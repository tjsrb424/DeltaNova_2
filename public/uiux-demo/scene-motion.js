// Presentation time and geometry only. No orbital simulation or game commands.
const TAU=Math.PI*2;
export function cloudMotion(elapsedMs) {
  return {surface:-1.3+elapsedMs*TAU/240000,clouds:-.8+elapsedMs*TAU/270000};
}
export function satellitePose(view,elapsedMs) {
  const phase=elapsedMs*TAU/96000,tilt=-22*Math.PI/180;
  const rx=view.radius+Math.min(36,view.radius*.28),ry=rx*.34;
  const a=rx*Math.cos(phase),b=ry*Math.sin(phase);
  const dx=a*Math.cos(tilt)-b*Math.sin(tilt),dy=a*Math.sin(tilt)+b*Math.cos(tilt);
  const depth=Math.sin(phase);
  return {x:view.cx+dx,y:view.cy+dy,depth,occluded:depth<0&&Math.hypot(dx,dy)<view.radius+9,rotation:phase*180/Math.PI+22,rx,ry};
}
export function arrivalEffect(route,now) {
  const age=now-route.startedAt-route.durationMs;
  if(age<0||age>=2200)return null;
  const u=age/2200;
  return {radius:5+22*(1-(1-u)**3),opacity:(1-u)**2,core:Math.exp(-age/330)*.75};
}
