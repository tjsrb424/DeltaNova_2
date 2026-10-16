// @vitest-environment jsdom
import {describe,it,expect} from 'vitest';
import {initialDemo,transition} from '../public/uiux-demo/model.js';
// @ts-expect-error native demo module
import {technologies,shipBuild,initialDevelopment,researchPlan,shipPlan,cancellationPlan} from '../public/uiux-demo/development-model.js';
import {SHIP_BUILD,TECHNOLOGY_NAMES} from '../src/empire/content';

describe('independent development review contracts',()=>{
 it('mirrors canonical build prices and all four technologies without importing the game runtime',()=>{
   expect(shipBuild).toEqual(SHIP_BUILD);
   expect(Object.fromEntries(technologies.map((t:any)=>[t.id,t.name]))).toEqual(TECHNOLOGY_NAMES);
 });
 it('quotes exact quantities without mutating snapshots or treating queued ships as inventory',()=>{
   const state=initialDemo(),before=JSON.stringify(state);
   const q=shipPlan(state,{...initialDevelopment(),quantity:'3'});
   expect(q.cost).toEqual({alloy:120,crystal:60,fuel:30});expect(q.seconds).toBe(120);
   expect(q.quantity).toBe(3);expect(JSON.stringify(state)).toBe(before);
   expect(state.planets[0].ships).toBe(10);
 });
 it('does not silently coerce incomplete, fractional, huge or out of range quantities',()=>{
   for(const quantity of ['', '1.5','-1','0','21','1e3','9007199254740992']){
     const q=shipPlan(initialDemo(),{...initialDevelopment(),quantity});
     expect(q.validQuantity).toBe(false);expect(q.cost).toBeNull();expect(q.seconds).toBeNull();
   }
   expect(shipPlan(initialDemo(),{...initialDevelopment(),quantity:'20'}).validQuantity).toBe(true);
 });
 it('shows tech effects, local lab requirement, empire queue and maximum level honestly',()=>{
   const s=initialDemo();const q=researchPlan(s,initialDevelopment());
   expect(q.cost).toEqual({alloy:40,crystal:30,fuel:10});expect(q.seconds).toBe(90);
   expect(q.issues.join(' ')).toContain('연구소');expect(q.issues.join(' ')).toContain('연구');
   const max=researchPlan(s,{...initialDevelopment(),technology:'industry',scenario:'max'});
   expect(max.issues.join(' ')).toContain('최대');expect(max.next).toBe(3);
   const future=researchPlan(s,{...initialDevelopment(),technology:'propulsion'});
   expect(future.effect).toContain('속도 보너스 없음');expect(future.effect).not.toContain('%');
 });
 it('retains missing shipyard, technology, resources and power as separate actionable conditions',()=>{
   const s=initialDemo();s.planets[0].facilities.powerPlant=0;
   const q=shipPlan(s,{...initialDevelopment(),ship:'carrier',quantity:'4'});
   expect(q.issues.join(' ')).toContain('조선소');expect(q.issues.join(' ')).toContain('산업');
   expect(q.issues.join(' ')).toContain('부족');expect(q.issues.join(' ')).toContain('전력');
 });
 it('refunds to the original payer rather than the selected colony with per-resource floor',()=>{
   const s=transition(initialDemo(),{type:'select',id:'vesper'}),before=JSON.stringify(s);
   const q=cancellationPlan(s,'research','snapshot',{alloy:41,crystal:13,fuel:7});
   expect(q.source.id).toBe('nova');expect(q.refund).toEqual({alloy:32,crystal:10,fuel:5});
   expect(q.after.alloy).toBe(312);expect(q.forfeit).toEqual({alloy:9,crystal:3,fuel:2});
   expect(JSON.stringify(s)).toBe(before);
 });
 it('blocks capacity overflow, completed work and empty jobs without fake cancellation',()=>{
   const s=initialDemo();
   const full=cancellationPlan(s,'ships','capacity');
   expect(full.allowed).toBe(false);expect(full.issues.join(' ')).toContain('저장');
   const done=cancellationPlan(s,'construction','completed');
   expect(done.allowed).toBe(false);expect(done.refund).toEqual({alloy:0,crystal:0,fuel:0});
   expect(done.issues.join(' ')).toContain('완료');
   expect(cancellationPlan({...s,empty:true},'research').job).toBeNull();
   expect(s.planets[0].ships).toBe(10);
 });
});

