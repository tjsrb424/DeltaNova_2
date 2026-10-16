import { describe, expect, it } from 'vitest';
import { initialDemo } from '../public/uiux-demo/model.js';
// @ts-expect-error The isolated demo exposes plain browser JavaScript modules.
import * as model from '../public/uiux-demo/strategy-model.js';

const { strategyFleet, strategySummary, transitionStrategy } = model;
// Existing formula/storyboard cases explicitly prepare this user-selected fixture.
const initialStrategy = () => transitionStrategy(model.initialStrategy(), {type: 'preset', id: 'balanced'}, initialDemo());
const act = (ui: any, action: any, state = initialDemo()) => transitionStrategy(ui, action, state);
const summary = (ui: any, state = initialDemo()) => strategySummary(ui, state);
const zero = { striker: 0, guardian: 0, siege: 0, support: 0, salvage: 0, scout: 0, jammer: 0, carrier: 0 };
const emptyFleet = () => ({ ...initialStrategy(), drafts: { nova: { ...zero } } });
const codes = (ui: any, state = initialDemo()) => summary(ui, state).errors.map((error: any) => error.code);

describe('memory-only fleet strategy', () => {
  it('starts with an editable target draft and no pending or simulated orders', async () => {
    const path = '../public/uiux-demo/strategy-model.js';
    const model = await import(path).catch(() => null);
    expect(model?.initialStrategy).toBeTypeOf('function');
    expect(model.initialStrategy()).toEqual({
      target: 'tarsis', intent: 'attack', context: 'solo', stage: 'target',
      delay: 0, drafts: {}, orders: [], clock: 0, nextId: 1, review: null,
    });
  });

  it('calculates an explicitly composed balanced local fleet without changing planet resources or inventory', () => {
    const state = initialDemo();
    const before = JSON.stringify(state);
    const ui = initialStrategy();
    expect(strategyFleet(ui, state)).toEqual({ ...zero, striker: 2, guardian: 1, salvage: 1, scout: 1 });
    expect(summary(ui, state)).toMatchObject({
      source: { id: 'nova' }, target: { id: 'tarsis', name: '타르시스', coords: 'L-01 · 03', kind: 'hostile', threat: '전력 미확인' },
      intent: 'attack', context: 'solo', total: 5, remaining: 5, command: 9, cargo: 15,
      power: 53, speed: 50, fuel: 27, travelSeconds: 432, departureSeconds: 0,
      arrivalSeconds: 432, returnSeconds: 864, allyDelta: -48, errors: [], valid: true,
      available: { striker: 3, guardian: 1, siege: 1, support: 1, salvage: 1, scout: 1, jammer: 1, carrier: 1 },
    });
    expect(summary(ui).selectedShips).toHaveLength(4);
    expect(JSON.stringify(state)).toBe(before);
    expect(summary(ui)).not.toHaveProperty('win');
    expect(summary(ui)).not.toHaveProperty('reward');
  });

  it('uses all galaxy target identities and all eight existing ship identities', () => {
    expect(model.strategyTargets.map((target: any) => target.id)).toEqual(['nova', 'vesper', 'tarsis', 'mira', 'naos', 'eos', 'rigel', 'saiph', 'bellatrix']);
    expect(model.strategyShips.map((ship: any) => ship.id)).toEqual(Object.keys(zero));
    for (const ship of model.strategyShips) {
      expect(ship.power).toBeGreaterThan(0);
      expect(ship.speed).toBeGreaterThan(0);
      expect(ship.fuel).toBeGreaterThan(0);
    }
  });

  it('preserves per-planet drafts while clamping finite quantities to the local inventory', () => {
    const state = initialDemo();
    const vesper = { ...state, selected: 'vesper' };
    let ui = act(initialStrategy(), { type: 'quantity', id: 'striker', value: '2.9' });
    expect(strategyFleet(ui, state).striker).toBe(2);
    ui = act(ui, { type: 'quantity', id: 'striker', value: 200 });
    expect(strategyFleet(ui, state).striker).toBe(3);
    ui = act(ui, { type: 'quantity', id: 'carrier', value: 1 }, vesper);
    expect(strategyFleet(ui, vesper)).toEqual(zero);
    expect(strategyFleet(ui, state).striker).toBe(3);
    ui = act(ui, { type: 'quantity', id: 'striker', value: -4 });
    expect(strategyFleet(ui, state).striker).toBe(0);
    expect(summary(ui, vesper)).toMatchObject({ total: 0, remaining: 0, valid: false });
  });

  it('rejects malformed inputs, prototype property names, and unknown identifiers without mutation', () => {
    const ui = initialStrategy();
    for (const value of [NaN, Infinity, -Infinity, '', ' ', 'invalid', null, undefined, true, {}, []]) {
      expect(act(ui, { type: 'quantity', id: 'striker', value })).toBe(ui);
      expect(act(ui, { type: 'delay', value })).toBe(ui);
    }
    for (const action of [null, {}, { type: 'missing' },
      { type: 'quantity', id: '__proto__', value: 1 }, { type: 'quantity', id: 'constructor', value: 1 },
      { type: 'preset', id: '__proto__' }, { type: 'configure', target: '__proto__' },
      { type: 'configure', intent: 'constructor' }, { type: 'configure', context: 'missing' },
      { type: 'configure', stage: 'confirm' }, { type: 'advance', id: 'preview-404' },
    ]) expect(act(ui, action)).toBe(ui);
    expect(act(ui, { type: 'quantity', id: 'striker', value: 1 }, { ...initialDemo(), selected: 'constructor' })).toBe(ui);
  });

  it('offers distinct power, speed, fuel and remaining-defense tradeoffs in the three presets', () => {
    const balanced = summary(act(initialStrategy(), { type: 'preset', id: 'balanced' }));
    const strike = summary(act(initialStrategy(), { type: 'preset', id: 'strike' }));
    const mobile = summary(act(initialStrategy(), { type: 'preset', id: 'mobile' }));
    expect([balanced.valid, strike.valid, mobile.valid]).toEqual([true, true, true]);
    expect(strike.power).toBeGreaterThan(balanced.power);
    expect(strike.speed).toBeLessThan(balanced.speed);
    expect(strike.fuel).toBeGreaterThan(balanced.fuel);
    expect(mobile.speed).toBeGreaterThan(balanced.speed);
    expect(mobile.travelSeconds).toBeLessThan(balanced.travelSeconds);
    expect(mobile.fuel).toBeLessThan(balanced.fuel);
    expect(mobile.remaining).toBeGreaterThan(balanced.remaining);
    expect(summary(act(initialStrategy(), { type: 'preset', id: 'mobile' }), { ...initialDemo(), selected: 'vesper' }).total).toBe(0);
  });

  it('reports exact fleet size, command, zero-fleet and fuel validation failures', () => {
    const ui = { ...initialStrategy(), drafts: { nova: { striker: 3, guardian: 1, siege: 1, support: 1, salvage: 1, scout: 1, jammer: 1, carrier: 1 } } };
    expect(summary(ui)).toMatchObject({ total: 10, command: 22, valid: false });
    expect(codes(ui)).toEqual(expect.arrayContaining(['ship-limit', 'command-limit']));
    expect(codes(emptyFleet())).toContain('empty');
    expect(act(emptyFleet(), { type: 'review' })).toEqual(emptyFleet());
    const state = initialDemo();
    state.planets[0].resources.fuel = 1;
    expect(codes(initialStrategy(), state)).toContain('fuel');
    expect(act(initialStrategy(), { type: 'review' }, state).review).toBeNull();
  });

  it('defaults target changes to an allowed purpose while preserving explicit incompatible choices for validation', () => {
    for (const [target, intent] of [['vesper', 'move'], ['mira', 'reinforce'], ['naos', 'scout'], ['bellatrix', 'scout'], ['rigel', 'attack']]) {
      const ui = act(initialStrategy(), { type: 'configure', target });
      expect(ui).toMatchObject({ target, intent, review: null });
      expect(summary(ui).valid).toBe(true);
    }
    expect(codes(act(initialStrategy(), { type: 'configure', target: 'nova' }))).toContain('same-source');
    expect(codes(act(initialStrategy(), { type: 'configure', target: 'naos', intent: 'attack' }))).toContain('intent');
    expect(codes(act(initialStrategy(), { type: 'configure', target: 'mira', intent: 'attack' }))).toContain('intent');
    expect(summary(act(initialStrategy(), { type: 'configure', target: 'mira', intent: 'scout' })).valid).toBe(true);
  });

  it('pins the shared alliance target and selects the other owned planet for defense relocation', () => {
    const alliance = act(initialStrategy(), { type: 'configure', context: 'alliance', target: 'mira', intent: 'scout', stage: 'fleet' });
    expect(alliance).toMatchObject({ context: 'alliance', target: 'tarsis', intent: 'attack', stage: 'fleet' });
    expect(act(alliance, { type: 'configure', target: 'rigel' })).toMatchObject({ target: 'tarsis', intent: 'attack' });
    const defense = act(initialStrategy(), { type: 'configure', context: 'defense' });
    expect(defense).toMatchObject({ context: 'defense', target: 'vesper', intent: 'move' });
    expect(summary(defense).valid).toBe(true);
    expect(codes(act(defense, { type: 'configure', target: 'tarsis', intent: 'attack' }))).toContain('defense-target');
  });

  it('updates illustrative departure, arrival and return seconds from finite clamped minute inputs', () => {
    const ui = act(initialStrategy(), { type: 'delay', value: '2.9' });
    expect(ui.delay).toBe(2);
    expect(summary(ui)).toMatchObject({ travelSeconds: 432, departureSeconds: 120, arrivalSeconds: 552, returnSeconds: 984, allyDelta: 72 });
    expect(act(ui, { type: 'delay', value: 100 }).delay).toBe(30);
    expect(act(ui, { type: 'delay', value: -8 }).delay).toBe(0);
    expect(ui.orders).toEqual([]);
  });

  it('aligns an arrival with the fixed ally rendezvous without scheduling automatic departure', () => {
    const ui = act(act(initialStrategy(), { type: 'configure', context: 'alliance' }), { type: 'align' });
    expect(ui.delay).toBe(1);
    expect(summary(ui)).toMatchObject({ arrivalSeconds: 492, allyDelta: 12 });
    expect(ui.orders).toEqual([]);
    const tooSlow = act({ ...emptyFleet(), drafts: { nova: { ...zero, carrier: 1 } } }, { type: 'delay', value: 7 });
    expect(act(tooSlow, { type: 'align' })).toBe(tooSlow);
  });

  it('freezes a review snapshot and invalidates it after any edited preparation value', () => {
    const reviewed = act(initialStrategy(), { type: 'review' });
    expect(reviewed).toMatchObject({ stage: 'confirm', review: { sourceId: 'nova', sourceName: '노바 프라임', targetId: 'tarsis', targetName: '타르시스', total: 5, intent: 'attack', context: 'solo', arrivalSeconds: 432 } });
    expect(Object.isFrozen(reviewed.review)).toBe(true);
    expect(Object.isFrozen(reviewed.review.counts)).toBe(true);
    for (const action of [
      { type: 'configure', target: 'mira' }, { type: 'configure', intent: 'scout' },
      { type: 'configure', context: 'defense' }, { type: 'delay', value: 1 },
      { type: 'quantity', id: 'striker', value: 1 }, { type: 'preset', id: 'mobile' },
      { type: 'edit' }, { type: 'cancel-review' },
    ]) expect(act(reviewed, action).review).toBeNull();
    expect(act(reviewed, { type: 'edit' }).stage).toBe('fleet');
    expect(act(reviewed, { type: 'reset' })).toEqual(model.initialStrategy());
  });

  it('rejects offline, changed-source, modified-configuration and depleted-fuel review previews', () => {
    const reviewed = act(initialStrategy(), { type: 'review' });
    const state = initialDemo();
    for (const connection of ['loading', 'offline']) {
      const unavailable = { ...state, connection };
      expect(summary(reviewed, unavailable).valid).toBe(false);
      expect(act(reviewed, { type: 'preview' }, unavailable).orders).toEqual([]);
      expect(act(initialStrategy(), { type: 'review' }, unavailable).review).toBeNull();
    }
    expect(act(reviewed, { type: 'preview' }, { ...state, selected: 'vesper' }).orders).toEqual([]);
    expect(act({ ...reviewed, delay: 3 }, { type: 'preview' }).orders).toEqual([]);
    expect(act({ ...reviewed, intent: 'scout' }, { type: 'preview' }).orders).toEqual([]);
    state.planets[0].resources.fuel = 0;
    expect(act(reviewed, { type: 'preview' }, state).orders).toEqual([]);
  });

  it('reserves immutable preview ships from their origin without spending source resources', () => {
    const state = initialDemo();
    const before = JSON.stringify(state);
    const reviewed = act(initialStrategy(), { type: 'review' });
    const ui = act(reviewed, { type: 'preview' }, state);
    expect(ui).toMatchObject({ review: null, stage: 'fleet', nextId: 2 });
    expect(ui.orders).toHaveLength(1);
    expect(ui.orders[0]).toMatchObject({ id: 'preview-1', sourceId: 'nova', phase: 'outbound', total: 5, counts: { striker: 2, guardian: 1, salvage: 1, scout: 1 } });
    expect(Object.isFrozen(ui.orders[0])).toBe(true);
    expect(Object.isFrozen(ui.orders[0].counts)).toBe(true);
    expect(summary(ui)).toMatchObject({ total: 1, remaining: 4, available: { striker: 1, guardian: 0, salvage: 0, scout: 0 } });
    expect(summary(ui, { ...state, selected: 'vesper' }).available).toEqual(zero);
    expect(JSON.stringify(state)).toBe(before);
    expect(act(ui, { type: 'preview' })).toBe(ui);
  });

  it('advances delayed orders only through explicit storyboard phases and frees reservations at completion', () => {
    const prepared = act(initialStrategy(), { type: 'delay', value: 2 });
    let ui = act(act(prepared, { type: 'review' }), { type: 'preview' });
    expect(ui.orders[0].phase).toBe('waiting');
    for (const phase of ['outbound', 'arrived', 'returning', 'complete']) {
      const before = ui;
      ui = act(ui, { type: 'advance', id: 'preview-1' });
      expect(ui.orders[0].phase).toBe(phase);
      expect(Object.isFrozen(ui.orders[0])).toBe(true);
      expect(before.orders[0].phase).not.toBe(phase);
    }
    expect(summary(ui).available.striker).toBe(3);
    expect(act(ui, { type: 'advance', id: 'preview-1' })).toBe(ui);
    expect(act(ui, { type: 'recall', id: 'preview-1' })).toBe(ui);
    expect(ui.orders[0]).not.toHaveProperty('win');
    expect(ui.orders[0]).not.toHaveProperty('reward');
  });

  it('recalls waiting and outbound previews without recording an actual battle result', () => {
    for (const delay of [0, 2]) {
      const ui = act(act(act(initialStrategy(), { type: 'delay', value: delay }), { type: 'review' }), { type: 'preview' });
      const recalled = act(ui, { type: 'recall', id: 'preview-1' });
      expect(recalled.orders[0].phase).toBe('returning');
      expect(summary(recalled).available.striker).toBe(1);
      expect(act(recalled, { type: 'recall', id: 'preview-1' })).toBe(recalled);
      const complete = act(recalled, { type: 'advance', id: 'preview-1' });
      expect(complete.orders[0].phase).toBe('complete');
      expect(summary(complete).available.striker).toBe(3);
    }
  });

  it('returns to fleet editing even when a review was already cleared', () => {
    for (const type of ['edit', 'cancel-review']) {
      expect(act(initialStrategy(), { type })).toMatchObject({ review: null, stage: 'fleet' });
    }
  });

  it('rejects unrecognized and prototype-named storyboard phases', () => {
    for (const phase of ['unknown', '__proto__', 'constructor']) {
      const ui = { ...initialStrategy(), orders: [{ id: 'preview-1', phase, sourceId: 'nova', counts: { ...zero, striker: 1 } }] };
      expect(act(ui, { type: 'advance', id: 'preview-1' })).toBe(ui);
      expect(act(ui, { type: 'recall', id: 'preview-1' })).toBe(ui);
    }
  });

  it('reserves each simultaneous preview once and releases only the completed origin reservation', () => {
    let ui = act(act(initialStrategy(), { type: 'review' }), { type: 'preview' });
    ui = act(act(ui, { type: 'review' }), { type: 'preview' });
    expect(ui.orders.map((order: any) => order.id)).toEqual(['preview-1', 'preview-2']);
    expect(summary(ui).available.striker).toBe(0);
    expect(summary(ui).total).toBe(0);
    ui = act(act(ui, { type: 'recall', id: 'preview-1' }), { type: 'advance', id: 'preview-1' });
    expect(summary(ui).available.striker).toBe(2);
    expect(ui.orders[1].phase).toBe('outbound');
    const foreign = { ...initialStrategy(), orders: [{ id: 'preview-99', phase: 'outbound', sourceId: 'vesper', counts: { ...zero, striker: 3 } }] };
    expect(summary(foreign).available.striker).toBe(3);
  });

  it('leaves movement and reinforcement deployed until explicit recall completes the return scene', () => {
    const state = initialDemo();
    const before = JSON.stringify(state);
    for (const [target, intent] of [['vesper', 'move'], ['mira', 'reinforce']]) {
      const prepared = act(initialStrategy(), { type: 'configure', target, intent }, state);
      let ui = act(act(prepared, { type: 'review' }, state), { type: 'preview' }, state);
      for (const phase of ['arrived', 'deployed']) {
        ui = act(ui, { type: 'advance', id: 'preview-1' }, state);
        expect(ui.orders[0].phase).toBe(phase);
        expect(summary(ui, state).available.striker).toBe(1);
      }
      expect(act(ui, { type: 'advance', id: 'preview-1' }, state)).toBe(ui);
      expect(summary(ui, { ...state, selected: 'vesper' }).available).toEqual(zero);
      const returning = act(ui, { type: 'recall', id: 'preview-1' }, state);
      expect(returning.orders[0].phase).toBe('returning');
      expect(summary(returning, state).available.striker).toBe(1);
      const complete = act(returning, { type: 'advance', id: 'preview-1' }, state);
      expect(complete.orders[0].phase).toBe('complete');
      expect(summary(complete, state).available.striker).toBe(3);
      expect(Object.isFrozen(returning.orders[0])).toBe(true);
    }
    expect(JSON.stringify(state)).toBe(before);
  });

  it('does not advertise an automatic return time for movement or reinforcement', () => {
    for (const [target, intent] of [['vesper', 'move'], ['mira', 'reinforce']]) {
      const ui = act(initialStrategy(), { type: 'configure', target, intent });
      expect(summary(ui).returnSeconds).toBeNull();
      const reviewed = act(ui, { type: 'review' });
      expect(reviewed.review.returnSeconds).toBeNull();
      expect(act(reviewed, { type: 'preview' }).orders[0].returnSeconds).toBeNull();
    }
  });

  it('allows recall immediately on a stationing arrival while attack and scout keep their return scenes', () => {
    for (const [target, intent] of [['vesper', 'move'], ['mira', 'reinforce'], ['tarsis', 'attack'], ['tarsis', 'scout']]) {
      const prepared = act(initialStrategy(), { type: 'configure', target, intent });
      const arrived = act(act(act(prepared, { type: 'review' }), { type: 'preview' }), { type: 'advance', id: 'preview-1' });
      expect(arrived.orders[0].phase).toBe('arrived');
      if (intent === 'move' || intent === 'reinforce') {
        expect(act(arrived, { type: 'recall', id: 'preview-1' }).orders[0].phase).toBe('returning');
      } else {
        expect(summary(prepared).returnSeconds).toBe(864);
        expect(act(arrived, { type: 'advance', id: 'preview-1' }).orders[0].phase).toBe('returning');
      }
    }
  });

  it('aligns to the nearest minute when the earlier arrival is closer to the ally rendezvous', () => {
    const guardianOnly = { ...emptyFleet(), drafts: { nova: { ...zero, guardian: 1 } } };
    expect(summary(guardianOnly).travelSeconds).toBe(333);
    const aligned = act(guardianOnly, { type: 'align' });
    expect(aligned.delay).toBe(2);
    expect(summary(aligned).allyDelta).toBe(-27);
  });

  it('explains a missing local fleet differently from reserved ships and a manually empty selection', () => {
    const state = initialDemo();
    const emptySource = summary(initialStrategy(), { ...state, selected: 'vesper' });
    expect(emptySource.errors).toContainEqual({ code: 'empty', text: '이 행성에는 보낼 함선이 없습니다. 상단 출발 행성을 변경하세요.' });
    let reserved = act(act(initialStrategy(), { type: 'review' }), { type: 'preview' });
    for (const id of ['siege', 'support', 'jammer']) reserved = act(reserved, { type: 'quantity', id, value: 1 });
    reserved = act(act(reserved, { type: 'review' }), { type: 'preview' });
    reserved = act(reserved, { type: 'quantity', id: 'carrier', value: 1 });
    reserved = act(act(reserved, { type: 'review' }), { type: 'preview' });
    expect(summary(reserved).available).toEqual(zero);
    expect(summary(reserved).errors).toContainEqual({ code: 'empty', text: '보유 함대가 모두 이동·주둔 중입니다. 함대에서 귀환 미리보기를 완료하거나 출발 행성을 바꾸세요.' });
    expect(summary(emptyFleet()).errors).toContainEqual({ code: 'empty', text: '출발지에서 사용할 함선을 1척 이상 선택하세요.' });
  });
});
