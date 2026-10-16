// Headless growth-preparation review. Static demo only; never starts game API.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,sep,extname} from 'node:path';
import {homedir} from 'node:os';
import {enlargeText,auditVisibleText} from './uiux-a11y.mjs';
const require=createRequire(import.meta.url),pw=require(process.env.DELTA_NOVA_PLAYWRIGHT||join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=resolve(process.env.DELTA_NOVA_DEMO_ROOT||'dist'),out=resolve(process.env.DELTA_NOVA_GROWTH_REVIEW_OUT||'.delta-nova/growth-preparation/browser');
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert(path.startsWith(root+sep));res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await pw.chromium.launch({headless:true,executablePath:process.env.DELTA_NOVA_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
const report={date:new Date().toISOString(),browser:browser.version(),root,scope:'Independent plan/refund previews. No real commands or state changes.',checks:[],layouts:[],accessibility:[],errors:[],requests:[],files:[]};
for(const file of ['index.html','main.js','workspace.js','development-model.js','development.js','development-controller.js','development.css'])report.files.push({file,sha256:createHash('sha256').update(await readFile(join(root,'uiux-demo',file))).digest('hex')});
context.on('request',r=>{if(r.method()!=='GET'||/\/api\//.test(r.url()))report.requests.push(r.url());});
await context.addInitScript(()=>{window.__growthStorage=[];for(const name of ['getItem','setItem','removeItem','clear']){const original=Storage.prototype[name];Storage.prototype[name]=function(...args){window.__growthStorage.push(name);return original.apply(this,args);};}});
const page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(60000);
const base='http://127.0.0.1:'+server.address().port+'/uiux-demo/index.html';let serial=0;
const go=async(view)=>{await page.goto(base+'?growth='+ ++serial+'#view='+view);await page.locator('#workspace-title').waitFor();await page.evaluate(()=>document.fonts.ready);};
const check=async(name,fn)=>{console.log('CHECK '+name);try{await fn();report.checks.push({name,passed:true});}catch(error){report.checks.push({name,passed:false,error:String(error)});await page.screenshot({path:join(out,'failure.png')});throw error;}};
const shot=async(name)=>page.screenshot({path:join(out,name+'.png')});
const audit=async(label)=>{
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+' page overflow');
 const contrast=await page.evaluate(auditVisibleText);assert.deepEqual(contrast.failures,[],label+' contrast');
 const small=await page.locator('button,select,input,summary').evaluateAll(els=>els.filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&!e.closest('[hidden]')&&(r.width<(innerWidth<=844?43.9:23.9)||r.height<(innerWidth<=844?43.9:23.9));}).map(e=>e.id||e.textContent?.slice(0,40)));
 assert.deepEqual(small,[],label+' touch targets');
 const duplicate=await page.locator('[id]').evaluateAll(els=>{const ids=els.map(e=>e.id);return ids.filter((x,i)=>ids.indexOf(x)!==i);});assert.deepEqual(duplicate,[],label+' duplicate IDs');
 report.layouts.push({label,contrastSamples:contrast.count??null,minimumControlPx:page.viewportSize().width<=844?44:24,overflow:false});
};
try{
 await check('all four technologies expose effects, exact costs, unlocks and honest future effects',async()=>{
  await go('research');
  for(const [id,name] of [['industry','멘더'],['intelligence','베일'],['defense','바스티온'],['propulsion','후속']]){
   await page.locator('#development-tech-'+id).click();
   assert.equal(await page.locator('#development-tech-'+id).getAttribute('aria-pressed'),'true');
   assert((await page.locator('.dev-selection').innerText()).includes(name));
  }
  await page.locator('#development-tech-industry').click();await shot('research-1440');
  await page.locator('.dev-scenarios summary').click();await page.selectOption('#development-research-scenario','max');
  assert(await page.locator('.dev-scenarios').evaluate(el=>el.open));
  assert.equal(await page.evaluate(()=>document.activeElement.id),'development-research-scenario');
  assert((await page.locator('#development-research-cost').innerText()).includes('최대'));
 });
 await check('ship choices and exact numeric edits preserve input/focus and reject invalid quantities',async()=>{
  await go('fleet');
  assert.equal(await page.locator('[data-development-ship]').count(),8);
  for(const id of ['carrier','scout','striker'])await page.locator('#development-ship-'+id).click();
  await page.locator('#development-quantity').evaluate(el=>{window.__originalGrowthInput=el;});
  await page.locator('#development-quantity').fill('3');
  assert(await page.evaluate(()=>document.activeElement===window.__originalGrowthInput&&document.getElementById('development-quantity')===window.__originalGrowthInput));
  assert((await page.locator('#development-ship-cost').innerText()).includes('120'));
  for(const quantity of ['','1.5','0','21']){await page.locator('#development-quantity').fill(quantity);assert.equal(await page.locator('#development-quantity').getAttribute('aria-invalid'),'true');assert(await page.locator('#development-ship-review').isDisabled());}
  await page.locator('#development-quantity').fill('3');await page.locator('#development-ship-review').click();
  assert((await page.locator('#development-dialog').innerText()).includes('케스트럴 3척'));
  assert(await page.getByRole('button',{name:'실제 건조 시작 · 미연결',exact:true}).isDisabled());
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'development-ship-review');
  await page.locator('.dev-shipyard').scrollIntoViewIfNeeded();await shot('shipyard-1440');
 });
 await check('each queue reviews original payment and80percent refund without changing jobs or assets',async()=>{
  for(const [view,kind,refund] of [['construction','construction','32'],['research','research','32'],['fleet','ships','96']]){
   await go(view);const resources=await page.locator('#resources').innerText();
   await page.locator('#development-cancel-'+kind).click();
   assert(await page.getByRole('dialog',{name:'취소 전 환급 확인',exact:true}).isVisible());
   assert((await page.locator('.dev-refund-grid .dev-resource').first().innerText()).includes(refund));
   assert(await page.getByRole('button',{name:'실제 취소 확정 · 미연결',exact:true}).isDisabled());
   await page.selectOption('#development-refund-scenario','capacity');
   assert((await page.locator('.dev-refund-status').innerText()).includes('저장'));
   assert((await page.locator('#development-announcement').innerText()).includes('저장'));
   const modalSession=await context.newCDPSession(page),modalAX=await modalSession.send('Accessibility.getFullAXTree');
   const dom=await modalSession.send('DOM.getDocument'),found=await modalSession.send('DOM.querySelector',{nodeId:dom.root.nodeId,selector:'#development-announcement'}),described=await modalSession.send('DOM.describeNode',{nodeId:found.nodeId});
   const liveNode=modalAX.nodes.find(n=>n.backendDOMNodeId===described.node.backendNodeId);assert(liveNode&&liveNode.role?.value==='status'&&!liveNode.ignored&&liveNode.properties?.some(p=>p.name==='live'&&p.value.value==='polite'));
   report.accessibility.push({kind,element:'#development-announcement',insideOpenModal:true,role:liveNode.role.value,ignored:liveNode.ignored,properties:liveNode.properties,text:await page.locator('#development-announcement').innerText()});await modalSession.detach();
   await page.selectOption('#development-refund-scenario','completed');
   assert((await page.locator('.dev-refund-status').innerText()).includes('완료'));
   assert((await page.locator('.dev-refund-grid .dev-resource').first().innerText()).includes('0'));
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#resources').innerText(),resources);
   assert(await page.locator('#development-cancel-'+kind).isVisible());
  }
 });
 await check('research refunds use Nova even when Vesper is selected and stale dialogs close on navigation',async()=>{
  await go('research');await page.selectOption('#planet-select','vesper');
  await page.locator('#development-cancel-research').click();
  assert((await page.locator('.dev-review-summary').innerText()).includes('노바 프라임'));
  await page.evaluate(()=>{location.hash='view=fleet';});await page.locator('.dev-shipyard').waitFor();
  assert.equal(await page.locator('#development-dialog').evaluate(el=>el.open),false);
  assert.equal(await page.locator('#development-cancel-ships').count(),0);
  await page.locator('#offline-button').click();assert.equal(await page.locator('.dev-shipyard').count(),0);
 });
 await check('keyboard and Chromium accessibility expose the named review and trap focus under forced colors',async()=>{
  await go('fleet');await page.locator('#development-ship-review').click();
  await page.emulateMedia({forcedColors:'active'});
  for(let i=0;i<8;i++){await page.keyboard.press(i%2?'Shift+Tab':'Tab');assert(await page.evaluate(()=>document.getElementById('development-dialog').contains(document.activeElement)));}
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'development-ship-review');
  await page.emulateMedia({forcedColors:'none'});const cdp=await context.newCDPSession(page);
  const ax=await cdp.send('Accessibility.getFullAXTree');
  assert(ax.nodes.some(n=>n.role?.value==='spinbutton'&&/건조 수량/.test(n.name?.value)));
  const quantityNode=ax.nodes.find(n=>n.role?.value==='spinbutton'&&/건조 수량/.test(n.name?.value));
  assert(quantityNode.properties.some(p=>p.name==='valuemin'&&p.value.value===1));
  assert(quantityNode.properties.some(p=>p.name==='valuemax'&&p.value.value===20));
  assert(/건조 중/.test(quantityNode.description?.value||''));
  await cdp.detach();
 });
 await check('desktop phone short landscape and200percent text preserve usable controls and dialogs',async()=>{
  for(const [width,height] of [[1440,900],[390,844],[320,568],[844,390]])for(const doubled of [false,true]){
   await page.setViewportSize({width,height});
   for(const view of ['research','fleet']){
    await go(view);if(doubled)await page.evaluate(enlargeText);
    await audit(view+'-'+width+'-text'+(doubled?200:100));
    const control=view==='research'?'#development-research-review':'#development-ship-review';
    await page.locator(control).scrollIntoViewIfNeeded();await page.locator(control).click();
    const rect=await page.locator('#development-dialog').boundingBox();assert(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=width+1&&rect.y+rect.height<=height+1);
    assert.equal(await page.locator('#development-dialog').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
    await shot(view+'-plan-'+width+'-text'+(doubled?200:100));
    await page.keyboard.press('Escape');
    if(!doubled){await page.locator(view==='research'?'.dev-research':'.dev-shipyard').scrollIntoViewIfNeeded();await shot(view+'-'+width);}
   }
   await go('research');if(doubled)await page.evaluate(enlargeText);
   await page.locator('#development-cancel-research').click();await audit('refund-'+width+'-text'+(doubled?200:100));
   await shot('refund-'+width+'-text'+(doubled?200:100));await page.keyboard.press('Escape');
  }
 });
 await check('the preparation flow reaches facility comparison research shipbuilding recon and the original free fleet editor',async()=>{
  await page.setViewportSize({width:1440,height:900});await go('research');
  await page.locator('[data-view-facility="laboratory"]').click();assert.equal(await page.locator('#workspace-facility-select').inputValue(),'laboratory');
  await page.locator('.sidebar [data-view="fleet"]').click();await page.locator('#development-ship-carrier').click();
  await page.locator('[data-development-research="industry"]').click();assert.equal(await page.locator('#development-tech-industry').getAttribute('aria-pressed'),'true');
  await page.locator('.sidebar [data-view="galaxy"]').click();assert(await page.locator('.gx-workspace').isVisible());
  await page.locator('.sidebar [data-view="career"]').click();await page.locator('#strategy-intent-scout').click();
  await page.locator('[data-strategy-open]').first().click();await page.locator('#strategy-count-scout').fill('1');
  assert.equal(await page.locator('#strategy-count-scout').inputValue(),'1');
 });
 await check('missing approved art leaves ship selection quantity quote and review usable',async()=>{
  await page.route('**/fleet-roster-v2.webp',r=>r.abort());await go('fleet');
  await page.locator('#development-quantity').fill('2');await page.locator('#development-ship-review').click();
  assert((await page.locator('#development-dialog').innerText()).includes('케스트럴 2척'));await page.keyboard.press('Escape');await page.unroute('**/fleet-roster-v2.webp');
 });
 await check('empty queues and disconnected state do not manufacture work or successful commands',async()=>{
  await go('fleet');await page.locator('#empty-button').click();assert.equal(await page.locator('[data-development-cancel]').count(),0);
  assert((await page.locator('.dev-yard-queue').innerText()).includes('없음'));
  await page.locator('#offline-button').click();assert.equal(await page.locator('.dev-workbench').count(),0);
  assert.deepEqual(await page.evaluate(()=>window.__growthStorage),[]);
 });
 await check('touch-emulated mobile can jump into shipbuilding edit quantities and review refunds',async()=>{
  const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,reducedMotion:'reduce'}),mp=await mobile.newPage();
  mobile.on('request',r=>{if(r.method()!=='GET'||/\/api\//.test(r.url()))report.requests.push(r.url());});mp.on('pageerror',e=>report.errors.push(String(e)));
  try{await mp.goto(base+'?touch=growth#view=fleet',{timeout:60000});await mp.locator('[data-development-jump="shipyard"]').tap();
   await mp.locator('#development-plus').tap();await mp.locator('#development-plus').tap();assert.equal(await mp.locator('#development-quantity').inputValue(),'3');
   await mp.locator('#development-ship-review').tap();assert((await mp.locator('#development-dialog').innerText()).includes('케스트럴 3척'));
   await mp.locator('#development-dialog-close').tap();await mp.screenshot({path:join(out,'touch-shipyard-390.png')});
   await mp.locator('.sidebar [data-view="research"]').tap();await mp.locator('#development-cancel-research').tap();
   await mp.selectOption('#development-refund-scenario','capacity');assert((await mp.locator('#development-announcement').innerText()).includes('저장'));
   await mp.locator('#development-dialog-close').tap();
  }finally{await mobile.close();}
 });
 await check('no script errors API requests or mutations occur',async()=>{assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);});
 report.passed=true;console.log('PASS '+report.checks.length+' checks / '+report.layouts.length+' layout/contrast audits');
}catch(error){report.passed=false;report.failure=String(error);throw error;}
finally{await writeFile(join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
