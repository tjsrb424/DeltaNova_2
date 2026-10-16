// Headless command performance isolation. No game API, installations or open windows.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {resolve,join,sep,extname} from 'node:path';
import {homedir} from 'node:os';
const require=createRequire(import.meta.url);
const pw=require(process.env.DELTA_NOVA_PLAYWRIGHT||join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const before=resolve('.delta-nova/command-perf-baseline/public'),after=resolve(process.env.DELTA_NOVA_DEMO_ROOT||'public');
const ref='255fa766ee92e1c1794e440e9e35d02c5b1ea080',out=resolve(process.env.DELTA_NOVA_COMMAND_PROFILE_OUT||'.delta-nova/command-isolation.json');
const repeats=Number(process.env.DELTA_NOVA_COMMAND_REPEATS||3),single=process.env.DELTA_NOVA_COMMAND_LABEL;
const instrumentOnly=process.env.DELTA_NOVA_COMMAND_MODE==='cost';
const noPreload=process.env.DELTA_NOVA_COMMAND_NO_PRELOAD==='1';
const memoryMode=process.env.DELTA_NOVA_COMMAND_MEMORY==='1';
const tracked=execFileSync('git',['ls-tree','-r','--format=%(objectname) %(path)',ref,'public/uiux-demo'],{encoding:'utf8',windowsHide:true}).trim().split('\n');
for(const row of tracked){const [sha,...parts]=row.split(' '),p=parts.join(' ').trim().slice(7),b=await readFile(join(before,p));assert.equal(createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex'),sha,p+' baseline drift');}
function instrument(text){
  for(const name of ['hydrateIcons','render','renderCurrentWorkspace','refreshStrategy','changeStrategy']){
    const re=new RegExp('function '+name+'\\(');assert(re.test(text),name+' missing');
    text=text.replace(re,'function measured_'+name+'(');
    text+='\nfunction '+name+'(...args){const t=performance.now();try{return measured_'+name+'(...args)}finally{window.__costs.push({name:"'+name+'",ms:performance.now()-t,input:window.__editing})}}\n';
  }
  return text;
}
async function serve(root){
  const buffers=new Map();
  if(memoryMode)for(const relative of await readdir(join(root,'uiux-demo'),{recursive:true})){
    if(/\.(html|css|js|webp|png)$/.test(relative)){const p=join(root,'uiux-demo',relative);buffers.set(p,await readFile(p));}
  }
  const server=createServer(async(req,res)=>{
    try{
      const p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert(p.startsWith(root+sep));
      const started=performance.now();let body=memoryMode?buffers.get(p):await readFile(p);assert(body,'missing static file');const fileReadMs=performance.now()-started;
      if(req.url.startsWith('/uiux-demo/main.js')&&instrumentOnly)body=Buffer.from(instrument(body.toString()));
      if(root===after&&extname(p)==='.html'&&noPreload)body=Buffer.from(body.toString().replace(/<link rel="modulepreload"[^>]+>/g,''));
      res.setHeader('Server-Timing','file;dur='+fileReadMs.toFixed(3));
      res.setHeader('Cache-Control','no-store');
      res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp'})[extname(p)]||'application/octet-stream');
      res.end(body);
    }catch(error){res.writeHead(404);res.end(String(error));}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  return {server,url:'http://127.0.0.1:'+server.address().port+'/uiux-demo/index.html#view=command&target=tarsis&intent=attack&context=solo&step=fleet'};
}
const b=await serve(before),a=await serve(after);
const browser=await pw.chromium.launch({headless:true,executablePath:process.env.DELTA_NOVA_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report={date:new Date().toISOString(),ref,browser:browser.version(),repeats,mode:instrumentOnly?'function-cost':'unmodified-cold',method:{viewport:'390x844 DPR3 mobile/touch',downBps:1600000,upBps:750000,latencyMs:150,cpuSlowdown:4,cache:false,ready:'MutationObserver DOM initialization, not input response',input:'Original six serial synthetic edits and doubleRAF, not INP. Cost mode wraps functions in served main.js only.'},samples:[]};
report.modulePreloadAblation=noPreload;
report.method.server=memoryMode?'Both static roots preloaded before measurement; RAM lookup removes repeated filesystem waits. Browser HTTP cache remains disabled.':'Original per-request filesystem reads; Server-Timing records read wait.';
report.method.input=(instrumentOnly?30:6)+' serial synthetic edits per page and doubleRAF; not INP. Cost mode wraps served main.js functions only.';
report.currentFiles=[];for(const file of ['index.html','main.js','route-preview.js','strategy.js','strategy.css','workspace.js','workspace.css'])report.currentFiles.push({file,sha256:createHash('sha256').update(await readFile(join(after,'uiux-demo',file))).digest('hex')});
try{
 for(let repeat=0;repeat<repeats;repeat++){
  for(const [label,site] of (repeat%2?[['after',a],['before',b]]:[['before',b],['after',a]]).filter(([l])=>!single||single===l)){
   console.log(report.mode+' '+(repeat+1)+' '+label);
   const c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}),p=await c.newPage(),cdp=await c.newCDPSession(p);
   const errors=[],mutations=[];p.on('pageerror',e=>errors.push(String(e)));p.on('request',r=>{if(r.method()!=='GET'||/\/api\//.test(r.url()))mutations.push(r.url());});
   await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
   await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1600000/8,uploadThroughput:750000/8});
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Performance.enable');
   await p.addInitScript(()=>{
     window.__costs=[];window.__editing=false;window.__ready=null;window.__long=[];window.__shifts=0;window.__lcp=0;
     new MutationObserver(()=>{if(window.__ready===null&&document.querySelectorAll('#resources button').length===3&&document.querySelector('#workspace-title')?.textContent)window.__ready=performance.now();}).observe(document,{childList:true,subtree:true});
     new PerformanceObserver(list=>{for(const e of list.getEntries())window.__long.push({start:e.startTime,ms:e.duration});}).observe({type:'longtask',buffered:true});
     new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__shifts+=e.value;}).observe({type:'layout-shift',buffered:true});
     new PerformanceObserver(list=>{for(const e of list.getEntries()){window.__lcp=e.startTime;window.__lcpDetail={tag:e.element?.tagName,id:e.element?.id,className:e.element?.className,url:e.url?.split('/').pop(),size:e.size};}}).observe({type:'largest-contentful-paint',buffered:true});
   });
   await p.goto(site.url,{waitUntil:'load',timeout:60000});await p.waitForFunction(()=>window.__ready!==null);
   await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const loading=await p.evaluate(()=>{
    const n=performance.getEntriesByType('navigation')[0],rs=performance.getEntriesByType('resource');
    return {ready:window.__ready,dcl:n.domContentLoadedEventEnd,load:n.loadEventEnd,fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,lcp:window.__lcp,lcpDetail:window.__lcpDetail,resourceBodyBytes:rs.reduce((sum,r)=>sum+r.decodedBodySize,0),shiftSum:window.__shifts,longTasks:window.__long,resources:rs.map(r=>({file:r.name.split('/').pop(),type:r.initiatorType,start:r.startTime,request:r.requestStart,response:r.responseStart,end:r.responseEnd,queue:r.requestStart-r.startTime,ttfb:r.responseStart-r.requestStart,download:r.responseEnd-r.responseStart,fileRead:r.serverTiming?.find(t=>t.name==='file')?.duration,bytes:r.decodedBodySize}))};
   });
   const beforeMetrics=(await cdp.send('Performance.getMetrics')).metrics;
   const count=instrumentOnly?30:6,inputs=[];
   for(let i=0;i<count;i++)inputs.push(await p.evaluate(i=>new Promise(r=>{
     window.__editing=true;const start=performance.now(),el=document.getElementById('strategy-count-striker');el.value=String(i%2+1);el.dispatchEvent(new Event('input',{bubbles:true}));const handler=performance.now()-start;
     requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__editing=false;r({handler,doubleRAF:performance.now()-start});}));
   }),i));
   const afterMetrics=(await cdp.send('Performance.getMetrics')).metrics;
   const metrics={};for(const name of ['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount'])metrics[name]=afterMetrics.find(m=>m.name===name).value-beforeMetrics.find(m=>m.name===name).value;
   const costs=await p.evaluate(()=>window.__costs);
   assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);
   report.samples.push({label,repeat:repeat+1,loading,inputs,costs,startupMetrics:beforeMetrics,inputMetrics:metrics});
   await c.close();await mkdir(resolve(out,'..'),{recursive:true});await writeFile(out,JSON.stringify(report,null,2));
  }
 }
 report.passed=true;
}finally{
 await writeFile(out,JSON.stringify(report,null,2));await browser.close();
 await Promise.all([new Promise(r=>a.server.close(r)),new Promise(r=>b.server.close(r))]);
}
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2;};
for(const label of ['before','after']){
 const rows=report.samples.filter(s=>s.label===label);if(!rows.length)continue;
 console.log(JSON.stringify({label,ready:rows.map(s=>s.loading.ready),handlerMedian:median(rows.flatMap(s=>s.inputs.map(i=>i.handler))),doubleRAF:median(rows.flatMap(s=>s.inputs.map(i=>i.doubleRAF))),layoutCounts:rows.map(s=>s.inputMetrics.LayoutCount),styleCounts:rows.map(s=>s.inputMetrics.RecalcStyleCount),coldCosts:rows.map(s=>s.costs.filter(x=>!x.input))}));
}
