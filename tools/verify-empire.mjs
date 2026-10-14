import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { createServer } from "vite";
import { GuildStore } from "../server/store.ts";
import { createGuildServer } from "../server/http.ts";

const dir=await mkdtemp(join(tmpdir(),"delta-nova-empire-")),path=join(dir,"world.sqlite");
let now=0,store,server,vite,url;
async function open() {
  store=new GuildStore(path,{now});server=createGuildServer(store,{clock:()=>now});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  vite=await createServer({server:{host:"127.0.0.1",port:0,open:false,proxy:{"/api":{target:"http://127.0.0.1:"+server.address().port,changeOrigin:true}}}});
  await vite.listen();url="http://127.0.0.1:"+vite.httpServer.address().port;
}
async function close() {if(vite){await vite.close();vite=null;}if(server){await new Promise(resolve=>server.close(resolve));server=null;}if(store){store.close();store=null;}}
async function request(route,body,token,status=200) {
  const r=await fetch(url+route,{method:body===undefined?"GET":"POST",headers:{Origin:"http://127.0.0.1:5173",...(body===undefined?{}:{"Content-Type":"application/json"}),...(token?{Authorization:"Bearer "+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data;
}
const hash=()=>createHash("sha256").update(JSON.stringify(store.worldSnapshot())).digest("hex");
try {
  await open();
  assert.match(await(await fetch(url)).text(),/<title>DELTA NOVA/);
  await request("/api/empire",undefined,undefined,401);
  let session=await request("/api/dev/session",{pilotId:"nova"}),snapshot=await request("/api/empire",undefined,session.token);
  async function send(action) {
    const command={commandId:randomUUID(),expectedEmpireRevision:snapshot.state.revision,action};
    snapshot=await request("/api/empire/commands",command,session.token);return command;
  }
  const planetId=snapshot.state.homePlanetId;
  await send({type:"upgrade-facility",planetId,facility:"alloyMine"});
  await send({type:"start-research",planetId,technology:"industry"});
  const original=await send({type:"build-ships",planetId,shipId:"striker",quantity:1});
  assert.deepEqual(snapshot.state.planets[0].resources,{alloy:0,crystal:20,fuel:50});
  assert.equal(snapshot.state.planets[0].ships.length,9);
  now=90000;const beforeRead=hash();snapshot=await request("/api/empire",undefined,session.token);
  assert.equal(hash(),beforeRead,"reads must remain projections");
  assert.equal(snapshot.state.planets[0].ships.length,10);assert.equal(snapshot.state.planets[0].facilities.alloyMine,2);assert.equal(snapshot.state.technologies.industry,1);
  const built=snapshot.state.planets[0].ships.find(sh=>sh.id.includes(original.commandId)).id;
  await send({type:"career-action",planetId,action:{type:"launch",missionId:"salvage",fleetIds:[built,"striker-01","guardian-01","salvage-01"],support:"jam",approach:"direct"}});
  assert.equal(snapshot.state.career.operation.phase,"checkpoint");
  assert.equal(snapshot.state.planets[0].ships.find(sh=>sh.id===built).status,"deployed");
  await send({type:"career-action",planetId,action:{type:"return"}});
  assert.equal(snapshot.state.career.operation.phase,"result");assert.ok(snapshot.state.career.operation.recovered>0);
  await send({type:"repair-fleet",planetId,fleetIds:snapshot.state.planets[0].ships.filter(sh=>sh.wear>0).map(sh=>sh.id)});
  await send({type:"career-action",planetId,action:{type:"dismiss"}});
  now=600000;await send({type:"collect-production",planetId});
  await send({type:"career-action",planetId,action:{type:"unlock-module",module:"cargo"}});
  assert.equal(snapshot.state.career.profile.active,"cargo");
  let shared=(await request("/api/guild")).state;
  for(const action of [{type:"claim",role:"recon"},{type:"contribute",role:"recon",planetId,fleetIds:[built,"scout-01","guardian-01","salvage-01"]}]) {
    shared=(await request("/api/guild/commands",{commandId:randomUUID(),expectedRevision:shared.revision,operationId:shared.operation.id,action},session.token)).state;
  }
  assert.equal(shared.operation.slots.recon.completed,true);
  assert.ok(shared.operation.slots.recon.report.fleet.some(sh=>sh.id===built));
  assert.equal(store.worldSnapshot().pilots[0].merit,10);
  const beforeReplay=hash();assert.equal((await request("/api/empire/commands",original,session.token)).duplicate,true);assert.equal(hash(),beforeReplay);
  await close();await open();
  await request("/api/empire",undefined,session.token,401);
  session=await request("/api/dev/session",{pilotId:"nova"});snapshot=await request("/api/empire",undefined,session.token);
  assert.equal(snapshot.state.planets[0].ships.length,10);assert.equal(snapshot.state.career.profile.active,"cargo");assert.equal(hash(),beforeReplay);
  assert.equal((await request("/api/empire/commands",original,session.token)).duplicate,true);assert.equal(hash(),beforeReplay);
  console.log("Empire HTTP/proxy smoke PASS: timed growth, industry research, constructed-ship personal sortie/return/repair and shared role, canonical v3 restart and duplicate receipt with unchanged world SHA. No browser or renderer opened.");
} finally {
  await close();const target=resolve(dir),root=resolve(tmpdir())+sep;
  if(!target.startsWith(root)||!target.slice(root.length).startsWith("delta-nova-empire-")) throw Error("Unsafe temporary directory");
  await rm(target,{recursive:true,force:true});
}
