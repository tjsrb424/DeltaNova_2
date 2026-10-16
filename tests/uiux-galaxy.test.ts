// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { initialDemo } from '../public/uiux-demo/model.js';
// @ts-expect-error The independent demo uses browser JavaScript modules.
import { galaxyTargets, initialGalaxy, transitionGalaxy, visibleGalaxyTargets, selectedGalaxyTarget, renderGalaxy, renderGalaxyContent, renderGalaxyReport } from '../public/uiux-demo/galaxy.js';

const mount = (html: string) => { const el = document.createElement('section'); el.innerHTML = html; return el; };

describe('galaxy demonstration selection and scan state', () => {
  it('starts on a foreign Lyra target and provides separate own planets', () => {
    const ui = initialGalaxy();
    expect(ui).toEqual({ sector: 'lyra', target: 'tarsis', filter: 'all', query: '', scan: null, reports: {} });
    expect(selectedGalaxyTarget(ui).id).toBe('tarsis');
    expect(galaxyTargets.filter((t: any) => t.own).map((t: any) => t.id)).toEqual(['nova', 'vesper']);
    expect(visibleGalaxyTargets(ui)).toHaveLength(6);
  });
  it('validates selection and normalizes filters and search', () => {
    const ui = initialGalaxy();
    expect(transitionGalaxy(ui, { type: 'target', id: 'invalid' })).toBe(ui);
    expect(transitionGalaxy(ui, { type: 'sector', value: 'invalid' })).toBe(ui);
    expect(transitionGalaxy(ui, { type: 'filter', value: 'invalid' })).toBe(ui);
    const own = transitionGalaxy(ui, { type: 'filter', value: 'own' });
    expect(selectedGalaxyTarget(own).own).toBe(true);
    const found = transitionGalaxy(ui, { type: 'query', value: '  타르시스  ' });
    expect(found.query).toBe('  타르시스  ');
    expect(visibleGalaxyTargets(found).map((t: any) => t.id)).toEqual(['tarsis']);
  });
  it('preserves stored selection during no results and restores external target context', () => {
    const none = transitionGalaxy(initialGalaxy(), { type: 'query', value: '없는 행성' });
    expect(visibleGalaxyTargets(none)).toEqual([]);
    expect(none.target).toBe('tarsis');
    expect(selectedGalaxyTarget(none)).toBeNull();
    const picked = transitionGalaxy(none, { type: 'target', id: 'vesper' });
    expect(picked.query).toBe('');
    expect(picked.filter).toBe('all');
    expect(selectedGalaxyTarget(picked).id).toBe('vesper');
    const orion = transitionGalaxy(picked, { type: 'sector', value: 'orion' });
    expect(selectedGalaxyTarget(orion).sector).toBe('orion');
    const again = transitionGalaxy(orion, { type: 'target', id: 'nova' });
    expect(again.sector).toBe('lyra');
  });
  it('resets filters and the search when changing sectors so the selection belongs to the destination', () => {
    let ui = transitionGalaxy(initialGalaxy(), { type: 'filter', value: 'own' });
    ui = transitionGalaxy(ui, { type: 'query', value: '노바 ' });
    expect(ui.query).toBe('노바 ');
    const changed = transitionGalaxy(ui, { type: 'sector', value: 'orion' });
    expect(changed.query).toBe('');
    expect(changed.filter).toBe('all');
    expect(selectedGalaxyTarget(changed)?.sector).toBe('orion');
    expect(visibleGalaxyTargets(changed)).toHaveLength(3);
  });
  it('attributes completion to the captured target and checks the scan token', () => {
    const base = initialGalaxy();
    const before = JSON.stringify(galaxyTargets);
    const scanning = transitionGalaxy(base, { type: 'scan-start', target: 'tarsis', token: 11 });
    const moved = transitionGalaxy(scanning, { type: 'target', id: 'vesper' });
    expect(transitionGalaxy(moved, { type: 'scan-complete', token: 10 })).toBe(moved);
    expect(transitionGalaxy(moved, { type: 'scan-start', target: 'tarsis', token: 12 })).toBe(moved);
    const done = transitionGalaxy(moved, { type: 'scan-complete', token: 11 });
    expect(done.target).toBe('vesper');
    expect(done.reports).toEqual({ tarsis: { kind: 'simulation' } });
    expect(done.scan).toBeNull();
    expect(base.reports).toEqual({});
    expect(JSON.stringify(galaxyTargets)).toBe(before);
    expect(transitionGalaxy(base, { type: 'scan-start', target: 'nova', token: 1 })).toBe(base);
    expect(transitionGalaxy(scanning, { type: 'scan-cancel' }).scan).toBeNull();
    expect(transitionGalaxy(done, { type: 'reset' })).toEqual(base);
  });
});

