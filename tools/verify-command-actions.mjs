// Headless action priority and stable command display review.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,sep,extname} from 'node:path';
import {homedir} from 'node:os';
import {enlargeText,auditNavigationText} from './uiux-a11y.mjs';
const require=createRequire(import.meta.url),pw=require(process.env.DELTA_NOVA_PLAYWRIGHT||join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=resolve(process.env.DELTA_NOVA_DEMO_ROOT||'public'),out=resolve(process.env.DELTA_NOVA_ACTION_REVIEW_OUT||'.delta-nova/command-actions-review');
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert(p.startsWith(root+sep));res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[extname(p)]||'application/octet-stream');res.end(await readFile(p));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await pw.chromium.launch({headless:true,executablePath:process.env.DELTA_NOVA_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await c.newPage();
const report={date:new Date().toISOString(),root,browser:browser.version(),checks:[],positions:[],errors:[],requests:[],files:[]};
for(const file of ['index.html','main.js','strategy.js','strategy.css','workspace.js','workspace.css','route-preview.js'])report.files.push({file,sha256:createHash('sha256').update(await readFile(join(root,'uiux-demo',file))).digest('hex')});
p.on('pageerror',e=>report.errors.push(String(e)));c.on('request',r=>{if(r.method()!=='GET'||/\/api\//.test(r.url()))report.requests.push(r.url());});
let serial=0;
const go=async view=>{await p.goto('http://127.0.0.1:'+server.address().port+'/uiux-demo/index.html?actions='+ ++serial+'#view='+view+(view==='command'?'&target=tarsis&intent=attack&context=solo&step=fleet':''));await p.locator(view==='home'?'#planet-name':'#workspace-title').waitFor();};
const check=async(name,fn)=>{try{await fn();report.checks.push({name,passed:true});console.log('PASS '+name);}catch(e){report.checks.push({name,passed:false,error:String(e)});console.log('FAIL '+name+' '+String(e));await p.screenshot({path:join(out,'failure-'+report.checks.length+'.png')});}};
try{
 await check('direct command discovers its visible hangar before module initialization without loading it on construction',async()=>{
  await go('command');const data=await p.evaluate(()=>{const r=performance.getEntriesByType('resource'),hero=r.find(r=>r.name.endsWith('orbital-hangar-v1.webp')),entry=r.find(r=>r.name.endsWith('/main.js'));return {hint:!!document.querySelector('link[rel=preload][href$="orbital-hangar-v1.webp"]'),heroStart:hero?.startTime,moduleEnd:entry?.responseEnd,requests:r.filter(r=>r.name.endsWith('orbital-hangar-v1.webp')).length};});
  assert(data.hint&&data.heroStart<data.moduleEnd,JSON.stringify(data));assert.equal(data.requests,1);report.heroDiscovery=data;
  await go('construction');assert.equal(await p.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.endsWith('orbital-hangar-v1.webp')).length),0);
 });
 await check('construction command precedes artwork, explanation and full costs and fits above mobile navigation',async()=>{
  for(const [width,height] of [[1440,900],[390,844],[320,568]]){
   await p.setViewportSize({width,height});await go('construction');
   const detail=p.locator('#workspace-facility-detail'),button=detail.locator('button:disabled');
   assert(await button.evaluate(el=>[...el.closest('.ws-facility-detail').querySelectorAll('.dn-facility-display,.ws-muted,.ws-effect,.ws-cost-table,.ws-prerequisite')].every(other=>el.compareDocumentPosition(other)&Node.DOCUMENT_POSITION_FOLLOWING)));
   const r=await button.boundingBox(),limit=width<=768?(await p.locator('.sidebar').boundingBox()).y:height;
   report.positions.push({view:'construction',width,height,button:r,limit});assert(r.y>=0&&r.y+r.height<=limit-(width<=768?12:0),JSON.stringify({width,r,limit}));
   assert.equal(await detail.locator('.ws-cost-table tbody tr').count(),3);
   await p.screenshot({path:join(out,'construction-'+width+'.png')});
   if(width<=768)await p.locator('#workspace-facility-select').selectOption('laboratory');else await p.locator('[data-workspace-facility=laboratory]').click();
   assert.match(await detail.locator('.ws-queue').innerText(),/건설 대기열.*연료 합성소/s);
  }
 });
 await check('research and fleet preparation lead with one clear main action before explanatory copy',async()=>{
  for(const view of ['research','fleet'])for(const width of [1440,390,320]){
   await p.setViewportSize({width,height:width===320?568:900});await go(view);
   const action=p.locator('.dn-art-lead>.ws-button');
   assert.equal(await action.count(),1);
   assert(await action.evaluate(el=>!!(el.compareDocumentPosition(el.parentElement.querySelector('p'))&Node.DOCUMENT_POSITION_FOLLOWING)));
   const r=await action.boundingBox();assert(r.y+r.height<=(await p.locator('.sidebar').boundingBox()).y||width>768);
   assert(await action.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===el||el.contains(hit);}));
   await p.screenshot({path:join(out,view+'-'+width+'.png')});
  }
 });
 await check('home decision action precedes its extended explanation and progress',async()=>{
  await p.setViewportSize({width:1440,height:900});await go('home');
  assert(await p.locator('#context .button').evaluate(el=>el.compareDocumentPosition(el.parentElement.querySelector('p'))&Node.DOCUMENT_POSITION_FOLLOWING));
  await p.screenshot({path:join(out,'home-action-1440.png')});
 });
 await check('quantity changes preserve display nodes, focus, exact values, errors and the top review control',async()=>{
  await p.setViewportSize({width:390,height:844});await go('command');
  await p.locator('#strategy-count-striker').fill('1');
  await p.evaluate(()=>{window.__retained={title:document.getElementById('strategy-estimate-title'),picked:document.querySelector('.sc-picked-ship'),metric:document.querySelector('#strategy-metrics dd'),input:document.getElementById('strategy-count-striker')};});
  await p.locator('#strategy-count-striker').fill('2');
  assert(await p.evaluate(()=>Object.entries(window.__retained).every(([key,el])=>el===({title:document.getElementById('strategy-estimate-title'),picked:document.querySelector('.sc-picked-ship'),metric:document.querySelector('#strategy-metrics dd'),input:document.activeElement})[key])));
  assert.match(await p.locator('.sc-picked-ship').innerText(),/×2/);assert.match(await p.locator('#strategy-estimate-title').innerText(),/2척/);
  assert(await p.locator('#strategy-review').evaluate(el=>el.compareDocumentPosition(document.getElementById('strategy-estimate'))&Node.DOCUMENT_POSITION_FOLLOWING));
  await p.locator('.sc-mobile-plan button').click();
  const r=await p.locator('#strategy-review').boundingBox(),nav=await p.locator('.sidebar').boundingBox();assert(r.y>=0&&r.y+r.height<nav.y);
  await p.screenshot({path:join(out,'command-review-top-390.png')});
  for(const [id,n] of Object.entries({striker:3,guardian:1,siege:1,support:1}))await p.locator('#strategy-count-'+id).fill(String(n));
  assert.equal(await p.locator('#strategy-review').isEnabled(),false);assert.match(await p.locator('#strategy-errors').innerText(),/지휘/);assert.match(await p.locator('#announcement').innerText(),/줄여/);
 });
 await check('action ordering reflows with doubled text and retains keyboard access',async()=>{
  for(const view of ['construction','research','fleet'])for(const width of [320,390,844]){
   await p.setViewportSize({width,height:width===844?390:844});await go(view);await p.evaluate(enlargeText);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),view+' '+width+' doubled text overflow');
   const nav=await p.evaluate(auditNavigationText);assert(nav.items.every(i=>i.fits&&i.withinViewport));assert(!nav.barOverflow);
   await p.screenshot({path:join(out,view+'-text200-'+width+'.png')});
  }
  await p.setViewportSize({width:390,height:844});await go('research');
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.classList.contains('skip-link')),true);
  await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>document.activeElement.id),'main');
  let reached=false;for(let i=0;i<12;i++){await p.keyboard.press('Tab');if(await p.evaluate(()=>!!document.activeElement.matches('.dn-art-lead>[data-view-facility=laboratory]'))){reached=true;break;}}
  assert(reached,'top research action reachable by Tab');await p.keyboard.press('Enter');
  await p.waitForFunction(()=>document.querySelector('#workspace-title')?.textContent==='건설 관리');
  assert.equal(await p.locator('[data-workspace-facility=laboratory]').getAttribute('aria-pressed'),'true');
 });
 await check('no script errors or game API mutations occur',async()=>{assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);});
 report.passed=report.checks.every(c=>c.passed);
}finally{await writeFile(join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length}));if(!report.passed)process.exitCode=1;
