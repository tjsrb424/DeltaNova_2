// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

// Canvas rendering is checked in a real browser. Exercise the actual DOM controller here.
vi.mock('../public/uiux-demo/planet.js', () => ({ drawPlanet: async () => {}, syncPlanetMotion: () => {} }));
const html = readFileSync(resolve('public/uiux-demo/index.html'), 'utf8');
const click = (selector: string) => (document.querySelector(selector) as HTMLElement).click();
const composeFleet = () => { for(const [id,value] of Object.entries({striker:2,guardian:1,salvage:1,scout:1})){const input=document.querySelector('#strategy-count-'+id) as HTMLInputElement;input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));} };
let disposeDemo: (() => void) | undefined;
const closeDetail = async () => { click('#dialog-close'); await vi.advanceTimersByTimeAsync(40); };
describe('disconnected design demo', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    history.replaceState(null, '', '/uiux-demo/index.html');
    document.open(); document.write(html); document.close();
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal('scrollTo', vi.fn());
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new Event('close')); };
    disposeDemo = (await import('../public/uiux-demo/main.js')).disposeDemo;
  });
  afterEach(() => { disposeDemo?.(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });
  it('prepares a fleet command, preserves live inputs, and previews it without spending assets',()=>{
    click('.sidebar [data-view="career"]');
    click('#strategy-target-tarsis [data-strategy-open]');
    expect(document.querySelector('#workspace-title')?.textContent).toContain('타르시스 공격');
    const assets=document.querySelector('#resources')!.textContent;
    const input=document.querySelector('#strategy-count-striker') as HTMLInputElement;
    expect((document.querySelector('#strategy-review') as HTMLButtonElement).disabled).toBe(true);
    input.focus();input.value='1';input.dispatchEvent(new Event('input',{bubbles:true}));
    expect(document.querySelector('#strategy-count-striker')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(document.querySelector('#strategy-picked')?.textContent).toContain('×1');
    click('#strategy-review');
    expect(document.querySelector('#strategy-confirm-title')?.textContent).toContain('1척');
    expect(document.activeElement?.id).toBe('strategy-confirm-title');
    click('#strategy-preview-launch');
    expect(document.querySelector('#strategy-order-preview-1')?.textContent).toContain('타르시스');
    expect(document.querySelector('#resources')!.textContent).toBe(assets);
    click('#strategy-advance-preview-1');
    expect(document.querySelector('#strategy-order-preview-1')?.textContent).toContain('목표 도착');
  });
  it('aligns alliance arrival only when requested and uses the common fleet command',()=>{
    click('.sidebar [data-view="guild"]');click('#strategy-alliance-join');
    expect(location.hash).toContain('context=alliance');
    composeFleet();
    const delay=document.querySelector('#strategy-delay') as HTMLSelectElement;
    expect(delay.value).toBe('0');
    click('[data-strategy-action="align"]');
    expect((document.querySelector('#strategy-delay') as HTMLSelectElement).value).toBe('1');
    click('#strategy-review');
    expect(document.querySelector('#strategy-confirm-title')).not.toBeNull();
    const select=document.querySelector('#planet-select') as HTMLSelectElement;select.value='vesper';select.dispatchEvent(new Event('change',{bubbles:true}));
    expect(document.querySelector('#strategy-confirm-title')).toBeNull();
    expect((document.querySelector('#strategy-review') as HTMLButtonElement).disabled).toBe(true);
  });
  it('resets the command destination and its route together',()=>{
    click('.sidebar [data-view="galaxy"]');
    const target=document.querySelector('#galaxy-target-select') as HTMLSelectElement;target.value='vesper';target.dispatchEvent(new Event('change',{bubbles:true}));
    click('[data-strategy-open="vesper"]');click('#reset-button');
    expect(location.hash).toContain('target=tarsis');expect(location.hash).toContain('intent=attack');
    expect(document.querySelector('#workspace-title')?.textContent).toContain('타르시스 공격');
    composeFleet();click('#strategy-review');expect(document.querySelector('#strategy-confirm-title')?.textContent).toContain('타르시스');
  });
  it('does not recreate a confirmation from browser history after launch',async()=>{
    click('.sidebar [data-view="career"]');click('#strategy-target-tarsis [data-strategy-open]');
    composeFleet();click('#strategy-review');click('#strategy-preview-launch');
    history.back();await vi.advanceTimersByTimeAsync(40);
    expect(document.querySelector('#strategy-confirm-title')).toBeNull();
    expect(document.querySelector('#strategy-preview-launch')).toBeNull();
    expect(location.hash).toContain('step=fleet');
    expect(document.querySelector('#strategy-estimate-title')?.textContent).toContain('1척');
  });
  it('requires a reviewed snapshot for a direct confirmation URL and normalizes alliance identity',()=>{
    history.replaceState(null,'','#view=command&target=mira&intent=reinforce&context=alliance&step=confirm');
    dispatchEvent(new PopStateEvent('popstate'));
    expect(document.querySelector('#strategy-confirm-title')).toBeNull();
    expect(location.hash).toContain('target=tarsis');expect(location.hash).toContain('intent=attack');expect(location.hash).toContain('step=fleet');
  });
  it('explains when the chosen fleet cannot reach the shared arrival time',()=>{
    click('.sidebar [data-view="guild"]');click('#strategy-alliance-join');
    click('#strategy-plus-carrier');
    click('[data-strategy-action="align"]');
    expect((document.querySelector('#strategy-delay') as HTMLSelectElement).value).toBe('0');
    expect(document.querySelector('#announcement')?.textContent).toContain('더 빠른 편성');
    expect(document.querySelector('#announcement')?.textContent).not.toContain('맞췄습니다');
    expect(document.querySelector('#strategy-align-note')?.textContent).toContain('더 빠른 편성');
  });
  it('keeps a relocated preview stationed and offers explicit recall',()=>{
    click('.sidebar [data-view="career"]');click('[data-strategy-intent-tab="move"]');click('#strategy-target-vesper [data-strategy-open]');
    composeFleet();
    click('#strategy-review');click('#strategy-preview-launch');click('#strategy-advance-preview-1');click('#strategy-advance-preview-1');
    expect(document.querySelector('#strategy-order-preview-1')?.textContent).toContain('현지 주둔 중');
    expect(document.querySelector('#strategy-advance-preview-1')).toBeNull();
    expect(document.querySelector('.ws-fleet-summary')?.textContent).toContain('시연 가용 함선5');
    click('[data-strategy-recall="preview-1"]');click('#strategy-advance-preview-1');
    expect(document.querySelector('.ws-fleet-summary')?.textContent).toContain('시연 가용 함선10');
  });
  it('lets the player select a facility and see its next investment without issuing a command', () => {
    click('.sidebar [data-view="construction"]');
    const picker = document.querySelector('[data-workspace-facility="alloyMine"]') as HTMLElement;
    picker.focus(); picker.click();
    const detail = document.querySelector('#workspace-facility-detail')!;
    expect(detail.textContent).toContain('합금 광산');
    expect(detail.textContent).toContain('생산');
    expect(detail.textContent).toContain('비용');
    expect(detail.textContent).toContain('조건');
    expect(detail.querySelector('button:disabled')).not.toBeNull();
    expect(document.activeElement).toBe(picker);
    expect((document.querySelector('dialog') as HTMLDialogElement).open).toBe(false);
    expect(document.querySelector('#workspace-page')!.textContent).toContain('01:24');
  });
  it('uses a central menu hub and shows selected-planet defenses even in peacetime', () => {
    click('.sidebar [data-view="more"]');
    click('#workspace-page [data-view="defense"]');
    expect((document.querySelector('dialog') as HTMLDialogElement).open).toBe(false);
    expect(document.querySelector('#workspace-title')!.textContent).toContain('방어');
    expect(document.querySelector('#workspace-page')!.textContent).toContain('0기');
    expect(document.querySelector('[aria-current="page"][data-view="more"]')).not.toBeNull();
  });
  it('keeps short summaries contextual and offers full management in the central view', () => {
    click('.quick-section [data-panel="fleet"]');
    expect((document.querySelector('dialog') as HTMLDialogElement).open).toBe(true);
    click('#dialog-content [data-view="fleet"]');
    expect((document.querySelector('dialog') as HTMLDialogElement).open).toBe(false);
    expect(document.querySelector('#workspace-title')!.textContent).toContain('함대');
    expect(document.querySelector('.sidebar [data-view="fleet"]')!.getAttribute('aria-current')).toBe('page');
  });
  it('keeps incoming routes on their target while a departure preview leaves inventory unchanged', () => {
    click('[data-state="threat"]');
    click('#departure-button');
    const select = document.querySelector('#planet-select') as HTMLSelectElement;
    select.value = 'vesper'; select.dispatchEvent(new Event('change', {bubbles:true}));
    expect(document.querySelector('#threat-banner')!.textContent).toContain('노바 프라임');
    expect(document.querySelector('#route-status')!.textContent).not.toContain('출항');
    select.value = 'nova'; select.dispatchEvent(new Event('change', {bubbles:true}));
    expect(document.querySelector('#fleet-value')!.textContent).toContain('10');
    expect(document.querySelector('#route-status')!.textContent).toContain('출항');
    expect(document.querySelector('#route-status')!.textContent).toContain('예시');
  });
  it('hides stale resource and fleet amounts in drawers while the snapshot is loading', async () => {
    click('#offline-button'); click('#retry-button');
    click('[data-panel="resources"]');
    expect(document.querySelector('#dialog-content')!.textContent).not.toContain('280 / 400');
    expect(document.querySelector('#dialog-content')!.textContent).toContain('불러오는');
    await closeDetail(); click('.quick-section [data-panel="fleet"]');
    expect(document.querySelector('#dialog-content')!.textContent).not.toContain('10척');
    expect(document.querySelector('#dialog-content')!.textContent).toContain('불러오는');
    vi.advanceTimersByTime(700);
    expect(document.querySelector('#dialog-content')!.textContent).toContain('10척');
  });
  it('keeps the current-work card and facility comparison on the same illustrative level', () => {
    click('#snapshot-button');
    expect(document.querySelector('#context')!.textContent).toContain('Lv.2 → Lv.3');
    click('.sidebar [data-view="construction"]');
    expect(document.querySelector('#workspace-facility-detail')!.textContent).toContain('Lv.2 → Lv.3');
    expect([...document.querySelectorAll('#workspace-facility-detail .ws-effect strong')].map(el=>el.textContent)).toEqual(['+8/분','+12/분']);
  });
  it('preserves the existing-game return route inside the mobile menu', () => {
    click('.sidebar [data-view="more"]');
    expect(document.querySelector('#workspace-page a[href="/"]')).not.toBeNull();
  });
  it('offers local reconnaissance details while keeping real scouting disabled',async()=>{
    click('#recon-button');
    expect((document.querySelector('dialog') as HTMLDialogElement).open).toBe(true);
    expect(document.querySelector('#dialog-content')!.textContent).toContain('S-01');
    expect(document.querySelector('#dialog-content button:disabled')).not.toBeNull();
    await closeDetail();
    const select=document.querySelector('#planet-select') as HTMLSelectElement;
    select.value='vesper';select.dispatchEvent(new Event('change',{bubbles:true}));
    expect((document.querySelector('#recon-button') as HTMLButtonElement).hidden).toBe(true);
  });
  it('preserves the quick facility picker focus when changing its comparison',()=>{
    click('#planet-scene');
    const picker=document.querySelector('#detail-facility-select') as HTMLSelectElement;
    picker.focus(); picker.value='laboratory'; picker.dispatchEvent(new Event('change',{bubbles:true}));
    expect(document.activeElement?.id).toBe('detail-facility-select');
    expect(document.querySelector('#dialog-title')!.textContent).toBe('연구소');
  });
  it('keeps an offline workspace offline when selecting another facility',()=>{
    click('.sidebar [data-view="construction"]');click('#offline-button');
    click('[data-workspace-facility="laboratory"]');
    expect(document.querySelector('#workspace-facility-detail')!.textContent).toContain('연결을 확인할 수 없습니다');
    expect(document.querySelector('#workspace-facility-detail table')).toBeNull();
  });
  it('opens the research facility when following its next-investment action',()=>{
    click('.sidebar [data-view="research"]');
    click('#workspace-page [data-view-facility="laboratory"]');
    expect(document.querySelector('#workspace-facility-detail h3')!.textContent).toBe('연구소');
  });
  it('returns focus to the workspace when closing a detail entered through a direct URL',()=>{
    history.replaceState(null,'','#view=construction&detail=planet&facility=alloyMine');
    dispatchEvent(new PopStateEvent('popstate'));
    expect((document.querySelector('dialog') as HTMLDialogElement).open).toBe(true);
    click('#dialog-close');
    expect((document.querySelector('dialog') as HTMLDialogElement).open).toBe(false);
    expect(document.activeElement?.id).toBe('main');
    expect(document.querySelector('[data-facility="alloyMine"]')!.getAttribute('aria-pressed')).toBe('true');
  });
  it('previews a departure from the fleet workspace without changing inventory or losing control focus',()=>{
    click('.sidebar [data-view="fleet"]');
    const preview=document.querySelector('#fleet-departure-preview') as HTMLButtonElement;
    preview.focus();preview.click();
    expect(document.activeElement?.id).toBe('fleet-departure-preview');
    expect(document.querySelector('#fleet-value')!.textContent).toContain('10');
    expect(document.querySelector('#workspace-page [data-route-eta="outgoing"]')).not.toBeNull();
    click('#fleet-departure-preview');
    expect(document.querySelector('#workspace-page [data-route-eta="outgoing"]')).toBeNull();
    expect(document.querySelector('#fleet-value')!.textContent).toContain('10');
  });
  it('returns to the start when reselecting a major menu without adding history',()=>{
    click('.sidebar [data-view="research"]');
    const entries=history.length;
    vi.mocked(window.scrollTo).mockClear();
    click('.sidebar [data-view="research"]');
    expect(window.scrollTo).toHaveBeenCalledOnce();
    expect(history.length).toBe(entries);
    expect(document.activeElement?.id).toBe('main');
  });
  it('selects an observation target without changing the current planet or its resources',()=>{
    click('.sidebar [data-view="galaxy"]');
    click('#galaxy-row-vesper');
    expect(document.querySelector('#galaxy-target-title')!.textContent).toContain('베스퍼');
    expect((document.querySelector('#planet-select') as HTMLSelectElement).value).toBe('nova');
    expect(document.querySelector('#resources')!.textContent).toContain('280');
    expect(location.hash).toContain('target=vesper');
    expect(document.querySelector('#galaxy-node-vesper')!.getAttribute('aria-pressed')).toBe('true');
  });
  it('keeps the search input mounted and recovers from no matching galaxy targets',()=>{
    click('.sidebar [data-view="galaxy"]');
    const search=document.querySelector('#galaxy-search') as HTMLInputElement;
    search.focus();search.value='no-such-target';search.dispatchEvent(new Event('input',{bubbles:true}));
    expect(document.querySelector('#galaxy-search')).toBe(search);
    expect(document.activeElement).toBe(search);
    expect(document.querySelector('#galaxy-results-count')!.textContent).toContain('0');
    click('#galaxy-clear-query');
    expect(search.value).toBe('');
    expect(document.querySelector('#galaxy-row-tarsis')).not.toBeNull();
    expect(document.activeElement).toBe(search);
  });
  it('attributes a delayed recon example to its original target and never opens a result automatically',async()=>{
    click('.sidebar [data-view="galaxy"]');click('#galaxy-row-tarsis');
    const assets=document.querySelector('#resources')!.textContent;
    click('#galaxy-scan-preview');click('#galaxy-row-vesper');
    await vi.advanceTimersByTimeAsync(1500);
    expect((document.querySelector('dialog') as HTMLDialogElement).open).toBe(false);
    expect(document.querySelector('#galaxy-target-title')!.textContent).toContain('베스퍼');
    click('#galaxy-row-tarsis');click('#galaxy-report-open');
    expect(document.querySelector('#dialog-content')!.textContent).toContain('타르시스');
    expect(document.querySelector('#dialog-content')!.textContent).toContain('시연');
    expect(document.querySelector('#resources')!.textContent).toBe(assets);
  });
  it('switches an owned planet only through an explicit command-center action',()=>{
    click('.sidebar [data-view="galaxy"]');click('#galaxy-row-vesper');
    click('[data-galaxy-home="vesper"]');
    expect((document.querySelector('#planet-select') as HTMLSelectElement).value).toBe('vesper');
    expect((document.querySelector('#home-workspace') as HTMLElement).hidden).toBe(false);
    expect(document.querySelector('#resources')!.textContent).toContain('90');
  });
  it('preserves IME input and an empty search while opening and closing a short detail',async()=>{
    click('.sidebar [data-view="galaxy"]');
    const search=document.querySelector('#galaxy-search') as HTMLInputElement;
    search.focus();search.value='타르시';
    search.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));
    expect(document.querySelector('#galaxy-results-count')!.textContent).toContain('6');
    expect(search.value).toBe('타르시');
    search.value=' 타르시스 ';
    search.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));
    expect(search.value).toBe(' 타르시스 ');
    expect(document.querySelector('#galaxy-results-count')!.textContent).toContain('1');
    search.value='no-such-target';search.dispatchEvent(new Event('input',{bubbles:true}));
    click('[data-panel="settings"]');await closeDetail();
    expect(document.querySelector('#galaxy-results-count')!.textContent).toContain('0');
    expect(search.value).toBe('no-such-target');
  });
  it('cancels unfinished recon while offline without producing a stale report',async()=>{
    click('.sidebar [data-view="galaxy"]');click('#galaxy-scan-preview');
    click('#offline-button');await vi.advanceTimersByTimeAsync(1500);
    expect(document.querySelector('#galaxy-content')!.textContent).toContain('연결 상태');
    expect(document.querySelector('#galaxy-row-tarsis')).toBeNull();
    click('#offline-button');
    expect(document.querySelector('#galaxy-report-open')).toBeNull();
    expect((document.querySelector('#galaxy-scan-preview') as HTMLButtonElement).disabled).toBe(false);
  });
  it('resets pending scans and remembered target even while outside the galaxy view',async()=>{
    click('.sidebar [data-view="galaxy"]');click('#galaxy-scan-preview');click('#galaxy-row-vesper');
    click('.sidebar [data-view="home"]');click('#reset-button');
    await vi.advanceTimersByTimeAsync(1500);
    click('.sidebar [data-view="galaxy"]');
    expect(document.querySelector('#galaxy-target-title')!.textContent).toBe('타르시스');
    expect(document.querySelector('#galaxy-report-open')).toBeNull();
    expect(location.hash).toContain('target=tarsis');
  });
  it('keeps keyboard focus on the busy recon control and after completion',async()=>{
    click('.sidebar [data-view="galaxy"]');
    const scan=document.querySelector('#galaxy-scan-preview') as HTMLButtonElement;
    scan.focus();scan.click();
    expect(document.activeElement?.id).toBe('galaxy-scan-preview');
    expect(document.activeElement?.getAttribute('aria-disabled')).toBe('true');
    await vi.advanceTimersByTimeAsync(1500);
    expect(document.activeElement?.id).toBe('galaxy-scan-preview');
    expect(document.querySelector('#galaxy-report-open')).not.toBeNull();
  });
  it('leaves an unrelated report and its focused control intact when recon completes',async()=>{
    click('.sidebar [data-view="galaxy"]');click('#galaxy-scan-preview');
    click('#galaxy-row-mira');click('#galaxy-report-open');
    const button=document.querySelector('#dialog-content [data-view="galaxy"]') as HTMLButtonElement;
    button.focus();await vi.advanceTimersByTimeAsync(1500);
    expect(document.activeElement).toBe(button);
    expect(button.isConnected).toBe(true);
    expect(document.querySelector('#dialog-content')!.textContent).toContain('미라');
  });
  it('preserves owned-planet and explicit-detail controls through delayed recon completion',async()=>{
    click('.sidebar [data-view="galaxy"]');click('#galaxy-scan-preview');click('#galaxy-row-vesper');
    const home=document.querySelector('#galaxy-home-vesper') as HTMLButtonElement;
    home.focus();await vi.advanceTimersByTimeAsync(1500);
    expect(document.activeElement?.id).toBe('galaxy-home-vesper');
    click('#galaxy-row-tarsis');click('#galaxy-scan-preview');
    const detail=document.querySelector('#galaxy-list-detail') as HTMLButtonElement;
    detail.focus();await vi.advanceTimersByTimeAsync(1500);
    expect(document.activeElement?.id).toBe('galaxy-list-detail');
  });
  it('uses defense relocation and the same command instead of a separate preparation flow',()=>{
    click('.sidebar [data-view="more"]');click('#workspace-page [data-view="defense"]');
    click('.sc-defense [data-strategy-open]');
    expect(location.hash).toContain('intent=move');
    expect(location.hash).toContain('context=defense');
    expect(document.querySelector('#workspace-body')?.textContent).toContain('베스퍼');
  });
  it('updates composition while keeping ship inputs mounted and game assets unchanged',()=>{
    click('.sidebar [data-view="practice"]');
    const assets=document.querySelector('#resources')!.textContent;
    const input=document.querySelector('#practice-count-striker') as HTMLInputElement;
    input.focus();input.value='3';input.dispatchEvent(new Event('change',{bubbles:true}));
    expect(document.querySelector('#practice-count-striker')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(document.querySelector('#practice-summary')!.textContent).toContain('6');
    expect(document.querySelector('#resources')!.textContent).toBe(assets);
    expect(document.querySelector('#fleet-value')!.textContent).toContain('10');
  });
  it('keeps per-planet practice drafts and removes stale local reviews after edits',()=>{
    click('.sidebar [data-view="practice"]');click('#practice-review');
    expect(document.querySelector('#practice-result-title')).not.toBeNull();
    click('#practice-plus-striker');
    expect(document.querySelector('#practice-result-title')).toBeNull();
    const select=document.querySelector('#planet-select') as HTMLSelectElement;
    select.value='vesper';select.dispatchEvent(new Event('change',{bubbles:true}));
    expect((document.querySelector('#practice-count-striker') as HTMLInputElement).value).toBe('0');
    expect((document.querySelector('#practice-plus-striker') as HTMLButtonElement).disabled).toBe(true);
    select.value='nova';select.dispatchEvent(new Event('change',{bubbles:true}));
    expect((document.querySelector('#practice-count-striker') as HTMLInputElement).value).toBe('3');
  });
  it('keeps the review action mounted when a number input commits a changed value',()=>{
    click('.sidebar [data-view="practice"]');
    const button=document.querySelector('#practice-review') as HTMLButtonElement;
    const input=document.querySelector('#practice-count-striker') as HTMLInputElement;
    input.focus();input.value='3';input.dispatchEvent(new Event('change',{bubbles:true}));
    expect(document.querySelector('#practice-review')).toBe(button);
    button.click();
    expect(document.activeElement?.id).toBe('practice-result-title');
  });
  it('preserves stepper keyboard focus when the quantity reaches available inventory',()=>{
    click('.sidebar [data-view="practice"]');
    const plus=document.querySelector('#practice-plus-striker') as HTMLButtonElement;
    plus.focus();plus.click();
    expect(document.activeElement).toBe(plus);
    expect(plus.disabled).toBe(false);
    expect(plus.getAttribute('aria-disabled')).toBe('true');
    expect((document.querySelector('#practice-count-striker') as HTMLInputElement).value).toBe('3');
    plus.click();expect((document.querySelector('#practice-count-striker') as HTMLInputElement).value).toBe('3');
  });
  it('closes the local practice review and restores the review action focus',()=>{
    click('.sidebar [data-view="practice"]');click('#practice-review');click('#practice-cancel-review');
    expect(document.querySelector('#practice-result-title')).toBeNull();
    expect(document.activeElement?.id).toBe('practice-review');
    expect(document.querySelector('#fleet-value')!.textContent).toContain('10');
  });
  it('updates practice totals as a valid quantity is typed without replacing the input',()=>{
    click('.sidebar [data-view="practice"]');
    const input=document.querySelector('#practice-count-striker') as HTMLInputElement;
    input.focus();input.value='3';input.dispatchEvent(new Event('input',{bubbles:true}));
    expect(document.querySelector('#practice-command')!.textContent).toContain('11');
    expect(document.querySelector('#practice-count-striker')).toBe(input);
    expect(document.activeElement).toBe(input);
  });
});