// @ts-expect-error native demo module
import {renderResearchWorkbench,renderShipyard,renderCancellation} from '../public/uiux-demo/development.js';
// @ts-expect-error native demo module
import {createDevelopmentController} from '../public/uiux-demo/development-controller.js';
describe('development review interface',()=>{
 it('provides four research choices, eight ship choices and top review before detail',()=>{
   document.body.innerHTML=renderResearchWorkbench(initialDemo(),initialDevelopment())+renderShipyard(initialDemo(),initialDevelopment());
   expect(document.querySelectorAll('[data-development-tech]')).toHaveLength(4);
   expect(document.querySelectorAll('[data-development-ship]')).toHaveLength(8);
   const action=document.querySelector('#development-research-review')!,detail=document.querySelector('#development-research-cost')!;
   expect(action.compareDocumentPosition(detail)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
   expect(document.querySelector('#development-quantity')?.getAttribute('aria-describedby')).toContain('development-quantity-note');
 });
 it('shows refund source and full comparison without a successful command',()=>{
   const s=transition(initialDemo(),{type:'select',id:'vesper'});
   const html=renderCancellation(cancellationPlan(s,'research'),'snapshot');
   expect(html).toContain('노바 프라임');expect(html).toContain('80%');
   const host=document.createElement('div');host.innerHTML=html;
   expect(host.querySelector('button:disabled')?.textContent).toBe('연구 취소');
   expect(host.querySelector('button:disabled')?.getAttribute('aria-describedby')).toBe('development-dialog-note');
   expect(html).not.toContain('취소되었습니다');
 });
 it('keeps the quantity input and focus while recalculating exact totals and invalid states',()=>{
   let ui=initialDevelopment();const state=initialDemo();
   document.body.innerHTML=renderShipyard(state,ui)+'<dialog id="development-dialog"><div id="development-dialog-body"></div></dialog><h1 id="workspace-title"></h1>';
   const controller=createDevelopmentController({getState:()=>state,getUI:()=>ui,setUI:(v:any)=>{ui=v;},render:()=>{},navigate:()=>{},announce:()=>{}});
   const input=document.querySelector('#development-quantity') as HTMLInputElement;input.focus();input.value='3';input.dispatchEvent(new Event('input',{bubbles:true}));
   expect(document.querySelector('#development-quantity')).toBe(input);expect(document.activeElement).toBe(input);
   expect(document.querySelector('#development-ship-cost')?.textContent).toContain('120');
   input.value='1.5';input.dispatchEvent(new Event('input',{bubbles:true}));
   expect(input.getAttribute('aria-invalid')).toBe('true');
   expect((document.querySelector('#development-ship-review') as HTMLButtonElement).disabled).toBe(true);
   controller.destroy();
 });
});

it('retains expanded research state controls and their keyboard focus after selecting a comparison',()=>{
 let ui=initialDevelopment();const state=initialDemo();
 const draw=()=>{document.body.innerHTML=renderResearchWorkbench(state,ui);};draw();
 const controller=createDevelopmentController({getState:()=>state,getUI:()=>ui,setUI:(v:any)=>{ui=v;},render:draw,navigate:()=>{},announce:()=>{}});
 const detail=document.querySelector('.dev-scenarios') as HTMLDetailsElement;detail.open=true;
 const select=document.querySelector('#development-research-scenario') as HTMLSelectElement;select.focus();select.value='max';select.dispatchEvent(new Event('change',{bubbles:true}));
 expect((document.querySelector('.dev-scenarios') as HTMLDetailsElement).open).toBe(true);
 expect(document.activeElement?.id).toBe('development-research-scenario');
 controller.destroy();
});
