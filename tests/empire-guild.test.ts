import { it, expect } from "vitest";
import { initialGuildState } from "../src/guild/rules.ts";
import { initialEmpire, applyEmpireAction, projectEmpire } from "../src/empire/rules.ts";
import { applyWorldGuildCommand } from "../src/empire/world.ts";
import { validateWorld } from "../src/empire/migration.ts";
import type { WorldState } from "../src/empire/types.ts";
import type { GuildAction } from "../src/guild/types.ts";
function world():WorldState { const old=initialGuildState(0);return {schemaVersion:3,rulesVersion:"planet-base-v3",revision:0,operation:old.operation,pilots:old.pilots.map(({base,...p})=>({...p,empire:initialEmpire(p.id,0)}))}; }
function run(s:WorldState,action:GuildAction,actor="nova") {return applyWorldGuildCommand(s,actor,{commandId:"cmd-"+s.revision,expectedRevision:s.revision,operationId:s.operation.id,action},40000);}
it("uses a constructed ship in shared roles and spends the same local resources",()=>{
  let s=world();s.pilots[0].empire=projectEmpire(applyEmpireAction(s.pilots[0].empire,{type:"build-ships",planetId:"nova-prime",shipId:"striker",quantity:1},0,"built"),40000);
  const e=s.pilots[0].empire,id=e.planets[0].ships.at(-1)!.id,fuel=e.planets[0].resources.fuel,revision=e.revision;
  s=run(s,{type:"claim",role:"recon"});
  s=run(s,{type:"contribute",role:"recon",fleetIds:[id,"scout-01","guardian-01","salvage-01"]});
  expect(s.operation.slots.recon.completed).toBe(true);expect(s.pilots[0].merit).toBe(10);
  expect(s.pilots[0].empire.revision).toBe(revision+1);expect(s.pilots[0].empire.planets[0].resources.fuel).toBeLessThan(fuel);
  for(const unit of s.operation.slots.recon.report!.fleet) expect(s.pilots[0].empire.planets[0].ships.find(sh=>sh.id===unit.id)?.wear).toBe(unit.maxHp-unit.hp);
  expect(validateWorld(s)).toEqual(s);
  const tampered=structuredClone(s);tampered.operation.slots.recon.report!.fleet[0].hp++;
  expect(()=>validateWorld(tampered)).toThrow();
});
it("rejects deployed or foreign ships instead of creating copies",()=>{
  let s=world();s=run(s,{type:"claim",role:"recon"});s.pilots[0].empire.planets[0].ships.find(sh=>sh.id==="scout-01")!.status="deployed";
  expect(()=>run(s,{type:"contribute",role:"recon",fleetIds:["scout-01"]})).toThrow();
  expect(()=>run(s,{type:"contribute",role:"recon",fleetIds:["foreign-ship"]})).toThrow();
});
