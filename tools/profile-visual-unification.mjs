// Small, reproducible localhost comparison; not INP or a real-device benchmark.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,sep,extname} from 'node:path';
import {homedir} from 'node:os';
const require=createRequire(import.meta.url),pw=require(process.env.DELTA_NOVA_PLAYWRIGHT||join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const before=resolve(process.env.DELTA_NOVA_BASELINE_ROOT||'.delta-nova/visual-unification-baseline/public'),after=resolve('public'),out=resolve('.delta-nova/visual-unification-performance.json');
async function serve(root){const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert(p.startsWith(root+sep));res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp'})[extname(p)]||'application/octet-stream');res.end(await readFile(p));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));return {server,url:`http://127.0.0.1:${server.address().port}/uiux-demo/index.html`};}
const baseline='766b248119495122d38dbe7e0cd67c0187a1edc7';
const tracked=execFileSync('git',['ls-tree','-r','--format=%(objectname) %(path)',baseline,'public/uiux-demo'],{encoding:'utf8',windowsHide:true}).trim().split('\n');
for(const entry of tracked){const [expected,...parts]=entry.split(' '),relative=parts.join(' ').trim().slice('public/'.length),bytes=await readFile(join(before,relative)),hash=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');assert.equal(hash,expected,'baseline drift: '+relative);}
const b=await serve(before),a=await serve(after),browser=await pw.chromium.launch({headless:true,executablePath:process.env.DELTA_NOVA_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report={baseline,baselineFilesVerified:tracked.length,date:new Date().toISOString(),method:'Alternating before/after; 3 cold contexts per view; 1440x900; shared Windows host; unthrottled headless Chrome. Resource decodedBodySize is body bytes, not compressed network transfer. doubleRAF after DOM input dispatch is not INP.',samples:[],summary:{}};
try{
  for(const view of ['construction','research','galaxy','command'])for(let repeat=0;repeat<3;repeat++)for(const [label,site] of repeat%2?[['after',a],['before',b]]:[['before',b],['after',a]]){
    console.log(`${view} ${repeat+1} ${label}`);const c=await browser.newContext({viewport:{width:1440,height:900}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));const mutations=[];p.on('request',r=>{if(r.method()!=='GET'||/\/api\//.test(r.url()))mutations.push(r.url());});
    await p.goto(site.url+'#view='+view+(view==='command'?'&target=tarsis&intent=attack&context=solo&step=fleet':''));await p.locator('#workspace-title').waitFor();await p.evaluate(()=>document.fonts.ready);
    const metrics=await p.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0],art=performance.getEntriesByType('resource').filter(r=>r.name.includes('/art/'));return {dcl:n.domContentLoadedEventEnd,load:n.loadEventEnd,artBodyBytes:art.reduce((s,r)=>s+r.decodedBodySize,0),art:art.map(r=>({file:r.name.split('/').pop(),bodyBytes:r.decodedBodySize}))};});
    const input=[];if(view==='command')for(let i=0;i<12;i++)input.push(await p.evaluate(i=>new Promise(resolve=>{const t=performance.now(),el=document.getElementById('strategy-count-striker');el.value=String(i%2+1);el.dispatchEvent(new Event('input',{bubbles:true}));requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-t)));}),i));
    assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);report.samples.push({view,repeat:repeat+1,label,...metrics,inputDoubleRafMs:input});await c.close();
  }
  const median=ns=>{const a=[...ns].sort((a,b)=>a-b);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
  for(const view of ['construction','research','galaxy','command']){report.summary[view]={};for(const label of ['before','after']){const rows=report.samples.filter(r=>r.view===view&&r.label===label),inputs=rows.flatMap(r=>r.inputDoubleRafMs).sort((a,b)=>a-b);report.summary[view][label]={dclMedianMs:median(rows.map(r=>r.dcl)),loadMedianMs:median(rows.map(r=>r.load)),artBodyBytes:rows.map(r=>r.artBodyBytes),...(inputs.length?{inputDoubleRafMedianMs:median(inputs),inputDoubleRafP95Ms:inputs[Math.ceil(inputs.length*.95)-1]}:{})};}}
  report.passed=true;
}finally{await mkdir(resolve('.delta-nova'),{recursive:true});await writeFile(out,JSON.stringify(report,null,2));await browser.close();await Promise.all([new Promise(r=>a.server.close(r)),new Promise(r=>b.server.close(r))]);}
console.log(JSON.stringify(report.summary,null,2));
