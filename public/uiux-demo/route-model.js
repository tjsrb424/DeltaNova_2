// Geometry and local presentation time only: no world coordinates or game rules.
export function routeCurve(view,direction) {
  const outgoing=direction==='outgoing',angle=(outgoing?-36:-150)*Math.PI/180;
  const clearance=Math.max(12,Math.min(22,view.radius*.1)),distance=view.radius+clearance;
  const unit={x:Math.cos(angle),y:Math.sin(angle)};
  const port={x:view.cx+distance*unit.x,y:view.cy+distance*unit.y};
  const outside={x:outgoing?view.width+20:-20,y:Math.max(8,port.y-26)};
  // All three control points lie beyond the port's tangent plane. Keep the
  // upward control point visible even when a wide scene makes reach large.
  const reach=Math.hypot(outside.x-port.x,outside.y-port.y)*.45;
  const control={x:port.x+unit.x*reach,y:Math.max(14,port.y+unit.y*reach)};
  return {start:outgoing?port:outside,control,end:outgoing?outside:port,port};
}
export function routePoint(curve,t) {
  t=Math.max(0,Math.min(1,t));const u=1-t;
  return {x:u*u*curve.start.x+2*u*t*curve.control.x+t*t*curve.end.x,y:u*u*curve.start.y+2*u*t*curve.control.y+t*t*curve.end.y};
}
export function flightProgress(route,now) {
  const duration=Math.max(0,route.durationMs),elapsed=Math.max(0,now-route.startedAt);
  const fraction=duration?Math.min(1,elapsed/duration):1;
  const initial=Math.max(0,Math.min(1,route.initialProgress||0));
  const remainingMs=Math.max(0,duration-elapsed),seconds=Math.ceil(remainingMs/1000);
  return {progress:initial+(1-initial)*fraction,remainingMs,label:String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'),arrived:fraction===1};
}
