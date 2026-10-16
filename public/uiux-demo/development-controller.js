import {technologies,initialDevelopment,researchPlan,shipPlan,cancellationPlan} from './development-model.js';
import {renderPlanCost,renderPlanReview,renderCancellation} from './development.js';
export function createDevelopmentController({getState,getUI,setUI,render,navigate,announce,signal}){
 const events=new window.AbortController(),dialog=document.getElementById('development-dialog');
 let opener=null,review=null;
 const on=(node,event,fn)=>node?.addEventListener(event,fn,{signal:events.signal});
 const close=(restore=true)=>{
   review=null;
   if(dialog?.open)dialog.close();
   if(restore)(opener?.isConnected&&!opener.closest('[hidden]')?opener:document.getElementById('workspace-title'))?.focus({preventScroll:true});
 };
 const open=(kind,element)=>{
   if(getState().connection!=='ready'||document.querySelector('dialog[open]'))return;
   const q=kind==='research'?researchPlan(getState(),getUI()):kind==='ships'?shipPlan(getState(),getUI()):cancellationPlan(getState(),kind.slice(7));
   if(kind==='ships'&&!q.validQuantity||kind.startsWith('cancel-')&&!q.job)return;
   opener=element;review={kind,scenario:'snapshot'};
   document.getElementById('development-announcement').textContent='';
   document.getElementById('development-dialog-title').textContent=kind.startsWith('cancel-')?'취소 전 환급 확인':'시작 전 계획 확인';
   document.getElementById('development-dialog-body').innerHTML=kind.startsWith('cancel-')?renderCancellation(q):renderPlanReview(q);
   dialog.showModal();document.getElementById('development-dialog-close').focus({preventScroll:true});
 };
 const refreshQuantity=raw=>{
   const ui={...getUI(),quantity:raw};setUI(ui);
   const q=shipPlan(getState(),ui),input=document.getElementById('development-quantity');
   if(!input)return;
   input.setAttribute('aria-invalid',String(!q.validQuantity));
   document.getElementById('development-quantity-error').textContent=q.validQuantity?'':'1~20 사이 정수를 입력하세요.';
   document.getElementById('development-ship-cost').innerHTML=renderPlanCost(q);
   document.getElementById('development-ship-review').disabled=!q.validQuantity;
   document.getElementById('development-minus').setAttribute('aria-disabled',String(!q.validQuantity||q.quantity<=1));
   document.getElementById('development-plus').setAttribute('aria-disabled',String(!q.validQuantity||q.quantity>=20));
   announce(q.validQuantity?q.name+' '+q.quantity+'척, 합금 '+q.cost.alloy+', 결정 '+q.cost.crystal+', 연료 '+q.cost.fuel+'. 계획 검토입니다.':'건조 수량은 1~20 사이의 정수여야 합니다.');
 };
 const select=(patch,focusId)=>{
   const expanded=[...document.querySelectorAll('.dev-scenarios[open]')].map(el=>el.id);
   setUI({...getUI(),...patch});render();
   expanded.forEach(id=>{const el=document.getElementById(id);if(el)el.open=true;});
   document.getElementById(focusId)?.focus({preventScroll:true});
 };
 on(document,'click',event=>{
   const b=event.target.closest('button');if(!b||b.disabled)return;
   if(b.dataset.developmentJump){const target=document.getElementById(b.dataset.developmentJump==='research'?'development-research-review':'development-yard-title');target?.scrollIntoView({block:'start'});target?.focus({preventScroll:true});}
   if(b.dataset.developmentTech)select({technology:b.dataset.developmentTech},b.id);
   if(b.dataset.developmentShip)select({ship:b.dataset.developmentShip},b.id);
   if(b.dataset.developmentReview)open(b.dataset.developmentReview,b);
   if(b.dataset.developmentCancel)open('cancel-'+b.dataset.developmentCancel,b);
   if(b.dataset.developmentResearch){setUI({...getUI(),technology:b.dataset.developmentResearch,scenario:'snapshot'});navigate('research');}
   if(b.dataset.developmentStep){
     const input=document.getElementById('development-quantity'),q=shipPlan(getState(),getUI());
     if(q.validQuantity){const value=Math.max(1,Math.min(20,q.quantity+Number(b.dataset.developmentStep)));if(value!==q.quantity){input.value=String(value);refreshQuantity(input.value);}}
   }
 });
 on(document,'input',event=>{if(event.target.id==='development-quantity')refreshQuantity(event.target.value);});
 on(document,'change',event=>{
   const el=event.target;
   if(el.id==='development-tech-select')select({technology:el.value},el.id);
   if(el.id==='development-ship-select')select({ship:el.value},el.id);
   if(el.id==='development-research-scenario')select({scenario:el.value},el.id);
   if(el.id==='development-refund-scenario'&&review?.kind.startsWith('cancel-')){
     review.scenario=el.value;
     document.getElementById('development-dialog-body').innerHTML=renderCancellation(cancellationPlan(getState(),review.kind.slice(7),el.value),el.value);
     document.getElementById(el.id)?.focus({preventScroll:true});
     const q=cancellationPlan(getState(),review.kind.slice(7),el.value);
     document.getElementById('development-announcement').textContent=q.issues.length?'취소 불가. '+q.issues.join(' '):'예시 환급 조건을 충족합니다. 실제 취소는 미연결입니다.';
   }
 });
 on(document.getElementById('development-dialog-close'),'click',()=>close());
 on(dialog,'keydown',event=>{
   if(event.key!=='Tab')return;
   const controls=[...dialog.querySelectorAll('button:not([disabled]),select:not([disabled]),input:not([disabled]),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length);
   if(!controls.length)return;
   const index=controls.indexOf(document.activeElement);
   if(event.shiftKey&&index<=0){event.preventDefault();controls.at(-1).focus();}
   else if(!event.shiftKey&&(index<0||index===controls.length-1)){event.preventDefault();controls[0].focus();}
 });
 on(dialog,'cancel',event=>{event.preventDefault();close();});
 on(dialog,'close',()=>{if(review)close();});
 on(window,'hashchange',()=>{if(review)close(false);});
 if(signal)signal.addEventListener('abort',()=>events.abort(),{once:true});
 return {invalidate(reset=false){if(review)close(false);if(reset)setUI(initialDevelopment());},destroy(){close(false);events.abort();}};
}
