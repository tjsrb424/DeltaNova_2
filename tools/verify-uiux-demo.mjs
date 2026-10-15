import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, extname, sep, join } from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
for (const candidate of [process.env.DELTA_NOVA_PLAYWRIGHT, 'playwright', 'C:/Users/delic/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'].filter(Boolean)) {
  try { playwright = require(candidate); break; } catch {}
}
assert(playwright, 'Use an existing Playwright runtime; no installation is performed. Set DELTA_NOVA_PLAYWRIGHT if needed.');
let executable;
for (const candidate of [process.env.DELTA_NOVA_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean)) {
  try { await access(candidate); executable = candidate; break; } catch {}
}
assert(executable, 'A local Chromium executable is required; only headless mode is permitted.');
const root = resolve(process.env.DELTA_NOVA_DEMO_ROOT || 'public');
const output = resolve(process.env.DELTA_NOVA_DEMO_QA || 'docs/qa/2026-10-15-refoundation');
await mkdir(output, { recursive: true });
const results = { at: new Date().toISOString(), browser: executable, root, viewports: [], tasks: [], consoleErrors: [], apiRequests: [], checks: {} };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const filename = resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!filename.startsWith(root + sep)) throw Error('Invalid path');
    const body = await readFile(filename);
    response.setHeader('Content-Type', {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png'}[extname(filename)] || 'application/octet-stream');
    response.end(body);
  } catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
let browser;
const settle = async page => {
  await page.locator('#planet-scene[aria-busy="false"]').waitFor();
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); });
};
try {
  browser = await playwright.chromium.launch({ headless: true, executablePath: executable });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    window.__storageAccess = [];
    for (const method of ['getItem','setItem','removeItem','clear']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function(...args) { window.__storageAccess.push(method); return original.apply(this,args); };
    }
    window.__longTasks = [];
    try { new PerformanceObserver(list => window.__longTasks.push(...list.getEntries().map(e => Math.round(e.duration)))).observe({type:'longtask', buffered:true}); } catch {}
  });
  context.on('request', request => { if (/\/api\//.test(request.url()) || request.method() !== 'GET') results.apiRequests.push(request.url()); });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => results.consoleErrors.push(String(e)));
  page.on('console', message => { if (message.type() === 'error') results.consoleErrors.push(message.text()); });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [width, height] of [[1920,1080],[1440,900],[1280,720],[1024,768],[390,844],[360,800]]) {
    await page.setViewportSize({width,height});
    await page.goto(base + '/uiux-demo/index.html');
    for (const [state,label] of [['idle','평시'],['threat','적 함대 접근'],['complete','행동 완료']]) {
      // Each state starts from peace so completion and threat have distinct captures.
      await page.getByRole('button',{name:'평시',exact:true}).click();
      await page.getByRole('button',{name:label,exact:true}).click();
      await settle(page);
      const dimensions = await page.evaluate(() => {
        const scene = document.querySelector('.planet-scene').getBoundingClientRect();
        const globe = document.querySelector('.globe-wrap').getBoundingClientRect();
        const target = document.querySelector('#threat-banner:not([hidden]) .button') || (innerWidth <= 768 ? document.querySelector('#mobile-priority .button') : document.querySelector('#context .button'));
        const rect = target.getBoundingClientRect();
        const center = document.elementFromPoint(rect.x + rect.width/2, rect.y + rect.height/2);
        return { documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth, cta: {top:rect.top,bottom:rect.bottom,visible:rect.top >= 0 && rect.bottom <= innerHeight && (target === center || target.contains(center))}, globeInside: globe.left >= scene.left-1 && globe.right <= scene.right+1 && globe.top >= scene.top-1 && globe.bottom <= scene.bottom+1 };
      });
      assert(dimensions.documentWidth <= width, `Horizontal overflow ${width} ${state}`);
      assert(dimensions.globeInside, `Clipped planet ${width} ${state}`);
      assert(dimensions.cta.visible, `Main CTA hidden ${width} ${state}: ${JSON.stringify(dimensions.cta)}`);
      await page.screenshot({path:join(output,`${state}-${width}x${height}.png`)});
      results.viewports.push({width,height,state,...dimensions});
    }
  }
  console.log('PASS: 18 viewport/state cases');
  await page.setViewportSize({width:1440,height:900});
  await page.reload();
  await settle(page);
  const novaImage = await page.locator('#planet-canvas').evaluate(canvas=>canvas.toDataURL());
  const renderCount = await page.evaluate(()=>performance.getEntriesByName('planet-render').length);
  await page.locator('#planet-select').selectOption('vesper');
  await page.locator('#planet-select').selectOption('nova');
  await page.waitForFunction(count=>performance.getEntriesByName('planet-render').length>=count+2,renderCount);
  assert.equal(await page.locator('#planet-canvas').evaluate(canvas=>canvas.toDataURL()),novaImage,'A slow previous planet must not overwrite the current selection');
  results.checks.planetSelection='PASS: rapid selection preserves the current planet after stale rendering finishes';
  const menuPanels = { construction:'건설 관리', research:'연구 관리', fleet:'함대 현황', career:'개인 작전', galaxy:'은하 · 정찰', guild:'동맹 · 공동 작전', reports:'활동 보고서', practice:'편성 연습' };
  for (const [key,title] of Object.entries(menuPanels)) {
    const source = page.locator(`.sidebar [data-panel="${key}"]`);
    await source.click();
    await page.getByRole('dialog').waitFor({state:'visible'});
    assert.equal(await page.locator('#dialog-title').textContent(),title);
    await page.keyboard.press('Escape');
    assert(await source.evaluate(el => el === document.activeElement),`Focus return ${key}`);
  }
  results.tasks.push({task:'C. 함대 상세',actions:1,result:'PASS'}, {task:'E. 상세 종료·포커스 복귀',result:'PASS',panels:8});
  await page.getByRole('button',{name:'합금 자원 상세'}).click();
  assert((await page.locator('#dialog-content').textContent()).includes('보유 / 저장 한도'));
  assert((await page.locator('#dialog-content').textContent()).includes('생산'));
  await page.keyboard.press('Escape');
  results.tasks.push({task:'A. 자원 보유량/생산량 구별',actions:1,result:'PASS (자동 동작 검사; 사람 인지 시간 미측정)'});
  await page.getByRole('button',{name:'연결 오류 예시',exact:true}).click();
  await page.getByRole('button',{name:'다시 표시 · 데모'}).click();
  assert(await page.evaluate(()=>document.activeElement !== document.body),'Retry must preserve meaningful keyboard focus');
  const loadingResource=page.getByRole('button',{name:'합금 자원 상세'});
  await loadingResource.click();
  await page.locator('#connection-state').waitFor({state:'hidden'});
  await page.keyboard.press('Escape');
  // Native dialog queues its close event; verify focus after the handler completes.
  await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='합금 자원 상세');
  assert(await loadingResource.evaluate(el=>el===document.activeElement),'Return to replaced resource trigger after background retry');
  await page.getByRole('button',{name:'건설 관리 열기',exact:true}).click();
  await page.keyboard.press('Shift+Tab');
  assert(await page.locator('#dialog-return').evaluate(el => el === document.activeElement),'Native focus trap');
  await page.keyboard.press('Tab');
  assert(await page.locator('#dialog-close').evaluate(el => el === document.activeElement),'Native focus cycle');
  await page.keyboard.press('Escape');
  results.tasks.push({task:'B. 진행 작업·건설 관리',actions:1,result:'PASS (예시 타이머 고정)'});
  await page.getByRole('button',{name:'적 함대 접근',exact:true}).click();
  await page.getByRole('button',{name:'적 함대 접근',exact:true}).click();
  assert.equal(await page.locator('#threat-banner').count(),1);
  await page.locator('#planet-select').selectOption('vesper');
  await page.getByRole('button',{name:'회피 계획 검토',exact:false}).click();
  assert((await page.locator('#dialog-content').textContent()).includes('노바 프라임'));
  assert((await page.locator('#dialog-content').textContent()).includes('베스퍼'));
  assert(await page.getByRole('button',{name:'함대 이동 확정 · 미연결'}).isDisabled());
  await settle(page);
  await page.screenshot({path:join(output,'evasion-review-desktop.png')});
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#planet-select').inputValue(),'vesper');
  await page.getByRole('button',{name:'행동 완료',exact:true}).click();
  assert(await page.locator('#threat-banner').isVisible());
  assert((await page.locator('#context').textContent()).includes('위협 예시는 계속 유지'));
  results.tasks.push({task:'D. 위협 대상·회피 검토·종료',actions:1,result:'PASS (실제 명령 불가)',duplicateBanner:false});
  await page.getByRole('button',{name:'평시',exact:true}).click();
  await page.locator('#planet-select').selectOption('nova');
  const before = await page.locator('#surface-markers i').count();
  await page.getByRole('button',{name:'시설 스냅샷 변경',exact:true}).click();
  assert(await page.locator('#surface-markers i').count() > before);
  assert.equal(await page.locator('#orbit-facility').getAttribute('data-level'),'2');
  await page.getByRole('button',{name:'시설 스냅샷 변경',exact:true}).click();
  assert.equal(await page.locator('#surface-markers i').count(),before);
  await page.getByRole('button',{name:'빈 작업 상태',exact:true}).click();
  assert((await page.locator('#queue').textContent()).includes('진행 중인 작업 없음'));
  await page.screenshot({path:join(output,'empty-desktop.png')});
  await page.getByRole('button',{name:'연결 오류 예시',exact:true}).click();
  assert((await page.locator('#connection-state').textContent()).includes('마지막 예시 스냅샷'));
  await page.screenshot({path:join(output,'offline-desktop.png')});
  await page.getByRole('button',{name:'다시 표시 · 데모'}).click();
  assert((await page.locator('#connection-state').textContent()).includes('불러오는 상태 예시'));
  await page.screenshot({path:join(output,'loading-desktop.png')});
  await page.locator('#connection-state').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'초기화',exact:true}).click();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'적 함대 접근',exact:true}).click();
  assert.equal(await page.evaluate(() => document.getAnimations().filter(a=>a.playState==='running').length),0);
  await page.getByRole('button',{name:'회피 계획 검토',exact:false}).click();
  assert(await page.getByRole('dialog').isVisible());
  await page.keyboard.press('Escape');
  results.checks.reducedMotion = 'PASS: no running animations; threat and modal still usable';
  console.log('PASS: task flows, retry focus restoration, Tab cycle, fixture states, reduced motion');
  await page.getByRole('button',{name:'평시',exact:true}).click();
  const contrast = await page.evaluate(() => {
    const parse = color => color.match(/[\d.]+/g)?.map(Number);
    const luminance = rgb => rgb.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
    const failures = [], checked = [];
    for (const el of document.querySelectorAll('body *')) {
      if (!el.getClientRects().length || el.closest('svg,canvas,button:disabled') || ![...el.childNodes].some(n=>n.nodeType===3 && n.textContent.trim())) continue;
      const style = getComputedStyle(el), color = parse(style.color);
      if (!color) continue;
      let parent = el, bg;
      while (parent) { const c = parse(getComputedStyle(parent).backgroundColor); if(c && (c[3] === undefined || c[3] >= 1)) { bg=c; break; } parent=parent.parentElement; }
      bg ||= [8,14,24];
      const l1=luminance(color),l2=luminance(bg),ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
      const threshold = parseFloat(style.fontSize)>=24 || (parseFloat(style.fontSize)>=18.66 && parseInt(style.fontWeight)>=700) ? 3 : 4.5;
      const item={text:el.textContent.trim().slice(0,50),ratio:+ratio.toFixed(2),threshold};
      checked.push(item);if(ratio<threshold)failures.push(item);
    }
    return {checked:checked.length,minimum:Math.min(...checked.map(x=>x.ratio)),failures};
  });
  results.checks.contrast = contrast;
  assert.equal(contrast.failures.length,0,'Visible text contrast failures: '+JSON.stringify(contrast.failures));
  // Browser zoom halves the CSS layout viewport; CSS zoom alone does not trigger breakpoints.
  await page.setViewportSize({width:720,height:450});
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),'200% equivalent reflow overflow');
  await page.screenshot({path:join(output,'zoom-200-percent.png')});
  await page.getByRole('button',{name:'적 함대 접근',exact:true}).click();
  await page.getByRole('button',{name:'회피 계획 검토',exact:false}).click();
  await page.keyboard.press('Escape');
  await page.setViewportSize({width:1440,height:900});
  await page.getByRole('button',{name:'평시',exact:true}).click();
  await page.evaluate(() => {
    const items=[...document.querySelectorAll('body *')].filter(el=>el.getClientRects().length && !el.closest('svg,canvas'));
    const sizes=items.map(el=>parseFloat(getComputedStyle(el).fontSize));
    items.forEach((el,i)=>el.style.fontSize=(sizes[i]*2)+'px');
  });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),'200% text enlargement overflow');
  await page.screenshot({path:join(output,'text-200-percent.png'),fullPage:true});
  results.checks.zoom='PASS: 720x450 CSS reflow equivalent to 1440x900 at 200%; separately enlarged visible text 200% at 1440px';
  results.checks.storageAccess = await page.evaluate(()=>window.__storageAccess);
  assert.equal(results.checks.storageAccess.length,0);
  results.checks.performance = await page.evaluate(()=>({navigation:performance.getEntriesByType('navigation').map(n=>({loadMs:Math.round(n.loadEventEnd),domContentLoadedMs:Math.round(n.domContentLoadedEventEnd),transferBytes:n.transferSize})),resources:performance.getEntriesByType('resource').map(r=>({name:r.name.split('/').pop(),bytes:r.decodedBodySize})),planetRenderMs:performance.getEntriesByName('planet-render').map(e=>+e.duration.toFixed(2)),longTasksMs:window.__longTasks}));
  assert(!results.checks.performance.longTasksMs.some(ms=>ms>=250),'Initial planet rendering must not monopolize the main thread for 250ms');
  await page.close();
  console.log('PASS: text contrast, 200% equivalent reflow and text enlargement');
  const touchContext = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const touchPage=await touchContext.newPage();
  touchPage.setDefaultTimeout(15000);
  await touchPage.goto(base+'/uiux-demo/index.html');
  await touchPage.getByRole('button',{name:'적 함대 접근',exact:true}).tap();
  await settle(touchPage);
  await touchPage.getByRole('button',{name:'회피 계획 검토',exact:false}).tap();
  assert(await touchPage.getByRole('dialog').isVisible());
  await settle(touchPage);
  await touchPage.screenshot({path:join(output,'evasion-review-mobile.png')});
  await touchPage.getByRole('button',{name:'상세 닫기',exact:true}).tap();
  await touchPage.getByRole('button',{name:'더보기',exact:true}).tap();
  for (const key of ['career','galaxy','defense','guild','diplomacy','rankings','reports','practice','settings']) assert(await touchPage.locator(`#dialog-content [data-panel="${key}"]`).isVisible());
  await touchPage.getByRole('button',{name:'닫고 돌아가기',exact:true}).tap();
  await touchPage.getByRole('button',{name:'평시',exact:true}).tap();
  await settle(touchPage);
  await touchPage.screenshot({path:join(output,'idle-mobile-full.png'),fullPage:true});
  results.checks.touch = 'PASS: tap threat/review/close/more; all secondary menus retained';
  assert.equal(results.apiRequests.length,0);
  assert.equal(results.consoleErrors.length,0);
  results.checks.network='PASS: no API requests or non-GET commands';
  results.checks.keyboard='PASS: Escape, focus return and native Tab cycle';
  results.status='PASS';
  console.log(`UIUX headless PASS: ${results.viewports.length} state/viewport cases, five task flows, touch, keyboard, zoom, reduced motion, contrast, zero API/storage activity.`);
} catch(error) {
  results.status='FAIL';results.failure=String(error);throw error;
} finally {
  await writeFile(join(output,'checks.json'),JSON.stringify(results,null,2));
  await browser?.close();
  await new Promise(r=>server.close(r));
}
