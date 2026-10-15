import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { access, mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { resolve, join, sep, extname } from 'node:path';
import { auditVisibleText, auditGeometry, enlargeText, auditNavigationText } from './uiux-a11y.mjs';

const require=createRequire(import.meta.url);
let pw;
for(const p of [process.env.DELTA_NOVA_PLAYWRIGHT,'playwright','C:/Users/delic/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'].filter(Boolean)){try{pw=require(p);break;}catch{}}
assert(pw,'An existing Playwright runtime is required; no packages are installed.');
let executable;
for(const p of [process.env.DELTA_NOVA_BROWSER,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/chromium'].filter(Boolean)){try{await access(p);executable=p;break;}catch{}}
assert(executable,'Local Chromium is required; only headless mode is used.');
const root=resolve(process.env.DELTA_NOVA_DEMO_ROOT||'public');
const output=resolve(process.env.DELTA_NOVA_QUALITY_QA||'docs/qa/2026-10-15-refinement/after');
await mkdir(output,{recursive:true});
const report={at:new Date().toISOString(),root,checks:[],layouts:[],contrast:[],ax:[],errors:[],requests:[],limitations:['Automated emulation is not physical mobile hardware or screen-reader speech.','Contrast uses visible DOM text and composited flat ancestor colors; it is not a full WCAG certification.']};
await writeFile(join(output,'progress.log'),'');
const check=async(name,fn)=>{try{const data=await fn();report.checks.push({name,status:'PASS',...(data?{data}:{})});}catch(e){report.checks.push({name,status:'FAIL',error:String(e)});}await appendFile(join(output,'progress.log'),report.checks.at(-1).status+' '+name+'\n');};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1');const file=resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+sep))throw Error('path');const bytes=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png'})[extname(file)]||'application/octet-stream');res.end(bytes);}catch{res.writeHead(404);res.end('not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/uiux-demo/index.html`;
let browser;
const settle=async page=>{await page.locator('#planet-scene[aria-busy="false"]').waitFor();await page.evaluate(async()=>{await document.fonts.ready;let timer;try{await Promise.race([Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('finite animation did not settle within 15s')),15000))]);}finally{clearTimeout(timer);}});};
const close=async page=>{await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'hidden'});};
try{
  browser=await pw.chromium.launch({headless:true,executablePath:executable});
  const context=await browser.newContext();
  context.on('request',r=>{if(r.method()!=='GET'||/\/api\//.test(r.url()))report.requests.push(r.url());});
  await context.addInitScript(()=>{window.__storageCalls=[];for(const name of ['getItem','setItem','removeItem','clear']){const f=Storage.prototype[name];Storage.prototype[name]=function(...args){window.__storageCalls.push(name);return f.apply(this,args);};}window.__longTasks=[];try{new PerformanceObserver(l=>window.__longTasks.push(...l.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});}catch{}});
  const page=await context.newPage();page.setDefaultTimeout(10000);
  page.on('pageerror',e=>report.errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  for(const [width,height] of [[1920,1080],[1440,900],[1024,768],[320,568],[360,640],[390,844],[844,390]]){
    await page.setViewportSize({width,height});await page.goto(url);await settle(page);
    for(const [state,label] of [['idle','평시'],['threat','적 함대 접근'],['complete','행동 완료']]){
      await page.getByRole('button',{name:'평시',exact:true}).click();await page.getByRole('button',{name:label,exact:true}).click();await settle(page);
      const geometry=await page.evaluate(auditGeometry);report.layouts.push({state,...geometry});
      await check(`layout-${state}-${width}x${height}`,()=>{assert(geometry.documentWidth<=width,'horizontal overflow');assert(geometry.ctaVisible,'priority CTA is obscured or below the initial viewport');assert.equal(geometry.touchFailures.length,0,'mobile targets below 44px: '+JSON.stringify(geometry.touchFailures));});
      const contrast=await page.evaluate(auditVisibleText);report.contrast.push({state,width,...contrast});
      await check(`contrast-${state}-${width}`,()=>assert.equal(contrast.failures.length,0,JSON.stringify(contrast.failures)));
      await page.screenshot({path:join(output,`${state}-${width}x${height}.png`)});
    }
  }
  console.log('Quality matrix collected: 21 state/viewport cases.');
  await page.setViewportSize({width:390,height:844});await page.reload();await settle(page);
  const cdp=await context.newCDPSession(page);await cdp.send('Accessibility.enable');
  await check('resource-accessible-description',async()=>{const tree=await cdp.send('Accessibility.getFullAXTree');const resource=tree.nodes.find(n=>!n.ignored&&n.role?.value==='button'&&n.name?.value==='합금 자원 상세');assert(resource?.description?.value?.includes('280')&&resource.description.value.includes('13'),'resource name hides quantity/rate without an accessible description');return {name:resource.name.value,description:resource.description.value};});
  for(const width of [390,1440]){
    await page.setViewportSize({width,height:900});
    for(const [state,id] of [['empty','empty-button'],['offline','offline-button']]){
      await page.locator('#reset-button').click();await page.locator('#'+id).click();await settle(page);
      const contrast=await page.evaluate(auditVisibleText);report.contrast.push({state,width,...contrast});
      await check(`contrast-${state}-${width}`,()=>assert.equal(contrast.failures.length,0,JSON.stringify(contrast.failures)));
    }
    await page.getByRole('button',{name:'다시 표시 · 데모'}).click();
    const contrast=await page.evaluate(auditVisibleText);report.contrast.push({state:'loading',width,...contrast});
    await check(`contrast-loading-${width}`,()=>assert.equal(contrast.failures.length,0,JSON.stringify(contrast.failures)));
    await page.locator('#connection-state').waitFor({state:'hidden'});
  }
  await page.setViewportSize({width:390,height:844});await page.locator('#reset-button').click();await page.evaluate(()=>window.scrollTo(0,0));
  await check('urgent-event-semantics-and-deduplication',async()=>{
    assert.equal(await page.locator('#urgent-announcement[role="alert"]').count(),1,'urgent live region missing');
    await page.evaluate(()=>{window.__urgentTexts=[];const node=document.getElementById('urgent-announcement');new MutationObserver(()=>{if(node.textContent)window.__urgentTexts.push(node.textContent);}).observe(node,{childList:true,subtree:true,characterData:true});});
    await page.getByRole('button',{name:'적 함대 접근',exact:true}).click();await page.getByRole('button',{name:'적 함대 접근',exact:true}).click();
    const values=await page.evaluate(()=>window.__urgentTexts);assert.equal(values.length,1,'duplicate urgent announcement');assert(values[0].includes('노바 프라임'));
    const tree=await cdp.send('Accessibility.getFullAXTree');const alert=tree.nodes.find(n=>!n.ignored&&n.role?.value==='alert');assert(alert?.properties?.some(p=>p.name==='live'&&p.value?.value==='assertive'),'Chromium accessibility tree must expose urgent live semantics');return values;
  });
  await page.getByRole('button',{name:'적 함대 접근',exact:true}).click();await settle(page);
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  await check('mobile-threat-remains-actionable-after-scroll',async()=>{const geometry=await page.evaluate(auditGeometry);assert(geometry.ctaVisible,'threat CTA is lost after scrolling');return geometry;});
  await page.evaluate(()=>window.scrollTo(0,0));
  const panels=['resources','planet','construction','research','fleet','career','galaxy','guild','reports','practice','threat','evasion','defense','more','settings','rankings','diplomacy'];
  // Open through real controls; secondary entries are reached from More or threat details.
  for(const panel of panels){
    if(await page.locator('dialog').isVisible())await close(page);
    await page.setViewportSize({width:390,height:844});
    let nested=false;let source=page.locator(`button[data-panel="${panel}"]:visible`).first();
    if(!await source.count()){
      if(['threat','evasion'].includes(panel)){await page.getByRole('button',{name:'회피 계획 검토',exact:false}).first().click();if(panel==='threat'){await close(page);await page.setViewportSize({width:1440,height:900});source=page.locator('#context [data-panel="threat"]');await source.click();}}
      else{await page.locator('[data-panel="more"]').click();await page.locator(`#dialog-content [data-panel="${panel}"]`).click();nested=true;}
    }else await source.click();
    await settle(page);
    if(nested)await check(`nested-panel-${panel}-focus`,async()=>assert(await page.locator('#dialog-title').evaluate(el=>el===document.activeElement),'nested panel title must receive focus'));
    await check(`dialog-${panel}-contrast-and-name`,async()=>{const contrast=await page.evaluate(auditVisibleText);report.contrast.push({panel,...contrast});assert.equal(contrast.failures.length,0,JSON.stringify(contrast.failures));const tree=await cdp.send('Accessibility.getFullAXTree');const unnamed=tree.nodes.filter(n=>!n.ignored&&['button','checkbox','combobox','dialog'].includes(n.role?.value)&&!n.name?.value);report.ax.push({panel,unnamed:unnamed.length});assert.equal(unnamed.length,0,'unnamed controls');});
    if(panel==='evasion')await page.screenshot({path:join(output,'evasion-mobile.png')});
    if(panel==='settings')await check('motion-toggle-keyboard',async()=>{await page.locator('#pause-motion').focus();await page.keyboard.press('Space');assert(await page.locator('body').evaluate(el=>el.classList.contains('motion-paused')));assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);});
  }
  if(await page.locator('dialog').isVisible())await close(page);
  for(const [width,height] of [[320,568],[360,640],[390,844],[844,390]]){
    await page.setViewportSize({width,height});await page.reload();await settle(page);
    const fontSizes=await page.evaluate(enlargeText);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await check(`text-200-percent-${width}`,async()=>{assert(fontSizes.every(v=>Math.abs(v.after/v.before-2)<.01),'text must actually double, including closed drawer title');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow after text enlargement');const nav=await page.evaluate(auditNavigationText);assert(nav.items.every(v=>v.fits&&v.withinViewport&&v.scrollHeight<=v.clientHeight+1),'navigation text clips: '+JSON.stringify(nav));assert(!nav.barOverflow,'navigation bar overflows');assert(nav.bottomClearance>=nav.barHeight,'page clearance is smaller than fixed navigation');return {fontSizes,nav};});
    await page.screenshot({path:join(output,`text-200-${width}.png`)});
    await page.screenshot({path:join(output,`text-200-full-${width}.png`),fullPage:true});
    for(const panel of ['settings','evasion']){
      if(panel==='settings')await page.getByRole('button',{name:'화면 설정'}).click();
      else{await page.getByRole('button',{name:'적 함대 접근',exact:true}).click();await page.getByRole('button',{name:'회피 계획 검토',exact:false}).first().click();}
      await settle(page);
      await check(`dialog-enlarged-text-${panel}-${width}`,async()=>{const info=await page.evaluate(()=>{const dialog=document.querySelector('dialog'),content=document.getElementById('dialog-content'),footer=document.getElementById('dialog-return').getBoundingClientRect();return {dialogWidth:dialog.scrollWidth,viewport:innerWidth,contentHeight:content.clientHeight,contentWidth:content.clientWidth,contentScrollWidth:content.scrollWidth,footerBottom:footer.bottom,height:innerHeight,titleSize:parseFloat(getComputedStyle(document.getElementById('dialog-title')).fontSize),valueSize:content.querySelector('.detail-stat strong')?parseFloat(getComputedStyle(content.querySelector('.detail-stat strong')).fontSize):null};});assert(info.dialogWidth<=width,'drawer horizontal overflow');assert(info.contentScrollWidth<=info.contentWidth,'drawer content horizontal overflow');assert(info.titleSize>=44,'drawer title was not doubled');if(panel==='evasion')assert.equal(info.valueSize,28,'dynamically inserted detail value must be doubled');assert(info.contentHeight>44,'drawer content collapses');assert(info.footerBottom<=height,'drawer close button is obscured');return info;});
      await page.screenshot({path:join(output,`text-200-${panel}-${width}.png`)});
      await close(page);
    }
  }
  await page.setViewportSize({width:390,height:844});await page.reload();await settle(page);
  await page.getByRole('button',{name:'적 함대 접근',exact:true}).click();await page.getByRole('button',{name:'회피 계획 검토',exact:false}).click();await settle(page);
  await check('drawer-scroll-lock-and-keyboard',async()=>{
    const start=await page.evaluate(()=>window.scrollY);await page.locator('#dialog-content').hover();await page.mouse.wheel(0,1800);
    await page.waitForFunction(()=>document.getElementById('dialog-content').scrollTop>0);
    assert.equal(await page.evaluate(()=>window.scrollY),start,'background scrolled behind dialog');
    for(let i=0;i<12;i++){await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)),'focus escaped dialog');}
    await page.screenshot({path:join(output,'evasion-scrolled-mobile.png')});
  });
  await close(page);await page.getByRole('button',{name:'평시',exact:true}).click();await settle(page);
  await check('generated-planet-is-used',async()=>assert.equal(await page.locator('#planet-canvas').getAttribute('data-art-source'),'generated'));
  await page.screenshot({path:join(output,'planet-initial-mobile.png')});
  await page.getByRole('button',{name:'시설 스냅샷 변경',exact:true}).click();await settle(page);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:join(output,'planet-developed-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1920,height:1080});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:join(output,'planet-developed-desktop.png')});
  const tree=await cdp.send('Accessibility.getFullAXTree');await writeFile(join(output,'accessibility-tree.json'),JSON.stringify(tree,null,2));
  await check('no-state-or-storage-side-effects',async()=>{assert.equal(report.requests.length,0);assert.equal((await page.evaluate(()=>window.__storageCalls)).length,0);assert.equal(report.errors.length,0,JSON.stringify(report.errors));});
  await check('cpu4x-pending-art-does-not-block-threat',async()=>{
    const perfContext=await browser.newContext();let release;
    const gate=new Promise(resolve=>release=resolve);
    try{
      const perf=await perfContext.newPage();perf.setDefaultTimeout(15000);
      await perf.route('**/art/nova-natural-v2.webp',async route=>{await gate;await route.continue();});
      await perf.addInitScript(()=>{window.__longTasks=[];new PerformanceObserver(l=>window.__longTasks.push(...l.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});});
      const session=await perfContext.newCDPSession(perf);await session.send('Emulation.setCPUThrottlingRate',{rate:4});
      await perf.goto(url,{waitUntil:'domcontentloaded'});
      assert.equal(await perf.locator('#planet-scene').getAttribute('aria-busy'),'true','art request should still be pending');
      await perf.evaluate(()=>document.addEventListener('click',event=>{
        if(!event.target.closest('[data-state="threat"]'))return;
        const start=performance.now();
        requestAnimationFrame(()=>requestAnimationFrame(()=>window.__threatVisualMs=performance.now()-start));
      },{capture:true,once:true}));
      const start=await perf.evaluate(()=>performance.now());
      await perf.getByRole('button',{name:'적 함대 접근',exact:true}).click();
      assert(await perf.locator('#threat-banner').isVisible(),'threat remains usable before art arrives');
      const actionMs=await perf.evaluate(t=>performance.now()-t,start);
      await perf.waitForFunction(()=>Number.isFinite(window.__threatVisualMs));
      const clickToPaintMs=await perf.evaluate(()=>window.__threatVisualMs);
      release();await settle(perf);
      const data=await perf.evaluate(()=>({longTasksMs:window.__longTasks,planetRenderMs:performance.getEntriesByName('planet-render').map(e=>e.duration),assets:performance.getEntriesByType('resource').filter(e=>e.name.endsWith('.webp')).map(e=>({bytes:e.decodedBodySize,transferBytes:e.transferSize}))}));
      const measurement={cpuSlowdown:4,pendingArt:'controlled request gate',clickToNextPaintProxyMs:+clickToPaintMs.toFixed(1),automatedRoundTripMs:+actionMs.toFixed(1),...data};
      report.performance=measurement;
      assert(clickToPaintMs<250,'browser click-to-paint proxy exceeds 250ms while art is pending');
      assert(!data.longTasksMs.some(ms=>ms>=250),'main thread task exceeded 250ms at CPU4x');
      assert.equal(await perf.locator('#planet-canvas').getAttribute('data-art-source'),'generated');
      return measurement;
    }finally{release?.();await perfContext.close();}
  });
  await check('landscape-touch-review-and-close',async()=>{
    const touchContext=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
    try{const touch=await touchContext.newPage();await touch.goto(url);await touch.getByRole('button',{name:'적 함대 접근',exact:true}).tap();await settle(touch);const g=await touch.evaluate(auditGeometry);assert(g.ctaVisible,'landscape touch CTA must be unobstructed');await touch.getByRole('button',{name:'회피 계획 검토',exact:false}).tap();await settle(touch);await touch.screenshot({path:join(output,'evasion-landscape.png')});await touch.getByRole('button',{name:'닫고 돌아가기',exact:true}).tap();assert(!await touch.getByRole('dialog').isVisible());return g;}finally{await touchContext.close();}
  });
  const fallbackContext=await browser.newContext();const fallback=await fallbackContext.newPage();
  await fallback.route('**/art/nova-natural-v2.webp',route=>route.abort());await fallback.goto(url);await settle(fallback);
  await check('planet-art-failure-falls-back',async()=>assert.equal(await fallback.locator('#planet-canvas').getAttribute('data-art-source'),'procedural'));
  await fallback.screenshot({path:join(output,'planet-fallback.png')});await fallbackContext.close();
  report.status=report.checks.some(c=>c.status==='FAIL')?'FAIL':'PASS';
  console.log(`UIUX quality ${report.status}: ${report.checks.filter(c=>c.status==='PASS').length}/${report.checks.length} checks; ${report.contrast.length} contrast contexts.`);
}catch(e){report.status='FAIL';report.failure=String(e);console.error(e);}
finally{await writeFile(join(output,'quality.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server.close(r));}
if(report.status!=='PASS')process.exitCode=1;
