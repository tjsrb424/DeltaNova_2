import assert from 'node:assert/strict';
import test from 'node:test';
import { initialDemo, transition, visualFacilities } from '../public/uiux-demo/model.js';

test('repeated threat delivery is idempotent; closing details cannot dismiss the event', () => {
  const initial = initialDemo();
  const first = transition(initial, { type: 'threat' });
  const again = transition(first, { type: 'threat' });
  assert.equal(again.threat.id, first.threat.id);
  assert.equal(again.threat.planetId, 'nova');
  assert.deepEqual(transition(again, { type: 'close' }).threat, first.threat);
  assert.equal(initial.threat, null);
});
test('completion is an explicitly illustrative event and does not resolve a threat or upgrade assets', () => {
  const initial = transition(initialDemo(), { type: 'threat' });
  const next = transition(initial, { type: 'complete' });
  assert.equal(next.notice.demo, true);
  assert.equal(next.notice.text.includes('예시'), true);
  assert.deepEqual(next.planets, initial.planets);
  assert.deepEqual(next.threat, initial.threat);
});
test('planet selection preserves the global threat target and the previous selection on return', () => {
  const state = transition(initialDemo(), { type: 'threat' });
  const colony = transition(state, { type: 'select', id: 'vesper' });
  assert.equal(colony.selected, 'vesper');
  assert.equal(colony.threat.planetId, 'nova');
  assert.equal(transition(colony, { type: 'select', id: 'nova' }).selected, 'nova');
  assert.equal(transition(colony, { type: 'select', id: 'invalid' }), colony);
});
test('visual layers use individual facility levels, never invented development thresholds', () => {
  const state = initialDemo();
  const planet = state.planets[0];
  const visuals = visualFacilities(planet);
  assert.equal(visuals.industry, planet.facilities.alloyMine + planet.facilities.crystalMine + planet.facilities.fuelRefinery);
  assert.equal(visuals.orbit, planet.facilities.shipyard);
  assert.equal(visuals.research, planet.facilities.laboratory);
  const changed = transition(state, { type: 'snapshot' });
  assert.notDeepEqual(changed.planets[0].facilities, planet.facilities);
  assert.deepEqual(transition(changed, { type: 'snapshot' }).planets, state.planets);
  assert.equal(planet.facilities.shipyard, 1);
});
test('offline and empty previews remain local, maintain assets and do not create results', () => {
  const state = initialDemo();
  const offline = transition(state, { type: 'connection', value: 'offline' });
  assert.equal(offline.connection, 'offline');
  assert.equal(offline.notice, null);
  assert.deepEqual(offline.planets, state.planets);
  const empty = transition(offline, { type: 'empty' });
  assert.equal(empty.empty, true);
  assert.deepEqual(transition(empty, { type: 'reset' }), state);
});
test('each planet restores its own facility snapshot independently', () => {
  let state = transition(initialDemo(), { type: 'snapshot' });
  state = transition(state, { type: 'select', id: 'vesper' });
  state = transition(state, { type: 'snapshot' });
  assert.equal(state.planets[1].facilities.shipyard, 2);
  state = transition(state, { type: 'select', id: 'nova' });
  state = transition(state, { type: 'snapshot' });
  assert.equal(state.planets[0].facilities.shipyard, 1);
  assert.equal(state.planets[1].facilities.shipyard, 2);
});