describe('galaxy presentation', () => {
  it('renders equivalent selectable map and list, stable controls and explicit demo commands', () => {
    const view = mount(renderGalaxy(initialDemo(), initialGalaxy()));
    expect(view.querySelector('.workspace-content')).toBeNull();
    for (const id of ['galaxy-sector-select', 'galaxy-search', 'galaxy-center-current', 'galaxy-target-select', 'galaxy-target-title', 'galaxy-scan-preview', 'galaxy-results-count']) expect(view.querySelector(`#${id}`)).not.toBeNull();
    for (const target of visibleGalaxyTargets(initialGalaxy())) {
      expect(view.querySelector(`#galaxy-node-${target.id}`)?.getAttribute('aria-label')).toContain(target.name);
      expect(view.querySelector(`#galaxy-row-${target.id}`)?.textContent).toContain(target.name);
    }
    expect(view.textContent).toContain('행성 위치');
    expect(view.textContent).toContain('정찰 정보 미리보기');
    expect(view.querySelector('button:disabled')?.textContent).toContain('정찰 시작');
    expect(view.textContent).toContain('미확인');
    expect(view.textContent).not.toContain('0척');
  });
  it('does not confuse target selection with the current own planet or scan source', () => {
    const state = { ...initialDemo(), selected: 'vesper' };
    const ui = transitionGalaxy(initialGalaxy(), { type: 'target', id: 'nova' });
    const view = mount(renderGalaxy(state, ui));
    expect(view.querySelector('[data-galaxy-home="nova"]')?.textContent).toContain('노바 프라임 관제로 이동');
    expect(view.querySelector('#galaxy-scan-preview')).toBeNull();
    expect(view.querySelector('[data-panel="recon"]')?.textContent).toContain('S-01');
    expect(state.selected).toBe('vesper');
  });
  it('keeps a pending scan tied to its own target while another target is selected', () => {
    let ui = transitionGalaxy(initialGalaxy(), { type: 'scan-start', target: 'tarsis', token: 1 });
    ui = transitionGalaxy(ui, { type: 'target', id: 'mira' });
    const view = mount(renderGalaxyContent(initialDemo(), ui));
    expect(view.querySelector('#galaxy-scan-preview')?.getAttribute('aria-disabled')).toBe('true');
    expect(view.querySelector('[role="status"]')?.textContent).toContain('타르시스');
  });
  it('renders no-result recovery and hides stale data during loading or offline', () => {
    const none = transitionGalaxy(initialGalaxy(), { type: 'query', value: 'zzzz' });
    const view = mount(renderGalaxyContent(initialDemo(), none));
    expect(view.querySelector('#galaxy-clear-query')).not.toBeNull();
    expect(view.querySelector('#galaxy-target-title')).toBeNull();
    for (const connection of ['loading', 'offline']) {
      const unavailable = mount(renderGalaxy({ ...initialDemo(), connection }, initialGalaxy()));
      expect(unavailable.querySelector('#galaxy-search')?.hasAttribute('disabled')).toBe(true);
      expect(unavailable.querySelector('#galaxy-scan-preview')).toBeNull();
      expect(unavailable.textContent).not.toContain('280');
      expect(unavailable.querySelector('[data-galaxy-target]')).toBeNull();
    }
  });
  it('only offers reports from an available passive record or completed demonstration', () => {
    const ui = initialGalaxy();
    const missing = mount(renderGalaxyReport(initialDemo(), ui, 'tarsis'));
    expect(missing.textContent).toContain('아직 확인한 정보가 없습니다');
    const scanning = transitionGalaxy(ui, { type: 'scan-start', token: 1, target: 'tarsis' });
    const done = transitionGalaxy(scanning, { type: 'scan-complete', token: 1 });
    const report = mount(renderGalaxyReport(initialDemo(), done, 'tarsis'));
    expect(report.textContent).toContain('정찰 보고서');
    expect(report.textContent).toContain('타르시스');
    expect(report.textContent).toContain('미확인');
    expect(mount(renderGalaxyContent(initialDemo(), done)).querySelector('#galaxy-report-open')?.getAttribute('data-panel')).toBe('intel');
    const passive = galaxyTargets.find((t: any) => t.observed);
    expect(renderGalaxyReport(initialDemo(), ui, passive.id)).toContain('12분 전');
    expect(renderGalaxyReport({ ...initialDemo(), empty: true }, ui, passive.id)).toContain('아직 확인한 정보가 없습니다');
    const empty = mount(renderGalaxyContent({ ...initialDemo(), empty: true }, ui));
    expect(empty.querySelector('#galaxy-node-mira')?.getAttribute('aria-label')).toContain('동맹 행성');
    expect(empty.querySelector('#galaxy-row-mira')?.textContent).toContain('동맹 행성');
  });
});
