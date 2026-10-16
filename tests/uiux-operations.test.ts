// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { initialDemo } from '../public/uiux-demo/model.js';
// @ts-expect-error The independent demo uses browser JavaScript modules.
import { missions, ships, initialOperations, operationDraft, operationInventory, operationSummary, transitionOperations, renderCareer, renderPractice, renderPracticeSummary, renderPracticeResult } from '../public/uiux-demo/operations.js';

const nova = { id: 'nova', name: '노바 프라임' };
const vesper = { id: 'vesper', name: '베스퍼' };
const mount = (html: string) => { const node = document.createElement('section'); node.innerHTML = html; return node; };
const act = (ui: any, action: any, planet = nova) => transitionOperations(ui, action, planet);

describe('operation preparation state', () => {
  it('derives the local default formation without changing demo planet inventory', () => {
    const ui = initialOperations();
    expect(ui).toEqual({ mission: 'salvage', drafts: {}, review: null });
    expect(operationInventory(nova)).toEqual({ striker: 3, guardian: 1, siege: 1, support: 1, salvage: 1, scout: 1, jammer: 1, carrier: 1 });
    expect(operationSummary(ui, nova)).toMatchObject({ total: 5, command: 9, cargo: 15, valid: true, inventoryTotal: 10 });
    expect(operationDraft(ui, nova)).toMatchObject({ counts: { striker: 2, guardian: 1, salvage: 1, scout: 1 }, support: 'none', approach: 'direct', preset: null });
    expect(operationSummary(ui, vesper)).toMatchObject({ total: 0, command: 0, cargo: 0, valid: false, inventoryTotal: 0 });
    expect(initialDemo().planets[0].ships).toBe(10);
  });

  it('clamps quantities to individual inventory while truncating fractional numeric input', () => {
    let ui = act(initialOperations(), { type: 'quantity', id: 'striker', value: '2.9' });
    expect(operationDraft(ui, nova).counts.striker).toBe(2);
    ui = act(ui, { type: 'quantity', id: 'striker', value: 200 });
    expect(operationDraft(ui, nova).counts.striker).toBe(3);
    ui = act(ui, { type: 'quantity', id: 'striker', value: -4 });
    expect(operationDraft(ui, nova).counts.striker).toBe(0);
    const empty = act(ui, { type: 'quantity', id: 'carrier', value: 1 }, vesper);
    expect(operationDraft(empty, vesper).counts.carrier).toBe(0);
  });

  it('rejects malformed quantities and unknown action identifiers', () => {
    const ui = initialOperations();
    for (const value of [NaN, Infinity, -Infinity, '', ' ', 'bad', null, undefined, true, {}, []]) {
      expect(act(ui, { type: 'quantity', id: 'striker', value })).toBe(ui);
    }
    for (const action of [
      { type: 'quantity', id: '__proto__', value: 1 },
      { type: 'mission', id: 'missing' }, { type: 'preset', id: 'missing' },
      { type: 'support', value: 'missing' }, { type: 'approach', value: 'missing' },
      { type: 'missing' },
    ]) expect(act(ui, action)).toBe(ui);
    expect(act(ui, { type: 'quantity', id: 'striker', value: 1 }, { id: 'unknown', name: 'Unknown' })).toBe(ui);
  });

  it('keeps independent drafts when the global current planet changes', () => {
    let ui = act(initialOperations(), { type: 'quantity', id: 'striker', value: 3 });
    ui = act(ui, { type: 'support', value: 'recon' }, vesper);
    expect(operationDraft(ui, nova).counts.striker).toBe(3);
    expect(operationDraft(ui, nova).support).toBe('none');
    expect(operationDraft(ui, vesper).support).toBe('recon');
    expect(operationSummary(ui, vesper).total).toBe(0);
    expect(initialOperations().drafts).toEqual({});
  });

  it('keeps aggregate excess so the review can explain exact fixes', () => {
    let ui = initialOperations();
    for (const [id, value] of [['striker', 3], ['siege', 1], ['support', 1], ['jammer', 1], ['carrier', 1]]) {
      ui = act(ui, { type: 'quantity', id, value });
    }
    const summary = operationSummary(ui, nova);
    expect(summary).toMatchObject({ total: 10, command: 22, cargo: 24, valid: false });
    expect(summary.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ship-limit', label: expect.stringContaining('4척'), action: expect.stringContaining('6척') }),
      expect.objectContaining({ code: 'command-limit', label: expect.stringContaining('10'), action: expect.stringContaining('12') }),
    ]));
    expect(operationDraft(ui, nova).counts.carrier).toBe(1);
  });

  it('requires a scout or recon support for the flank approach', () => {
    let ui = act(initialOperations(), { type: 'quantity', id: 'scout', value: 0 });
    ui = act(ui, { type: 'approach', value: 'flank' });
    expect(operationSummary(ui, nova).issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'flank', action: expect.stringContaining('정찰 지원') })]));
    const recon = act(ui, { type: 'support', value: 'recon' });
    expect(operationSummary(recon, nova).valid).toBe(true);
    const scout = act(ui, { type: 'quantity', id: 'scout', value: 1 });
    expect(operationSummary(scout, nova).valid).toBe(true);
  });

  it('applies all three example presets within the planet inventory and clears to zero', () => {
    const balanced = act(initialOperations(), { type: 'preset', id: 'balanced' });
    expect(operationSummary(balanced, nova)).toMatchObject({ total: 5, command: 9, cargo: 15 });
    const recovery = act(balanced, { type: 'preset', id: 'recovery' });
    expect(operationDraft(recovery, nova)).toMatchObject({ preset: 'recovery', counts: { striker: 1, support: 1, salvage: 1 } });
    expect(operationSummary(recovery, nova)).toMatchObject({ total: 5, command: 9, cargo: 15 });
    const breach = act(recovery, { type: 'preset', id: 'breach' });
    expect(operationSummary(breach, nova)).toMatchObject({ total: 5, command: 11, cargo: 8, valid: true });
    const clear = act(breach, { type: 'clear' });
    expect(operationSummary(clear, nova)).toMatchObject({ total: 0, valid: false });
    expect(operationDraft(clear, nova).preset).toBeNull();
    const empty = act(breach, { type: 'preset', id: 'recovery' }, vesper);
    expect(operationSummary(empty, vesper).total).toBe(0);
    expect(operationDraft(empty, nova).preset).toBe('breach');
  });

  it('captures an immutable review snapshot and removes it when preparation changes', () => {
    const state = initialDemo();
    const before = JSON.stringify(state);
    const ui = act(initialOperations(), { type: 'review' });
    expect(ui.review).toMatchObject({ planet: nova, mission: 'salvage', summary: { total: 5, command: 9, cargo: 15, valid: true } });
    expect(Object.isFrozen(ui.review.draft.counts)).toBe(true);
    expect(ui.review.draft.counts).not.toBe(operationDraft(ui, nova).counts);
    expect(act(ui, { type: 'quantity', id: 'striker', value: 1 }).review).toBeNull();
    expect(act(ui, { type: 'mission', id: 'relay' }).review).toBeNull();
    expect(act(ui, { type: 'support', value: 'recon' }).review).toBeNull();
    expect(act(ui, { type: 'approach', value: 'flank' }).review).toBeNull();
    expect(act(ui, { type: 'preset', id: 'breach' }).review).toBeNull();
    expect(act(ui, { type: 'cancel-review' }).review).toBeNull();
    expect(JSON.stringify(state)).toBe(before);
    expect(operationDraft(ui, nova).counts.striker).toBe(2);
    expect(act(ui, { type: 'reset' })).toEqual(initialOperations());
  });

  it('allows review of an invalid formation without recording a battle outcome', () => {
    const ui = act(act(initialOperations(), { type: 'clear' }), { type: 'review' });
    expect(ui.review.summary.valid).toBe(false);
    expect(ui.review.summary.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'empty' })]));
    expect(ui.review).not.toHaveProperty('win');
    expect(ui.review).not.toHaveProperty('reward');
  });
});

