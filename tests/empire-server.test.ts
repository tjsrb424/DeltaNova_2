import { it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GuildStore } from "../server/store.ts";
import { createGuildServer } from "../server/http.ts";
import { initialGuildState, applyGuildCommand } from "../src/guild/rules.ts";
const command=(revision=0)=>({commandId:"build-1",expectedEmpireRevision:revision,action:{type:"build-ships",planetId:"nova-prime",shipId:"striker",quantity:1}} as const);
it("refuses to initialize a missing world when personal receipts already exist",()=>{
  const dir=mkdtempSync(join(tmpdir(),"nova-empire-orphan-")),path=join(dir,"world.sqlite"),db=new DatabaseSync(path);
  db.exec("CREATE TABLE empire_receipts(pilot_id TEXT,command_id TEXT,request TEXT,response TEXT,PRIMARY KEY(pilot_id,command_id));");
  db.prepare("INSERT INTO empire_receipts VALUES(?,?,?,?)").run("nova","old","{}","{}");db.close();
  let unexpected:GuildStore|undefined;
  try {expect(()=>{unexpected=new GuildStore(path,{now:0});}).toThrow();}
  finally {unexpected?.close();rmSync(dir,{recursive:true,force:true});}
});
it("rolls back world spending when writing the personal receipt fails",()=>{
  const dir=mkdtempSync(join(tmpdir(),"nova-empire-atomic-")),path=join(dir,"world.sqlite");
  let store=new GuildStore(path,{now:0});ready(store);store.close();
  const db=new DatabaseSync(path);db.exec("CREATE TRIGGER block_empire_receipt BEFORE INSERT ON empire_receipts BEGIN SELECT RAISE(ABORT,'blocked'); END;");db.close();
  store=new GuildStore(path,{now:0});
  try {const before=store.worldSnapshot();expect(()=>store.executeEmpire("nova",command(),0)).toThrow();expect(store.worldSnapshot()).toEqual(before);}
  finally {store.close();rmSync(dir,{recursive:true,force:true});}
});
function ready(store:GuildStore) {expect(typeof store.executeEmpire).toBe("function");expect(typeof store.empireSnapshot).toBe("function");}
it("keeps an uncertain command unresolved when its stored receipt cannot be validated",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"nova-empire-bad-receipt-")),path=join(dir,"world.sqlite"),store=new GuildStore(path,{now:0});
  store.executeEmpire("nova",command(),0);
  const db=new DatabaseSync(path),receipt=JSON.parse(String(db.prepare("SELECT response FROM empire_receipts").get()!.response));
  receipt.state.planets[0].resources.alloy=-1;db.prepare("UPDATE empire_receipts SET response=?").run(JSON.stringify(receipt));db.close();
  const server=createGuildServer(store,{clock:()=>0});await new Promise<void>(r=>server.listen(0,"127.0.0.1",r));
  const url="http://127.0.0.1:"+(server.address() as {port:number}).port;
  try {
    const session=await(await fetch(url+"/api/dev/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pilotId:"nova"})})).json();
    const response=await fetch(url+"/api/empire/commands",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.token},body:JSON.stringify(command())});
    expect(response.status).toBe(503);expect(store.worldSnapshot().pilots[0].empire.planets[0].resources.alloy).toBe(80);
  } finally {await new Promise<void>(r=>server.close(()=>r()));store.close();rmSync(dir,{recursive:true,force:true});}
});
it("persists canonical v3 assets, replays receipts and retains completed construction after restart",()=>{
  const dir=mkdtempSync(join(tmpdir(),"nova-empire-")),path=join(dir,"world.sqlite");let store=new GuildStore(path,{now:0});
  try {
    ready(store);expect(store.worldSnapshot().schemaVersion).toBe(3);
    expect("base" in store.worldSnapshot().pilots[0]).toBe(false);
    store.executeEmpire("nova",command(),0);const before=store.worldSnapshot();
    expect(store.executeEmpire("nova",command(),40000).duplicate).toBe(true);expect(store.worldSnapshot()).toEqual(before);
    expect(store.empireSnapshot("nova",40000).state.planets[0].ships).toHaveLength(10);
    store.close();store=new GuildStore(path,{now:40000});
    expect(store.empireSnapshot("nova",40000).state.planets[0].ships).toHaveLength(10);
    expect(store.executeEmpire("nova",command(),40000).duplicate).toBe(true);
    expect(()=>store.executeEmpire("nova",{...command(),action:{...command().action,quantity:2}},40000)).toThrow(/같은 명령/);
    expect(()=>store.empireSnapshot("foreign",40000)).toThrow();
  } finally {store.close();rmSync(dir,{recursive:true,force:true});}
});
it("personal commands ignore unrelated guild revisions but reject stale personal spending",()=>{
  const store=new GuildStore(":memory:",{now:0});
  try {
    ready(store);const old=store.snapshot(),other=old.pilots[1].id;
    store.execute(other,{commandId:"role",expectedRevision:old.revision,operationId:old.operation.id,action:{type:"claim",role:"jam"}},0);
    expect(store.executeEmpire("nova",command(),0).state.revision).toBe(1);
    expect(()=>store.executeEmpire("nova",{...command(),commandId:"second"},0)).toThrow(/바뀌었/);
    expect(store.empireSnapshot("nova",0).state.planets[0].resources.alloy).toBe(80);
  } finally {store.close();}
});
it("authenticates empire HTTP reads and atomically accepts only one simultaneous build",async()=>{
  const store=new GuildStore(":memory:",{now:0}),server=createGuildServer(store,{clock:()=>0});
  await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
  const url="http://127.0.0.1:"+(server.address() as {port:number}).port;
  try {
    expect((await fetch(url+"/api/empire")).status).toBe(401);
    const session=await(await fetch(url+"/api/dev/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pilotId:"nova"})})).json();
    const headers={"Content-Type":"application/json",Authorization:"Bearer "+session.token};
    const read=await fetch(url+"/api/empire",{headers});expect(read.status).toBe(200);expect((await read.json()).state.homePlanetId).toBe("nova-prime");
    const requests=await Promise.all(["first","second"].map(commandId=>fetch(url+"/api/empire/commands",{method:"POST",headers,body:JSON.stringify({...command(),commandId})})));
    expect(requests.map(r=>r.status).sort()).toEqual([200,409]);
    const invalid=await fetch(url+"/api/empire/commands",{method:"POST",headers,body:JSON.stringify({...command(1),commandId:"injected",pilotId:"rhea"})});
    expect(invalid.status).toBe(400);
  } finally {await new Promise<void>(resolve=>server.close(()=>resolve()));store.close();}
});
function canonical(v:unknown):string {return Array.isArray(v)?"["+v.map(canonical).join(",")+"]":v&&typeof v==="object"?"{"+Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+":"+canonical(v)).join(",")+"}":JSON.stringify(v);}
it.each(["trigger","corrupt"])("receipt failure rolls back every migrated row: %s",(kind)=>{
  const dir=mkdtempSync(join(tmpdir(),"nova-empire-migrate-")),path=join(dir,"world.sqlite"),old=initialGuildState(0);
  const request={commandId:"legacy",expectedRevision:0,operationId:1,action:{type:"claim",role:"recon"}} as const;
  const state=applyGuildCommand(old,"nova",request,0),db=new DatabaseSync(path);
  db.exec("CREATE TABLE world(id INTEGER PRIMARY KEY,snapshot TEXT);CREATE TABLE receipts(pilot_id TEXT,command_id TEXT,request TEXT,response TEXT,PRIMARY KEY(pilot_id,command_id));");
  const raw=JSON.stringify(state),response=JSON.stringify({state:kind==="corrupt"?{...state,rulesVersion:"broken"}:state,receipt:{pilotId:"nova",commandId:"legacy",revision:1},duplicate:false});
  db.prepare("INSERT INTO world VALUES(1,?)").run(raw);db.prepare("INSERT INTO receipts VALUES(?,?,?,?)").run("nova","legacy",canonical(request),response);
  if(kind==="trigger") db.exec("CREATE TRIGGER block_receipt BEFORE UPDATE ON receipts BEGIN SELECT RAISE(ABORT,'blocked'); END;");
  db.close();
  try {
    let unexpected:GuildStore|undefined;
    try {expect(()=>{unexpected=new GuildStore(path,{now:1000});}).toThrow();}
    finally {unexpected?.close();}
    const check=new DatabaseSync(path);
    try {expect(check.prepare("SELECT snapshot FROM world").get()!.snapshot).toBe(raw);expect(check.prepare("SELECT response FROM receipts").get()!.response).toBe(response);}
    finally {check.close();}
  } finally {rmSync(dir,{recursive:true,force:true});}
});
