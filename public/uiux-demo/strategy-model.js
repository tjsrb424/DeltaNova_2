// Illustrative, memory-only strategy preparation. No game rules or live orders.
import { ships, operationInventory } from './operations.js';
import { galaxyTargets } from './galaxy.js';

const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

const shipExamples = {
  striker: { power: 18, speed: 90, fuel: 5 },
  guardian: { power: 12, speed: 65, fuel: 7 },
  siege: { power: 30, speed: 45, fuel: 11 },
  support: { power: 4, speed: 60, fuel: 6 },
  salvage: { power: 2, speed: 50, fuel: 8 },
  scout: { power: 3, speed: 120, fuel: 2 },
  jammer: { power: 8, speed: 80, fuel: 6 },
  carrier: { power: 38, speed: 40, fuel: 16 },
};
export const strategyShips = freeze(ships.map(ship => ({ ...ship, ...shipExamples[ship.id] })));

const targetExamples = {
  nova: { kind: 'own', travelUnits: 180, threat: '내 행성', hint: '현재 출발지의 잔류 전력을 확인하세요.' },
  vesper: { kind: 'own', travelUnits: 180, threat: '배치 함선 없음 · 예시', hint: '함대를 옮겨 다른 내 행성의 방어를 준비하세요.' },
  tarsis: { kind: 'hostile', travelUnits: 360, threat: '전력 미확인', hint: '공격과 정찰을 비교하세요. 적 전력과 전투 결과는 알 수 없습니다.' },
  mira: { kind: 'ally', travelUnits: 300, threat: '동맹 거점 · 예시', hint: '지원 병력과 도착 시각을 동맹과 맞춰 보세요.' },
  naos: { kind: 'neutral', travelUnits: 240, threat: '중립 · 전력 미확인', hint: '중립 거점은 정찰 목적으로만 접근할 수 있습니다.' },
  eos: { kind: 'hostile', travelUnits: 420, threat: '전력 미확인', hint: '먼 항로의 이동 시간과 출발지의 잔류 전력을 비교하세요.' },
  rigel: { kind: 'hostile', travelUnits: 600, threat: '전력 미확인', hint: '다른 성역까지의 이동 시간과 편성을 검토하세요.' },
  saiph: { kind: 'hostile', travelUnits: 540, threat: '전력 미확인', hint: '관측 정보는 고정 예시입니다. 전투 결과를 예측하지 않습니다.' },
  bellatrix: { kind: 'neutral', travelUnits: 660, threat: '중립 · 전력 미확인', hint: '먼 중립 거점을 정찰할 편성과 시간을 검토하세요.' },
};
export const strategyTargets = freeze(galaxyTargets.map(({ id, name, coords }) => ({ id, name, coords, ...targetExamples[id] })));

const presets = freeze({
  balanced: { striker: 2, guardian: 1, salvage: 1, scout: 1 },
  strike: { striker: 3, guardian: 1, siege: 1 },
  mobile: { striker: 2, scout: 1, jammer: 1 },
});
const purposes = freeze({ own: ['move'], ally: ['reinforce', 'scout'], neutral: ['scout'], hostile: ['attack', 'scout'] });
const contexts = ['solo', 'alliance', 'defense'];
const intents = ['attack', 'scout', 'move', 'reinforce'];
const stationsAtTarget = intent => ['move', 'reinforce'].includes(intent);
const targetFor = id => strategyTargets.find(target => target.id === id);
const sourceFor = state => state?.planets?.find(planet => planet.id === state.selected);
const ownedSource = source => source && ['nova', 'vesper'].includes(source.id);
const finiteInteger = value => {
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
};
const sumCounts = counts => Object.values(counts).reduce((total, count) => total + count, 0);

export function initialStrategy() {
  return {
    target: 'tarsis', intent: 'attack', context: 'solo', stage: 'target',
    delay: 0, drafts: {}, orders: [], clock: 0, nextId: 1, review: null,
  };
}

function availableInventory(ui, source) {
  const inventory = operationInventory(source);
  return Object.fromEntries(strategyShips.map(ship => {
    const reserved = (ui?.orders || []).filter(order => order.sourceId === source?.id && order.phase !== 'complete')
      .reduce((total, order) => total + Math.max(0, finiteInteger(order.counts?.[ship.id]) ?? 0), 0);
    return [ship.id, Math.max(0, inventory[ship.id] - reserved)];
  }));
}

export function strategyFleet(ui, state) {
  const source = sourceFor(state);
  const available = availableInventory(ui, source);
  const saved = Object.hasOwn(ui?.drafts || {}, source?.id) ? ui.drafts[source.id] : null;
  const counts = saved || presets.balanced;
  return Object.fromEntries(strategyShips.map(ship => [ship.id, Math.max(0, Math.min(available[ship.id], finiteInteger(counts[ship.id]) ?? 0))]));
}

