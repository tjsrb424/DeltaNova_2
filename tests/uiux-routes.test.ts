import {describe,it,expect} from 'vitest';
import {routeCurve,routePoint,flightProgress} from '../public/uiux-demo/route-model.js';
import {initialDemo,transition} from '../public/uiux-demo/model.js';

describe('demo flight position and exterior routes',()=>{
  it.each([
    {width:800,height:338,cx:400,cy:165,radius:150},
    {width:342,height:290,cx:171,cy:139,radius:117.5},
    {width:288,height:290,cx:144,cy:139,radius:104},
    {width:1228,height:338,cx:614,cy:166.4,radius:150},
    {width:1416,height:388,cx:708,cy:190.4,radius:175},
  ])('keeps the complete incoming and outbound curve outside the visible globe ($width px)',view=>{
    for(const direction of ['incoming','outgoing']){
      const curve=routeCurve(view,direction);
      for(let i=0;i<=100;i++){
        const point=routePoint(curve,i/100);
        expect(Math.hypot(point.x-view.cx,point.y-view.cy)).toBeGreaterThanOrEqual(view.radius+11.9);
        expect(point.y).toBeGreaterThanOrEqual(8);
        expect(point.y).toBeLessThan(view.height);
      }
      const port=direction==='incoming'?curve.end:curve.start;
      expect(Math.hypot(port.x-view.cx,port.y-view.cy)).toBeLessThan(view.radius+25);
      const outside=direction==='incoming'?curve.start:curve.end;
      expect(direction==='incoming'?outside.x<0:outside.x>view.width).toBe(true);
    }
  });
  it('derives position and countdown from the same elapsed flight, without a repeating loop',()=>{
    const route={startedAt:1000,durationMs:160000,initialProgress:0};
    expect(flightProgress(route,41000)).toMatchObject({progress:.25,remainingMs:120000,label:'02:00',arrived:false});
    expect(flightProgress(route,161000)).toMatchObject({progress:1,remainingMs:0,label:'00:00',arrived:true});
    expect(flightProgress(route,321000).progress).toBe(1);
    expect(flightProgress(route,0).progress).toBe(0);
  });
  it('retains a known initial position while the remaining example time counts down',()=>{
    expect(flightProgress({startedAt:1000,durationMs:160000,initialProgress:.25},41000)).toMatchObject({progress:.4375,label:'02:00'});
  });
  it('previews arrival in five seconds without resolving a threat or changing assets',()=>{
    const before=initialDemo(),after=transition(before,{type:'arrival',now:1000});
    expect(after.threat).not.toBeNull();
    expect(after.planets).toEqual(before.planets);
    expect(flightProgress(after.threat,1000)).toMatchObject({label:'00:05',arrived:false});
    expect(flightProgress(after.threat,6000)).toMatchObject({label:'00:00',arrived:true});
    expect(transition(after,{type:'threat',now:6000}).threat).toBe(after.threat);
  });
});
