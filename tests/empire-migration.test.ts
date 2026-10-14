import { it, expect } from "vitest";
import { initialGuildState } from "../src/guild/rules.ts";
import { applyBaseAction } from "../src/base/rules.ts";
import { upgradeWorld, upgradeGuildReceipt } from "../src/empire/migration.ts";
it("migrates v2 local assets, clocks, wear and common progress without duplicating grants",()=>{
  const old=initialGuildState(1000); old.pilots[0].base.facilities.forge=3; old.pilots[0].base.wear["scout-01"]=5;old.pilots[0].merit=40;
  const s=upgradeWorld(old,9000); expect(s).not.toBeNull(); expect(s.schemaVersion).toBe(3);
  const home=s.pilots[0].empire.planets[0];
  expect(home.resources).toEqual({alloy:120,crystal:80,fuel:80});
  expect(home.facilities.alloyMine).toBe(3);expect(home.production.alloy.at).toBe(1000);expect(home.production.crystal.at).toBe(9000);
  expect(home.ships.find(sh=>sh.id==="scout-01")?.wear).toBe(5);expect(s.pilots[0].merit).toBe(40);
  expect("base" in s.pilots[0]).toBe(false); expect(upgradeWorld(s,100000)).toEqual(s);
});
it.each(["checkpoint","result"])("retains the personal %s and its stored source without paying cargo twice",(phase)=>{
  const old=initialGuildState(0),p=old.pilots[0];
  p.base=applyBaseAction(p.base,{type:"career-action",action:{type:"launch",missionId:"salvage",fleetIds:["striker-01","striker-02","guardian-01","salvage-01"],support:"jam",approach:"direct"}},0);
  if(phase==="result") p.base=applyBaseAction(p.base,{type:"career-action",action:{type:"return"}},0);
  const s=upgradeWorld(old,1000);expect(s).not.toBeNull(); const e=s.pilots[0].empire;
  expect(e.career).toEqual(p.base.career);expect(e.careerOriginPlanetId).toBe(e.homePlanetId);
  expect(e.planets[0].resources.alloy).toBe(p.base.resources.alloy);
  expect(e.planets[0].ships.find(sh=>sh.id==="striker-01")?.status).toBe(phase==="checkpoint"?"deployed":"docked");
});
it("migrates v1 and receipt responses while preserving the original receipt identity",()=>{
  const old=initialGuildState(0),legacy={...old,schemaVersion:1,rulesVersion:"guild-v1",pilots:old.pilots.map(({base,...p})=>p)};
  const s=upgradeWorld(legacy,1000);expect(s).not.toBeNull();expect(s.pilots[0].empire.planets[0].resources.crystal).toBe(80);
  const r=upgradeGuildReceipt({state:legacy,receipt:{pilotId:"nova",commandId:"old",revision:0},duplicate:false},1000);
  expect(r).not.toBeNull();expect(r.receipt).toEqual({pilotId:"nova",commandId:"old",revision:0});expect(r.state.pilots[0].base.resources.supply).toBe(80);
  expect(()=>upgradeWorld({...old,rulesVersion:"unknown"},1000)).toThrow();
  expect(()=>upgradeGuildReceipt({state:old,receipt:{pilotId:"nova",commandId:"old",revision:999},duplicate:false},1000)).toThrow();
});
