// Static headless review of the independent demo. Never starts the game API.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join,sep,extname} from 'node:path';
import {homedir} from 'node:os';
import {enlargeText,auditVisibleText} from './uiux-a11y.mjs';
const require=createRequire(import.meta.url);
const pw=require(process.env.DELTA_NOVA_PLAYWRIGHT||join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=resolve(process.env.DELTA_NOVA_DEMO_ROOT||'public'),out=resolve(process.env.DELTA_NOVA_VISUAL_REVIEW_OUT||'.delta-nova/visual-unification-review');await mkdir(out,{recursive:true});
const report={generatedAt:new Date().toISOString(),node:process.version,demoRoot:root,scope:'Static independent demo; no game API',checks:[],layouts:[],textLayouts:[],errors:[],requests:[],touchTargets:[],graphics:[]};
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert(p.startsWith(root+sep));res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp'})[extname(p)]||'application/octet-stream');res.end(await readFile(p));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/uiux-demo/index.html`;
const browser=await pw.chromium.launch({headless:true,executablePath:process.env.DELTA_NOVA_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
report.browser=browser.version();report.inspectedFiles=[];for(const file of ['index.html','main.js','workspace.js','operations.js','strategy.js','icons.js','visuals.js','visuals.css']){report.inspectedFiles.push({file,sha256:createHash('sha256').update(await readFile(join(root,'uiux-demo',file))).digest('hex')});}
const context=await browser.newContext({viewport:{width:1440,height:1000}});
context.on('request',r=>{if(r.method()!=='GET'||/\/api\//.test(r.url()))report.requests.push(r.url());});
await context.addInitScript(()=>{window.__storageCalls=[];for(const name of ['getItem','setItem','removeItem','clear']){const original=Storage.prototype[name];Storage.prototype[name]=function(...args){window.__storageCalls.push(name);return original.apply(this,args);};}});
const page=await context.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>report.errors.push(String(e)));
page.setDefaultNavigationTimeout(30000);
const check=async(name,fn)=>{console.log('CHECK '+name);await fn();report.checks.push(name);};
let visit=0;
const go=async(view,extra='')=>{await page.goto(url+'?visual='+ ++visit+'#view='+view+extra);await page.evaluate(()=>document.fonts.ready);};
const settle=async()=>page.waitForFunction(()=>document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).every(a=>a.playState!=='running'));
const audit=async(label,mobile=false)=>{
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+' overflow');
  const text=await page.evaluate(auditVisibleText);assert.deepEqual(text.failures,[],label+' contrast');
  assert.deepEqual(await page.locator('[id]').evaluateAll(nodes=>{const ids=nodes.map(n=>n.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);}),[],label+' duplicate IDs');
  if(mobile){const small=await page.locator('button,select,summary,input:not([type=checkbox]):not([type=radio])').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&!n.closest('[hidden]')&&(r.width<43.9||r.height<43.9);}).map(n=>({id:n.id,classes:n.className,text:n.textContent?.trim().slice(0,35),width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));assert.deepEqual(small,[],label+' undersized controls');report.touchTargets.push({label,minimumPx:44,failures:small});}
  return {texts:text.count||text.samples?.length||null};
};
const compose=async()=>{for(const [id,n] of Object.entries({striker:2,guardian:1,support:1}))await page.locator('#strategy-count-'+id).fill(String(n));};
const command='&target=tarsis&intent=attack&context=solo&step=fleet';
const views=['home','construction','research','fleet','defense','evasion','career','galaxy','guild','reports','practice','more','diplomacy','rankings','command'];
try{
  await check('only reviewed graphics scoring strictly above9.5 are admitted',async()=>{
    const gate=JSON.parse(await readFile('docs/art-source/visual-unification-v1/review-gate.json','utf8'));
    for(const a of gate.assets.filter(a=>a.status==='approved')){assert(a.score>9.5,a.id);report.graphics.push({id:a.id,score:a.score});}
    assert.equal(gate.assets.find(a=>a.id==='facilities-v1').status,'rejected');assert(report.graphics.length>=5);
    const manifest=JSON.parse(await readFile('docs/art-source/visual-unification-v1/manifest.json','utf8'));for(const asset of manifest.runtime){const file=join(root,asset.path.slice('public/'.length));assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),asset.sha256,asset.path+' differs from reviewed artifact');}
  });
  await check('neon fleet shows the exact player composition and explicit phases with one action-triggered arrival effect',async()=>{
    await go('command',command);await compose();await page.locator('#strategy-review').click();await page.locator('#strategy-preview-launch').click();await settle();
    assert.deepEqual(await page.locator('[data-neon-ship]').evaluateAll(nodes=>nodes.map(n=>[n.dataset.neonShip,n.dataset.neonCount])),[['striker','2'],['guardian','1'],['support','1']]);
    assert.deepEqual(await page.locator('.sc-flight-scene [data-neon-unit]').evaluateAll(nodes=>nodes.map(n=>n.dataset.neonUnit)),['striker','striker','guardian','support']);
    const outboundX=await page.locator('.dn-flight-formation').evaluate(el=>el.getBoundingClientRect().x);
    const assets=await page.locator('#resources').innerText();await audit('neon outbound');await page.locator('.sc-order').scrollIntoViewIfNeeded();await page.screenshot({path:join(out,'neon-outbound-desktop.png')});
    await page.locator('#strategy-advance-preview-1').click();assert.equal(await page.locator('[data-neon-phase]').getAttribute('data-neon-phase'),'arrived');assert.equal(await page.locator('.sc-order').evaluate(el=>el.classList.contains('dn-phase-changed')),true);await settle();assert(await page.locator('.dn-flight-formation').evaluate(el=>el.getBoundingClientRect().x)>outboundX,'arrival must anchor near destination');await page.screenshot({path:join(out,'neon-arrived-desktop.png')});
    await page.locator('.sidebar [data-view=research]').click();await page.locator('.sidebar [data-view=fleet]').click();assert.equal(await page.locator('.dn-phase-changed').count(),0,'arrival replayed on navigation');
    await page.locator('#strategy-advance-preview-1').click();assert.equal(await page.locator('[data-neon-phase]').getAttribute('data-neon-phase'),'returning');await page.locator('#strategy-advance-preview-1').click();assert.equal(await page.locator('[data-neon-phase]').getAttribute('data-neon-phase'),'complete');assert.equal(await page.locator('#resources').innerText(),assets);
  });
  await check('all six literal neon units stay separate and inside the scene through mobile and desktop phases',async()=>{
    for(const [width,height] of [[1440,900],[760,900],[390,844],[320,568]]){
      await page.setViewportSize({width,height});await go('command',command);
      for(const [id,n] of Object.entries({striker:3,guardian:1,support:1,scout:1}))await page.locator('#strategy-count-'+id).fill(String(n));
      if(width<=768)await page.locator('.sc-mobile-plan button').click();
      await page.locator('#strategy-review').click();await page.locator('#strategy-preview-launch').click();
      for(const phase of ['outbound','arrived','returning','complete']){
        await settle();assert.equal(await page.locator('[data-neon-phase]').getAttribute('data-neon-phase'),phase);
        assert.deepEqual(await page.locator('[data-neon-unit]').evaluateAll(nodes=>nodes.map(n=>n.dataset.neonUnit)),['striker','striker','striker','guardian','support','scout']);
        const geometry=await page.locator('.sc-flight-scene').evaluate(scene=>{const s=scene.getBoundingClientRect(),units=[...scene.querySelectorAll('[data-neon-unit]')].map(n=>n.getBoundingClientRect());return {outside:units.some(r=>r.left<s.left||r.right>s.right||r.top<s.top||r.bottom>s.bottom),overlap:units.some((r,i)=>units.slice(i+1).some(q=>r.left<q.right&&r.right>q.left&&r.top<q.bottom&&r.bottom>q.top))};});
        assert.deepEqual(geometry,{outside:false,overlap:false},phase+' '+width);
        if(width===320&&phase==='arrived'){await page.locator('.dn-neon-flight').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:join(out,'neon-six-mobile-320.png')});}
        if(phase!=='complete')await page.locator('#strategy-advance-preview-1').click();
      }
    }
  });
  await check('facility graphics follow all six selected comparisons without issuing a command',async()=>{
    await page.setViewportSize({width:1440,height:900});await go('construction');for(const key of ['alloyMine','crystalMine','fuelRefinery','powerPlant','shipyard','laboratory']){await page.locator('[data-workspace-facility='+key+']').click();assert.equal(await page.locator('#workspace-facility-detail [data-facility-art]').getAttribute('data-facility-art'),key);assert.equal(await page.locator('#workspace-facility-detail .ws-command button').isEnabled(),false);}await page.screenshot({path:join(out,'construction-selected-lab.png')});
  });
  await check('all15 demo views preserve readable layouts and controls across8 viewport sizes',async()=>{
    for(const [width,height] of [[1920,1080],[1440,900],[839,1065],[390,844],[360,800],[320,568],[844,390],[390,390]]){
      await page.setViewportSize({width,height});
      for(const view of views){console.log('LAYOUT '+width+'x'+height+' '+view);await go(view,view==='command'?command:'');await audit(view+' '+width+'x'+height,width<=768);report.layouts.push({view,width,height});if(width===1440||width===390&&height===844){await settle();await page.screenshot({path:join(out,view+'-'+width+'.png')});}}
    }
  });
  await check('every view reflows with200percent text at320,390 andlandscape widths',async()=>{
    for(const [width,height] of [[320,568],[390,844],[844,390]]){await page.setViewportSize({width,height});for(const view of views){console.log('TEXT200 '+width+' '+view);await go(view,view==='command'?command:'');await page.evaluate(enlargeText);await audit(view+' text200 '+width,width<=768);report.textLayouts.push({view,width,height});if(['construction','research','more','galaxy'].includes(view))await page.screenshot({path:join(out,view+'-text200-'+width+'.png'),fullPage:true});}}
  });
  await check('new effects stop for system reduced motion, manual pause and controlled page invisibility',async()=>{
    await page.setViewportSize({width:1440,height:900});await page.emulateMedia({reducedMotion:'reduce'});await go('research');await settle();assert.equal(await page.locator('.dn-lead-art').evaluate(el=>el.getAnimations({subtree:true}).length),0);
    await go('command',command);await compose();await page.locator('#strategy-review').click();await page.locator('#strategy-preview-launch').click();assert.equal(await page.locator('.dn-neon-flight').evaluate(el=>el.getAnimations({subtree:true}).length),0);
    await page.emulateMedia({reducedMotion:'no-preference'});await go('research');await page.locator('[data-panel=settings]').click();await page.locator('#pause-motion').check();await page.locator('#dialog-close').click();await page.locator('.sidebar [data-view=construction]').click();assert.equal(await page.locator('#workspace-page').evaluate(el=>el.getAnimations({subtree:true}).length),0,'navigation ignores manual pause');
    await go('research');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.locator('.dn-lead-scan').evaluate(el=>el.getAnimations().every(a=>a.playState==='paused')),true);
  });
  await check('missing new raster assets leave facility costs, navigation and exact fleet review usable',async()=>{
    await page.route('**/art/*',route=>route.abort());await go('construction');assert.equal(await page.locator('.ws-cost-table').count(),1);assert.equal(await page.locator('.ws-command button').isEnabled(),false);await go('command',command);await compose();await page.locator('#strategy-review').click();assert.match(await page.locator('#strategy-confirm-title').innerText(),/4척/);await page.unroute('**/art/*');
  });
  await check('empty and offline screens do not manufacture reports or a successful connection',async()=>{
    await go('reports');await page.locator('#empty-button').click();assert.match(await page.locator('#workspace-body').innerText(),/아직 활동 보고서/);await page.locator('#offline-button').click();assert.equal(await page.locator('.ws-report').count(),0);assert.match(await page.locator('#workspace-body').innerText(),/연결/);
  });
  await check('touch-emulated mobile can compose, review, launch and advance the neon fleet',async()=>{
    const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});c.on('request',r=>{if(r.method()!=='GET'||/\/api\//.test(r.url()))report.requests.push(r.url());});await c.addInitScript(()=>{window.__storageCalls=[];for(const name of ['getItem','setItem','removeItem','clear']){const original=Storage.prototype[name];Storage.prototype[name]=function(...args){window.__storageCalls.push(name);return original.apply(this,args);};}});const touch=await c.newPage();touch.on('pageerror',e=>report.errors.push(String(e)));await touch.goto(url+'?touch=1#view=command'+command);await touch.locator('#strategy-plus-striker').tap();await touch.locator('.sc-mobile-plan button').tap();await touch.locator('#strategy-review').tap();await touch.locator('#strategy-preview-launch').tap();assert.equal(await touch.locator('[data-neon-count]').getAttribute('data-neon-count'),'1');assert.equal(await touch.locator('[data-neon-unit=striker]').count(),1);await touch.locator('#strategy-advance-preview-1').tap();assert.equal(await touch.locator('[data-neon-phase]').getAttribute('data-neon-phase'),'arrived');await touch.waitForFunction(()=>document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).every(a=>a.playState!=='running'));await touch.locator('.dn-neon-flight').evaluate(el=>el.scrollIntoView({block:'start'}));await touch.screenshot({path:join(out,'neon-touch-mobile.png')});assert.deepEqual(await touch.evaluate(()=>window.__storageCalls),[]);await c.close();
  });
  await check('no API mutations, storage calls or script errors occur',async()=>{assert.deepEqual(report.requests,[]);assert.deepEqual(report.errors,[]);assert.deepEqual(await page.evaluate(()=>window.__storageCalls),[]);});
  report.passed=true;
}catch(error){report.passed=false;report.failure=String(error);await page.screenshot({path:join(out,'FAILURE.png'),fullPage:true});throw error;}
finally{await writeFile(join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
console.log(`PASS ${report.checks.length}checks / ${report.layouts.length}layouts / ${report.textLayouts.length}text layouts`);