export function strategySummary(ui, state) {
  const source = sourceFor(state);
  const target = targetFor(ui?.target) || null;
  const available = availableInventory(ui, source);
  const counts = strategyFleet(ui, state);
  const selectedShips = strategyShips.filter(ship => counts[ship.id] > 0).map(ship => ({ ...ship, count: counts[ship.id] }));
  const total = sumCounts(counts);
  const weighted = key => selectedShips.reduce((sum, ship) => sum + ship[key] * ship.count, 0);
  const command = weighted('command');
  const cargo = weighted('cargo');
  const power = weighted('power');
  const fuel = weighted('fuel');
  const speed = total ? Math.min(...selectedShips.map(ship => ship.speed)) : 0;
  const travelSeconds = speed && target ? Math.ceil(target.travelUnits * 60 / speed) : 0;
  const departureSeconds = Math.max(0, Math.min(30, finiteInteger(ui?.delay) ?? 0)) * 60;
  const arrivalSeconds = departureSeconds + travelSeconds;
  const returnSeconds = stationsAtTarget(ui?.intent) ? null : arrivalSeconds + travelSeconds;
  const errors = [];
  const error = (code, text) => errors.push({ code, text });
  if (state?.connection !== 'ready') error('connection', '연결이 준비되면 명령 시연을 검토할 수 있습니다.');
  if (!ownedSource(source)) error('source', '출발할 내 행성을 선택하세요.');
  if (!target) error('target', '이동할 대상을 선택하세요.');
  if (!total) {
    if (!sumCounts(operationInventory(source))) error('empty', '이 행성에는 보낼 함선이 없습니다. 상단 출발 행성을 변경하세요.');
    else if (!sumCounts(available)) error('empty', '시연 함대가 모두 배치 중입니다. 함대에서 귀환 시연을 완료하거나 출발 행성을 변경하세요.');
    else error('empty', '출발지에서 사용할 함선을 1척 이상 선택하세요.');
  }
  if (total > 6) error('ship-limit', `함선 ${total - 6}척을 줄여 6척 이하로 맞추세요.`);
  if (command > 12) error('command-limit', `지휘 비용을 ${command - 12} 줄여 12 이하로 맞추세요.`);
  const sourceFuel = Number(source?.resources?.fuel);
  if (fuel > 0 && (!Number.isFinite(sourceFuel) || fuel > sourceFuel)) error('fuel', `예시 필요 연료 ${fuel}이 출발지의 보유 연료를 넘습니다.`);
  if (target && !purposes[target.kind].includes(ui?.intent)) error('intent', '선택한 대상에 사용할 수 없는 명령입니다.');
  if (target?.id === source?.id) error('same-source', '현재 출발지와 다른 행성을 선택하세요.');
  if (!contexts.includes(ui?.context)) error('context', '명령 상황을 다시 선택하세요.');
  if (ui?.context === 'alliance' && (target?.id !== 'tarsis' || ui.intent !== 'attack')) error('alliance-target', '합동 공격은 타르시스를 공통 대상으로 사용합니다.');
  if (ui?.context === 'defense' && (target?.kind !== 'own' || ui.intent !== 'move')) error('defense-target', '방어 재배치는 다른 내 행성으로 이동할 수 있습니다.');
  return {
    target, source, intent: ui?.intent, context: ui?.context, counts, total,
    remaining: Math.max(0, sumCounts(available) - total), command, cargo, power, speed, fuel,
    travelSeconds, departureSeconds, arrivalSeconds, returnSeconds, allyDelta: arrivalSeconds - 480,
    errors, valid: errors.length === 0, available, selectedShips,
  };
}

function configure(ui, action, state) {
  if (Object.hasOwn(action, 'target') && !targetFor(action.target)) return ui;
  if (Object.hasOwn(action, 'intent') && !intents.includes(action.intent)) return ui;
  if (Object.hasOwn(action, 'context') && !contexts.includes(action.context)) return ui;
  if (Object.hasOwn(action, 'stage') && !['target', 'fleet'].includes(action.stage)) return ui;
  const next = { ...ui, review: null, stage: ui.stage === 'confirm' ? 'fleet' : ui.stage };
  for (const key of ['target', 'intent', 'context', 'stage']) if (Object.hasOwn(action, key)) next[key] = action[key];
  if (next.context === 'alliance') return { ...next, target: 'tarsis', intent: 'attack' };
  if (next.context === 'defense' && !Object.hasOwn(action, 'target')) next.target = sourceFor(state)?.id === 'nova' ? 'vesper' : 'nova';
  if (!Object.hasOwn(action, 'intent') && (Object.hasOwn(action, 'target') || Object.hasOwn(action, 'context'))) {
    next.intent = next.context === 'defense' ? 'move' : purposes[targetFor(next.target).kind][0];
  }
  return next;
}

