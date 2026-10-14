import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {catalog as c} from './catalog.mjs';
const out=name=>fileURLToPath(new URL(name,import.meta.url));
const artifacts=['catalog.json','level-curves.json','CONSTRUCTION_CATALOG.md','FLEET_CATALOG.md','RESEARCH_CATALOG.md','audit-results.json','BALANCE_AUDIT_V0.1.md','command-plans.json','controlled-economy-results.json','CONTROLLED_ECONOMY_V0.2.md','colony-economy-results.json','COLONY_ECONOMY_V0.2.md','combat-attack-control.json','combat-benchmark-results.json','COMBAT_AND_RAID_V0.2.md','model-check-results.json','review-results.json','BALANCE_REVIEW_V0.2.md','planning-verification.json'];
const hash=name=>createHash('sha256').update(readFileSync(out(name))).digest('hex');
const before=Object.fromEntries(artifacts.map(name=>[name,hash(name)])),commands=[['audit.mjs'],['controlled-economy.mjs'],['colony-economy.mjs'],['combat-benchmark.mjs','--attack-control'],['combat-benchmark.mjs'],['model-checks.mjs'],['summarize.mjs'],['verify-planning.mjs']];
for(const [file,...args]of commands){const result=spawnSync(process.execPath,[out(file),...args],{encoding:'utf8',windowsHide:true});assert.equal(result.status,0,`${file}: ${result.stderr}\n${result.stdout}`);console.log(`${file}${args.length?' '+args.join(' '):''}: pass`);}
for(const name of artifacts)assert.equal(hash(name),before[name],`Repeat output changed: ${name}`);
writeFileSync(out('reproducibility-results.json'),JSON.stringify({version:c.version,passed:true,commands:commands.map(v=>v.join(' ')),identicalArtifacts:artifacts.length,sha256:before},null,2)+'\n');
console.log(JSON.stringify({passed:true,commands:commands.length,identicalArtifacts:artifacts.length}));
