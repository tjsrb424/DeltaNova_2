import type { WorldState } from "./types.ts";
import type { GuildState, GuildCommand } from "../guild/types.ts";
import { initialGuildState } from "../guild/rules.ts";
import { applyGuildCommand } from "../guild/rules.ts";
import { legacyBaseView, applyLegacyBaseAction } from "./legacy-base.ts";
import { projectEmpire, ownedPlanet, empireFail } from "./rules.ts";
import { GuildError } from "../guild/types.ts";
export function guildView(world: WorldState, actorId?: string, planetId?: string, now?: number): GuildState {
  const pilots=world.pilots.map(p=>now===undefined?p:{...p,empire:projectEmpire(p.empire,now)});
  return {schemaVersion:2,rulesVersion:"base-operations-v2",revision:world.revision,operation:structuredClone(world.operation),
    pilots:pilots.map(p=>({id:p.id,name:p.name,merit:p.merit,successfulOperations:p.successfulOperations,
      base:legacyBaseView(p.empire,p.id===actorId&&planetId?planetId:p.empire.homePlanetId),
      fleetContext:{roster:p.empire.planets.flatMap(p=>p.ships.map(sh=>({id:sh.id,shipId:sh.shipId})))}}))};
}
export function applyWorldGuildCommand(world: WorldState,actorId: string,command: GuildCommand,now: number): WorldState {
  if(command.expectedRevision!==world.revision||command.operationId!==world.operation.id) throw new GuildError(409,"REVISION_CONFLICT","작전 상태가 바뀌었습니다. 최신 상태를 확인하세요.");
  const s=structuredClone(world),actor=s.pilots.find(p=>p.id===actorId);
  if(!actor) throw new GuildError(403,"PILOT_UNKNOWN","알 수 없는 참가자입니다.");
  const action=command.action;
  if(["collect-production","upgrade-facility","repair-fleet","career-action"].includes(action.type)) {
    actor.empire=applyLegacyBaseAction(actor.empire,action as import("../base/types.ts").BaseAction,now,actorId+"-"+command.commandId);
    s.revision++; return s;
  }
  let planetId=actor.empire.homePlanetId;
  if(action.type==="contribute") {
    actor.empire=projectEmpire(actor.empire,now);
    planetId=action.planetId||planetId; const p=ownedPlanet(actor.empire,planetId);
    if(action.fleetIds.some(id=>!p.ships.some(sh=>sh.id===id&&sh.status==="docked"&&sh.wear===0))) empireFail("FLEET_INVALID","현지의 정비 완료 함선만 공동 작전에 출격할 수 있습니다.");
  }
  const result=applyGuildCommand(guildView(s,actorId,planetId),actorId,command,now);
  s.operation=result.operation; s.revision=result.revision;
  for(const p of s.pilots) { const changed=result.pilots.find(r=>r.id===p.id)!; p.merit=changed.merit; p.successfulOperations=changed.successfulOperations; }
  if(action.type==="contribute") {
    const changed=result.pilots.find(p=>p.id===actorId)!.base,p=ownedPlanet(actor.empire,planetId);
    p.resources.alloy=changed.resources.alloy;p.resources.fuel=changed.resources.supply;
    for(const sh of p.ships) sh.wear=changed.wear[sh.id];
    actor.empire.revision++;
  }
  return s;
}
