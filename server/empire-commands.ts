import type { WorldState, EmpireCommand } from "../src/empire/types.ts";
import { applyEmpireAction } from "../src/empire/rules.ts";
import { GuildError } from "../src/guild/types.ts";
export function applyPersonalCommand(previous: WorldState,pilotId: string,command: EmpireCommand,now: number): WorldState {
  const world=structuredClone(previous),actor=world.pilots.find(p=>p.id===pilotId);
  if(!actor) throw new GuildError(403,"PILOT_UNKNOWN","알 수 없는 참가자입니다.");
  if(command.expectedEmpireRevision!==actor.empire.revision) throw new GuildError(409,"EMPIRE_REVISION_CONFLICT","행성 상태가 바뀌었습니다. 최신 상태를 확인하세요.");
  actor.empire=applyEmpireAction(actor.empire,command.action,now,pilotId+"-"+command.commandId);
  world.revision++; return world;
}
