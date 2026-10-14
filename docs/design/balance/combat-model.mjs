// Proposed season combat/economics, isolated from the existing gameplay engine.
import assert from 'node:assert/strict';
import {catalog as c,total,byId} from './catalog.mjs';
import {voyage,round} from './economy-model.mjs';
const ships=byId(c.ships),defenses=byId(c.defenses),EPS=1e-8;
export const DEFAULT_RULES={maxRounds:12,guardCap:0.15,ewCap:0.20,repairRate:0.20,defenseRecovery:0.60,salvageRate:0.30,
  bursts:{L:1,M:2,H:4,F:2},weaponBursts:{kinetic:1,beam:1,missile:1,siege:1,drone:2}};
const alive=units=>units.filter(u=>u.hp>EPS);
const cost=u=>total(u.cost);
const techLevel=(tech,id,cap)=>Math.min(cap,tech[id]??0);
export function forceCost(force){return Object.entries(force.ships??{}).reduce((sum,[id,n])=>sum+total(ships.get(id).cost)*n,0)+Object.entries(force.defenses??{}).reduce((sum,[id,n])=>sum+total(defenses.get(id).cost)*n,0);}
export function makeForce(weights,budget,{tech={},defense=false,fields=80,command=500,power=Infinity}={}){
  assert(Number.isFinite(budget)&&budget>=0&&fields>=0&&command>=0&&power>=0);
  assert(Object.values(weights).every(v=>Number.isFinite(v)&&v>=0)&&total(Object.values(weights))>0);
  const map=defense?defenses:ships,composition={},weightSum=total(Object.values(weights));let used=0,space=0,orders=0;
  const ids=Object.keys(weights).filter(id=>weights[id]>0),desired=Object.fromEntries(ids.map(id=>[id,Math.floor(budget*weights[id]/weightSum/total(map.get(id).cost))]));
  const desiredFields=total(Object.values(desired)),desiredCommand=ids.reduce((sum,id)=>sum+desired[id]*(map.get(id).command??0),0);
  const shrink=defense?Math.min(1,fields/Math.max(1,desiredFields)):Math.min(1,command/Math.max(1,desiredCommand));
  for(const id of ids){const d=map.get(id),n=Math.floor(desired[id]*shrink);if(n>0){composition[id]=n;used+=total(d.cost)*n;space+=defense?n:0;orders+=defense?0:d.command*n;}}
  // Capacity limits shrink every role together; list order cannot consume all fields first.
  while(true){const eligible=ids.filter(id=>{const d=map.get(id);return used+total(d.cost)<=budget&&(defense?space<fields:orders+d.command<=command);});if(!eligible.length)break;
    eligible.sort((a,b)=>(composition[a]??0)*total(map.get(a).cost)/weights[a]-(composition[b]??0)*total(map.get(b).cost)/weights[b]||a.localeCompare(b));
    const id=eligible[0],d=map.get(id);composition[id]=(composition[id]??0)+1;used+=total(d.cost);space+=defense?1:0;orders+=defense?0:d.command;
  }
  const force={ships:defense?{}:composition,defenses:defense?composition:{},tech,power,fields,command};assert(forceCost(force)<=budget);assert(defense?space<=fields:orders<=command);return force;
}
export function unitsFor(force,side){
  const result=[];for(const kind of ['ships','defenses'])for(const [id,n]of Object.entries(force[kind]??{}).sort(([a],[b])=>a.localeCompare(b))){assert(Number.isInteger(n)&&n>=0);const d=(kind==='ships'?ships:defenses).get(id);assert(d,`Unknown ${id}`);
    const tech=force.tech??{},weaponResearch=d.weapon==='siege'?'siege_protocol':d.weapon==='drone'?'carrier_ops':d.weapon;
    const maxHp=d.hp*(1+0.03*techLevel(tech,'armor',10)),maxShield=d.shield*(1+0.04*techLevel(tech,'shield',8)),attack=d.attack*(1+(d.weapon==='drone'?0.04:0.03)*techLevel(tech,weaponResearch,d.weapon==='drone'?6:d.weapon==='siege'?8:10));
    for(let i=0;i<n;i++)result.push({id:`${side}:${id}:${String(i).padStart(5,'0')}`,type:id,kind:kind==='ships'?'ship':'defense',size:kind==='ships'?d.size:'F',weapon:d.weapon,cost:d.cost,hp:maxHp,maxHp,shield:maxShield,maxShield,armor:d.armor,attack,cargo:d.cargo??0,power:d.power??0});
  }return result;
}
function guard(units,tech,rules){const active=alive(units),all=active.reduce((sum,u)=>sum+cost(u),0),support=active.filter(u=>['guardian','shield_ship','shield_dome'].includes(u.type)).reduce((sum,u)=>sum+cost(u),0);if(!support||!all)return 0;return Math.min(rules.guardCap,0.5*support/all*(1+0.10*techLevel(tech,'formation',6)));}
function ewar(units,tech,opponentTech,rules){const active=alive(units),all=active.reduce((sum,u)=>sum+cost(u),0),support=active.filter(u=>u.type==='jammer').reduce((sum,u)=>sum+cost(u),0);if(!support||!all)return 0;return Math.max(0,Math.min(rules.ewCap,0.5*support/all*(1+0.10*techLevel(tech,'electronic_warfare',6)))-0.02*techLevel(opponentTech,'counter_ew',6));}
function attackFactor(unit,target,tech){return c.targeting[unit.weapon][target.size]+(target.size==='L'?0.025*techLevel(tech,'tracking',8):0);}
export function fight(forceA,forceB,{seed=0,rules=DEFAULT_RULES}={}){
  const a=unitsFor(forceA,'a'),b=unitsFor(forceB,'b'),techA=forceA.tech??{},techB=forceB.tech??{};
  const ewA=ewar(a,techA,techB,rules),ewB=ewar(b,techB,techA,rules);for(const u of b)u.shield*=1-ewA;for(const u of a)u.shield*=1-ewB;
  let rounds=0,overkill=0;const guardTrace=[];
  function fire(attackers,targets,ownTech,targetTech,targetGuard,availablePower){
    const shots=new Map(),forecast=new Map(targets.map(u=>[u.id,u.hp+u.shield]));
    const order=[...attackers];if(order.length){const offset=seed%order.length;order.push(...order.splice(0,offset));}
    const demand=attackers.filter(u=>u.kind==='defense').reduce((sum,u)=>sum+u.power,0),powerFactor=Math.min(1,availablePower/Math.max(1,demand));
    for(const source of order){const count=(rules.bursts[source.size]??1)*(rules.weaponBursts[source.weapon]??1),raw=source.attack/count*(source.kind==='defense'?powerFactor:1);
      for(let shot=0;shot<count;shot++){
        let target=null,best=-Infinity;for(const candidate of targets){const remaining=forecast.get(candidate.id);if(remaining<=EPS)continue;const coefficient=attackFactor(source,candidate,ownTech),priority=coefficient+0.1*(1-remaining/(candidate.maxHp+candidate.maxShield));if(priority>best+EPS){target=candidate;best=priority;}}
        if(!target)break;
        const damage=raw*attackFactor(source,target,ownTech)/(1+target.armor/100)*(1-targetGuard);assert(damage>=0&&Number.isFinite(damage));
        const remaining=forecast.get(target.id);forecast.set(target.id,remaining-damage);shots.set(target.id,(shots.get(target.id)??0)+damage);overkill+=Math.max(0,damage-remaining);
      }
    }return shots;
  }
  for(let r=1;r<=rules.maxRounds&&alive(a).length&&alive(b).length;r++){
    rounds=r;const aa=alive(a),bb=alive(b),ga=guard(aa,techA,rules),gb=guard(bb,techB,rules);assert(ga<=rules.guardCap+EPS&&gb<=rules.guardCap+EPS);guardTrace.push([ga,gb]);
    const da=fire(aa,bb,techA,techB,gb,forceA.power??Infinity),db=fire(bb,aa,techB,techA,ga,forceB.power??Infinity);
    for(const [units,damage]of [[a,db],[b,da]])for(const u of units){let value=damage.get(u.id)??0;const shield=Math.min(u.shield,value);u.shield-=shield;value-=shield;u.hp=Math.max(0,u.hp-value);if(u.hp<EPS)u.hp=0;assert(u.hp<=u.maxHp+EPS&&u.shield>=-EPS);}
  }
  const survivorsA=alive(a),survivorsB=alive(b),outcome=!survivorsA.length&&!survivorsB.length?'mutual':!survivorsA.length?'defender':!survivorsB.length?'attacker':'held';
  return {outcome,rounds,a,b,survivorsA,survivorsB,costA:forceCost(forceA),costB:forceCost(forceB),guardTrace,ewA,ewB,overkill,techA,techB};
}
export function aftermath(units,{repairRate=0.20,defenseRecovery=0.60,recoveryRound='floor'}={}){
  const dead=units.filter(u=>u.hp<=EPS),survivors=alive(units),groups=new Map();
  for(const u of dead)if(u.kind==='defense'){if(!groups.has(u.type))groups.set(u.type,[]);groups.get(u.type).push(u);}
  let permanentLoss=dead.filter(u=>u.kind==='ship').reduce((sum,u)=>sum+cost(u),0),repair=0,disabled=0;
  const destroyedDebris=[0,0,0];for(const u of dead.filter(u=>u.kind==='ship')){destroyedDebris[0]+=u.cost[0];destroyedDebris[1]+=u.cost[1];}
  for(const group of groups.values()){
    const n=Math.min(group.length,(recoveryRound==='ceil'?Math.ceil:Math.floor)(group.length*defenseRecovery));disabled+=n;
    for(let i=0;i<group.length;i++){const u=group[i];if(i<n)repair+=(u.cost[0]+u.cost[1])*0.35;else{permanentLoss+=cost(u);destroyedDebris[0]+=u.cost[0];destroyedDebris[1]+=u.cost[1];}}
  }
  for(const u of survivors)repair+=(u.cost[0]+u.cost[1])*((u.maxHp-u.hp)/u.maxHp)*repairRate;
  return {permanentLoss,repair,disabled,destroyedDebris,dead:dead.length,survivors:survivors.length};
}
export function raidEconomics(battle,forceA,{distance=3,speed=1,stock=[36000,24000,12000],vaultLevel=2,recoveryRound='floor',rules=DEFAULT_RULES}={}){
  const tech=forceA.tech??{},repairRate=Math.max(0.16,rules.repairRate-0.005*techLevel(tech,'field_repair',8)),defenderRepairRate=Math.max(0.16,rules.repairRate-0.005*techLevel(battle.techB??{},'field_repair',8)),a=aftermath(battle.a,{repairRate,defenseRecovery:rules.defenseRecovery,recoveryRound}),b=aftermath(battle.b,{repairRate:defenderRepairRate,defenseRecovery:rules.defenseRecovery,recoveryRound});
  const trip=voyage(forceA.ships,distance,speed,tech);
  const bonus=1+0.05*techLevel(tech,'cargo_compression',10),salvageCapacity=battle.survivorsA.filter(u=>u.type==='salvage').reduce((sum,u)=>sum+u.cargo*bonus,0),lootCapacity=battle.survivorsA.filter(u=>u.type!=='salvage').reduce((sum,u)=>sum+u.cargo*bonus,0);
  const protectedAmount=500*1.5**Math.max(0,vaultLevel-1),offered=total(stock.map(v=>Math.max(0,v-Math.min(v*0.30,protectedAmount))*0.25));
  const loot=battle.outcome==='attacker'?Math.min(offered,lootCapacity):0,salvageRate=Math.min(0.45,rules.salvageRate+0.025*techLevel(tech,'salvage_processing',6)),wreck=total(a.destroyedDebris)+total(b.destroyedDebris);
  const recovered=battle.outcome==='attacker'?Math.min(wreck*salvageRate,salvageCapacity):0;
  assert(loot+recovered<=lootCapacity+salvageCapacity+EPS,'Cargo conservation');assert(recovered<=wreck*salvageRate+EPS,'Debris conservation');
  const profit=loot+recovered-trip.fuel-a.repair-a.permanentLoss;
  return {profit:round(profit),loot:round(loot),recovered:round(recovered),fuel:trip.fuel,repair:round(a.repair),permanentLoss:a.permanentLoss,defenderPermanentLoss:b.permanentLoss,defenderRepair:round(b.repair),defenderDisabled:b.disabled,cargo:round(lootCapacity+salvageCapacity),tripHours:round(2*trip.hours),profitPerTravelHour:round(profit/(2*trip.hours)),outcome:battle.outcome};
}
