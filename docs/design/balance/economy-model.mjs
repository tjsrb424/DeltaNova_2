// Planning model shared by controlled attendance and local-asset transport experiments.
import assert from 'node:assert/strict';
import {catalog as c, byId, total, resourceCost, levelHours} from './catalog.mjs';
export const facilities=byId(c.facilities), researches=byId(c.researches), ships=byId(c.ships);
export const STEP=0.25, EPS=1e-6;
export const zeros=()=>[0,0,0];
export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const subtract=(a,b)=>a.map((v,i)=>v-b[i]);
export const scale=(a,k)=>a.map(v=>v*k);
export const canPay=(cash,cost)=>cost.every((v,i)=>v<=cash[i]+EPS);
export const round=value=>Number(value.toFixed(4));
export function bonus(tech,id){const definition=researches.get(id);return Math.min(definition?.bonus?.cap??0,(tech[id]??0)*(definition?.bonus?.perLevel??0));}
export function production(levels,tech={},site=[1,1,1],fusionActive=true){
  const mines=['alloy_mine','crystal_mine','fuel_refinery'];
  const scales=mines.map(id=>(levels[id]??0)*c.economy.productionGrowth**Math.max(0,(levels[id]??0)-1));
  const power=c.economy.powerBase*(levels.power_plant??0)*c.economy.powerGrowth**Math.max(0,(levels.power_plant??0)-1)+(fusionActive?250*(levels.fusion_plant??0):0);
  const demand=total(scales.map((v,i)=>v*c.economy.energyBase[i]*(1-bonus(tech,'power_efficiency'))))+Object.entries(levels).reduce((sum,[id,l])=>sum+(facilities.get(id)?.idlePowerPerLevel??0)*l,0);
  const factor=Math.min(1,power/Math.max(1,demand));
  return {rates:scales.map((v,i)=>v*c.economy.baseHourly[i]*site[i]*(1+bonus(tech,'automation')+(i?bonus(tech,'refining'):0))*factor),factor,power,demand};
}
export function capacities(levels,tech={}){const base=c.economy.warehouseBase*c.economy.warehouseGrowth**((levels.warehouse??1)-1)*(1+bonus(tech,'storage'));return [base,base,base+2000*(levels.fuel_depot??0)];}
export function facilityHours(id,level,tech={}){return levelHours(facilities.get(id),level)/(1+bonus(tech,'construction'));}
export function researchHours(id,level,levels){return levelHours(researches.get(id),level)/(1+c.economy.researchSpeedPerLabLevel*((levels.laboratory??1)-1));}
export function buildHours(id,count,levels,tech={}){return ships.get(id).buildHours*count/(1+c.economy.buildSpeedPerYardLevel*((levels.shipyard??1)-1)+0.05*(levels.assembly_plant??0)+bonus(tech,'shipbuilding'));}
export function tickProduction(planet,tech,step=STEP){
  const fusionFuel=12*(planet.levels.fusion_plant??0)*step;
  const active=fusionFuel===0||planet.cash[2]>=fusionFuel;
  if(active&&fusionFuel){planet.cash[2]-=fusionFuel;planet.spent[2]+=fusionFuel;}
  const p=production(planet.levels,tech,planet.site,active),caps=capacities(planet.levels,tech);
  for(let i=0;i<3;i++){const generated=p.rates[i]*step,credited=Math.max(0,Math.min(generated,caps[i]-planet.cash[i]));planet.cash[i]+=credited;planet.produced[i]+=credited;planet.wasted[i]+=generated-credited;}
  return p;
}
export function pay(planet,cost){assert(canPay(planet.cash,cost),'Insufficient local resources');planet.cash=subtract(planet.cash,cost);planet.spent=add(planet.spent,cost);assert(planet.cash.every(v=>v>=-EPS));}
export function makePlanet(id,levels,cash,site=[1,1,1]){return {id,levels:{...levels},cash:[...cash],initial:[...cash],site,produced:zeros(),wasted:zeros(),spent:zeros(),movedIn:zeros(),movedOut:zeros(),construction:[]};}
export function effectiveSpeed(ship,tech={}){const drive=ship.size==='L'?'chemical_drive':ship.size==='M'?'ion_drive':'fusion_drive';const coefficient=ship.size==='L'?0.04:ship.size==='M'?0.05:0.06;return ship.speed*(1+Math.min(0.5,(tech[drive]??0)*coefficient+(tech.navigation??0)*0.02));}
export function voyage(fleet,distance,speedFraction=1,tech={},roundTrip=true){
  assert(Object.entries(fleet).every(([id,n])=>ships.has(id)&&Number.isInteger(n)&&n>=0),'Valid integer fleet');
  assert(distance>0&&speedFraction>=0.5&&speedFraction<=1&&Object.values(fleet).some(n=>n>0));
  const selected=Object.entries(fleet).filter(([,n])=>n>0).map(([id,n])=>({ship:ships.get(id),n}));
  const speed=Math.min(...selected.map(v=>effectiveSpeed(v.ship,tech)));
  return {hours:Math.max(0.75,0.5*distance*100/speed/speedFraction),fuel:Math.ceil((roundTrip?2:1)*distance*total(selected.map(v=>v.ship.fuel*v.n))*speedFraction**1.6*(1-Math.min(0.32,(tech.fuel_efficiency??0)*0.04))),
    cargo:Math.floor(total(selected.map(v=>v.ship.cargo*v.n))*(1+Math.min(0.5,(tech.cargo_compression??0)*0.05))),command:total(selected.map(v=>v.ship.command*v.n))};
}
export function conservation(planet){for(let i=0;i<3;i++)assert(Math.abs(planet.initial[i]+planet.produced[i]+planet.movedIn[i]-planet.spent[i]-planet.movedOut[i]-planet.cash[i])<1e-4,`Resource conservation ${planet.id}:${i}`);}

