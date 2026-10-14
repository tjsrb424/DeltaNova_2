import type { WorldState } from "./types.ts";
import type { GuildReply } from "../guild/types.ts";
import { initialEmpire } from "./rules.ts";
import { guildView } from "./world.ts";
import { validateEmpire } from "./validation.ts";
import { validateGuildState as legacyV2 } from "../guild/legacy-validation.ts";
import { validateGuildState } from "../guild/validation.ts";
import { upgradeGuildState } from "../guild/migration.ts";
import { PILOTS } from "../guild/content.ts";
export function validateWorld(value: unknown): WorldState {
  if(!value||typeof value!=="object"||Array.isArray(value)) throw Error("Invalid world");
  const s=value as WorldState;
  if(s.schemaVersion!==3||s.rulesVersion!=="planet-base-v3"||Object.keys(s).sort().join(",")!=="operation,pilots,revision,rulesVersion,schemaVersion"||!Number.isSafeInteger(s.revision)||s.revision<0||!Array.isArray(s.pilots)||s.pilots.length!==4) throw Error("Invalid v3 world");
  for(const p of s.pilots) {
    if(Object.keys(p).sort().join(",")!=="empire,id,merit,name,successfulOperations"||!PILOTS.some(d=>d.id===p.id&&d.name===p.name)) throw Error("Invalid pilot");
    validateEmpire(p.empire);
  }
  validateGuildState(guildView(s)); return structuredClone(s);
}
export function upgradeWorld(value: unknown,now: number): WorldState {
  if((value as {schemaVersion?:unknown})?.schemaVersion===3) return validateWorld(value);
  const old=(value as {schemaVersion?:unknown})?.schemaVersion===1 ? upgradeGuildState(value,now) : legacyV2(value);
  const s:WorldState={schemaVersion:3,rulesVersion:"planet-base-v3",revision:old.revision,operation:structuredClone(old.operation),pilots:old.pilots.map(p=>{
    const e=initialEmpire(p.id,Math.max(now,p.base.lastProducedAt)),home=e.planets[0],base=p.base;
    home.resources={alloy:base.resources.alloy,crystal:80,fuel:base.resources.supply};
    home.facilities.alloyMine=base.facilities.forge;home.facilities.fuelRefinery=base.facilities.reactor;
    home.production.alloy={at:base.lastProducedAt,carry:base.productionCarry.alloy};home.production.fuel={at:base.lastProducedAt,carry:base.productionCarry.supply};
    e.career=structuredClone(base.career);
    if(e.career.operation) {e.careerOriginPlanetId=home.id;e.careerFleetContext={roster:e.career.operation.fleet.map(u=>({id:u.id,shipId:u.shipId}))};}
    for(const sh of home.ships) {sh.wear=base.wear[sh.id];sh.status=e.career.operation?.phase==="checkpoint"&&e.career.operation.fleet.some(u=>u.id===sh.id)?"deployed":"docked";}
    return {id:p.id,name:p.name,merit:p.merit,successfulOperations:p.successfulOperations,empire:e};
  })};
  return validateWorld(s);
}
export function upgradeGuildReceipt(value: unknown,now: number): GuildReply {
  const r=value as GuildReply;
  if(!r?.receipt||typeof r.duplicate!=="boolean"||!PILOTS.some(p=>p.id===r.receipt.pilotId)||typeof r.receipt.commandId!=="string"||r.receipt.revision!==r.state?.revision) throw Error("Invalid legacy receipt");
  return {...structuredClone(r),state:guildView(upgradeWorld(r.state,now))};
}
