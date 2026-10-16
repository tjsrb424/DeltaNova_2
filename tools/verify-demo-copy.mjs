// Headless game-language review. Static demo only; never starts game API.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,sep,extname} from 'node:path';
import {homedir} from 'node:os';
import {enlargeText,auditVisibleText} from './uiux-a11y.mjs';
const require=createRequire(import.meta.url),pw=require(process.env.DELTA_NOVA_PLAYWRIGHT||join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=resolve(process.env.DELTA_NOVA_DEMO_ROOT||'dist'),out=resolve(process.env.DELTA_NOVA_COPY_REVIEW_OUT||'.delta-nova/copy-review/browser');
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert(path.startsWith(root+sep));res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await pw.chromium.launch({headless:true,executablePath:process.env.DELTA_NOVA_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
const report={date:new Date().toISOString(),browser:browser.version(),root,scope:'Game language and separate demo notices. Static independent demo only.',checks:[],layouts:[],accessibility:[],errors:[],requests:[],files:[]};
for(const file of ['index.html','main.js','workspace.js','development-model.js','development.js','development-controller.js','development.css','refinement.css','strategy.js','strategy-model.js','galaxy.js','operations.js','alliance.js','model.js','visuals.js','route-preview.js'])report.files.push({file,sha256:createHash('sha256').update(await readFile(join(root,'uiux-demo',file))).digest('hex')});
context.on('request',r=>{if(r.method()!=='GET'||/\/api\//.test(r.url()))report.requests.push(r.url());});
await context.addInitScript(()=>{window.__growthStorage=[];for(const name of ['getItem','setItem','removeItem','clear']){const original=Storage.prototype[name];Storage.prototype[name]=function(...args){window.__growthStorage.push(name);return original.apply(this,args);};}});
const page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(60000);
const base='http://127.0.0.1:'+server.address().port+'/uiux-demo/index.html';let serial=0;
const go=async(view)=>{await page.goto(base+'?growth='+ ++serial+'#view='+view);await page.locator(view==='home'?'#planet-name':'#workspace-title').waitFor();await page.evaluate(()=>document.fonts.ready);};
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

const plainCopy=async(label)=>{
 const result=await page.evaluate(()=>{
  const ignored='.demo-bar,.preview-tools,.demo-tools,.dev-scenarios,.dev-demo-controls,#dialog-demo,#development-dialog-note,#development-dialog-note,#announcement,#urgent-announcement,#development-announcement';
  return [...document.querySelectorAll('main *,dialog[open] *')].filter(e=>!e.children.length&&e.getClientRects().length&&!e.closest('[hidden]')&&!e.closest(ignored)).map(e=>e.textContent).filter(s=>/검토|미연결|스냅샷|피드백|로컬|준비안|시연|예시/.test(s));
 });assert.deepEqual(result,[],label+' game copy');
};
try{
 await check('all15views use game language with a persistent separate demo notice',async()=>{
  for(const [width,height] of [[1440,900],[390,844],[320,568]]){
   await page.setViewportSize({width,height});
   for(const view of ['home','construction','research','fleet','career','command','guild','galaxy','defense','evasion','reports','practice','more','rankings','diplomacy']){
    await go(view);await audit(view+'-'+width);await plainCopy(view+'-'+width);
    assert(await page.locator('#demo-boundary').isVisible());
    assert((await page.locator('#demo-boundary').innerText()).includes('실제 게임에 반영되지 않습니다'));
    if(width===390&&['construction','research','fleet','command'].includes(view))await shot(view+'-390');
   }
  }
 });
 await check('demo guide opens by keyboard with focus and remains scrollable on a small phone',async()=>{
  for(const [width,height,doubled] of [[1440,900,false],[320,568,false],[320,568,true],[844,390,true]]){
   await page.setViewportSize({width,height});await go('fleet');if(doubled)await page.evaluate(enlargeText);
   await page.locator('#demo-help').focus();await page.keyboard.press('Enter');
   assert(await page.locator('#preview-tools').evaluate(e=>e.open));
   assert.equal(await page.evaluate(()=>document.activeElement.tagName),'SUMMARY');
   await audit('guide-'+width+'-text'+(doubled?200:100));
   const rect=await page.locator('.preview-content').boundingBox();assert(rect.x>=0&&rect.x+rect.width<=width+1);
   await page.locator('#arrival-button').scrollIntoViewIfNeeded();assert(await page.locator('#arrival-button').evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'guide last control occluded');assert(await page.locator('#arrival-button').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));
   await page.locator('.preview-content').evaluate(e=>e.scrollTop=0);await shot('guide-'+width+'-text'+(doubled?200:100));
   await page.locator('#preview-tools summary').click();assert.equal(await page.locator('#preview-tools').evaluate(e=>e.open),false);if(width<=768)await page.waitForFunction(()=>document.activeElement.id==='demo-help');
  }
 });
 await check('research shipbuilding and cancellation use named actions while final commands stay disabled',async()=>{
  for(const [width,height,doubled] of [[1440,900,false],[390,844,false],[320,568,true],[844,390,true]]){
   await page.setViewportSize({width,height});
   for(const [view,opener,name,command] of [['research','#development-research-review','연구 시작 전 확인','연구 시작'],['fleet','#development-ship-review','건조 시작 전 확인','건조 시작'],['construction','#development-cancel-construction','취소 시 환급액','건설 취소'],['research','#development-cancel-research','취소 시 환급액','연구 취소'],['fleet','#development-cancel-ships','취소 시 환급액','건조 취소']]){
    await go(view);if(doubled)await page.evaluate(enlargeText);
    const before=await page.locator('#resources').innerText();await page.locator(opener).click();
    assert(await page.getByRole('dialog',{name,exact:true}).isVisible());
    const b=page.locator('#development-dialog').getByRole('button',{name:command,exact:true});assert(await b.isDisabled());
    assert.equal(await b.getAttribute('aria-describedby'),'development-dialog-note');
    assert((await page.locator('#development-dialog-note').innerText()).includes('시작하거나 취소하지 않습니다'));
    await audit(command+'-'+width+'-text'+(doubled?200:100));await plainCopy(command);
    assert.equal(await page.locator('#development-dialog').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
    for(let i=0;i<4;i++){await page.keyboard.press(i%2?'Shift+Tab':'Tab');assert(await page.evaluate(()=>document.getElementById('development-dialog').contains(document.activeElement)));}
    const cdp=await context.newCDPSession(page),ax=await cdp.send('Accessibility.getFullAXTree');
    assert(ax.nodes.some(n=>n.role?.value==='dialog'&&n.name?.value===name&&/데모/.test(n.description?.value||'')));
    report.accessibility.push({width,name,command,disabled:true,dialogDescription:'demo notice exposed'});await cdp.detach();
    if(width===390&&view==='fleet')await shot(command==='건조 취소'?'refund-390':'build-confirm-390');
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),opener.slice(1));assert.equal(await page.locator('#resources').innerText(),before);
   }
  }
 });
 await check('preview launches and recon stay explicitly previews and never send data',async()=>{
  await page.setViewportSize({width:390,height:844});await go('command');
  await page.locator('#strategy-count-striker').fill('2');await page.locator('#strategy-review').click();
  assert.equal(await page.locator('#strategy-preview-launch').innerText(),'출항 미리보기');
  await page.locator('#strategy-preview-launch').click();await page.locator('.sc-order').waitFor();await plainCopy('orders');
  await shot('orders-390');await page.locator('[data-strategy-advance]').click();await plainCopy('arrival');
  await go('galaxy');assert((await page.locator('#galaxy-scan-preview').innerText()).includes('미리보기'));
  await page.locator('#galaxy-scan-preview').click();await page.locator('#galaxy-report-open').waitFor();await page.locator('#galaxy-report-open').click();
  assert((await page.locator('#dialog-demo').innerText()).includes('실제 게임에 반영되지 않습니다'));await plainCopy('recon report');
  await page.keyboard.press('Escape');await page.locator('#offline-button').click();await plainCopy('offline');
  assert.deepEqual(await page.evaluate(()=>window.__growthStorage),[]);
 });
 await check('touch can open guide and build confirmation and forced colors preserve named close',async()=>{
  const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,reducedMotion:'reduce'}),mp=await mobile.newPage();
  mobile.on('request',r=>{if(r.method()!=='GET'||/\/api\//.test(r.url()))report.requests.push(r.url());});mp.on('pageerror',e=>report.errors.push(String(e)));
  try{await mp.goto(base+'#view=fleet',{timeout:60000});await mp.locator('#demo-help').tap();assert(await mp.locator('#preview-tools').evaluate(e=>e.open));await mp.locator('#preview-tools summary').tap();
   await mp.locator('#development-plus').tap();await mp.locator('#development-ship-review').tap();assert((await mp.locator('#development-dialog-title').innerText()).includes('건조 시작 전 확인'));await mp.emulateMedia({forcedColors:'active'});await mp.getByRole('button',{name:'확인 창 닫기',exact:true}).tap();assert.equal(await mp.evaluate(()=>document.activeElement.id),'development-ship-review');
  }finally{await mobile.close();}
 });
 await check('no script errors API requests or mutations occur',async()=>{assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);});
 report.passed=true;console.log('PASS '+report.checks.length+' checks / '+report.layouts.length+' layout/contrast audits');
}catch(error){report.passed=false;report.failure=String(error);throw error;}
finally{await writeFile(join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
