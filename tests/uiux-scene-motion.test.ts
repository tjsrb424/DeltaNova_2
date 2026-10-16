import {describe,it,expect} from 'vitest';
import {cloudMotion,satellitePose,arrivalEffect} from '../public/uiux-demo/scene-motion.js';

describe('independent atmospheric and orbital motion',()=>{
  it('moves clouds relative to the surface and advances continuously across a surface revolution',()=>{
    const a=cloudMotion(0),b=cloudMotion(60000),c=cloudMotion(240001),d=cloudMotion(239999);
    expect(b.surface-a.surface).toBeGreaterThan(0);
    expect(b.clouds-a.clouds).toBeGreaterThan(0);
    expect((b.clouds-b.surface)-(a.clouds-a.surface)).not.toBeCloseTo(0,3);
    expect(Math.abs(c.clouds-d.clouds)).toBeLessThan(.001);
  });
  it('occludes the satellite behind the planet but keeps it visible in front',()=>{
    const view={cx:300,cy:160,radius:110};
    expect(satellitePose(view,0)).toMatchObject({occluded:false});
    const front=satellitePose(view,24000),back=satellitePose(view,72000);
    expect(front.depth).toBeGreaterThan(0);expect(front.occluded).toBe(false);
    expect(back.depth).toBeLessThan(0);expect(back.occluded).toBe(true);
    expect(Math.hypot(back.x-view.cx,back.y-view.cy)).toBeLessThan(view.radius);
    expect(satellitePose(view,96000).x).toBeCloseTo(satellitePose(view,0).x);
  });
  it('runs a brief arrival pulse once without replaying after arrival',()=>{
    const flight={startedAt:1000,durationMs:5000};
    expect(arrivalEffect(flight,5999)).toBeNull();
    const early=arrivalEffect(flight,6100),later=arrivalEffect(flight,6800);
    expect(early.opacity).toBeGreaterThan(later.opacity);
    expect(later.radius).toBeGreaterThan(early.radius);
    expect(arrivalEffect(flight,8500)).toBeNull();
    expect(arrivalEffect(flight,300000)).toBeNull();
  });
});
