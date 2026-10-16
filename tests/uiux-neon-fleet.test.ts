// @vitest-environment jsdom
import {describe,it,expect} from 'vitest';
import {initialDemo} from '../public/uiux-demo/model.js';
// @ts-expect-error Independent browser demo module.
import {initialStrategy,transitionStrategy} from '../public/uiux-demo/strategy-model.js';
// @ts-expect-error Independent browser demo module.
import {renderStrategyOrders} from '../public/uiux-demo/strategy.js';
// @ts-expect-error Independent browser demo module.
import {renderFacilityDetail,renderWorkspace} from '../public/uiux-demo/workspace.js';

function fixture(delay=0){
  const state=initialDemo();let ui=initialStrategy();
  for(const [id,value] of Object.entries({striker:2,guardian:1,support:1}))ui=transitionStrategy(ui,{type:'quantity',id,value},state);
  ui=transitionStrategy(ui,{type:'delay',value:delay},state);
  ui=transitionStrategy(ui,{type:'review'},state);
  return {state,ui:transitionStrategy(ui,{type:'preview'},state)};
}
function render(state:any,ui:any){const host=document.createElement('div');host.innerHTML=renderStrategyOrders(state,ui);return host;}
describe('neon departure presentation',()=>{
  it('shows exactly the selected types and counts, without inserting decorative extra ships',()=>{
    const {state,ui}=fixture(),host=render(state,ui);
    const ships=[...host.querySelectorAll<HTMLElement>('[data-neon-ship]')];
    expect(ships.map(el=>[el.dataset.neonShip,el.dataset.neonCount])).toEqual([['striker','2'],['guardian','1'],['support','1']]);
    expect(host.querySelector('.dn-neon-manifest')?.textContent).toContain('보낸 함대');
    expect(host.querySelector('[data-neon-ship=carrier]')).toBeNull();
  });
  it('draws one neon unit for every selected ship in the actual departure scene',()=>{
    const {state,ui}=fixture(),host=render(state,ui);
    expect([...host.querySelectorAll<HTMLElement>('.sc-flight-scene [data-neon-unit]')].map(el=>el.dataset.neonUnit)).toEqual(['striker','striker','guardian','support']);
    expect(host.querySelectorAll('.sc-flight-scene .dn-ship-icon')).toHaveLength(4);
    expect(host.querySelector('.sc-flight-vessel')).toBeNull();
  });
  it('follows explicit local storyboard phases and never invents completed actions',()=>{
    const {state,ui:initial}=fixture(2),before=JSON.stringify(state);let ui=initial;
    for(const phase of ['waiting','outbound','arrived','returning','complete']){
      expect(render(state,ui).querySelector('[data-neon-phase]')?.getAttribute('data-neon-phase')).toBe(phase);
      ui=transitionStrategy(ui,{type:'advance',id:'preview-1'},state);
    }
    expect(JSON.stringify(state)).toBe(before);
    expect(render(state,ui).textContent).not.toMatch(/승리|보상 획득|실제 출항 완료/);
  });
  it('renders no departure telemetry when there are no local orders',()=>{
    expect(render(initialDemo(),initialStrategy()).querySelector('[data-neon-phase]')).toBeNull();
  });
  it('ties facility artwork to the selected comparison while preserving all costs',()=>{
    const p=initialDemo().planets[0],before=JSON.stringify(p),host=document.createElement('div');
    for(const key of ['alloyMine','crystalMine','fuelRefinery','powerPlant','shipyard','laboratory']){
      host.innerHTML=renderFacilityDetail(p,key);
      expect(host.querySelector('[data-facility-art]')?.getAttribute('data-facility-art')).toBe(key);
      expect(host.querySelector('.ws-cost-table')).not.toBeNull();
      expect((host.querySelector('.ws-command button') as HTMLButtonElement).disabled).toBe(true);
    }
    expect(JSON.stringify(p)).toBe(before);
    host.innerHTML=renderFacilityDetail(p,'laboratory',{loading:true});
    expect(host.querySelector('[data-facility-art]')).toBeNull();
  });
  it('keeps the research investment entry ahead of decorative artwork and the long cost breakdown',()=>{
    const host=document.createElement('div');host.innerHTML=renderWorkspace('research',initialDemo());
    const actions=host.querySelectorAll('[data-view-facility=laboratory]');
    expect(actions).toHaveLength(1);
    expect(actions[0].closest('.dn-art-lead')).not.toBeNull();
    expect(host.querySelector('.ws-investment-cost')).not.toBeNull();
  });
});
