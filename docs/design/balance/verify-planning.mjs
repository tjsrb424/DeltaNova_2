import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,relative} from 'node:path';
import {catalog as c,total,resourceCost,levelHours,byId} from './catalog.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),base=dirname(fileURLToPath(import.meta.url));
const json=name=>JSON.parse(readFileSync(resolve(base,name),'utf8'));let checks=0,links=0;
function check(value,label){assert(value,label);checks++;}
assert.deepEqual(json('catalog.json'),c);checks++;
const curves=json('level-curves.json').curves;
check(curves.reduce((sum,d)=>sum+d.levels.length,0)===499,'Complete level curves');
for(const d of curves){const definition=[...c.facilities,...c.researches].find(v=>v.id===d.id),cumulative=[0,0,0];for(const l of d.levels){assert.deepEqual(l.cost,resourceCost(definition,l.level));checks++;check(l.baseHours===levelHours(definition,l.level),'Curve time');if(!l.initialFree)for(let i=0;i<3;i++)cumulative[i]+=l.cost[i];assert.deepEqual(l.cumulativeStandardCost,cumulative);checks++;check(l.growthScore===total(cumulative)/10,'Ranking standard value');}}
const controlled=json('controlled-economy-results.json'),colony=json('colony-economy-results.json'),combat=json('combat-benchmark-results.json'),review=json('review-results.json');
for(const name of ['command-plans.json','audit-results.json','controlled-economy-results.json','colony-economy-results.json','combat-benchmark-results.json','combat-attack-control.json','model-check-results.json','review-results.json'])check(json(name).version===c.version,`Version ${name}`);
check(controlled.cases.length===18&&!controlled.findings.length,'Attendance target');
check(colony.cases.length+colony.baseline.length+colony.diagnostics.length===148,'Colony cases');
check(combat.cases.length===3008&&combat.economics.length===8064&&combat.investmentRatios.length===1728,'Combat case coverage');
const definitions=byId(c.researches);
for(const [id,l]of Object.entries(colony.fixture.tech)){check(l<=definitions.get(id).maxLevel,'Fixture level');for(const [parent,required]of Object.entries(definitions.get(id).prerequisites))check((colony.fixture.tech[parent]??0)>=required,`${id} prerequisite ${parent}`);}
const docs=[];function walk(path){for(const name of readdirSync(path)){const p=resolve(path,name);if(statSync(p).isDirectory())walk(p);else if(name.endsWith('.md'))docs.push(p);}}
walk(resolve(root,'docs/design'));docs.push(resolve(root,'README.md'));
for(const path of docs){const s=readFileSync(path,'utf8');check(!s.includes('\ufffd'),`UTF8 ${path}`);check(!/[\t ]+$/m.test(s),`Trailing whitespace ${path}`);for(const m of s.matchAll(/!?\[[^\]\n]+\]\(([^)]+)\)/g)){let target=m[1].split(' ')[0];if(/^(https?:|#|codex:)/.test(target))continue;target=decodeURIComponent(target.split('#')[0]);check(existsSync(resolve(dirname(path),target)),`Broken link ${relative(root,path)} => ${target}`);links++;}}
const doctrinal=[
 [{striker:6,interceptor:4,courier:2,scout:1},32300,19,5400,1,62,0.75],
 [{cruiser:4,destroyer:3,guardian:2,jammer:1,heavy_cargo:2},147500,39,26280,3,762,150/55],
 [{bomber:4,siege_platform:2,guardian:2,jammer:1,heavy_cargo:2},437000,58,25280,3,2670,7.5]
];
const shipMap=byId(c.ships);
for(const [force,price,command,cargo,distance,fuel,hours]of doctrinal){const selected=Object.entries(force).map(([id,n])=>[shipMap.get(id),n]);check(total(selected.map(([d,n])=>total(d.cost)*n))===price,'Doctrine price');check(total(selected.map(([d,n])=>d.command*n))===command,'Doctrine command');check(total(selected.map(([d,n])=>d.cargo*n))===cargo,'Doctrine cargo');check(2*distance*total(selected.map(([d,n])=>d.fuel*n))===fuel,'Doctrine fuel');check(Math.abs(Math.max(.75,.5*distance*100/Math.min(...selected.map(([d])=>d.speed)))-hours)<1e-8,'Doctrine duration');}
check(review.striker.after.winPercent<80&&review.striker.before.winPercent>80,'Matched attack control');
writeFileSync(resolve(base,'planning-verification.json'),JSON.stringify({version:c.version,checks,documents:docs.length,localLinks:links,levelCurves:499,passed:true},null,2)+'\n');
console.log(JSON.stringify({checks,documents:docs.length,localLinks:links,levelCurves:499,passed:true}));