export function replay(plan,visits,{calendar=true,queueSize=c.economy.constructionQueue}={}){
  const home=makePlanet('home',c.initialLevels,c.initialResources),tech={},queues={facility:home.construction,research:[],ship:[]};
  const commands=plan.commands;let commandCursor=0;
  const cursors={facility:0,research:0,ship:0},completed={facility:0,research:0,ship:0},paidShipValue={value:0};
  const receipts=new Set(), snapshots=[];let maxQueue=0;
  const jobHours=job=>job.kind==='facility'?facilityHours(job.id,job.level,tech):job.kind==='research'?researchHours(job.id,job.level,home.levels):buildHours(job.id,job.count,home.levels,tech);
  for(let t=0;t<=c.seasonDays*24;t+=STEP){
    for(const [kind,queue]of Object.entries(queues))while(queue[0]&&queue[0].finish<=t+EPS){const job=queue.shift();if(kind==='facility')home.levels[job.id]=job.level;else if(kind==='research')tech[job.id]=job.level;else paidShipValue.value+=total(job.cost);completed[kind]++;if(queue[0])queue[0].finish=t+jobHours(queue[0]);}
    if(t<c.seasonDays*24&&Number.isInteger(t/(24/visits))){
      while(commandCursor<commands.length){const command=commands[commandCursor],kind=command.kind,queue=queues[kind],limit=kind==='facility'?queueSize:3;
        if(queue.length>=limit)break;
        if(calendar&&command.at>t+EPS)break;
        const prerequisites=kind==='facility'?facilities.get(command.id).prerequisites:kind==='research'?researches.get(command.id).prerequisites:ships.get(command.id).prerequisites;
        const projectedTech={...tech};for(const job of queues.research)projectedTech[job.id]=job.level;
        const shadow=kind==='facility'?{...home.levels}:{...projectedTech};for(const job of queue)if(job.level)shadow[job.id]=job.level;
        if(Object.entries(prerequisites).some(([id,l])=>(kind==='research'?projectedTech:tech)[id]<l||!(kind==='research'?projectedTech:tech)[id]))break;
        if(kind==='research'&&home.levels.laboratory<researches.get(command.id).labLevel)break;
        if(kind==='ship'&&home.levels.shipyard<ships.get(command.id).yardLevel)break;
        if(command.level&&(shadow[command.id]??0)+1!==command.level)break;
        if(!canPay(home.cash,command.cost))break;
        const id=`${kind}:${commandCursor}`;assert(!receipts.has(id));receipts.add(id);pay(home,command.cost);const job={...command};job.finish=queue.length?Infinity:t+jobHours(job);queue.push(job);cursors[kind]++;commandCursor++;maxQueue=Math.max(maxQueue,queue.length);
      }
    }
    if([7,14,28,56,84].includes(t/24))snapshots.push({day:t/24,levels:{...home.levels},research:{...tech},produced:round(total(home.produced)),paidShips:paidShipValue.value});
    if(t<c.seasonDays*24)tickProduction(home,tech);
  }
  conservation(home);
  return {profile:plan.profile,visits,calendar,queueSize,produced:round(total(home.produced)),potential:round(total(home.produced)+total(home.wasted)),wastePercent:round(100*total(home.wasted)/(total(home.produced)+total(home.wasted))),
    levels:home.levels,research:tech,fleetValue:paidShipValue.value,submitted:cursors,completed,planCommands:plan.commands.length,submittedCommands:receipts.size,snapshots,maxQueue};
}
