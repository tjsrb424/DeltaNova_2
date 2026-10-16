// @vitest-environment jsdom
import {describe,it,expect} from 'vitest';
import {initialDemo} from '../public/uiux-demo/model.js';
// @ts-expect-error Independent demo modules.
import {initialStrategy,strategySummary,transitionStrategy} from '../public/uiux-demo/strategy-model.js';
// @ts-expect-error Independent demo modules.
import {renderStrategyCommand} from '../public/uiux-demo/strategy.js';

describe('player-authored fleet composition',()=>{
  it('starts without assigning ships and requires a deliberate player composition',()=>{
    const state=initialDemo(),plan=initialStrategy();
    expect(strategySummary(plan,state)).toMatchObject({total:0,valid:false,selectedShips:[]});
    expect(transitionStrategy(plan,{type:'review'},state).review).toBeNull();
  });
  it('exposes every ship quantity immediately and gives no preset selection priority',()=>{
    const host=document.createElement('div');host.innerHTML=renderStrategyCommand(initialDemo(),initialStrategy());
    const inputs=[...host.querySelectorAll<HTMLInputElement>('[data-strategy-quantity]')];
    expect(inputs).toHaveLength(8);
    expect(inputs.every(input=>input.value==='0')).toBe(true);
    expect(inputs.every(input=>!input.closest('details:not([open])'))).toBe(true);
    expect(host.querySelector('[data-strategy-preset]')).toBeNull();
    expect((host.querySelector('#strategy-review') as HTMLButtonElement).disabled).toBe(true);
  });
  it('reviews exactly the hand-selected combination and keeps source assets unchanged',()=>{
    const state=initialDemo(),before=JSON.stringify(state);
    let plan=initialStrategy();
    for(const id of ['striker','support','jammer'])plan=transitionStrategy(plan,{type:'quantity',id,value:1},state);
    expect(strategySummary(plan,state)).toMatchObject({total:3,valid:true,counts:{striker:1,support:1,jammer:1,guardian:0,salvage:0,scout:0}});
    plan=transitionStrategy(plan,{type:'review'},state);
    expect(plan.review).toMatchObject({total:3,counts:{striker:1,support:1,jammer:1}});
    expect(JSON.stringify(state)).toBe(before);
  });
  it('clears only the current planet draft and invalidates a reviewed command',()=>{
    const state=initialDemo();
    let plan=transitionStrategy(initialStrategy(),{type:'quantity',id:'striker',value:2},state);
    plan=transitionStrategy(plan,{type:'review'},state);
    const foreign=transitionStrategy(plan,{type:'clear'},{...state,selected:'vesper'});
    expect(strategySummary(foreign,state).total).toBe(2);
    const cleared=transitionStrategy(foreign,{type:'clear'},state);
    expect(strategySummary(cleared,state)).toMatchObject({total:0,valid:false});
    expect(cleared.review).toBeNull();
  });
  it('does not fabricate departure or arrival estimates for an empty fleet',()=>{
    const host=document.createElement('div');host.innerHTML=renderStrategyCommand(initialDemo(),initialStrategy());
    const text=host.querySelector('#strategy-estimate')!.textContent;
    expect(text).toContain('함선 선택 후 표시');
    expect(text).not.toContain('14:20:00');
  });
});
