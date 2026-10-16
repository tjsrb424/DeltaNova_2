// Local design fixtures only. This module has no server, storage or game-rule imports.
const basePlanets = () => [
  { id: 'nova', name: '노바 프라임', kind: '본성', resources: { alloy: 280, crystal: 140, fuel: 120 }, rates: { alloy: 13, crystal: 5, fuel: 5 }, capacities: { alloy: 400, crystal: 200, fuel: 150 }, facilities: { alloyMine: 1, crystalMine: 1, fuelRefinery: 1, powerPlant: 1, shipyard: 1, laboratory: 0 }, ships: 10, defenses: 0 },
  { id: 'vesper', name: '베스퍼', kind: '식민지', resources: { alloy: 90, crystal: 35, fuel: 20 }, rates: { alloy: 8, crystal: 3, fuel: 2 }, capacities: { alloy: 300, crystal: 150, fuel: 100 }, facilities: { alloyMine: 1, crystalMine: 0, fuelRefinery: 0, powerPlant: 1, shipyard: 0, laboratory: 0 }, ships: 0, defenses: 0 },
];
export function initialDemo() {
  return { planets: basePlanets(), selected: 'nova', satellite: {id:'S-01',planetId:'nova'}, threat: null, departure: null, notice: null, connection: 'ready', empty: false, expanded: [] };
}
export function transition(state, action) {
  switch (action.type) {
    case 'threat': return { ...state, threat: state.threat || { id: 'demo-threat-01', planetId: 'nova', eta: '02:40', startedAt:action.now??0,durationMs:160000,initialProgress:.3 }, notice: null };
    case 'arrival': return {...state,threat:{id:'demo-arrival-01',planetId:'nova',startedAt:action.now??0,durationMs:5000,initialProgress:.9},notice:null};
    case 'idle': return { ...state, threat: null, notice: null };
    case 'departure': return {...state, departure: state.departure?.planetId === state.selected ? null : {planetId:state.selected, eta:'04:20',startedAt:action.now??0,durationMs:260000,initialProgress:0}};
    case 'complete': return { ...state, notice: { demo: true, text: '연료 합성소 Lv.2 증설 완료', id: 'demo-complete-01' } };
    case 'select': return state.planets.some(p => p.id === action.id) ? { ...state, selected: action.id } : state;
    case 'snapshot': {
      const restore = state.expanded.includes(state.selected);
      return { ...state, expanded: restore ? state.expanded.filter(id => id !== state.selected) : [...state.expanded, state.selected], planets: state.planets.map(p => p.id !== state.selected ? p : { ...p, facilities: restore ? basePlanets().find(b => b.id === p.id).facilities : { ...p.facilities, alloyMine: 3, crystalMine: 2, fuelRefinery: 2, powerPlant: 2, shipyard: 2, laboratory: 1 } }) };
    }
    case 'connection': return ['ready', 'loading', 'offline'].includes(action.value) ? { ...state, connection: action.value, notice: null } : state;
    case 'empty': return { ...state, empty: !state.empty };
    case 'dismiss-notice': return { ...state, notice: null };
    case 'reset': return initialDemo();
    default: return state;
  }
}
export function visualFacilities(planet) {
  const f = planet.facilities;
  return { industry: f.alloyMine + f.crystalMine + f.fuelRefinery, orbit: f.shipyard, research: f.laboratory, power: f.powerPlant };
}
