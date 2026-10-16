import {routeCurve,routePoint,flightProgress} from './route-model.js';
import {satellitePose,arrivalEffect} from './scene-motion.js';

export function createRoutePreview(getState) {
  const stage=document.querySelector('.scene-stage'),canvas=document.querySelector('#planet-canvas'),svg=document.querySelector('.route-layer');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const announcedArrivals=new WeakSet();
  let offset=0,pausedAt=null,timer=null,curves=null,sceneVisible=true;
  function now() {
    const t=performance.now(),paused=document.hidden||reduced.matches||document.body.classList.contains('motion-paused')||!!document.querySelector('dialog[open]');
    if(paused&&pausedAt===null)pausedAt=t;
    if(!paused&&pausedAt!==null){offset+=t-pausedAt;pausedAt=null;}
    return (pausedAt??t)-offset;
  }
  function measure() {
    if(stage.closest('[hidden]'))return;
    const s=stage.getBoundingClientRect(),g=canvas.getBoundingClientRect();
    if(!s.width||!g.width)return;
    const view={width:s.width,height:s.height,cx:g.left-s.left+g.width/2,cy:g.top-s.top+g.height/2,radius:g.width/2};
    svg.setAttribute('viewBox',`0 0 ${s.width} ${s.height}`);
    const controls=[...stage.querySelectorAll('.facility-hotspot')].map(el=>{const b=el.getBoundingClientRect();return {left:b.left-s.left,right:b.right-s.left,top:b.top-s.top,bottom:b.bottom-s.top};}).sort((a,b)=>b.top-a.top);
    curves={incoming:routeCurve(view,'incoming'),outgoing:routeCurve(view,'outgoing'),width:s.width,controls,view};
    document.querySelector('.satellite-layer').setAttribute('viewBox',`0 0 ${s.width} ${s.height}`);
    const orbit=stage.querySelector('.orbit'),pose=satellitePose(view,0),button=stage.querySelector('.planet-scene').getBoundingClientRect();
    Object.assign(orbit.style,{left:view.cx+'px',top:(view.cy-(button.top-s.top))+'px',width:pose.rx*2+'px',height:pose.ry*2+'px',transform:'translate(-50%,-50%) rotate(-22deg)'});
    for(const [kind,id] of [['incoming','incoming-route'],['outgoing','departure-route']]){
      const group=document.getElementById(id),c=curves[kind];
      group.querySelector('.route-track').setAttribute('d',`M${c.start.x} ${c.start.y} Q${c.control.x} ${c.control.y} ${c.end.x} ${c.end.y}`);
      const port=group.querySelector('.route-port');port.setAttribute('cx',c.port.x);port.setAttribute('cy',c.port.y);
    }
  }
  function draw(t) {
    const state=getState();let running=false;
    const satellite=document.getElementById('recon-satellite'),hasSatellite=state.satellite?.planetId===state.selected;
    if(satellite.hasAttribute('hidden')===hasSatellite)satellite.toggleAttribute('hidden',!hasSatellite);
    if(hasSatellite&&curves&&sceneVisible){
      const pose=satellitePose(curves.view,t+12000),scale=pose.depth<0?.68:.86;
      satellite.setAttribute('transform',`translate(${pose.x} ${pose.y}) rotate(${pose.rotation}) scale(${scale})`);
      satellite.setAttribute('opacity',pose.occluded?'0':pose.depth<0?'.45':'.95');
      satellite.dataset.occluded=String(pose.occluded);satellite.dataset.depth=String(pose.depth);
      running=true;
    }
    for(const [kind,id,route] of [['incoming','incoming-route',state.threat],['outgoing','departure-route',state.departure]]){
      if(!route)continue;
      const flight=flightProgress(route,t),group=document.getElementById(id);
      running ||= !flight.arrived;
      // Update only when a displayed second changes. Timers are deliberately
      // outside live regions; an urgent event is announced once by the shell.
      document.querySelectorAll(`[data-route-eta="${kind}"]`).forEach(el=>{if(el.textContent!==flight.label)el.textContent=flight.label;});
      if(kind==='outgoing'){
        const phase=flight.arrived?'외부 항로 이탈':'외부 항로로 출항 중',caption=flight.arrived?'이탈 완료':'외부 항로까지';
        for(const el of document.querySelectorAll('[data-outgoing-phase]'))if(el.textContent!==phase)el.textContent=phase;
        for(const el of document.querySelectorAll('[data-outgoing-caption]'))if(el.textContent!==caption)el.textContent=caption;
      }
      if(kind==='incoming'){
        const title=flight.arrived?'적 함대 외곽 대기':'적 함대 접근',caption=flight.arrived?'외곽 대기점 도달':'외곽 도달까지';
        for(const el of document.querySelectorAll('[data-threat-phase]'))if(el.textContent!==title)el.textContent=title;
        for(const el of document.querySelectorAll('[data-incoming-caption]'))if(el.textContent!==caption)el.textContent=caption;
        if(route.planetId===state.selected){const pill=document.getElementById('planet-status'),text=flight.arrived?'△ 외곽 대기 · 예시':'△ 적 접근 · 예시';if(pill.textContent!==text)pill.textContent=text;}
        if(flight.arrived&&!announcedArrivals.has(route)){announcedArrivals.add(route);document.getElementById('announcement').textContent='외곽 대기점 도달 시연. 실제 공격이나 자산 변화는 없습니다.';}
      }
      const effect=kind==='incoming'?arrivalEffect(route,t):null;running ||= !!effect;
      const status=document.querySelector(`[data-route-phase="${kind}"]`),phaseText=flight.arrived?(kind==='incoming'?'외곽 대기점 도달':'외부 항로 이탈'):'현재 위치';if(status&&status.textContent!==phaseText)status.textContent=phaseText;
      if(!curves||!sceneVisible||group.hasAttribute('hidden')||route.planetId!==state.selected)continue;
      const c=curves[kind],p=routePoint(c,flight.progress),tail=routePoint(c,Math.max(0,flight.progress-.035));
      group.dataset.progress=String(flight.progress);group.dataset.remaining=String(flight.remainingMs);group.dataset.arrived=String(flight.arrived);
      for(const el of group.querySelectorAll('.route-dot,.route-aura')){el.setAttribute('cx',p.x);el.setAttribute('cy',p.y);}
      group.querySelector('.route-tail').setAttribute('d',`M${tail.x} ${tail.y} L${p.x} ${p.y}`);
      group.querySelector('.route-tail').setAttribute('opacity',flight.arrived?'0':'1');
      group.querySelector('.route-dot').setAttribute('opacity',flight.arrived?'.55':'1');
      const ring=group.querySelector('.arrival-ring'),core=group.querySelector('.arrival-core');
      if(ring){
        group.dataset.arrivalEffect=effect?'active':'none';
        for(const el of [ring,core]){el.setAttribute('cx',c.port.x);el.setAttribute('cy',c.port.y);}
        ring.setAttribute('r',effect?.radius??0);ring.setAttribute('opacity',effect?.opacity??0);core.setAttribute('opacity',effect?.core??0);
      }
      const label=group.querySelector('.route-time'),x=Math.max(10,Math.min(curves.width-80,p.x+10));let y=Math.max(14,p.y-12);
      // Keep the moving label clear of facility controls on narrow columns.
      for(const b of curves.controls)if(x<b.right&&x+80>b.left&&y-12<b.bottom&&y+3>b.top)y=Math.max(14,b.top-8);
      label.setAttribute('x',x);label.setAttribute('y',y);label.textContent=(kind==='incoming'?(flight.arrived?'도달 ':'접근 '):'출항 ')+flight.label;
    }
    return running;
  }
  function tick() {
    clearTimeout(timer);const t=now(),running=draw(t);
    if(running&&pausedAt===null)timer=setTimeout(tick,sceneVisible?50:1000);
  }
  function render(){measure();tick();}
  const observer=new ResizeObserver(render);observer.observe(stage);observer.observe(canvas);
  const visibilityObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{sceneVisible=entries[0].isIntersecting;render();}):null;
  visibilityObserver?.observe(stage);
  const bodyObserver=new MutationObserver(render);bodyObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  const dialogObserver=new MutationObserver(render);dialogObserver.observe(document.querySelector('dialog'),{attributes:true,attributeFilter:['open']});
  document.addEventListener('visibilitychange',render);reduced.addEventListener('change',render);
  return {now,render,dispose(){clearTimeout(timer);observer.disconnect();visibilityObserver?.disconnect();bodyObserver.disconnect();dialogObserver.disconnect();document.removeEventListener('visibilitychange',render);reduced.removeEventListener('change',render);}};
}
