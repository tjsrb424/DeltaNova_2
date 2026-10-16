// Headless static UI verification. No game server or live data is involved.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join,sep,extname} from 'node:path';
import {homedir} from 'node:os';
import {auditVisibleText,enlargeText} from './uiux-a11y.mjs';
const require=createRequire(import.meta.url);
const pw=require(process.env.DELTA_NOVA_PLAYWRIGHT||join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=resolve('public'),out=resolve(process.env.DELTA_NOVA_FLEET_REVIEW_OUT||'.delta-nova/free-fleet-review');await mkdir(out,{recursive:true});
const report={checks:[],layouts:[],errors:[],mutations:[],images:[]};
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert(p.startsWith(root+sep));res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp'})[extname(p)]||'application/octet-stream');res.end(await readFile(p));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/uiux-demo/index.html`;
const browser=await pw.chromium.launch({headless:true,executablePath:process.env.DELTA_NOVA_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const context=await browser.newContext();
context.on('request',r=>{if(r.method()!=='GET'||/\/api\//.test(r.url()))report.mutations.push(r.url());});
context.on('response',r=>{if(/fleet-roster-v1|orbital-hangar-v1/.test(r.url()))report.images.push({url:r.url().split('/').at(-1),status:r.status()});});
await context.addInitScript(()=>{window.__storageCalls=[];for(const name of ['getItem','setItem','removeItem','clear']){const original=Storage.prototype[name];Storage.prototype[name]=function(...args){window.__storageCalls.push(name);return original.apply(this,args);};}});
const page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',e=>report.errors.push(String(e)));
const check=async(name,fn)=>{console.log('CHECK '+name);await fn();report.checks.push(name);};
const command='#view=command&target=tarsis&intent=attack&context=solo&step=fleet';
let visit=0;
const go=async(hash=command)=>{await page.goto(url+'?free-fleet='+ ++visit+hash);await page.evaluate(()=>document.fonts.ready);};
const fill=async(id,n)=>{await page.locator('#strategy-count-'+id).fill(String(n));};
const custom=async()=>{for(const id of ['striker','support','jammer'])await fill(id,1);};
const audit=async label=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+' overflow');assert.deepEqual((await page.evaluate(auditVisibleText)).failures,[],label+' contrast');assert.deepEqual(await page.locator('[id]').evaluateAll(nodes=>{const ids=nodes.map(n=>n.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);}),[],label+' duplicate IDs');};
try{
  await check('empty first visit exposes all eight quantities with no preset and no fabricated ETA',async()=>{
    await go();assert.equal(await page.locator('[data-strategy-quantity]:visible').count(),8);assert.equal(await page.locator('[data-strategy-preset]').count(),0);assert.equal(await page.locator('#strategy-review').isEnabled(),false);
    assert.deepEqual(await page.locator('[data-strategy-quantity]').evaluateAll(nodes=>nodes.map(n=>n.value)),Array(8).fill('0'));assert.match(await page.locator('#strategy-estimate').innerText(),/함선 선택 후 표시/);
  });
  await check('three manually chosen ship types retain exact counts and input identity through review and Back',async()=>{
    const input=page.locator('#strategy-count-striker'),handle=await input.elementHandle();await custom();await input.focus();await input.press('ArrowUp');
    assert.equal(await handle.evaluate(el=>el.isConnected&&el===document.activeElement),true);await fill('striker',1);
    assert.match(await page.locator('#strategy-estimate-title').innerText(),/3척/);assert.equal(await page.locator('.sc-ship[data-selected=true]').count(),3);
    await page.locator('#strategy-review').click();assert.match(await page.locator('#strategy-confirm-title').innerText(),/3척/);assert.equal(await page.locator('.sc-picked-ship').count(),3);
    await page.goBack();await page.locator('#strategy-review').waitFor();assert.equal(await page.locator('#strategy-count-support').inputValue(),'1');
  });
  await check('clear removes the current draft and leaves the clear button focused',async()=>{
    await page.locator('[data-strategy-action=clear]').click();assert.equal(await page.locator('#strategy-review').isEnabled(),false);assert.deepEqual(await page.locator('[data-strategy-quantity]').evaluateAll(nodes=>nodes.map(n=>n.value)),Array(8).fill('0'));assert.equal(await page.locator('[data-strategy-action=clear]').evaluate(el=>el===document.activeElement),true);
  });
  await check('ownership, six-ship and command limits remain explicit with all ship types selectable',async()=>{
    await fill('striker',99);await page.locator('#strategy-count-striker').blur();assert.equal(await page.locator('#strategy-count-striker').inputValue(),'3');
    for(const id of ['guardian','siege','support','salvage','scout','jammer','carrier'])await fill(id,1);
    assert.match(await page.locator('#strategy-errors').innerText(),/6척/);assert.match(await page.locator('#strategy-errors').innerText(),/12/);assert.equal(await page.locator('#strategy-review').isEnabled(),false);
    await page.locator('#planet-select').selectOption('vesper');assert.equal(await page.locator('[data-strategy-quantity]:enabled').count(),0);
    await page.locator('#planet-select').selectOption('nova');assert.equal(await page.locator('#strategy-count-carrier').inputValue(),'1');
  });
  await check('eight distinct raster silhouettes and the orbital scene load from local optimized assets',async()=>{
    const positions=await page.locator('.sc-ship-visual>.sc-ship-art').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).backgroundPosition));assert.equal(new Set(positions).size,8);
    for(const file of ['fleet-roster-v1.webp','orbital-hangar-v1.webp'])assert(report.images.some(i=>i.url===file&&i.status===200),file+' missing');
  });
  await check('desktop, tablet and mobile layouts keep touch targets and a usable summary shortcut',async()=>{
    for(const [width,height] of [[1920,1080],[1440,900],[839,1065],[390,844],[360,800],[320,568],[844,390],[390,390]]){
      await page.setViewportSize({width,height});await go();await custom();await audit('fleet '+width);
      const controls=await page.locator('.sc-quantity button,.sc-quantity input').evaluateAll(nodes=>nodes.map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})));assert(controls.every(r=>r.w>=44&&r.h>=44),'44px controls '+width);
      if(width<=768){const bar=page.locator('.sc-mobile-plan');assert.match(await bar.innerText(),/3척/);assert(await bar.evaluate(el=>el.getBoundingClientRect().bottom<=document.querySelector('.sidebar').getBoundingClientRect().top));await bar.locator('button').click();assert.equal(await page.locator('#strategy-estimate-title').evaluate(el=>el===document.activeElement),true);}
      await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:join(out,`fleet-${width}x${height}.png`),fullPage:width===1440});
      await page.locator('#strategy-count-striker').scrollIntoViewIfNeeded();await page.screenshot({path:join(out,`fleet-editor-${width}x${height}.png`)});
      report.layouts.push({width,height,minControl:Math.min(...controls.map(r=>Math.min(r.w,r.h)))});
    }
  });
  await check('mobile summary never blocks the footer reset control, including doubled text',async()=>{
    for(const [width,height,enlarged] of [[390,844,false],[320,568,true]]){await page.setViewportSize({width,height});await go();if(enlarged)await page.evaluate(enlargeText);await custom();await page.locator('#reset-button').click();assert.match(await page.locator('#strategy-estimate-title').innerText(),/0척/);}
  });
  await check('optional practice shares raster ships without card overlap at desktop and phone widths',async()=>{
    for(const [width,height] of [[1440,900],[760,900],[390,844],[320,568]]){await page.setViewportSize({width,height});await go('#view=practice');await audit('practice '+width);const bounds=await page.locator('.op-ship-card').evaluateAll(cards=>cards.map(card=>{const c=card.getBoundingClientRect(),a=card.querySelector('.sc-ship-art').getBoundingClientRect();return a.left>=c.left&&a.right<=c.right&&a.top>=c.top&&a.bottom<=c.bottom;}));assert(bounds.every(Boolean),'practice art outside its card');await page.screenshot({path:join(out,'practice-'+width+'.png')});}
  });
  await check('200 percent text reflows at 320, 390 and landscape widths',async()=>{
    for(const [width,height] of [[320,568],[390,844],[844,390]]){await page.setViewportSize({width,height});await go();await page.evaluate(enlargeText);await custom();await audit('text 200 '+width);const controls=await page.locator('.sc-quantity input').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));assert(controls.every(w=>w>=44));await page.screenshot({path:join(out,`fleet-text-200-${width}.png`),fullPage:true});}
  });
  await check('selection feedback, confirmation entrance and departure scene run with regular motion',async()=>{
    await page.setViewportSize({width:1440,height:900});await go();await custom();assert.equal(await page.locator('[data-strategy-ship=striker]').getAttribute('data-selected'),'true');assert(await page.locator('.sc-hangar-light').evaluate(el=>el.getAnimations().length>0));
    const assets=await page.locator('#resources').innerText();await page.locator('#strategy-review').click();await page.screenshot({path:join(out,'fleet-confirm.png')});await page.locator('#strategy-preview-launch').click();assert.equal(await page.locator('.sc-flight-scene[data-phase=outbound]').count(),1);assert(await page.locator('.sc-flight-stars').evaluate(el=>el.getAnimations().length>0));assert.equal(await page.locator('#resources').innerText(),assets);await page.screenshot({path:join(out,'fleet-departure.png')});
  });
  await check('system reduced motion and manual pause stop fleet animations',async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});await go();await custom();assert.equal(await page.locator('.sc-hangar-light').evaluate(el=>el.getAnimations().length),0);await page.locator('#strategy-review').click();await page.locator('#strategy-preview-launch').click();assert.equal(await page.locator('.sc-flight-scene').evaluate(el=>el.getAnimations({subtree:true}).length),0);
    await page.emulateMedia({reducedMotion:'no-preference'});await go();await page.locator('[data-panel=settings]').click();await page.locator('#pause-motion').check();await page.locator('#dialog-close').click();await custom();assert.equal(await page.locator('.sc-hangar').evaluate(el=>el.getAnimations({subtree:true}).length),0);await page.screenshot({path:join(out,'fleet-paused.png')});
  });
  await check('missing art preserves names, quantity controls, exact review and working commands',async()=>{
    await page.route('**/art/*',route=>route.abort());await go();await custom();assert.equal(await page.locator('[data-strategy-quantity]:visible').count(),8);await page.locator('#strategy-review').click();assert.match(await page.locator('#strategy-confirm-title').innerText(),/3척/);await page.screenshot({path:join(out,'fleet-art-unavailable.png')});await page.unroute('**/art/*');
  });
  await check('alliance uses the same free composition without default ships or automatic departure',async()=>{
    await go('#view=guild');await page.locator('#strategy-alliance-join').click();assert.match(page.url(),/context=alliance/);assert.match(await page.locator('#strategy-estimate-title').innerText(),/0척/);await custom();await page.locator('[data-strategy-action=align]').click();assert.equal(await page.locator('#strategy-preview-launch').count(),0);await page.screenshot({path:join(out,'fleet-alliance-custom.png')});
  });
  await check('no API, storage or runtime errors occur during the full verification',async()=>{assert.deepEqual(report.mutations,[]);assert.deepEqual(report.errors,[]);assert.deepEqual(await page.evaluate(()=>window.__storageCalls),[]);});
  report.passed=true;
}catch(error){report.passed=false;report.failure=String(error);await page.screenshot({path:join(out,'FAILURE.png'),fullPage:true});throw error;}
finally{await writeFile(join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
console.log(`PASS ${report.checks.length} fleet checks / ${report.layouts.length} layouts`);
