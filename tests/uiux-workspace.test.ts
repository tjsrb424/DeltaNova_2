// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { initialDemo, transition } from '../public/uiux-demo/model.js';
// @ts-expect-error The isolated browser demo uses native JavaScript modules.
import { renderFacilityDetail, renderWorkspace, workspaceTitles } from '../public/uiux-demo/workspace.js';

const mount = (html: string) => {
  const section = document.createElement('section');
  section.innerHTML = html;
  return section;
};

describe('central demo workspaces', () => {
  it('puts selected facility actions before art and explanations while preserving all costs and conditions',()=>{
    const detail=mount(renderFacilityDetail(initialDemo().planets[0],'fuelRefinery'));
    const action=detail.querySelector('button:disabled')!;
    for(const explanation of detail.querySelectorAll('.dn-facility-display,.ws-muted,.ws-effect,.ws-cost-table,.ws-prerequisite')){
      expect(action.compareDocumentPosition(explanation)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(detail.querySelectorAll('.ws-cost-table tbody tr')).toHaveLength(3);
    expect(detail.textContent).toContain('미연결');
    const view=mount(renderWorkspace('construction',initialDemo(),'fuelRefinery'));
    expect(view.querySelector('#workspace-facility-detail')!.compareDocumentPosition(view.querySelector('.ws-queue')!)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(view.querySelector('.ws-queue')!.compareDocumentPosition(view.querySelector('#workspace-facility-detail .dn-facility-display')!)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('puts research and fleet preparation actions ahead of explanatory copy',()=>{
    for(const page of ['research','fleet']){
      const view=mount(renderWorkspace(page,initialDemo(),'fuelRefinery'));
      const lead=view.querySelector('.ws-lead')!,action=lead.querySelector('button')!,description=lead.querySelector('p')!;
      expect(action).not.toBeNull();
      expect(action.compareDocumentPosition(description)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });
  it('compares a selected facility using the current planet snapshot', () => {
    const state = transition(initialDemo(), { type: 'select', id: 'vesper' });
    const view = mount(renderWorkspace('construction', state, 'laboratory'));
    expect(view.querySelectorAll('[data-workspace-facility]')).toHaveLength(6);
    expect(view.querySelector('[data-workspace-facility="laboratory"]')?.getAttribute('aria-pressed')).toBe('true');
    expect((view.querySelector('#workspace-facility-select') as HTMLSelectElement).value).toBe('laboratory');
    const detail = view.querySelector('#workspace-facility-detail')!;
    expect(detail.textContent).toContain('연구소');
    expect(detail.textContent).toContain('Lv.0');
    expect(detail.textContent).toContain('Lv.1');
    expect(detail.textContent).toContain('증설 후');
    expect(detail.textContent).toContain('조건 미리보기');
    expect(detail.querySelector('button:disabled')).not.toBeNull();
    expect(view.querySelector('#facility-detail')).toBeNull();
  });

  it('keeps illustrative queues coherent with the snapshot and empty state', () => {
    const state = transition(initialDemo(), { type: 'snapshot' });
    const view = mount(renderWorkspace('construction', state, 'fuelRefinery'));
    expect(view.textContent).toContain('연료 합성소 Lv.3');
    expect(view.textContent).toContain('01:24');
    expect(view.querySelector('[aria-valuenow="62"]')).not.toBeNull();
    const empty = mount(renderWorkspace('construction', { ...state, empty: true }, 'fuelRefinery'));
    expect(empty.textContent).toContain('진행 중인 건설 없음');
    expect(empty.textContent).not.toContain('01:24');
  });

  it('renders selected-planet defense even when no incoming event exists', () => {
    const state = initialDemo();
    state.planets[1].defenses = 7;
    state.selected = 'vesper';
    const view = mount(renderWorkspace('defense', state, 'fuelRefinery'));
    expect(view.textContent).toContain('베스퍼');
    expect(view.textContent).toContain('7');
    expect(view.textContent).toContain('접근 중인 위협 없음');
  });

  it('distinguishes selected-planet defenses from an incoming event targeting Nova', () => {
    const state = transition(initialDemo(), { type: 'threat' });
    state.planets[1].defenses = 7;
    state.selected = 'vesper';
    const view = mount(renderWorkspace('defense', state, 'fuelRefinery'));
    expect(view.querySelector('[data-defense-count]')?.textContent).toContain('7');
    expect(view.querySelector('[data-threat-target]')?.textContent).toContain('노바 프라임');
    expect(view.querySelector('[data-route-eta="incoming"]')).not.toBeNull();
    expect(view.querySelector('[data-view="evasion"]')).not.toBeNull();
  });

  it('does not show stale inventory, fleet, or facility values while loading', () => {
    const state = { ...initialDemo(), connection: 'loading' };
    for (const page of ['construction', 'research', 'fleet', 'defense', 'evasion']) {
      const view = mount(renderWorkspace(page, state, 'fuelRefinery'));
      expect(view.textContent).toContain('불러오는');
      expect(view.textContent).not.toContain('280');
      expect(view.textContent).not.toContain('10척');
      expect(view.textContent).not.toContain('01:24');
    }
    expect(renderFacilityDetail(state.planets[0], 'fuelRefinery', { loading: true })).not.toContain('+8');
  });

  it('offers center-view navigation for major menus and a settings detail', () => {
    const view = mount(renderWorkspace('more', initialDemo(), 'fuelRefinery'));
    for (const page of ['career', 'galaxy', 'defense', 'guild', 'diplomacy', 'rankings', 'reports', 'practice']) {
      expect(view.querySelector(`[data-view="${page}"]`)).not.toBeNull();
      expect(workspaceTitles[page]).toBeTruthy();
    }
    expect(view.querySelector('[data-panel="settings"]')).not.toBeNull();
    expect(view.querySelector('a[href="/"]')).not.toBeNull();
  });

  it('offers useful next destinations from an empty report view', () => {
    const view = mount(renderWorkspace('reports', initialDemo(), 'fuelRefinery'));
    expect(view.textContent).toContain('보고서가 없습니다');
    expect(view.querySelector('[data-view="construction"]')).not.toBeNull();
    expect(view.querySelector('[data-view="fleet"]')).not.toBeNull();
  });
  it('keeps common research visible on another planet and shows the local next investment directly',()=>{
    const state=transition(initialDemo(),{type:'select',id:'vesper'});
    const view=mount(renderWorkspace('research',state));
    expect(view.querySelector('.ws-research-progress')!.textContent).toContain('노바 프라임');
    expect(view.querySelector('.ws-research-progress')!.textContent).toContain('03:10');
    expect(view.querySelector('.ws-research-foundation')!.textContent).toContain('베스퍼');
    expect(view.querySelector('.ws-research-foundation')!.textContent).toContain('Lv.0 → Lv.1');
    expect(view.querySelector('.ws-investment-cost')!.textContent).toContain('60');
    expect(view.querySelector('[data-view-facility="laboratory"]')).not.toBeNull();
    expect(view.querySelector('[data-panel="research"]')).toBeNull();
  });
  it('shows incoming and outgoing illustrative routes without treating them as ship inventory',()=>{
    let state=transition(initialDemo(),{type:'threat',now:0});
    state=transition(state,{type:'departure',now:0});
    const view=mount(renderWorkspace('fleet',state));
    expect(view.querySelector('[data-route-eta="incoming"]')).not.toBeNull();
    expect(view.querySelector('[data-route-eta="outgoing"]')).not.toBeNull();
    expect(view.querySelector('#fleet-departure-preview')!.textContent).toContain('지우기');
    expect(view.querySelector('[data-outgoing-phase]')).not.toBeNull();
    expect(view.querySelector('[data-view="evasion"]')).not.toBeNull();
    const colony=mount(renderWorkspace('fleet',{...state,selected:'vesper'}));
    expect(colony.querySelector('[data-route-eta="outgoing"]')).toBeNull();
    expect(colony.querySelector('[data-route-eta="incoming"]')).toBeNull();
    expect(colony.querySelector('[data-view="evasion"]')).toBeNull();
    expect(colony.textContent).toContain('노바 프라임');
  });
});
