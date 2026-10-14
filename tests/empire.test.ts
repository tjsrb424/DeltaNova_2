import { it, expect } from "vitest";
import { initialEmpire, applyEmpireAction, projectEmpire } from "../src/empire/rules.ts";
import type { EmpireState, EmpireAction } from "../src/empire/types.ts";
import { validateEmpire, parseEmpireCommand } from "../src/empire/validation.ts";
function rich() { const s=initialEmpire("nova",0); s.planets[0].resources={alloy:300,crystal:200,fuel:150}; return s; }
function run(s: EmpireState, action: EmpireAction, at=0, id="job-1") { return applyEmpireAction(s,action,at,id); }
const build = { type: "build-ships", planetId: "nova-prime", shipId: "striker", quantity: 1 } as const;

it("starts one owned planet with real resources, facilities and nine ships", () => {
  expect(initialEmpire("nova", 0)).toMatchObject({
    revision: 0, homePlanetId: "nova-prime",
    planets: [{ name: "노바 프라임", resources: { alloy: 120, crystal: 80, fuel: 80 } }],
    technologies: { industry: 0, propulsion: 0, intelligence: 0, defense: 0 },
    researchJob: null,
  });
});
it("charges a build once and grants real ships only on completion", () => {
  const s=initialEmpire("nova",0), started=run(s,build);
  expect(started.planets[0].resources).toEqual({alloy:80,crystal:60,fuel:70});
  expect(projectEmpire(started,39999).planets[0].ships).toHaveLength(9);
  const done=projectEmpire(started,40000);
  expect(done.planets[0].ships).toHaveLength(10);
  expect(done.planets[0].ships.at(-1)).toMatchObject({shipId:"striker",planetId:"nova-prime",wear:0,status:"docked"});
  expect(projectEmpire(done,40000)).toEqual(done);
  expect(s.planets[0].ships).toHaveLength(9);
});
it("runs construction, shipbuilding and research in separate lanes", () => {
  let s=run(rich(),{type:"upgrade-facility",planetId:"nova-prime",facility:"alloyMine"});
  s=run(s,build,0,"job-2");
  s=run(s,{type:"start-research",planetId:"nova-prime",technology:"industry"},0,"job-3");
  expect(s.planets[0].constructionJob).not.toBeNull();
  expect(s.planets[0].shipJob).not.toBeNull();
  expect(s.researchJob).not.toBeNull();
  expect(() => run(s,build,0,"job-4")).toThrow();
  expect(() => run(s,{type:"start-research",planetId:"nova-prime",technology:"defense"},0,"job-4")).toThrow();
  const done=projectEmpire(s,90000);
  expect(done.planets[0].facilities.alloyMine).toBe(2);
  expect(done.technologies.industry).toBe(1);
  expect(done.planets[0].ships).toHaveLength(10);
});
it("keeps production at the old rate until the facility actually finishes", () => {
  const s=run(initialEmpire("nova",0),{type:"upgrade-facility",planetId:"nova-prime",facility:"alloyMine"});
  expect(projectEmpire(s,59999).planets[0].facilities.alloyMine).toBe(1);
  expect(projectEmpire(s,60000).planets[0].resources.alloy).toBe(86);
  expect(projectEmpire(s,120000).planets[0].resources.alloy).toBe(98);
});
it("preserves fractions across a rate change just before a minute boundary", () => {
  const s=run(initialEmpire("nova",0),{type:"upgrade-facility",planetId:"nova-prime",facility:"alloyMine"},59999);
  expect(projectEmpire(s,120000).planets[0].resources.alloy).toBe(92);
  expect(projectEmpire(s,180000).planets[0].resources.alloy).toBe(104);
});
it("returns eighty percent to the original planet and removes reservations", () => {
  const s=run(initialEmpire("nova",0),build), cancelled=run(s,{type:"cancel-job",planetId:"nova-prime",jobId:"job-1"},10000);
  expect(cancelled.planets[0].resources).toEqual({alloy:112,crystal:76,fuel:78});
  expect(cancelled.planets[0].shipJob).toBeNull();
  expect(projectEmpire(cancelled,50000).planets[0].ships).toHaveLength(9);
  expect(() => run(s,{type:"cancel-job",planetId:"nova-prime",jobId:"job-1"},40000)).toThrow();
});
it("refuses a refund that does not fit rather than losing returned resources", () => {
  const s=run(initialEmpire("nova",0),build);
  s.planets[0].resources.alloy=300;
  expect(() => run(s,{type:"cancel-job",planetId:"nova-prime",jobId:"job-1"},0)).toThrow();
  expect(s.planets[0].shipJob).not.toBeNull();
});
it("requires ownership, affordable local resources, valid quantity and unlocked ship conditions", () => {
  expect(() => run(rich(),{...build,planetId:"foreign"})).toThrow();
  for(const quantity of [0,21,1.5]) expect(() => run(rich(),{...build,quantity})).toThrow();
  expect(() => run(initialEmpire("nova",0),{...build,quantity:10})).toThrow();
  expect(() => run(rich(),{...build,shipId:"carrier"})).toThrow();
});
it("keeps resources local while sharing completed research with every planet", () => {
  const s=rich(), other=structuredClone(s.planets[0]);
  other.id="colony"; other.name="세레스"; other.kind="colony"; other.ships=[];
  s.planets.push(other);
  const started=run(s,{type:"start-research",planetId:"colony",technology:"industry"});
  expect(started.planets[0].resources).toEqual(s.planets[0].resources);
  expect(started.planets[1].resources).toEqual({alloy:260,crystal:170,fuel:140});
  expect(projectEmpire(started,90000).technologies.industry).toBe(1);
  expect(() => run(started,{type:"cancel-job",planetId:"nova-prime",jobId:"job-1"})).toThrow();
});
it("builds defenses locally and refuses exhausted space, power and maximum levels", () => {
  const s=run(rich(),{type:"build-defense",planetId:"nova-prime"});
  expect(projectEmpire(s,60000).planets[0].defenses).toBe(1);
  const full=rich(); full.planets[0].defenses=24;
  expect(() => run(full,{type:"build-defense",planetId:"nova-prime"})).toThrow();
  const powerless=rich(); powerless.planets[0].defenses=25;
  expect(() => run(powerless,build)).toThrow();
  const max=rich(); max.planets[0].facilities.alloyMine=5;
  expect(() => run(max,{type:"upgrade-facility",planetId:"nova-prime",facility:"alloyMine"})).toThrow();
});
it("caps the full offline window, never revives lost overflow and ignores backward clocks", () => {
  const s=projectEmpire(initialEmpire("nova",0),9*3600000+59999);
  expect(s.planets[0].resources).toEqual({alloy:300,crystal:200,fuel:150});
  const spent=run(s,build,9*3600000+59999);
  expect(projectEmpire(spent,9*3600000+60000).planets[0].resources.alloy).toBe(260);
  expect(projectEmpire(spent,1)).toEqual(spent);
});
it("offline cap spans jobs and shared research without segment rounding changes", () => {
  let s=run(rich(),{type:"upgrade-facility",planetId:"nova-prime",facility:"alloyMine"},0,"facility");
  s=run(s,{type:"start-research",planetId:"nova-prime",technology:"industry"},0,"research");
  const at=180000, direct=projectEmpire(s,at), split=projectEmpire(projectEmpire(s,90000),at);
  expect(split).toEqual(direct);
  const offline=projectEmpire(s,12*3600000);
  expect(offline.planets[0].resources.alloy).toBe(400);
  expect(offline.planets[0].production.alloy.at).toBe(12*3600000);
  expect(offline.events).toHaveLength(2);
});
it("validates saved assets and rejects tampered jobs, duplicate ships and injected command costs", () => {
  const s=initialEmpire("nova",0); expect(validateEmpire(s)).toEqual(s);
  const bad=structuredClone(s); bad.planets[0].resources.fuel=-1;
  expect(()=>validateEmpire(bad)).toThrow();
  const duplicate=structuredClone(s); duplicate.planets[0].ships.push(duplicate.planets[0].ships[0]);
  expect(()=>validateEmpire(duplicate)).toThrow();
  const job=run(s,build); job.planets[0].shipJob!.cost.alloy=999;
  expect(()=>validateEmpire(job)).toThrow();
  const command={commandId:"build",expectedEmpireRevision:0,action:build};
  expect(parseEmpireCommand(command)).toEqual(command);
  expect(()=>parseEmpireCommand({...command,action:{...build,cost:0}})).toThrow();
  expect(()=>parseEmpireCommand({...command,action:{...build,quantity:1.5}})).toThrow();
  expect(()=>parseEmpireCommand({...command,action:{type:"start-research",planetId:"nova-prime",technology:"constructor"}})).toThrow();
});
it("permits a power plant upgrade as the recovery path during a power shortage", () => {
  const s=rich(); s.planets[0].defenses=16;
  const up=run(s,{type:"upgrade-facility",planetId:"nova-prime",facility:"powerPlant"});
  expect(projectEmpire(up,60000).planets[0].facilities.powerPlant).toBe(2);
});