const changedDraft = (ui, source, counts) => ({ ...ui, drafts: { ...ui.drafts, [source.id]: counts }, review: null, stage: 'fleet' });
const withoutReview = ui => ui.review || ui.stage !== 'fleet' ? { ...ui, review: null, stage: 'fleet' } : ui;

function reviewSnapshot(ui, summary) {
  const { source, target, counts, total, remaining, command, cargo, power, speed, fuel, travelSeconds, departureSeconds, arrivalSeconds, returnSeconds, allyDelta } = summary;
  return freeze({
    sourceId: source.id, sourceName: source.name, targetId: target.id, targetName: target.name,
    intent: ui.intent, context: ui.context, delay: ui.delay, counts: { ...counts },
    total, remaining, command, cargo, power, speed, fuel,
    travelSeconds, departureSeconds, arrivalSeconds, returnSeconds, allyDelta,
  });
}

function matchesReview(ui, summary) {
  if (!ui.review || !summary.valid) return false;
  const current = reviewSnapshot(ui, summary);
  return Object.keys(current).every(key => key === 'counts'
    ? strategyShips.every(ship => current.counts[ship.id] === ui.review.counts?.[ship.id])
    : current[key] === ui.review[key]);
}

function changeOrderPhase(ui, action) {
  const order = ui.orders.find(item => item.id === action.id);
  if (!order) return ui;
  const stationed = stationsAtTarget(order.intent);
  const nextPhases = { waiting: 'outbound', outbound: 'arrived', arrived: stationed ? 'deployed' : 'returning', returning: 'complete' };
  const canRecall = ['waiting', 'outbound'].includes(order.phase) || (stationed && ['arrived', 'deployed'].includes(order.phase));
  const phase = action.type === 'recall'
    ? canRecall ? 'returning' : null
    : Object.hasOwn(nextPhases, order.phase) ? nextPhases[order.phase] : null;
  if (!phase) return ui;
  return { ...ui, review: null, stage: ui.stage === 'confirm' ? 'fleet' : ui.stage,
    orders: ui.orders.map(item => item === order ? freeze({ ...item, phase }) : item) };
}

export function transitionStrategy(ui, action, state) {
  if (!action || typeof action.type !== 'string') return ui;
  if (action.type === 'reset') return initialStrategy();
  if (['edit', 'cancel-review'].includes(action.type)) return withoutReview(ui);
  if (action.type === 'configure') return configure(ui, action, state);
  const source = sourceFor(state);
  if (!ownedSource(source) || state?.connection !== 'ready') return ui;
  switch (action.type) {
    case 'quantity': {
      const ship = strategyShips.find(candidate => candidate.id === action.id);
      const number = finiteInteger(action.value);
      if (!ship || number === null) return ui;
      const counts = strategyFleet(ui, state);
      const value = Math.max(0, Math.min(availableInventory(ui, source)[ship.id], number));
      return changedDraft(ui, source, { ...counts, [ship.id]: value });
    }
    case 'preset': {
      if (!Object.hasOwn(presets, action.id)) return ui;
      const available = availableInventory(ui, source);
      const counts = Object.fromEntries(strategyShips.map(ship => [ship.id, Math.min(available[ship.id], presets[action.id][ship.id] || 0)]));
      return changedDraft(ui, source, counts);
    }
    case 'delay': {
      const value = finiteInteger(action.value);
      return value === null ? ui : { ...ui, delay: Math.max(0, Math.min(30, value)), review: null, stage: ui.stage === 'confirm' ? 'fleet' : ui.stage };
    }
    case 'align': {
      const current = strategySummary(ui, state);
      if (!current.total || current.travelSeconds > 480) return ui;
      return { ...ui, delay: Math.round((480 - current.travelSeconds) / 60), review: null, stage: ui.stage === 'confirm' ? 'fleet' : ui.stage };
    }
    case 'review': {
      const current = strategySummary(ui, state);
      return current.valid ? { ...ui, review: reviewSnapshot(ui, current), stage: 'confirm' } : ui;
    }
    case 'preview': {
      const current = strategySummary(ui, state);
      if (!matchesReview(ui, current)) return ui;
      const order = freeze({ id: `preview-${ui.nextId}`, ...ui.review, phase: ui.delay ? 'waiting' : 'outbound' });
      return { ...ui, orders: [...ui.orders, order], review: null, stage: 'fleet', nextId: ui.nextId + 1 };
    }
    case 'advance':
    case 'recall': return changeOrderPhase(ui, action);
    default: return ui;
  }
}
