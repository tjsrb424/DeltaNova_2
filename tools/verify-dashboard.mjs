import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { createServer } from "vite";
import { GuildStore } from "../server/store.ts";
import { createGuildServer } from "../server/http.ts";

const candidates = [process.env.DELTA_NOVA_BROWSER, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter(Boolean);
let executable;
for (const candidate of candidates) { try { await access(candidate); executable = candidate; break; } catch {} }
if (!executable) throw Error("A local Chromium browser is required. Set DELTA_NOVA_BROWSER to its executable; only headless mode is used.");
const temporary = await mkdtemp(join(tmpdir(), "delta-nova-dashboard-"));
const output = resolve(process.env.DELTA_NOVA_QA_OUTPUT || "docs/qa/2026-10-14-planet-management");
let store, server, vite, browser, socket, now = 0;
const pending = new Map(), errors = [], origins = [];
let nextId = 0, sessionId;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function call(method, params = {}, session = sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(() => { pending.delete(id); reject(Error("CDP timeout: " + method)); }, 15000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params, ...(session ? { sessionId: session } : {}) }));
  });
}
async function evaluate(expression) {
  const r = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw Error(r.exceptionDetails.text + ": " + r.exceptionDetails.exception?.description);
  return r.result.value;
}
async function until(expression) {
  const started = Date.now();
  while (Date.now() - started < 15000) { if (await evaluate(expression)) return; await pause(100); }
  throw Error("Dashboard wait timed out: " + expression);
}
async function click(label) {
  const expression = "(() => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === " + JSON.stringify(label) + "); if (!button) throw Error('Missing button'); button.scrollIntoView({block:'nearest',inline:'nearest'});const r=button.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}; })()";
  const point=await evaluate(expression);
  await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
}
async function viewport(width, height) {
  await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  await pause(150);
}
async function capture(name) {
  await evaluate("document.fonts.ready.then(() => true)");
  await evaluate("Promise.all(document.getAnimations().filter(a=>a.playState==='running'&&a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))).then(()=>true)");
  const r = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(join(output, name + ".png"), Buffer.from(r.data, "base64"));
}
async function layout(name) {
  const value = await evaluate("({width:innerWidth, documentWidth:document.documentElement.scrollWidth, mainWidth:document.querySelector('main').getBoundingClientRect().width, overviewWidth:document.querySelector('.overview-board')?.getBoundingClientRect().width, reportsColumn:document.querySelector('.recent-reports') ? getComputedStyle(document.querySelector('.recent-reports')).gridColumn : null})");
  if (value.documentWidth > value.width) {
    value.overflow = await evaluate("[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,cls:e.className,left:e.getBoundingClientRect().left,width:e.getBoundingClientRect().width,min:getComputedStyle(e).minWidth,columns:getComputedStyle(e).gridTemplateColumns})).filter(e=>e.width>innerWidth).slice(0,12)");
    await capture(name + "-overflow");
  }
  assert.ok(value.documentWidth <= value.width, name + " horizontal overflow: " + JSON.stringify(value));
  return { name, ...value };
}
async function actionAccess(name) {
  const value = await evaluate(`(() => {
    const button = document.querySelector('.empire-action .empire-primary'), rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return {label:button.textContent.trim(), x:rect.x, y:rect.y, width:rect.width, height:rect.height, viewport:innerHeight,
      visible:rect.top >= 0 && rect.bottom <= innerHeight, unobstructed:!!hit && button.contains(hit)};
  })()`);
  await capture(name);
  assert.ok(value.visible && value.unobstructed && value.height >= 44, name + " action inaccessible: " + JSON.stringify(value));
  return { name, ...value };
}
async function pointerClick(selector) {
  const point = await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)});if(!e) throw Error('Missing click target');e.scrollIntoView({block:'nearest',inline:'nearest'});const r=e.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);if(!hit||!e.contains(hit)) throw Error('Click target is obstructed: '+${JSON.stringify(selector)});return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await call("Input.dispatchMouseEvent", {type:"mousePressed",button:"left",clickCount:1,...point});
  await call("Input.dispatchMouseEvent", {type:"mouseReleased",button:"left",clickCount:1,...point});
}
async function effectAccess(name) {
  const rows=await evaluate("document.querySelectorAll('[aria-label=\"증설 완료 효과\"] tbody tr').length");
  const checks=[];
  for(let index=0;index<rows;index++) {
    const value=await evaluate(`(() => {const row=document.querySelectorAll('[aria-label="증설 완료 효과"] tbody tr')[${index}];row.scrollIntoView({block:'start'});const r=row.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),pane=document.querySelector('.management-content'),footer=document.querySelector('.action-commit');return {text:row.textContent,readable:!!hit&&row.contains(hit),hit:hit?.className,rowTop:r.top,paneHeight:pane.getBoundingClientRect().height,container:getComputedStyle(pane).containerType,footer:getComputedStyle(footer).position};})()`);
    if(!value.readable) await capture(name+"-hidden-effect");
    assert.ok(value.readable,name+" hidden effect: "+JSON.stringify(value));checks.push(value);
  }
  return {name,rows:checks};
}
async function auditPage(name) {
  const value=await evaluate(`(() => {
    const pane=document.querySelector('.management-content'),heading=pane.querySelector('h2'),button=pane.querySelector('.empire-action .empire-primary');
    const bounds=pane.getBoundingClientRect(),h=heading?.getBoundingClientRect(),b=button?.getBoundingClientRect();
    const hud=[...document.querySelectorAll('.hud-resource,.hud-power,.hud-space')].map(cell=>{
      const r=cell.getBoundingClientRect(),text=cell.querySelector('strong').getBoundingClientRect();
      return {name:cell.textContent.trim(),fits:text.right<=r.right+1,textRight:text.right,cellRight:r.right};
    });
    const glyph=document.querySelector('.inventory-ship .ship-glyph'),shipText=glyph?.nextElementSibling;
    const actionHeading=document.querySelector('.empire-action h2')?.getBoundingClientRect();
    const controls=[...document.querySelectorAll('.action-inspector select,.action-inspector input')].map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {label:e.getAttribute('aria-label'),readable:!!hit&&e.contains(hit)};});
    return {scroll:pane.scrollTop,heading:heading?.textContent,headingVisible:!!h&&h.top>=bounds.top-1&&h.bottom<=bounds.bottom,
      button:button?.textContent.trim(),actionVisible:!b||(b.top>=bounds.top&&b.bottom<=bounds.bottom),actionHeadingVisible:!actionHeading||(actionHeading.top>=bounds.top&&actionHeading.bottom<=bounds.bottom),
      shipGap:glyph&&shipText?shipText.getBoundingClientRect().left-glyph.getBoundingClientRect().right:null,controls,hud};
  })()`);
  await capture(name);return {name,...value};
}
async function visualAudit() {
  const checks=[];
  for(const [width,height] of [[1672,941],[1100,650],[900,650],[390,844]]) {
    await viewport(width,height);
    for(const label of ['대시보드','건설','함대','연구','개인 작전','보고서']) {
      await click(label);await pause(100);
      checks.push(await auditPage('audit-'+label+'-'+width));
      if(label==='함대'||label==='연구') {
        await click(label==='함대'?'함선 건조 상세':'기술 연구 상세');await pause(100);
        checks.push(await auditPage('audit-action-'+label+'-'+width));
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
        await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
        assert.ok(await evaluate("document.querySelector('.action-inspector').contains(document.activeElement)"),'Shortcut keyboard focus escaped the selected action');
      }
      await evaluate("document.querySelector('.management-content').scrollTop=10000");
    }
    await click('대시보드');await pause(100);
    checks.push(await auditPage('audit-return-'+width));
    await click('연구 상세');await pause(100);
    checks.push(await auditPage('audit-action-overview-research-'+width));
    await click('연구');await pause(100);
    await pointerClick('.technology-branch button:last-child');await pause(100);
    checks.push(await auditPage('audit-action-map-research-'+width));
    await click('연구');await pause(100);
    await pointerClick('.growth-goal .empire-secondary');await pause(100);
    assert.equal(await evaluate("document.querySelector('[aria-label=\"건조 함선\"]').value"),'carrier');
    checks.push(await auditPage('audit-action-map-carrier-'+width));
    await click('연구');await pause(100);
    if(await evaluate("document.querySelector('.queue-toggle').getAttribute('aria-expanded')==='false'")) await click('대기열 펼치기');
    await pointerClick('.job-inspect[aria-label="정보 기술 Lv.1 상세"]');await pause(100);
    assert.equal(await evaluate("document.querySelector('[aria-label=\"연구 기술\"]').value"),'intelligence');
    assert.ok(await evaluate("document.activeElement===document.querySelector('.action-inspector')"),'Queue inspection did not focus the current research detail');
    checks.push(await auditPage('audit-action-queue-research-'+width));
  }
  await writeFile(join(output,'visual-audit.json'),JSON.stringify(checks,null,2)+'\n');
  console.log('Visual audit measurements: '+JSON.stringify(checks.map(c=>({name:c.name,scroll:c.scroll,headingVisible:c.headingVisible,actionVisible:c.actionVisible,hudFits:c.hud.every(h=>h.fits)}))));
  if(process.env.DELTA_NOVA_UIUX_ASSERT === '1') {
    assert.ok(checks.every(c=>c.hud.every(h=>h.fits)),'HUD values escape their assigned columns');
    assert.ok(checks.filter(c=>c.name.includes('audit-action-')).every(c=>c.actionVisible&&c.actionHeadingVisible),'Action shortcut hides its context or commit button');
    assert.ok(checks.filter(c=>c.name.includes('audit-action-')).every(c=>c.controls.every(e=>e.readable)),'Commit footer covers the selected action controls');
    assert.ok(checks.filter(c=>c.shipGap!==null).every(c=>c.shipGap<=24),'Fleet glyphs and labels are too far apart');
  }
  const compact=[];
  for(const [width,height] of [[390,650],[1100,600],[900,760],[1100,650]]) {
    await viewport(width,height);
    for(const [settings,queue] of [[false,false],[true,false],[false,true],[true,true]]) {
      await click('함대');
      if(await evaluate("!document.querySelector('.guild-connection').hidden")!==settings) await click('참가자 설정');
      if(await evaluate("document.querySelector('.queue-toggle').getAttribute('aria-expanded')==='true'")!==queue) await click(queue?'대기열 펼치기':'대기열 접기');
      await click('함선 건조 상세');
      const controls=[];
      for(const label of ['건조 함선','건조 수량']) {
        const control=await evaluate(`(() => {const e=document.querySelector('[aria-label="${label}"]');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {label:'${label}',readable:!!hit&&e.contains(hit)};})()`);
        assert.ok(control.readable,'Compact form obstructed: '+JSON.stringify({width,height,settings,queue,control}));controls.push(control);
      }
      const name='audit-compact-fleet-'+width+'x'+height+'-settings-'+settings+'-queue-'+queue;
      await evaluate("document.querySelector('.empire-action .empire-primary').scrollIntoView({block:'nearest'})");
      compact.push({width,height,settings,queue,controls,action:await actionAccess(name)});
    }
  }
  await writeFile(join(output,'compact-access.json'),JSON.stringify(compact,null,2)+'\n');
  if(await evaluate("!document.querySelector('.guild-connection').hidden")) await click('참가자 설정');
  await viewport(1672,941);await click('대시보드');
  await click('개인 작전');await click('추천 편성 적용');
  assert.ok(await evaluate("document.querySelectorAll('.career-fleet-picker input:checked').length>0"),'Recommended fleet is empty');
  await pointerClick('.empire-career .empire-primary');
  await until("!!document.querySelector('.empire-career-results .decision-panel')");
  assert.ok(await evaluate("document.activeElement===document.querySelector('.empire-career-results')"),'New battle did not receive focus');
  assert.ok(await evaluate("document.querySelector('.battle-panel h2').getBoundingClientRect().top>=document.querySelector('.management-content').getBoundingClientRect().top"),'New battle title stayed above the scrolled viewport');
  await capture('audit-career-battle');
  const operation=store.empireSnapshot('nova',now).state.career.operation;
  assert.ok(operation,'Personal sortie did not reach the real server');
  if(operation.phase==='checkpoint') {await pointerClick('.decision-panel .primary-button');await until("!!document.querySelector('.result-details')");assert.ok(await evaluate("document.activeElement===document.querySelector('.decision-panel')"),'Return did not focus the new report');}
  await capture('audit-career-return');
  await click('기지 연구로 이동');await until("!!document.querySelector('[aria-label=\"연구 기술\"]')");
  assert.equal(await evaluate("document.querySelector('.planet-navigation button[aria-current=\"page\"]').textContent.trim()"),'연구');
  await click('개인 작전');await until("!!document.querySelector('.empire-career')");
  assert.equal(store.empireSnapshot('nova',now).state.career.operation,null);
  await click('함대');
  const repairNeeded=store.empireSnapshot('nova',now).state.planets[0].ships.some(s=>s.wear>0);
  let repairExecuted=false;
  if(await evaluate("!document.querySelector('.empire-fleet .empire-primary').disabled")) {
    await pointerClick('.empire-fleet .empire-primary');
    await until("document.querySelector('.empire-fleet .empire-primary').disabled");
    assert.ok(store.empireSnapshot('nova',now).state.planets[0].ships.every(s=>s.wear===0),'Repair did not restore returned ships');
    repairExecuted=true;
  }
  assert.ok(!repairNeeded||repairExecuted,'Returned ships require repair but the repair action was unavailable');
  await click('대시보드');await click('동맹');await until("!!document.querySelector('.guild-screen')");
  await capture('audit-guild-desktop');await viewport(390,844);await capture('audit-guild-mobile');
  await pointerClick('.nav-items button[aria-label="행성"]');await until("!!document.querySelector('.overview-board')");
  await viewport(1672,941);await click('편성 연습');await until("!!document.querySelector('.app-shell')");
  await capture('audit-practice-desktop');await viewport(390,844);await capture('audit-practice-mobile');
  await pointerClick('.nav-items button[aria-label="행성"]');await until("!!document.querySelector('.overview-board')");await viewport(1672,941);
  await writeFile(join(output,'journey.json'),JSON.stringify({headless:true,personalSortie:true,return:true,researchReportLink:true,repairNeeded,repairExecuted,guildAndPracticeNavigation:true},null,2)+'\n');
}
try {
  await mkdir(output, { recursive: true });
  store = new GuildStore(join(temporary, "world.sqlite"), { now });
  const seed = action => store.executeEmpire("nova", { commandId: randomUUID(), expectedEmpireRevision: store.empireSnapshot("nova", now).state.revision, action: { ...action, planetId: "nova-prime" } }, now);
  seed({ type: "upgrade-facility", facility: "alloyMine" });
  seed({ type: "start-research", technology: "industry" });
  seed({ type: "build-ships", shipId: "striker", quantity: 1 });
  now = 90000; seed({ type: "collect-production" });
  now = 3600000; seed({ type: "collect-production" });
  seed({ type: "upgrade-facility", facility: "fuelRefinery" });
  seed({ type: "start-research", technology: "intelligence" });
  seed({ type: "build-ships", shipId: "striker", quantity: 1 });
  now += 18000;
  server = createGuildServer(store, { allowedOrigins: origins, clock: () => now });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  vite = await createServer({ server: { host: "127.0.0.1", port: 0, open: false, proxy: { "/api": { target: "http://127.0.0.1:" + server.address().port, changeOrigin: true } } } });
  await vite.listen();
  const url = "http://127.0.0.1:" + vite.httpServer.address().port; origins.push(url);
  browser = spawn(executable, ["--headless=new", "--disable-gpu", "--disable-background-networking", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", "--user-data-dir=" + join(temporary, "browser"), "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  const endpoint = await new Promise((resolve, reject) => {
    let stderr = "";
    const timeout = setTimeout(() => reject(Error("Headless browser startup timeout")), 15000);
    browser.once("error", reject);
    browser.stderr.on("data", chunk => { stderr += chunk; const match = stderr.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:[^\s]+)/); if (match) { clearTimeout(timeout); resolve(match[1]); } });
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data), request = pending.get(message.id);
    if (request) { clearTimeout(request.timeout); pending.delete(message.id); message.error ? request.reject(Error(message.error.message)) : request.resolve(message.result); }
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  });
  socket.addEventListener("close", () => { for (const request of pending.values()) { clearTimeout(request.timeout); request.reject(Error("Headless browser closed")); } pending.clear(); });
  const target = await call("Target.createTarget", { url: "about:blank" }, null);
  sessionId = (await call("Target.attachToTarget", { targetId: target.targetId, flatten: true }, null)).sessionId;
  await call("Page.enable"); await call("Runtime.enable");
  await viewport(1672, 941); await call("Page.navigate", { url });
  await until("!!document.querySelector('.guild-connection')");
  await click("참가자로 연결");
  await until("!!document.querySelector('[aria-label=\"전체 현황\"]')");
  if(process.env.DELTA_NOVA_UIUX_AUDIT === '1') await visualAudit();
  await evaluate("(() => { const image = new Image(); image.src='/art/planet-facilities-v1.png'; return image.decode().then(() => true); })()");
  await viewport(1100, 650); await click("건설");
  await until("!!document.querySelector('.facility-catalog')");
  const accessChecks = [await actionAccess("construction-compact")];
  const effectChecks=[await effectAccess("construction-compact")];
  for (const [width,height] of [[1280,720],[900,650],[720,650],[720,550],[390,844],[390,650]]) {
    await viewport(width,height);
    await pointerClick('.facility-catalog button:last-child');
    await until("document.querySelector('.empire-action h2').textContent.includes('연구소')");
    if(height < 600) await evaluate("document.querySelector('.empire-action .empire-primary').scrollIntoView({block:'nearest'})");
    accessChecks.push(await actionAccess("construction-" + width + "x" + height));
  }
  for (const [width,height] of [[1100,650],[390,650]]) {
    await viewport(width,height);
    await click("대기열 펼치기");
    await evaluate("document.querySelector('.empire-action .empire-primary').scrollIntoView({block:'nearest'})");
    accessChecks.push(await actionAccess("construction-queue-" + width));
    await click("참가자 설정");
    effectChecks.push(await effectAccess("construction-settings-and-queue-"+width));
    await evaluate("document.querySelector('.empire-action .empire-primary').scrollIntoView({block:'nearest'})");
    accessChecks.push(await actionAccess("construction-settings-and-queue-" + width));
    await click("대기열 접기");
    await evaluate("document.querySelector('.empire-action .empire-primary').scrollIntoView({block:'nearest'})");
    accessChecks.push(await actionAccess("construction-settings-" + width));
    await click("참가자 설정");
  }
  for (const width of [720,390]) {
    await viewport(width,540);
    assert.ok(await evaluate("document.querySelector('.planet-nav').getBoundingClientRect().height < 100"), "Short mobile navigation occupies the viewport");
    await evaluate("document.querySelector('.empire-action .empire-primary').scrollIntoView({block:'nearest'})");
    accessChecks.push(await actionAccess("construction-short-" + width));
  }
  await click("대시보드"); await viewport(1672, 941);
  const checks = [await layout("overview-desktop")]; await capture("overview-desktop");
  await viewport(900, 900); checks.push(await layout("overview-tablet")); await capture("overview-tablet");
  await viewport(390, 844); checks.push(await layout("overview-mobile")); await capture("overview-mobile");
  await viewport(1672, 941); await click("연구");
  await until("!!document.querySelector('[aria-label=\"발전지도\"]')");
  checks.push(await layout("growth-desktop")); await capture("growth-desktop");
  await viewport(390, 844); checks.push(await layout("growth-mobile")); await capture("growth-mobile");
  await viewport(1672, 941); await click("건설");
  await until("!!document.querySelector('.facility-catalog')");
  checks.push(await layout("construction-desktop")); await capture("construction-desktop");
  await pointerClick('.empire-job button[aria-label="연료 합성소 Lv.2 취소"]');
  await pointerClick('.job-refund .empire-secondary');
  await until("!document.querySelector('[role=\"progressbar\"][aria-label=\"연료 합성소 Lv.2\"]')");
  await viewport(390,650); await pointerClick('.facility-catalog button:nth-child(2)');
  await until("document.querySelector('.empire-action h2').textContent.includes('결정 채굴소')");
  accessChecks.push(await actionAccess("construction-ready-mobile"));
  const beforeBuild = structuredClone(store.empireSnapshot("nova",now).state.planets[0].resources);
  await pointerClick('.empire-action .empire-primary');
  await until("document.querySelector('.empire-jobs h2').textContent.includes('3건')");
  const built = store.empireSnapshot("nova",now).state.planets[0];
  assert.equal(built.constructionJob?.target,"crystalMine");
  assert.deepEqual(built.resources,{alloy:beforeBuild.alloy-40,crystal:beforeBuild.crystal-10,fuel:beforeBuild.fuel-10});
  assert.equal(await evaluate("document.querySelector('.empire-action select').value"),"crystalMine");
  await click("대기열 펼치기");
  await pointerClick('.job-inspect[aria-label="결정 채굴소 Lv.2 상세"]');
  await until("document.querySelector('.queue-toggle').getAttribute('aria-expanded') === 'false'");
  await viewport(1672,941);
  await click("함대"); await until("!!document.querySelector('.empire-fleet')");
  await click("개인 작전"); await until("!!document.querySelector('.empire-career')");
  await click("보고서"); await until("!!document.querySelector('.empire-report-list')");
  await click("대시보드"); await until("!!document.querySelector('[aria-label=\"전체 현황\"]')");
  assert.equal(errors.length, 0, errors.join("\n"));
  await writeFile(join(output, "checks.json"), JSON.stringify({ headless: true, isolatedDatabase: true, checks, actionAccess:accessChecks, effectAccess:effectChecks, realBuild:{facility:built.constructionJob.target,before:beforeBuild,after:built.resources}, runtimeErrors: errors }, null, 2) + "\n");
  console.log("Dashboard headless PASS: " + accessChecks.length + " action access checks, effect-row hit tests, real pointer build/cancel and resource deductions, all category transitions, isolated API, atlas decode. Captures: " + output);
} finally {
  if (socket?.readyState === WebSocket.OPEN) { try { await call("Browser.close", {}, null); } catch {} socket.close(); }
  if (browser && browser.exitCode === null) { await Promise.race([new Promise(resolve => browser.once("exit", resolve)), pause(3000)]); if (browser.exitCode === null) browser.kill(); }
  if (vite) await vite.close();
  if (server) await new Promise(resolve => server.close(resolve));
  if (store) store.close();
  const target = resolve(temporary), root = resolve(tmpdir()) + sep;
  if (!target.startsWith(root) || !target.slice(root.length).startsWith("delta-nova-dashboard-")) throw Error("Unsafe temporary directory");
  await rm(target, { recursive: true, force: true, maxRetries: 20, retryDelay: 150 });
}
