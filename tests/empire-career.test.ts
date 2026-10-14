import { it, expect } from "vitest";
import { initialEmpire, applyEmpireAction, projectEmpire } from "../src/empire/rules.ts";
import { applyEmpireCareer } from "../src/empire/career.ts";
import { validateEmpire } from "../src/empire/validation.ts";
import { validateFleet, createFleet } from "../src/game/fleet.ts";
import { legacyBaseView, applyLegacyBaseAction } from "../src/empire/legacy-base.ts";
import type { EmpireState } from "../src/empire/types.ts";
function built() { return projectEmpire(applyEmpireAction(initialEmpire("nova",0),{type:"build-ships",planetId:"nova-prime",shipId:"striker",quantity:1},0,"built"),40000); }
function launch(s: EmpireState) { return applyEmpireCareer(s,{type:"career-action",planetId:s.homePlanetId,action:{type:"launch",missionId:"salvage",fleetIds:[s.planets[0].ships.at(-1)!.id,"striker-01","guardian-01","salvage-01"],support:"jam",approach:"direct"}},40000); }
it("uses a constructed ship only with an explicit owned fleet context",()=>{
  const context={roster:[{id:"built-striker",shipId:"striker"}]};
  expect(validateFleet(["built-striker"],"none","direct",context)).toEqual([]);
  expect(createFleet(["built-striker"],"none",context)[0].id).toBe("built-striker");
  expect(validateFleet(["built-striker"],"none","direct")).not.toEqual([]);
  expect(validateFleet(["striker-01"],"none","direct",context)).not.toEqual([]);
});
it("launches newly built ships, reserves them, settles once and permits repair",()=>{
  const base=built(),started=launch(base);
  expect(started.career.operation?.phase).toBe("checkpoint");
  expect(started.planets[0].resources.fuel).toBe(base.planets[0].resources.fuel-10);
  expect(started.planets[0].ships.at(-1)?.status).toBe("deployed");
  expect(validateEmpire(started)).toEqual(started);
  expect(()=>applyEmpireCareer(started,{type:"repair-fleet",planetId:base.homePlanetId,fleetIds:["striker-01"]},40000)).toThrow();
  const returned=applyEmpireCareer(started,{type:"career-action",planetId:base.homePlanetId,action:{type:"return"}},40000);
  expect(returned.career.operation?.phase).toBe("result");
  expect(returned.planets[0].ships.at(-1)?.status).toBe("docked");
  expect(returned.planets[0].resources.alloy).toBe(base.planets[0].resources.alloy+returned.career.operation!.recovered*4);
  const twice=applyEmpireCareer(returned,{type:"career-action",planetId:base.homePlanetId,action:{type:"return"}},40000);
  expect(twice.planets[0]).toEqual(returned.planets[0]);
  const damaged=returned.planets[0].ships.filter(sh=>sh.wear>0);
  const repaired=applyEmpireCareer(returned,{type:"repair-fleet",planetId:base.homePlanetId,fleetIds:damaged.map(sh=>sh.id)},40000);
  expect(repaired.planets[0].ships.every(sh=>sh.wear===0)).toBe(true);
});
it("returns resources and ships to the stored origin when another planet is selected",()=>{
  const base=built(),p=structuredClone(base.planets[0]);p.id="other";p.name="세레스";p.kind="colony";p.ships=[];
  base.planets.push(p);
  const started=launch(base),other=structuredClone(started.planets[1]); expect(started.career.operation).not.toBeNull();
  const returned=applyEmpireCareer(started,{type:"career-action",planetId:"other",action:{type:"return"}},40000);
  expect(returned.planets[1]).toEqual(other);
  expect(returned.planets[0].ships.some(sh=>sh.status==="deployed")).toBe(false);
});
it("rejects unowned, duplicate, damaged and nonlocal departure ships",()=>{
  const s=built(); s.planets[0].ships.at(-1)!.wear=10;
  expect(()=>launch(s)).toThrow();
  expect(()=>applyEmpireCareer(s,{type:"repair-fleet",planetId:"nova-prime",fleetIds:["foreign"]},40000)).toThrow();
  expect(()=>applyEmpireCareer(s,{type:"repair-fleet",planetId:"nova-prime",fleetIds:["striker-01","striker-01"]},40000)).toThrow();
});
it("validates dynamic combat reports and rejects altered HP or unreserved ships",()=>{
  const s=launch(built()); expect(s.career.operation).not.toBeNull(); expect(validateEmpire(s)).toEqual(s);
  const corrupt=structuredClone(s); corrupt.career.operation!.fleet[0].hp++;
  expect(()=>validateEmpire(corrupt)).toThrow();
  const unreserved=structuredClone(s);unreserved.planets[0].ships.forEach(sh=>sh.status="docked");
  expect(()=>validateEmpire(unreserved)).toThrow();
});
it("connects the public empire action path to personal operations",()=>{
  const s=built(),started=applyEmpireAction(s,{type:"career-action",planetId:s.homePlanetId,action:{type:"launch",missionId:"relay",fleetIds:["salvage-01"],support:"none",approach:"direct"}},40000,"sortie");
  expect(started.career.operation?.phase).toBe("result");
  expect(started.planets[0].ships.find(sh=>sh.id==="salvage-01")?.wear).toBe(70);
});
it("exposes a legacy base as a read view without storing duplicate resources",()=>{
  const s=initialEmpire("nova",0),view=legacyBaseView(s);
  expect(view).toMatchObject({resources:{alloy:120,supply:80},facilities:{forge:1,reactor:1},lastProducedAt:0});
  expect(Object.keys(view.wear)).toHaveLength(9);
  expect("base" in s).toBe(false);
});
it("targets the home planet for legacy facility commands and uses the current timed growth rules",()=>{
  const s=applyLegacyBaseAction(initialEmpire("nova",0),{type:"upgrade-facility",facility:"forge"},0,"old-build");
  expect(s.planets[0].constructionJob?.target).toBe("alloyMine");
  expect(s.planets[0].facilities.alloyMine).toBe(1);
  expect(s.planets[0].resources).toEqual({alloy:80,crystal:70,fuel:70});
  expect(projectEmpire(s,60000).planets[0].facilities.alloyMine).toBe(2);
});
