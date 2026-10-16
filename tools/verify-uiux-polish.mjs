// Serves only static demo files. Never starts or connects to the game API.
import assert from 'node:assert/strict';
import {verifyStrategyUI} from './verify-strategy-ui.mjs';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join,sep,extname} from 'node:path';
import {homedir} from 'node:os';
import {enlargeText,auditNavigationText,auditVisibleText} from './uiux-a11y.mjs';
const require=createRequire(import.meta.url);
const pw=require(process.env.DELTA_NOVA_PLAYWRIGHT || join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=resolve(process.env.DELTA_NOVA_DEMO_ROOT || 'dist');
const out=resolve(process.env.DELTA_NOVA_DEMO_REVIEW_OUT || '.delta-nova/uiux-strategy-review');await mkdir(out,{recursive:true});
const report={checks:[],layouts:[],errors:[],requests:[],operationFonts:[]};
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert(path.startsWith(root+sep));res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/uiux-demo/index.html`;
const browser=await pw.chromium.launch({headless:true,executablePath:process.env.DELTA_NOVA_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const check=async(name,fn)=>{console.log('CHECK '+name);await fn();report.checks.push(name);};
const context=await browser.newContext({viewport:{width:1440,height:900}});
context.on('request',r=>{if(r.method()!=='GET'||/\/api\//.test(r.url()))report.requests.push(r.url());});
await context.addInitScript(()=>{window.__storageCalls=[];for(const name of ['getItem','setItem','removeItem','clear']){const original=Storage.prototype[name];Storage.prototype[name]=function(...args){window.__storageCalls.push(name);return original.apply(this,args);};}});
const page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',e=>report.errors.push(String(e)));
const settle=async()=>{await page.locator('#planet-scene[aria-busy="false"]').waitFor();await page.evaluate(()=>document.fonts.ready.then(()=>true));await page.waitForFunction(()=>document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).every(a=>a.playState!=='running'),null,{timeout:3000});};
const scenario=async name=>{if(!await page.locator('#preview-tools').getAttribute('open')){if(!await page.locator('[data-state="'+name+'"]').isVisible())await page.locator('#preview-tools summary').click();}await page.locator('[data-state="'+name+'"]').click();if(await page.locator('[data-state="idle"]').isVisible())await page.locator('#preview-tools summary').click();await page.evaluate(()=>scrollTo(0,0));await settle();};
try{
  await page.goto(url);await settle();
  const uploadFailure=await browser.newContext();await uploadFailure.addInitScript(()=>{
    const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){const gl=get.call(this,type,...args);if(type==='webgl'&&gl){const upload=gl.texImage2D.bind(gl);gl.texImage2D=(...values)=>{upload(...values);upload(gl.TEXTURE_2D,0,gl.RGBA,-1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,null);};}return gl;};
  });
  const uploadPage=await uploadFailure.newPage();await uploadPage.goto(url);await uploadPage.locator('#planet-scene[aria-busy="false"]').waitFor();
  await check('WebGL texture upload errors preserve a static visible fallback',async()=>{assert.equal(await uploadPage.locator('canvas').getAttribute('data-renderer'),'static');assert.match(await uploadPage.locator('canvas').evaluate(el=>el.style.background),/nova-natural-v2/);});await uploadFailure.close();
  await check('facility selection exposes comparison, cost, conditions and a disabled command',async()=>{
    await page.locator('.facility-hotspot[data-facility="alloyMine"]').click();
    assert.match(await page.locator('#facility-detail').innerText(),/합금 광산/);
    assert.match(await page.locator('#facility-detail').innerText(),/\+6\s*→\s*\+12/);
    assert.match(await page.locator('#facility-detail').innerText(),/증설 비용/);
    assert.equal(await page.locator('#facility-detail button').isEnabled(),false);
    await page.keyboard.press('Escape');assert.equal(await page.locator('.facility-hotspot[data-facility="alloyMine"]').evaluate(el=>el===document.activeElement),true);
  });
  for(const [width,height] of [[1440,900],[839,1065],[390,844],[320,568],[844,390]]){
    await page.setViewportSize({width,height});
    for(const state of ['idle','threat','complete']){
      console.log(`LAYOUT ${width}x${height} ${state}`);
      if(state==='complete')await scenario('idle');await scenario(state);
      const layout=await page.evaluate(()=>{
        const mobile=getComputedStyle(document.querySelector('.sidebar')).position==='fixed';
        const el=document.querySelector(mobile?(document.body.classList.contains('has-threat')?'#threat-banner button':'.mobile-priority button'):'#context button');
        const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return {overflow:document.documentElement.scrollWidth>innerWidth,ctaVisible:r.top>=0&&r.bottom<=innerHeight&&!!hit&&el.contains(hit),metricsTop:document.querySelector('.planet-metrics').getBoundingClientRect().top};
      });
      assert.equal(layout.overflow,false,`${width}x${height} ${state} overflow`);assert.equal(layout.ctaVisible,true,`${width}x${height} ${state} CTA hidden`);
      report.layouts.push({width,height,state,...layout});
      if(state==='idle'&&[1440,390,844].includes(width))await page.screenshot({path:join(out,`idle-${width}x${height}.png`)});
    }
  }
  await page.setViewportSize({width:390,height:844});await scenario('idle');
  await check('central menu and native Back restore the workspace and initiating control',async()=>{
    await page.locator('.mobile-more').click();await page.locator('#workspace-page [data-view="defense"]').click();
    assert.match(await page.locator('#workspace-title').innerText(),/방어/);
    assert.match(await page.locator('[data-defense-count]').innerText(),/0/);
    assert.equal(await page.locator('#detail-dialog').evaluate(el=>el.open),false);
    await page.goBack();await page.locator('#workspace-page [data-view="defense"]').waitFor();
    assert.equal(await page.locator('#workspace-page [data-view="defense"]').evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.locator('#workspace-page a[href="/"]').isVisible(),true);
    await page.goBack();await page.locator('#home-workspace').waitFor();
    assert.equal(await page.locator('.mobile-more').evaluate(el=>el===document.activeElement),true);
  });
  await check('major menus replace the center at desktop, tablet, phone and landscape sizes',async()=>{
    for(const [width,height] of [[1440,900],[839,1065],[390,844],[320,568],[844,390]]){
      await page.setViewportSize({width,height});
      for(const view of ['construction','research','fleet','more']){
        await page.locator('.sidebar [data-view="'+view+'"]:visible').click();
        await page.waitForFunction(()=>document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).every(a=>a.playState!=='running'));
        assert.equal(await page.locator('#detail-dialog').evaluate(el=>el.open),false);
        assert.equal(await page.locator('#workspace-page').isVisible(),true);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,view+' overflow '+width);
        const contrast=await page.evaluate(auditVisibleText);assert.deepEqual(contrast.failures,[],view+' contrast '+width);
        if(view==='construction'){
          if(width===390||width===844){
            await page.locator('#workspace-facility-select').focus();
            await page.locator('#workspace-facility-select').selectOption('laboratory');
            const before=await page.evaluate(()=>({scroll:scrollY,top:document.querySelector('#workspace-facility-select').getBoundingClientRect().top}));
            await page.locator('#workspace-facility-select').selectOption('alloyMine');
            const after=await page.evaluate(()=>({scroll:scrollY,top:document.querySelector('#workspace-facility-select').getBoundingClientRect().top,focus:document.activeElement.id}));
            assert.equal(after.focus,'workspace-facility-select');assert.equal(after.scroll,before.scroll);assert.equal(after.top,before.top);
          }else if(width>768){
            await page.locator('[data-workspace-facility="alloyMine"]').click();
            assert.equal(await page.locator('[data-workspace-facility="alloyMine"]').evaluate(el=>el===document.activeElement),true);
          }
          assert.match(await page.locator('#workspace-page').innerText(),/01:24/);
          await page.screenshot({path:join(out,'construction-'+width+'x'+height+'.png')});
        }
        if(view==='more')for(const sub of ['career','galaxy','defense','guild','diplomacy','rankings','reports','practice']){
          await page.locator('#workspace-page [data-view="'+sub+'"]').click();
          assert.equal(await page.locator('#detail-dialog').evaluate(el=>el.open),false);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,sub+' overflow '+width);
          await page.locator('.sidebar [data-view="more"]:visible').click();
        }
      }
      await page.locator('.sidebar [data-view="home"]').click();
    }
  });
  await check('short details restore focus through Close, Escape and native Back/Forward',async()=>{
    await page.setViewportSize({width:1440,height:900});
    await page.locator('.sidebar [data-view="construction"]').click();
    await page.locator('#resources button').first().click();
    await page.goBack();await page.waitForFunction(()=>!document.querySelector('dialog').open);
    assert.equal(await page.locator('#resources button').first().evaluate(el=>el===document.activeElement),true);
    await page.goForward();await page.locator('dialog[open]').waitFor();
    await page.locator('#dialog-close').click();await page.waitForFunction(()=>!document.querySelector('dialog').open);
    assert.match(await page.locator('#workspace-title').innerText(),/건설/);
    await page.locator('.sidebar [data-view="home"]').click();
    await page.locator('.quick-section [data-panel="fleet"]').click();
    await page.locator('#dialog-content [data-view="fleet"]').click();
    assert.equal(await page.locator('#detail-dialog').evaluate(el=>el.open),false);
    assert.match(await page.locator('#workspace-title').innerText(),/함대/);
    await page.goBack();await page.locator('dialog[open]').waitFor();
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog').open);
    await page.locator('.sidebar [data-view="home"]').click();
  });
  await check('direct detail URLs close into their workspace with visible focus and selected facility',async()=>{
    const deep=await context.newPage();await deep.goto(url+'#view=construction&detail=planet&facility=alloyMine');
    await deep.locator('dialog[open]').waitFor();await deep.locator('#dialog-close').click();
    await deep.waitForFunction(()=>!document.querySelector('dialog').open);
    assert.equal(await deep.evaluate(()=>document.activeElement.id),'workspace-title');
    assert.equal(await deep.locator('.facility-hotspot[data-facility="alloyMine"]').getAttribute('aria-pressed'),'true');
    await deep.close();
  });
  await check('research keeps empire-wide progress while showing the selected local investment',async()=>{
    await page.locator('.sidebar [data-view="research"]').click();
    await page.selectOption('#planet-select','vesper');
    assert.match(await page.locator('.ws-research-progress').innerText(),/노바 프라임/);
    assert.match(await page.locator('.ws-research-foundation').innerText(),/베스퍼/);
    assert.match(await page.locator('.ws-investment-cost').innerText(),/60/);
    assert.equal(await page.locator('#workspace-page [data-panel="research"]').count(),0);
    await page.locator('[data-view-facility="laboratory"]').click();assert.match(await page.locator('#workspace-facility-detail .ws-name-level h3').innerText(),/연구소/);
    await page.goBack();await page.locator('.ws-research-progress').waitFor();
    await page.selectOption('#planet-select','nova');
    await page.locator('#reset-button').scrollIntoViewIfNeeded();
    await page.locator('.sidebar [data-view="research"]').click();
    assert.equal(await page.evaluate(()=>scrollY),0);
    for(const [width,height] of [[390,844],[320,568],[844,390]]){
      await page.setViewportSize({width,height});await page.locator('.sidebar [data-view="research"]').click();
      const titleTop=await page.locator('#workspace-title').evaluate(el=>el.getBoundingClientRect().top);
      if(width===390){const action=await page.locator('[data-view-facility="laboratory"]').boundingBox();assert(action.y+action.height<=await page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().top),'research investment CTA is covered by navigation');}
      await page.screenshot({path:join(out,`research-${width}x${height}.png`)});
      await page.locator('.sidebar [data-view="fleet"]').click();
      assert(Math.abs(await page.locator('#workspace-title').evaluate(el=>el.getBoundingClientRect().top)-titleTop)<1);
      await page.screenshot({path:join(out,`fleet-${width}x${height}.png`)});
    }
    await page.setViewportSize({width:1440,height:900});
    await page.locator('.sidebar [data-view="home"]').click();
  });
  await page.setViewportSize({width:1440,height:900});await scenario('threat');
  await check('outbound/incoming previews stay local and keep their original planet',async()=>{
    await page.locator('#preview-tools summary').click();await page.locator('#departure-button').click();await page.locator('#preview-tools summary').click();
    assert.equal(await page.locator('#departure-route').isVisible(),true);assert.equal(await page.locator('#incoming-route').isVisible(),true);
    assert.match(await page.locator('#fleet-value').innerText(),/10/);assert.match(await page.locator('#route-status').innerText(),/위치·남은 시간 동기화/);
    await page.screenshot({path:join(out,'routes-desktop.png')});
    await page.selectOption('#planet-select','vesper');assert.match(await page.locator('#threat-banner').innerText(),/노바 프라임/);assert.equal(await page.locator('#incoming-route').isVisible(),false);assert.equal(await page.locator('#departure-route').isVisible(),false);
    await page.selectOption('#planet-select','nova');await settle();
  });
  await check('both complete routes stay outside the atmosphere and within the scene at seven viewport sizes',async()=>{
    for(const [width,height] of [[1440,900],[839,1065],[390,844],[320,568],[844,390],[1920,1080],[2560,1440]]){
      await page.setViewportSize({width,height});
      await page.waitForFunction(()=>Math.abs(document.querySelector('.route-layer').viewBox.baseVal.width-document.querySelector('.scene-stage').getBoundingClientRect().width)<1);
      const routes=await page.evaluate(()=>{
        const s=document.querySelector('.scene-stage').getBoundingClientRect(),g=document.querySelector('canvas').getBoundingClientRect();
        const cx=g.left-s.left+g.width/2,cy=g.top-s.top+g.height/2,r=g.width/2;
        return [...document.querySelectorAll('.route-layer g')].map(group=>{
          const path=group.querySelector('.route-track'),length=path.getTotalLength(),dot=group.querySelector('.route-dot');
          let minClearance=Infinity,dotDistance=Infinity,minY=Infinity,maxY=-Infinity;
          for(let i=0;i<=1000;i++){const p=path.getPointAtLength(length*i/1000);minClearance=Math.min(minClearance,Math.hypot(p.x-cx,p.y-cy)-r);dotDistance=Math.min(dotDistance,Math.hypot(p.x-Number(dot.getAttribute('cx')),p.y-Number(dot.getAttribute('cy'))));minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
          const label=group.querySelector('.route-time').getBoundingClientRect();
          const overlaps=[...document.querySelectorAll('.facility-hotspot')].some(el=>{const b=el.getBoundingClientRect();return label.left<b.right&&label.right>b.left&&label.top<b.bottom&&label.bottom>b.top;});
          return {id:group.id,minClearance,dotDistance,overlaps,minY,maxY,height:s.height};
        });
      });
      for(const r of routes){assert(r.minClearance>=11.8,`${width} ${r.id} entered atmosphere`);assert(r.dotDistance<1,`${width} ${r.id} dot left route`);assert(!r.overlaps,`${width} ${r.id} time overlaps a control`);assert(r.minY>=7.9&&r.maxY<r.height,`${width} ${r.id} clipped vertically`);}
    }
    await page.setViewportSize({width:1440,height:900});
  });
  await check('one local clock advances the position and every ETA, and pauses inside details',async()=>{
    const read=()=>page.evaluate(()=>({progress:Number(document.querySelector('#incoming-route').dataset.progress),remaining:Number(document.querySelector('#incoming-route').dataset.remaining),etas:[...document.querySelectorAll('[data-route-eta="incoming"]')].map(el=>el.textContent)}));
    const first=await read();await page.waitForTimeout(1100);const next=await read();
    assert(next.progress>first.progress);assert(first.remaining-next.remaining>=1000);assert(next.etas.every(label=>label===next.etas[0]));
    assert(Math.abs((next.progress-.3)/.7-(1-next.remaining/160000))<.00001);
    await page.locator('#context [data-panel="threat"]').click();await page.waitForTimeout(120);const frozen=await read();
    await page.waitForTimeout(1100);assert.deepEqual(await read(),frozen);
    assert.equal(await page.locator('#dialog-content [data-route-eta="incoming"]').innerText(),frozen.etas[0]);
    await page.keyboard.press('Escape');await page.waitForTimeout(200);assert((await read()).progress>frozen.progress);
  });
  await check('sphere rotates while visible and reduced motion pauses it',async()=>{
    assert.equal(await page.locator('canvas').getAttribute('data-renderer'),'webgl');
    assert.equal(await page.locator('canvas').getAttribute('data-rotation'),'running');
    const before=await page.locator('canvas').screenshot();await page.waitForTimeout(400);const after=await page.locator('canvas').screenshot();assert.notEqual(Buffer.compare(before,after),0);
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('canvas').dataset.rotation==='paused');
    // Let the compositor present the final cancelled animation frame before
    // comparing pixels; the state flag is set synchronously by the listener.
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true)))));
    const angles=await page.locator('canvas').evaluate(el=>({surface:el.dataset.surfaceAngle,clouds:el.dataset.cloudAngle}));
    let frozen=await page.locator('canvas').screenshot(),stable=false;
    for(let attempt=0;attempt<5;attempt++){
      await page.waitForTimeout(50);const frame=await page.locator('canvas').screenshot();
      if(Buffer.compare(frozen,frame)===0){stable=true;break;}frozen=frame;
    }
    assert.equal(stable,true,'paused compositor did not settle');
    await page.waitForTimeout(200);assert.equal(Buffer.compare(frozen,await page.locator('canvas').screenshot()),0);
    assert.deepEqual(await page.locator('canvas').evaluate(el=>({surface:el.dataset.surfaceAngle,clouds:el.dataset.cloudAngle})),angles);
    await page.emulateMedia({reducedMotion:'no-preference'});
  });
  await check('manual pause survives closing settings and offscreen rendering stops',async()=>{
    await page.getByRole('button',{name:'화면 설정',exact:true}).click();await page.locator('#pause-motion').check();await page.keyboard.press('Escape');assert.equal(await page.locator('canvas').getAttribute('data-rotation'),'paused');
    await page.getByRole('button',{name:'화면 설정',exact:true}).click();await page.locator('#pause-motion').uncheck();await page.keyboard.press('Escape');
    await page.setViewportSize({width:320,height:568});await page.locator('#reset-button').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('canvas').dataset.rotation==='paused');
    const readScene=()=>page.evaluate(()=>({satellite:document.querySelector('#recon-satellite').getAttribute('transform'),dot:document.querySelector('#incoming-route .route-dot').getAttribute('cx')}));
    // Canvas and scene use separate IntersectionObservers; allow the final scene callback to settle.
    let offscreen=await readScene(),settled=false;
    for(let attempt=0;attempt<5;attempt++){
      await page.waitForTimeout(100);const next=await readScene();
      if(JSON.stringify(next)===JSON.stringify(offscreen)){settled=true;break;}offscreen=next;
    }
    assert.equal(settled,true,'offscreen scene did not settle');
    await page.waitForTimeout(1100);assert.deepEqual(await readScene(),offscreen);
    await page.locator('canvas').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('canvas').dataset.rotation==='running');
  });
  await check('no API requests, mutations, storage accesses or runtime errors',async()=>{assert.deepEqual(report.requests,[]);assert.deepEqual(report.errors,[]);assert.deepEqual(await page.evaluate(()=>window.__storageCalls),[]);});
  const staticContext=await browser.newContext();await staticContext.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:get.call(this,type,...args);};});
  const staticPage=await staticContext.newPage();await staticPage.goto(url);await staticPage.locator('#planet-scene[aria-busy="false"]').waitFor();
  await check('WebGL unavailability preserves the natural static fallback',async()=>{assert.equal(await staticPage.locator('canvas').getAttribute('data-renderer'),'static');assert.equal(await staticPage.locator('canvas').getAttribute('data-art-source'),'generated');});
  const failure=await browser.newContext();await failure.route('**/art/*.webp',r=>r.abort());const failedPage=await failure.newPage();await failedPage.goto(url);await failedPage.locator('#planet-scene[aria-busy="false"]').waitFor();
  await check('image failure preserves procedural terrain and working workspace controls',async()=>{assert.equal(await failedPage.locator('canvas').getAttribute('data-art-source'),'procedural');await failedPage.locator('.sidebar [data-view="construction"]').click();assert.equal(await failedPage.locator('#workspace-facility-detail').isVisible(),true);});
  const motionContext=await browser.newContext({viewport:{width:1440,height:900}}),motionPage=await motionContext.newPage();
  motionContext.on('request',r=>{if(r.method()!=='GET'||/\/api\//.test(r.url()))report.requests.push(r.url());});motionPage.on('pageerror',e=>report.errors.push(String(e)));
  await motionPage.clock.install({time:new Date('2026-10-15T12:00:00Z')});await motionPage.goto(url);await motionPage.locator('#planet-scene[aria-busy="false"]').waitFor();
  await motionPage.clock.pauseAt(new Date('2026-10-15T12:01:00Z'));
  const cloudAngles=()=>motionPage.locator('canvas').evaluate(el=>({surface:Number(el.dataset.surfaceAngle),clouds:Number(el.dataset.cloudAngle)}));
  await check('separate cloud and surface uniforms advance at different slow rates',async()=>{
    const a=await cloudAngles();await motionPage.clock.fastForward(12000);const b=await cloudAngles();
    assert(b.surface>a.surface);assert(b.clouds>a.clouds);assert(Math.abs((b.clouds-b.surface)-(a.clouds-a.surface))>.01);
  });
  await check('recon satellite orbits in front and is occluded behind the globe; details issue no command',async()=>{
    const poses=[];for(let i=0;i<5;i++){
      poses.push(await motionPage.locator('#recon-satellite').evaluate(el=>({depth:Number(el.dataset.depth),hidden:el.dataset.occluded==='true',opacity:Number(el.getAttribute('opacity')),x:el.getBoundingClientRect().left,y:el.getBoundingClientRect().top})));
      await motionPage.clock.fastForward(24000);
    }
    assert(poses.some(p=>p.depth>0&&!p.hidden&&p.opacity>0));assert(poses.some(p=>p.depth<0&&p.hidden&&p.opacity===0));assert(Math.hypot(poses[0].x-poses[4].x,poses[0].y-poses[4].y)<.01);
    await motionPage.locator('#recon-button').click();assert.match(await motionPage.locator('#dialog-content').innerText(),/S-01/);assert.equal(await motionPage.locator('#dialog-content button:disabled').count(),1);await motionPage.keyboard.press('Escape');
    await motionPage.selectOption('#planet-select','vesper');assert.equal(await motionPage.locator('#recon-button').isVisible(),false);assert.equal(await motionPage.locator('#recon-satellite').isVisible(),false);await motionPage.selectOption('#planet-select','nova');
  });
  await check('arrival gives one brief exterior pulse, settles, and never mutates ships or replays on return',async()=>{
    const assets=await motionPage.locator('#resources,#fleet-value').allTextContents();
    await motionPage.locator('#preview-tools summary').click();await motionPage.locator('#arrival-button').click();await motionPage.locator('#preview-tools summary').click();
    await motionPage.clock.fastForward(5350);
    assert.equal(await motionPage.locator('#incoming-route').getAttribute('data-arrived'),'true');assert.equal(await motionPage.locator('#incoming-route').getAttribute('data-arrival-effect'),'active');
    assert(Number(await motionPage.locator('.arrival-ring').getAttribute('opacity'))>0);assert.match(await motionPage.locator('#threat-banner').innerText(),/외곽 대기/);
    await motionPage.screenshot({path:join(out,'arrival-pulse.png')});
    const end=await motionPage.locator('#incoming-route .route-dot').getAttribute('cx');
    await motionPage.clock.fastForward(3000);assert.equal(await motionPage.locator('#incoming-route').getAttribute('data-arrival-effect'),'none');assert.equal(await motionPage.locator('.arrival-ring').getAttribute('opacity'),'0');
    await motionPage.selectOption('#planet-select','vesper');await motionPage.selectOption('#planet-select','nova');await motionPage.clock.fastForward(1000);
    assert.equal(await motionPage.locator('#incoming-route .route-dot').getAttribute('cx'),end);assert.equal(await motionPage.locator('.arrival-ring').getAttribute('opacity'),'0');assert.deepEqual(await motionPage.locator('#resources,#fleet-value').allTextContents(),assets);
  });
  await check('reduced motion freezes clouds, satellite, flight time and pulse together',async()=>{
    await motionPage.locator('#preview-tools summary').click();await motionPage.locator('#arrival-button').click();await motionPage.locator('#preview-tools summary').click();await motionPage.clock.fastForward(1000);
    await motionPage.emulateMedia({reducedMotion:'reduce'});
    await motionPage.locator('canvas[data-rotation="paused"]').waitFor();
    await motionPage.clock.runFor(100);
    const read=()=>motionPage.evaluate(()=>({clouds:document.querySelector('canvas').dataset.cloudAngle,surface:document.querySelector('canvas').dataset.surfaceAngle,satellite:document.querySelector('#recon-satellite').getAttribute('transform'),remaining:document.querySelector('#incoming-route').dataset.remaining,pulse:document.querySelector('.arrival-ring').getAttribute('r')}));
    const before=await read();await motionPage.clock.fastForward(20000);assert.deepEqual(await read(),before);await motionPage.emulateMedia({reducedMotion:'no-preference'});await motionPage.locator('canvas[data-rotation="running"]').waitFor();await motionPage.clock.runFor(100);
    const remaining=Number(await motionPage.locator('#incoming-route').getAttribute('data-remaining'));await motionPage.clock.fastForward(remaining+350);
    assert.equal(await motionPage.locator('#incoming-route').getAttribute('data-arrival-effect'),'active');
    await motionPage.emulateMedia({reducedMotion:'reduce'});await motionPage.locator('canvas[data-rotation="paused"]').waitFor();await motionPage.clock.runFor(100);const frozenPulse=await read();await motionPage.clock.fastForward(20000);assert.deepEqual(await read(),frozenPulse);
  });
  const cloudFailure=await browser.newContext();await cloudFailure.route('**/nova-clouds-v1.webp',r=>r.abort());const cloudPage=await cloudFailure.newPage();await cloudPage.goto(url);await cloudPage.locator('#planet-scene[aria-busy="false"]').waitFor();
  await check('missing cloud mask preserves the rotating surface',async()=>{assert.equal(await cloudPage.locator('canvas').getAttribute('data-renderer'),'webgl');assert.equal(await cloudPage.locator('canvas').getAttribute('data-rotation'),'running');});
  await check('fleet preview retains inventory and follows both flight endings while the planet is hidden',async()=>{
    const fleetPage=await context.newPage();await fleetPage.clock.install({time:new Date('2026-10-15T12:00:00Z')});await fleetPage.goto(url);
    await fleetPage.locator('#planet-scene[aria-busy="false"]').waitFor();await fleetPage.clock.pauseAt(new Date('2026-10-15T12:01:00Z'));
    await fleetPage.locator('.sidebar [data-view="fleet"]').click();
    const assets=await fleetPage.locator('#resources,#fleet-value').allTextContents();
    await fleetPage.locator('#fleet-departure-preview').click();
    assert.equal(await fleetPage.locator('#fleet-departure-preview').evaluate(el=>el===document.activeElement),true);
    await fleetPage.clock.fastForward(260500);
    assert.equal(await fleetPage.locator('#workspace-page [data-route-eta="outgoing"]').innerText(),'00:00');
    assert.equal(await fleetPage.locator('[data-outgoing-phase]').innerText(),'외부 항로 이탈');
    await fleetPage.locator('#preview-tools summary').click();await fleetPage.locator('#arrival-button').click();await fleetPage.locator('#preview-tools summary').click();
    await fleetPage.clock.fastForward(5500);
    assert.equal(await fleetPage.locator('#workspace-page [data-route-eta="incoming"]').innerText(),'00:00');
    assert.match(await fleetPage.locator('#workspace-page [data-threat-phase]').innerText(),/외곽 대기/);
    assert.deepEqual(await fleetPage.locator('#resources,#fleet-value').allTextContents(),assets);
    await fleetPage.screenshot({path:join(out,'fleet-arrived-desktop.png')});
    await fleetPage.selectOption('#planet-select','vesper');assert.equal(await fleetPage.locator('#workspace-page [data-route-eta]').count(),0);
    await fleetPage.selectOption('#planet-select','nova');assert.match(await fleetPage.locator('[data-outgoing-phase]').innerText(),/이탈/);
    await fleetPage.close();
  });
  const galaxyPage=await context.newPage();
  await galaxyPage.goto(url+'#view=galaxy&target=tarsis');
  await check('galaxy map, list and observation target stay in sync at five viewport sizes',async()=>{
    for(const [width,height] of [[1440,900],[839,1065],[390,844],[320,568],[844,390]]){
      await galaxyPage.setViewportSize({width,height});
      await galaxyPage.locator('#galaxy-node-tarsis').waitFor();
      assert.equal(await galaxyPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'galaxy overflow '+width);
      assert.deepEqual((await galaxyPage.evaluate(auditVisibleText)).failures,[],'galaxy contrast '+width);
      const targets=await galaxyPage.locator('.gx-node').evaluateAll(nodes=>nodes.map(el=>{
        const r=el.getBoundingClientRect();return {id:el.id,x:r.x,y:r.y,w:r.width,h:r.height};
      }));
      assert.equal(targets.length,6);
      assert(targets.every(t=>t.w>=44&&t.h>=44),'galaxy map touch target '+width);
      for(let i=0;i<targets.length;i++)for(let j=i+1;j<targets.length;j++){
        const a=targets[i],b=targets[j];assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),'overlapping nodes '+width+' '+a.id+' '+b.id);
      }
      const assets=await galaxyPage.locator('#resources').innerText();
      await galaxyPage.locator('#galaxy-node-vesper').click();
      assert.equal(await galaxyPage.locator('#galaxy-target-title').innerText(),'베스퍼');
      assert.equal(await galaxyPage.locator('#galaxy-row-vesper').getAttribute('aria-pressed'),'true');
      assert.equal(await galaxyPage.locator('#planet-select').inputValue(),'nova');
      assert.equal(await galaxyPage.locator('#resources').innerText(),assets);
      await galaxyPage.locator('#galaxy-node-tarsis').click();
      await galaxyPage.locator('.sidebar [data-view="more"]:visible').click();
      await galaxyPage.locator('#workspace-page [data-view="galaxy"]').click();
      await galaxyPage.screenshot({path:join(out,`galaxy-${width}x${height}.png`)});
    }
  });
  await check('galaxy search preserves typing focus and clears empty results; sector changes reveal their own targets',async()=>{
    await galaxyPage.setViewportSize({width:390,height:844});
    await galaxyPage.locator('#galaxy-search').fill('no-such-target');
    assert.equal(await galaxyPage.locator('#galaxy-search').evaluate(el=>el===document.activeElement),true);
    assert.equal(await galaxyPage.locator('#galaxy-results-count').innerText(),'0개 대상');
    await galaxyPage.locator('#galaxy-clear-query').click();
    assert.equal(await galaxyPage.locator('#galaxy-search').inputValue(),'');
    assert.equal(await galaxyPage.locator('#galaxy-search').evaluate(el=>el===document.activeElement),true);
    await galaxyPage.locator('#galaxy-filter-own').click();assert.equal(await galaxyPage.locator('#galaxy-results-count').innerText(),'2개 대상');
    await galaxyPage.locator('#galaxy-sector-select').focus();await galaxyPage.locator('#galaxy-sector-select').selectOption('orion');
    assert.equal(await galaxyPage.locator('#galaxy-results-count').innerText(),'3개 대상');
    assert.equal(await galaxyPage.locator('#galaxy-target-title').innerText(),'리겔');
    assert.equal(await galaxyPage.locator('#galaxy-filter-all').getAttribute('aria-pressed'),'true');
    await galaxyPage.locator('#galaxy-center-current').click();assert.equal(await galaxyPage.locator('#galaxy-target-title').innerText(),'노바 프라임');
    await galaxyPage.locator('#galaxy-target-select').focus();await galaxyPage.locator('#galaxy-target-select').selectOption('tarsis');
  });
  await check('galaxy mobile selector and explicit details keep context; native Back restores target and initiating focus',async()=>{
    await galaxyPage.locator('#galaxy-target-select').focus();await galaxyPage.locator('#galaxy-target-select').selectOption('mira');
    assert.equal(await galaxyPage.locator('#galaxy-target-select').evaluate(el=>el===document.activeElement),true);
    await galaxyPage.goBack();await galaxyPage.waitForFunction(()=>document.querySelector('#galaxy-target-title').textContent==='타르시스');
    assert.equal(await galaxyPage.locator('#galaxy-target-select').evaluate(el=>el===document.activeElement),true);
    await galaxyPage.locator('#galaxy-target-select').focus();await galaxyPage.locator('#galaxy-target-select').selectOption('mira');
    await galaxyPage.locator('[data-galaxy-focus]').first().click();
    assert.equal(await galaxyPage.locator('#galaxy-target-title').evaluate(el=>el===document.activeElement),true);
    const top=await galaxyPage.locator('.gx-inspector').evaluate(el=>el.getBoundingClientRect().top);assert(top>=0&&top<30);
    await galaxyPage.locator('#galaxy-report-open').click();
    assert.match(await galaxyPage.locator('#dialog-content').innerText(),/사전 관측.*12분 전/s);
    assert.match(await galaxyPage.locator('#dialog-content').innerText(),/함대 구성·수량\s*미확인/);
    await galaxyPage.keyboard.press('Escape');await galaxyPage.waitForFunction(()=>!document.querySelector('dialog').open);
    assert.equal(await galaxyPage.locator('#galaxy-report-open').evaluate(el=>el===document.activeElement),true);
    await galaxyPage.locator('.gx-list [data-galaxy-target="vesper"]').click();
    assert.match(await galaxyPage.locator('.gx-list-foot').innerText(),/선택: 베스퍼/);
    await galaxyPage.locator('.gx-list-foot [data-galaxy-focus]').click();
    assert.equal(await galaxyPage.locator('#galaxy-target-title').innerText(),'베스퍼');
  });
  await check('local recon belongs to the original target, never opens automatically, and changes no assets',async()=>{
    await galaxyPage.clock.install();
    await galaxyPage.locator('#galaxy-target-select').focus();await galaxyPage.locator('#galaxy-target-select').selectOption('tarsis');
    const assets=await galaxyPage.locator('#resources,#fleet-value').allTextContents();
    await galaxyPage.locator('#galaxy-scan-preview').click();
    await galaxyPage.locator('#galaxy-target-select').focus();await galaxyPage.locator('#galaxy-target-select').selectOption('vesper');
    assert.match(await galaxyPage.locator('.gx-scan-status').innerText(),/타르시스/);
    await galaxyPage.clock.fastForward(1500);
    assert.equal(await galaxyPage.locator('#detail-dialog').evaluate(el=>el.open),false);
    assert.equal(await galaxyPage.locator('#galaxy-target-title').innerText(),'베스퍼');
    assert.equal(await galaxyPage.locator('#galaxy-target-select').evaluate(el=>el===document.activeElement),true);
    await galaxyPage.locator('#galaxy-target-select').focus();await galaxyPage.locator('#galaxy-target-select').selectOption('tarsis');
    await galaxyPage.locator('#galaxy-report-open').click();
    assert.match(await galaxyPage.locator('#dialog-content').innerText(),/정찰 시연 결과/);
    assert.match(await galaxyPage.locator('#dialog-content').innerText(),/타르시스/);
    assert.deepEqual(await galaxyPage.locator('#resources,#fleet-value').allTextContents(),assets);
    await galaxyPage.screenshot({path:join(out,'galaxy-report-mobile.png')});
    await galaxyPage.keyboard.press('Escape');await galaxyPage.waitForFunction(()=>!document.querySelector('dialog').open);
    await galaxyPage.locator('#galaxy-scan-preview').click();
    await galaxyPage.locator('#offline-button').click();await galaxyPage.clock.fastForward(1500);
    assert.equal(await galaxyPage.locator('#galaxy-node-tarsis').count(),0);
    assert.equal(await galaxyPage.locator('#galaxy-search').isEnabled(),false);
    await galaxyPage.locator('#offline-button').click();await galaxyPage.locator('#reset-button').click();
    assert.equal(await galaxyPage.locator('#galaxy-report-open').count(),0);
    assert.equal(await galaxyPage.locator('#galaxy-scan-preview').isEnabled(),true);
    assert.deepEqual(await galaxyPage.evaluate(()=>window.__storageCalls),[]);
  });
  await galaxyPage.close();
  await verifyStrategyUI({context,url,out,check,report,auditVisibleText,enlargeText});
  const textContext=await browser.newContext({reducedMotion:'reduce'}),textPage=await textContext.newPage();
  for(const [width,height] of [[320,568],[390,844],[844,390]]){
    await textPage.setViewportSize({width,height});await textPage.goto(url);await textPage.locator('#planet-scene[aria-busy="false"]').waitFor();
    await check(`200% text reflow and readable navigation ${width}x${height}`,async()=>{
      await textPage.evaluate(enlargeText);
      await textPage.waitForFunction(()=>parseFloat(getComputedStyle(document.body).paddingBottom)>=document.querySelector('.sidebar').getBoundingClientRect().height);
      assert.equal(await textPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      const nav=await textPage.evaluate(auditNavigationText);assert.equal(nav.barOverflow,false);assert(nav.items.every(i=>i.fits&&i.withinViewport));
      await textPage.locator('.nav-item[data-view="construction"]').click();
      const contrast=await textPage.evaluate(auditVisibleText);assert.deepEqual(contrast.failures,[]);
      assert.equal(await textPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      for(const view of ['research','fleet']){
        await textPage.locator('.nav-item[data-view="'+view+'"]').click();
        assert.equal(await textPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,view+' text reflow');
        assert.deepEqual((await textPage.evaluate(auditVisibleText)).failures,[]);
      }
      await textPage.locator('.mobile-more').click();await textPage.locator('#workspace-page [data-view="galaxy"]').click();
      assert.equal(await textPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'galaxy text reflow '+width);
      assert.deepEqual((await textPage.evaluate(auditVisibleText)).failures,[],'galaxy text contrast '+width);
      const mapTargets=await textPage.locator('.gx-node').evaluateAll(nodes=>nodes.map(el=>{
        const r=el.getBoundingClientRect(),m=el.closest('.gx-map').getBoundingClientRect();
        return {id:el.id,x:r.x,y:r.y,w:r.width,h:r.height,within:r.left>=m.left&&r.right<=m.right&&r.top>=m.top&&r.bottom<=m.bottom};
      }));
      assert(mapTargets.every(t=>t.within&&t.w>=44&&t.h>=44),'enlarged map target bounds '+width);
      for(let i=0;i<mapTargets.length;i++)for(let j=i+1;j<mapTargets.length;j++){
        const a=mapTargets[i],b=mapTargets[j];assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),'enlarged overlapping nodes '+width+' '+a.id+' '+b.id);
      }
      await textPage.locator('[data-galaxy-focus]').first().click();
      await textPage.screenshot({path:join(out,`galaxy-text-200-${width}.png`)});
      for(const view of ['practice']){
        await textPage.locator('.mobile-more').click();await textPage.locator('#workspace-page [data-view="'+view+'"]').click();
        const font=await textPage.locator(view==='career'?'.op-briefing-facts p':'.op-ship-role').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
        const baseline=report.operationFonts.find(item=>item.width===width&&item.view===view).size;
        assert(Math.abs(font-baseline*2)<.1,view+' font must actually double '+width);
        assert.equal(await textPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,view+' text reflow '+width);
        assert.deepEqual((await textPage.evaluate(auditVisibleText)).failures,[],view+' enlarged contrast '+width);
        if(view==='practice'){
          await textPage.locator('#practice-review').click();
          assert.equal(await textPage.locator('#practice-result-title').evaluate(el=>el===document.activeElement),true);
          assert.equal(await textPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'review text reflow '+width);
        }
        await textPage.screenshot({path:join(out,`${view}-text-200-${width}.png`)});
      }
      await textPage.locator('#resources button').first().click();
      const close=textPage.locator('#dialog-return');assert.equal(await close.isVisible(),true);await textPage.screenshot({path:join(out,`text-200-${width}.png`)});
    });
  }
  assert.deepEqual(report.requests,[]);assert.deepEqual(report.errors,[]);
  console.log(`PASS: ${report.checks.length} integration checks, ${report.layouts.length} layouts; API/storage/runtime errors 0`);
}catch(error){report.failure=String(error);throw error;}finally{await writeFile(join(out,'results.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