describe('operation workspaces', () => {
  it('shows the selected briefing with mission selection and a preparation handoff', () => {
    const ui = act(initialOperations(), { type: 'mission', id: 'relay' });
    const view = mount(renderCareer(initialDemo(), ui));
    expect(view.querySelector('.workspace-content')).toBeNull();
    expect(view.querySelector('#career-mission-select')?.querySelector('option:checked')?.getAttribute('value')).toBe('relay');
    for (const mission of missions) expect(view.querySelector(`#career-mission-${mission.id}`)?.getAttribute('data-operation-mission')).toBe(mission.id);
    expect(view.querySelector('#career-mission-relay')?.getAttribute('aria-pressed')).toBe('true');
    expect(view.querySelector('#career-briefing-title')?.textContent).toContain('봉쇄된 중계 거점');
    expect(view.querySelectorAll('.op-stage')).toHaveLength(3);
    expect(view.querySelector('[data-view="practice"]')).not.toBeNull();
    expect(view.querySelector('#career-launch')?.hasAttribute('disabled')).toBe(true);
    expect(view.textContent).toContain('편성 한도');
  });

  it('offers eight labeled ship editors and all stable controls without duplicated ids', () => {
    const view = mount(renderPractice(initialDemo(), initialOperations()));
    for (const id of ['practice-mission-select', 'practice-clear', 'practice-support-select', 'practice-approach-select', 'practice-summary', 'practice-review', 'practice-review-result', 'practice-summary-jump']) expect(view.querySelector(`#${id}`)).not.toBeNull();
    for (const id of ['balanced', 'recovery', 'breach']) expect(view.querySelector(`#practice-preset-${id}`)?.getAttribute('data-operation-preset')).toBe(id);
    for (const ship of ships) {
      const input = view.querySelector<HTMLInputElement>(`#practice-count-${ship.id}`);
      expect(input?.getAttribute('data-operation-quantity')).toBe(ship.id);
      expect(input?.labels?.length).toBe(1);
      expect(view.querySelector(`#practice-minus-${ship.id}`)?.getAttribute('data-delta')).toBe('-1');
      expect(view.querySelector(`#practice-plus-${ship.id}`)?.getAttribute('data-delta')).toBe('1');
      expect(view.querySelector(`[data-operation-ship="${ship.id}"] svg`)).not.toBeNull();
    }
    const ids = [...view.querySelectorAll('[id]')].map(el => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(view.querySelector('#practice-review')?.hasAttribute('disabled')).toBe(false);
    expect(view.querySelector('#practice-review-result')?.textContent).toBe('');
  });

  it('keeps no-inventory controls disabled and gives a useful route to fleet preparation', () => {
    const state = { ...initialDemo(), selected: 'vesper' };
    const view = mount(renderPractice(state, initialOperations()));
    for (const control of view.querySelectorAll('[data-operation-preset], [data-operation-step], [data-operation-quantity]')) expect(control.hasAttribute('disabled')).toBe(true);
    expect(view.querySelector('#practice-empty-fleet')?.textContent).toContain('베스퍼');
    expect(view.querySelector('[data-view="fleet"]')).not.toBeNull();
    expect(view.querySelector('[data-view="construction"]')).not.toBeNull();
    expect(view.querySelectorAll('.op-formation-unit')).toHaveLength(0);
    expect(view.querySelector('#practice-review')?.hasAttribute('disabled')).toBe(false);
    expect(view.querySelector<HTMLInputElement>('#practice-count-striker')?.value).toBe('0');
  });

  it('does not treat the job-empty demonstration toggle as empty ship inventory', () => {
    const view = mount(renderPractice({ ...initialDemo(), empty: true }, initialOperations()));
    expect(view.querySelector<HTMLInputElement>('#practice-count-striker')?.value).toBe('2');
    expect(view.querySelector('#practice-empty-fleet')).toBeNull();
    expect(view.querySelector('#practice-preset-balanced')?.hasAttribute('disabled')).toBe(false);
  });

  it('keeps the review action outside the replaceable summary and boundary steppers focusable', () => {
    const view = mount(renderPractice(initialDemo(), initialOperations()));
    expect(view.querySelector('#practice-summary #practice-review')).toBeNull();
    expect(view.querySelector('#practice-review')).not.toBeNull();
    expect(view.querySelector('#practice-minus-siege')?.hasAttribute('disabled')).toBe(false);
    expect(view.querySelector('#practice-minus-siege')?.getAttribute('aria-disabled')).toBe('true');
    expect(view.querySelector('#practice-plus-guardian')?.hasAttribute('disabled')).toBe(false);
    expect(view.querySelector('#practice-plus-guardian')?.getAttribute('aria-disabled')).toBe('true');
    expect(view.querySelector('#practice-total')?.textContent).toContain('5');
    expect(view.querySelector('#practice-command')?.textContent).toContain('9');
    expect(view.querySelector('#practice-cargo')?.textContent).toContain('15');
  });

  it('explains failed checks and renders exact captured counts only after a review', () => {
    let ui = act(initialOperations(), { type: 'clear' });
    ui = act(ui, { type: 'quantity', id: 'carrier', value: 1 });
    ui = act(ui, { type: 'approach', value: 'flank' });
    expect(renderPracticeResult(initialDemo(), ui)).toBe('');
    const before = mount(renderPracticeSummary(initialDemo(), ui));
    expect(before.textContent).toContain('정찰 지원');
    const reviewed = act(ui, { type: 'review' });
    const result = mount(renderPracticeResult(initialDemo(), reviewed));
    expect(result.querySelector('#practice-result-title')?.getAttribute('tabindex')).toBe('-1');
    expect(result.textContent).toContain('보완이 필요합니다');
    expect(result.textContent).toContain('노바 프라임');
    expect(result.textContent).toContain('고요한 잔해지대');
    expect(result.textContent).toContain('아크 1척');
    expect(result.querySelector('button:disabled')?.textContent).toContain('출격 시작');
    expect(renderPracticeResult({ ...initialDemo(), selected: 'vesper' }, reviewed)).toBe('');
    expect(renderPracticeResult(initialDemo(), act(reviewed, { type: 'quantity', id: 'scout', value: 1 }))).toBe('');
  });

  it('hides stale briefing, inventory and review information while unavailable', () => {
    const reviewed = act(initialOperations(), { type: 'review' });
    for (const connection of ['loading', 'offline']) {
      const state = { ...initialDemo(), connection };
      const career = mount(renderCareer(state, reviewed));
      const practice = mount(renderPractice(state, reviewed));
      expect(career.querySelector('#career-briefing-title')).toBeNull();
      expect(career.querySelector('#career-mission-select')?.hasAttribute('disabled')).toBe(true);
      expect(practice.querySelector('#practice-mission-select')?.hasAttribute('disabled')).toBe(true);
      expect(practice.querySelector('[data-operation-quantity]')).toBeNull();
      expect(practice.querySelector('#practice-review')).toBeNull();
      expect(practice.querySelector('#practice-result-title')).toBeNull();
      expect(practice.textContent).not.toContain('케스트럴');
      expect(renderPracticeResult(state, reviewed)).toBe('');
    }
  });
});
