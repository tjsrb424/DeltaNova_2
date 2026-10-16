// Headless mobile, accessibility-tree and loading-boundary review of static demo files.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join,sep,extname} from 'node:path';
import {homedir} from 'node:os';
import {enlargeText} from './uiux-a11y.mjs';
const require=createRequire(import.meta.url),pw=require(process.env.DELTA_NOVA_PLAYWRIGHT||join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=resolve(process.env.DELTA_NOVA_DEMO_ROOT||'public'),out=resolve(process.env.DELTA_NOVA_MOBILE_REVIEW_OUT||'.delta-nova/mobile-a11y-review');await mkdir(out,{recursive:true});
const report={date:new Date().toISOString(),root,checks:[],errors:[],mutations:[],axViews:[],focusChecks:[],limitations:['Chromium emulation, not a physical phone or spoken screen reader.']};
report.inspectedFiles=[];for(const file of ['index.html','main.js','refinement.css','strategy.js','strategy.css','visuals.css','art/fleet-roster-v2.webp']){report.inspectedFiles.push({file,sha256:createHash('sha256').update(await readFile(join(root,'uiux-demo',file))).digest('hex')});}
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert(p.startsWith(root+sep));res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp'})[extname(p)]||'application/octet-stream');res.end(await readFile(p));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/uiux-demo/index.html`;
const browser=await pw.chromium.launch({headless:true,executablePath:process.env.DELTA_NOVA_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'});report.browser=browser.version();
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
context.on('request',r=>{if(r.method()!=='GET'||/\/api\//.test(r.url()))report.mutations.push(r.url());});
const page=await context.newPage(),cdp=await context.newCDPSession(page);page.setDefaultTimeout(10000);page.on('pageerror',e=>report.errors.push(String(e)));
const command='&target=tarsis&intent=attack&context=solo&step=fleet';let serial=0;
const go=async(view)=>{await page.goto(url+'?mobile='+ ++serial+'#view='+view+(view==='command'?command:''));await page.locator(view==='home'?'#planet-name':'#workspace-title').waitFor();};
const check=async(name,fn)=>{try{await fn();report.checks.push({name,passed:true});console.log('PASS '+name);}catch(e){report.checks.push({name,passed:false,error:String(e)});console.log('FAIL '+name+' '+String(e));await page.screenshot({path:join(out,'failure-'+report.checks.length+'.png')});}};
try{
  await check('reviewed source bundle hashes and displayed fleet atlas match the adopted art',async()=>{
    const manifest=JSON.parse(await readFile('docs/art-source/fleet-refinement-v2/manifest.json','utf8'));
    for(const file of manifest.files){const path=file.path===manifest.runtime?join(root,'uiux-demo/art/fleet-roster-v2.webp'):file.path,b=await readFile(path);assert.equal(b.length,file.bytes,file.path+' size');assert.equal(createHash('sha256').update(b).digest('hex'),file.sha256,file.path+' hash');}
    const gate=JSON.parse(await readFile('docs/art-source/fleet-refinement-v2/review-gate.json','utf8')),adopted=gate.candidates.find(c=>c.runtime===manifest.runtime);assert.equal(adopted?.parts.length,8);for(const ship of adopted.parts)assert(ship.score>gate.thresholdStrictlyAbove,ship.id+' below review gate');report.artGate=gate;
  });
  await check('each view exposes one main, one named navigation, one h1 and named controls in Chromium AX',async()=>{
    for(const view of ['home','construction','research','fleet','defense','evasion','career','galaxy','guild','reports','practice','more','diplomacy','rankings','command']){
      await go(view);const {nodes}=await cdp.send('Accessibility.getFullAXTree');const visible=nodes.filter(n=>!n.ignored),controls=visible.filter(n=>['button','link','spinbutton','combobox','textbox','checkbox','DisclosureTriangle'].includes(n.role?.value)),unnamed=controls.filter(n=>!n.name?.value?.trim()).map(n=>({role:n.role.value,id:n.backendDOMNodeId}));
      assert.deepEqual(unnamed,[],view+' unnamed controls');assert.equal(visible.filter(n=>n.role?.value==='main').length,1,view+' main');assert(visible.some(n=>n.role?.value==='navigation'&&n.name?.value==='제국 메뉴'),view+' navigation');assert.equal(visible.filter(n=>n.role?.value==='heading'&&n.properties?.some(p=>p.name==='level'&&p.value.value===1)).length,1,view+' h1');report.axViews.push({view,controls:controls.length,unnamed});
    }
  });
  await check('quantity fields expose available inventory and global limits as AX descriptions',async()=>{
    await go('command');const {nodes}=await cdp.send('Accessibility.getFullAXTree'),inputs=nodes.filter(n=>!n.ignored&&n.role?.value==='spinbutton');assert.equal(inputs.length,8);report.axInputs=inputs.map(n=>({role:n.role.value,name:n.name.value,description:n.description?.value,value:n.value?.value,properties:n.properties}));
    const missing=inputs.filter(n=>!n.description?.value?.includes('가용')||!n.description.value.includes('6척')||!n.description.value.includes('지휘 12')).map(n=>({name:n.name.value,description:n.description?.value||''}));assert.deepEqual(missing,[]);
  });
  await check('editing announces exact composition and actionable invalid limits without moving focus',async()=>{
    await go('command');const field=page.locator('#strategy-count-striker');await field.fill('1');assert.equal(await field.evaluate(el=>el===document.activeElement),true);assert.match(await page.locator('#announcement').innerText(),/1척.*지휘 2/);
    for(const [id,n] of Object.entries({striker:3,guardian:1,siege:1,support:1}))await page.locator('#strategy-count-'+id).fill(String(n));assert.match(await page.locator('#announcement').innerText(),/지휘.*줄여/);assert.equal(await page.locator('#strategy-review').isEnabled(),false);
  });
  await check('explicit departure phases are announced as local previews',async()=>{
    await go('command');await page.locator('#strategy-count-striker').fill('1');await page.locator('.sc-mobile-plan button').tap();await page.locator('#strategy-review').tap();await page.locator('#strategy-preview-launch').tap();await page.locator('#strategy-advance-preview-1').tap();const text=await page.locator('#announcement').innerText();assert.match(text,/타르시스.*도착/);assert.match(text,/시연/);
  });
  await check('focused numeric fields remain unobscured at reduced mobile heights and doubled text',async()=>{
    const failures=[];for(const [width,height] of [[390,844],[320,568],[390,430],[320,390]])for(const doubled of [false,true]){
      await page.setViewportSize({width,height});await go('command');if(doubled)await page.evaluate(enlargeText);
      for(const id of ['striker','support','carrier']){const field=page.locator('#strategy-count-'+id);await field.focus();await field.evaluate(el=>el.scrollIntoView({block:'end'}));const result=await field.evaluate(el=>{const r=el.getBoundingClientRect(),visibleTop=Math.max(0,visualViewport.offsetTop),limits=[visualViewport.height+visibleTop];for(const node of document.querySelectorAll('.sc-mobile-plan,.sidebar')){const b=node.getBoundingClientRect();if(['fixed','sticky'].includes(getComputedStyle(node).position)&&b.bottom>visibleTop&&b.top<visualViewport.height)limits.push(b.top);}return {id:el.id,top:r.top,bottom:r.bottom,limit:Math.min(...limits),topLimit:visibleTop,overflow:document.documentElement.scrollWidth>innerWidth};});report.focusChecks.push({width,height,doubled,...result});if(result.top<result.topLimit||result.bottom>result.limit||result.overflow)failures.push({width,height,doubled,...result});}
    }assert.deepEqual(failures,[]);
  });
  await check('mobile summary remains anchored to the viewport after target navigation and scrolling',async()=>{
    await page.setViewportSize({width:390,height:844});await go('career');await page.locator('#strategy-target-tarsis [data-strategy-open]').tap();await page.waitForFunction(()=>document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).every(a=>a.playState!=='running'));await page.locator('#strategy-count-support').evaluate(el=>el.scrollIntoView({block:'center'}));
    const rect=await page.locator('.sc-mobile-plan').evaluate(el=>{const r=el.getBoundingClientRect(),n=document.querySelector('.sidebar').getBoundingClientRect();return {top:r.top,bottom:r.bottom,navTop:n.top,height:innerHeight};});assert(rect.top>=0&&rect.bottom<=rect.navTop&&rect.bottom>rect.height/2,JSON.stringify(rect));await page.screenshot({path:join(out,'mobile-summary-after-navigation.png')});
  });
  await check('skip link and native dialog keyboard trap preserve focus under forced colors',async()=>{
    await page.setViewportSize({width:390,height:844});await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await go('research');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('skip-link')),true);await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'main');
    await page.locator('[data-panel=settings]').first().click();for(let i=0;i<7;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>!!document.activeElement.closest('dialog[open]')),true);}await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('data-panel')),'settings');await page.screenshot({path:join(out,'forced-colors-research.png')});await page.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'});
  });
  await check('direct non-planet screens do not fetch hidden WebGL albedo or cloud textures',async()=>{
    await page.setViewportSize({width:390,height:844});for(const view of ['construction','research','command','reports']){await go(view);const hidden=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/nova-(albedo|clouds)/.test(r.name)).map(r=>r.name.split('/').pop()));assert.deepEqual(hidden,[],view+' hidden textures');}
    await page.locator('.sidebar [data-view=home]').click();await page.locator('#planet-scene[aria-busy=false]').waitFor();assert.equal(await page.locator('#planet-canvas').getAttribute('data-art-source'),'generated');
  });
  await check('reviewed fleet silhouettes fit their art panels and remain160px across desktop and mobile cards',async()=>{
    const {cell,bounds}=JSON.parse(await readFile('docs/art-source/fleet-refinement-v2/runtime-cell-bounds.json','utf8'));report.fleetBounds=[];
    await page.emulateMedia({reducedMotion:'reduce'});
    for(const width of [1920,1440,1152,1024,839,768,760,390,361,360,320]){
      await page.setViewportSize({width,height:900});await go('command');
      const failures=await page.locator('.sc-ship-visual>.sc-ship-art').evaluateAll((nodes,{cell,bounds})=>nodes.flatMap(a=>{const id=a.closest('[data-strategy-ship]').dataset.strategyShip,b=bounds.find(b=>b.name===id),r=a.getBoundingClientRect(),v=a.parentElement.getBoundingClientRect(),visible={left:r.left+b.left/cell*r.width,right:r.left+(b.right+1)/cell*r.width,top:r.top+b.top/cell*r.height,bottom:r.top+(b.bottom+1)/cell*r.height};return r.width!==160||visible.left<v.left-.5||visible.right>v.right+.5||visible.top<v.top-.5||visible.bottom>v.bottom+.5?[{id,artWidth:r.width,visible,panel:{left:v.left,right:v.right,top:v.top,bottom:v.bottom}}]:[];}),{cell,bounds});
      report.fleetBounds.push({width,failures});assert.deepEqual(failures,[],width+' clipped silhouette');
      if(width===1440||width===390)await page.locator('.sc-ship-grid').screenshot({path:join(out,'fleet-cards-'+width+'.png')});
    }
    await page.emulateMedia({reducedMotion:'no-preference'});
  });
  await check('script errors and game API mutations remain absent',async()=>{assert.deepEqual(report.errors,[]);assert.deepEqual(report.mutations,[]);});
  report.passed=report.checks.every(c=>c.passed);
}finally{await writeFile(join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,failed:report.checks.filter(c=>!c.passed).map(c=>c.name)}));if(!report.passed)process.exitCode=1;
