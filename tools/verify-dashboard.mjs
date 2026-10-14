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
const output = resolve(process.env.DELTA_NOVA_QA_OUTPUT || "docs/qa/2026-10-14-dashboard");
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
  const expression = "(() => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === " + JSON.stringify(label) + "); if (!button) throw Error('Missing button'); button.click(); return true; })()";
  await evaluate(expression);
}
async function viewport(width, height) {
  await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  await pause(150);
}
async function capture(name) {
  await evaluate("document.fonts.ready.then(() => true)");
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
  await evaluate("(() => { const image = new Image(); image.src='/art/planet-facilities-v1.png'; return image.decode().then(() => true); })()");
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
  await click("함대"); await until("!!document.querySelector('.empire-fleet')");
  await click("개인 작전"); await until("!!document.querySelector('.empire-career')");
  await click("보고서"); await until("!!document.querySelector('.empire-report-list')");
  await click("대시보드"); await until("!!document.querySelector('[aria-label=\"전체 현황\"]')");
  assert.equal(errors.length, 0, errors.join("\n"));
  await writeFile(join(output, "checks.json"), JSON.stringify({ headless: true, isolatedDatabase: true, checks, runtimeErrors: errors }, null, 2) + "\n");
  console.log("Dashboard headless HTTP/UI/layout PASS: desktop1672, tablet900, mobile390, all category transitions, real isolated API and PNG atlas decode. Captures: " + output);
} finally {
  if (socket?.readyState === WebSocket.OPEN) { try { await call("Browser.close", {}, null); } catch {} socket.close(); }
  if (browser && browser.exitCode === null) { await Promise.race([new Promise(resolve => browser.once("exit", resolve)), pause(3000)]); if (browser.exitCode === null) browser.kill(); }
  if (vite) await vite.close();
  if (server) await new Promise(resolve => server.close(resolve));
  if (store) store.close();
  const target = resolve(temporary), root = resolve(tmpdir()) + sep;
  if (!target.startsWith(root) || !target.slice(root.length).startsWith("delta-nova-dashboard-")) throw Error("Unsafe temporary directory");
  await rm(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
