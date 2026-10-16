import assert from 'node:assert/strict';
import {join} from 'node:path';
export async function verifyStrategyUI({context,url,out,check,report,auditVisibleText,enlargeText}){
  const page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',e=>report.errors.push(String(e)));
  const settle=async()=>{await page.evaluate(()=>document.fonts.ready.then(()=>true));await page.waitForFunction(()=>document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).every(a=>a.playState!=='running'));};
  const audit=async label=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+' overflow');assert.deepEqual((await page.evaluate(auditVisibleText)).failures,[],label+' contrast');assert.deepEqual(await page.locator('[id]').evaluateAll(nodes=>{const ids=nodes.map(n=>n.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);}),[],label+' duplicate IDs');};
  const goView=hash=>page.goto(page.url().split('#')[0]+hash);
  const compose=async()=>{for(const [id,count] of Object.entries({striker:2,guardian:1,salvage:1,scout:1}))await page.locator('#strategy-count-'+id).fill(String(count));};
  report.operationFonts=[];
  await check('target, fleet command, confirmation and alliance layouts at five viewport sizes',async()=>{
    for(const [width,height] of [[1440,900],[839,1065],[390,844],[320,568],[844,390]]){
      await page.setViewportSize({width,height});await page.goto(url+'?layout='+width+'#view=career');await settle();
      assert.equal(await page.locator('#career-practice-start').count(),0);await audit('targets '+width);
      await page.screenshot({path:join(out,`strategy-targets-${width}x${height}.png`)});
      await page.locator('#strategy-target-tarsis [data-strategy-open]').click();await settle();await audit('command '+width);
      assert.equal(await page.locator('[data-strategy-quantity]').count(),8);assert.equal(await page.locator('#strategy-review').isEnabled(),false);assert.equal(await page.locator('[data-strategy-preset]').count(),0);
      await page.screenshot({path:join(out,`strategy-command-${width}x${height}.png`)});
      await compose();await page.locator('#strategy-review').click();await settle();await audit('confirmation '+width);
      assert.equal(await page.locator('#strategy-confirm-title').evaluate(el=>el===document.activeElement),true);
      await page.screenshot({path:join(out,`strategy-confirm-${width}x${height}.png`)});
      await goView('#view=guild');await settle();await page.evaluate(()=>scrollTo(0,0));await audit('alliance '+width);
      assert.equal(await page.locator('[data-alliance-role]').count(),0);
      await page.waitForFunction(()=>document.querySelector('.sc-alliance-target img')?.naturalWidth>0);
      await page.screenshot({path:join(out,`strategy-alliance-${width}x${height}.png`)});
      await goView('#view=practice');await settle();report.operationFonts.push({width,view:'practice',size:await page.locator('.op-ship-role').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))});
    }
  });
  await check('command editor preserves input nodes and native Back returns from confirmation',async()=>{
    await page.setViewportSize({width:390,height:844});await page.goto(url+'?editor#view=command&target=tarsis&intent=attack&context=solo&step=fleet');
    await compose();
    const input=page.locator('#strategy-count-striker'),handle=await input.elementHandle();await input.fill('3');
    assert.equal(await handle.evaluate(el=>el.isConnected&&el===document.querySelector('#strategy-count-striker')),true);
    assert.equal(await input.evaluate(el=>el===document.activeElement),true);
    assert.match(await page.locator('#strategy-estimate-title').innerText(),/6척/);
    await page.locator('#strategy-review').click();assert.match(await page.locator('#strategy-confirm-title').innerText(),/6척/);
    await page.goBack();await page.waitForFunction(()=>!!document.querySelector('#strategy-review'));
    assert.equal(await page.locator('#strategy-count-striker').inputValue(),'3');
    assert.equal(await page.locator('#strategy-review').evaluate(el=>el===document.activeElement),true);
    await page.goForward();await page.locator('#strategy-confirm-title').waitFor();
    await page.locator('[data-strategy-action="edit"]').click();assert.equal(await page.locator('#strategy-confirm-title').count(),0);
  });
  await check('alliance arrival alignment is explicit and planet/offline changes discard stale confirmation',async()=>{
    await page.goto(url+'?alliance#view=guild');await page.locator('#strategy-alliance-join').click();
    await compose();assert.match(page.url(),/context=alliance/);assert.equal(await page.locator('#strategy-delay').inputValue(),'0');
    const before=await page.locator('#strategy-estimate').innerText();
    await page.locator('[data-strategy-action="align"]').click();assert.equal(await page.locator('#strategy-delay').inputValue(),'1');
    assert.notEqual(await page.locator('#strategy-estimate').innerText(),before);
    await page.locator('#strategy-delay').focus();await page.locator('#strategy-delay').selectOption('2');
    assert.equal(await page.locator('#strategy-delay').evaluate(el=>el===document.activeElement),true);
    await page.locator('#strategy-review').click();await page.locator('#planet-select').selectOption('vesper');
    assert.equal(await page.locator('#strategy-confirm-title').count(),0);assert.equal(await page.locator('#strategy-review').isEnabled(),false);
    await page.locator('#planet-select').selectOption('nova');await page.locator('#strategy-review').click();
    await page.locator('#offline-button').click();assert.equal(await page.locator('#strategy-confirm-title').count(),0);assert.equal(await page.locator('#strategy-review').count(),0);
    await page.locator('#offline-button').click();assert.equal(await page.locator('#strategy-confirm-title').count(),0);
  });
  await check('local launch, recall, arrival and return reserve only preview ships and keep assets unchanged',async()=>{
    await page.goto(url+'?orders#view=command&target=tarsis&intent=attack&context=solo&step=fleet');
    const assets=await page.locator('#resources,#fleet-value').allTextContents();await compose();
    await page.locator('#strategy-review').click();await page.locator('#strategy-preview-launch').click();
    assert.equal(await page.locator('#strategy-order-preview-1').count(),1);
    await page.locator('#strategy-advance-preview-1').click();assert.match(await page.locator('#strategy-order-preview-1').innerText(),/目標|목표 도착/);
    await page.locator('#strategy-advance-preview-1').click();await page.locator('#strategy-advance-preview-1').click();
    assert.match(await page.locator('#strategy-order-preview-1').innerText(),/귀환 완료/);
    assert.deepEqual(await page.locator('#resources,#fleet-value').allTextContents(),assets);
    await page.screenshot({path:join(out,'strategy-return-mobile.png')});
    await goView('#view=command&target=tarsis&intent=attack&context=solo&step=fleet');
    await page.locator('#strategy-review').click();await page.locator('#strategy-preview-launch').click();
    await page.locator('[data-strategy-recall="preview-2"]').click();assert.match(await page.locator('#strategy-order-preview-2').innerText(),/귀환 중/);
    assert.equal(await page.locator('#strategy-order-preview-2 .sc-example-report').count(),0);
    assert.deepEqual(await page.locator('#resources,#fleet-value').allTextContents(),assets);
    assert.deepEqual(await page.evaluate(()=>window.__storageCalls),[]);
  });
  await check('galaxy and defense destinations open the same valid relocation and reinforcement commands',async()=>{
    await page.goto(url+'?entry#view=galaxy&target=vesper');await page.locator('[data-strategy-open="vesper"]').click();
    assert.match(page.url(),/intent=move/);assert.match(await page.locator('#workspace-title').innerText(),/베스퍼 이동/);
    await goView('#view=galaxy&target=mira');await page.locator('[data-strategy-intent="reinforce"]').click();assert.match(page.url(),/intent=reinforce/);
    await goView('#view=defense');await page.locator('.sc-defense [data-strategy-open]').click();assert.match(page.url(),/context=defense/);
  });
  await check('direct and historical confirmations stay safe; relocated fleets station until recalled',async()=>{
    await page.goto(url+'?guard#view=command&target=vesper&intent=move&context=solo&step=confirm');
    assert.match(page.url(),/step=fleet/);assert.equal(await page.locator('#strategy-preview-launch').count(),0);
    await compose();
    await page.locator('#strategy-review').click();await page.locator('#strategy-preview-launch').click();
    await page.goBack();await page.waitForFunction(()=>!!document.querySelector('#strategy-review'));
    assert.match(page.url(),/step=fleet/);assert.equal(await page.locator('#strategy-preview-launch').count(),0);
    await goView('#view=fleet');await page.locator('#strategy-advance-preview-1').click();await page.locator('#strategy-advance-preview-1').click();
    assert.match(await page.locator('#strategy-order-preview-1').innerText(),/현지 주둔 중/);assert.equal(await page.locator('#strategy-advance-preview-1').count(),0);
    await page.locator('[data-strategy-recall="preview-1"]').click();await page.locator('#strategy-advance-preview-1').click();
    assert.match(await page.locator('#strategy-order-preview-1').innerText(),/귀환 완료/);
    await goView('#view=command&target=vesper&intent=move&context=defense&step=fleet');await page.locator('#reset-button').click();
    assert.match(page.url(),/target=tarsis&intent=attack&context=solo&step=fleet/);assert.match(await page.locator('#workspace-title').innerText(),/타르시스 공격/);
  });
  await check('strategy text doubles and reflows at 320, 390 and landscape widths',async()=>{
    for(const [width,height] of [[320,568],[390,844],[844,390]]){
      await page.setViewportSize({width,height});await page.goto(url+'?text='+width+'#view=career');
      const base=await page.locator('.sc-target-card>p').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
      await page.evaluate(enlargeText);const enlarged=await page.locator('.sc-target-card>p').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));assert(Math.abs(enlarged-base*2)<.1);
      await audit('targets text '+width);
      await page.locator('#strategy-target-tarsis [data-strategy-open]').click();await audit('command text '+width);
      await page.screenshot({path:join(out,'strategy-command-text-200-'+width+'.png')});
      await compose();const controls=await page.locator('.sc-quantity input,.sc-quantity button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {w:r.width,h:r.height};}));assert(controls.every(r=>r.w>=44&&r.h>=44));
      await audit('composition text '+width);await page.locator('#strategy-review').click();await audit('confirm text '+width);
      await goView('#view=guild');await audit('alliance text '+width);await page.screenshot({path:join(out,'strategy-alliance-text-200-'+width+'.png')});
      await goView('#view=defense');await audit('defense text '+width);
    }
  });
  await page.close();
}
