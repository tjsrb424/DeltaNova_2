// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {createDemoNavigation} from '../public/uiux-demo/navigation.js';

describe('demo browser navigation', () => {
  let nav: ReturnType<typeof createDemoNavigation>;
  const visited: Array<{view:string;detail:string|null;facility:string}> = [];
  beforeEach(() => {
    window.history.replaceState(null, '', '/uiux-demo/index.html');
    visited.length = 0;
    nav = createDemoNavigation((route: {view:string;detail:string|null;facility:string}) => visited.push(route), {
      views: ['home','construction','fleet','more'], details: ['resources','planet','fleet'],
    });
  });
  afterEach(() => nav.dispose());
  it('validates cooperative roles and restores their selection through native Back',async()=>{
    nav.dispose();history.replaceState(null,'','#view=guild&role=unlisted');
    nav=createDemoNavigation(()=>{},{views:['home','guild'],details:[],roles:['recon','jam','supply','breach']});
    expect(location.hash).toBe('#view=guild&role=breach');
    nav.go({role:'jam'});
    const back=new Promise<void>(resolve=>window.addEventListener('popstate',()=>resolve(),{once:true}));
    history.back();await back;
    expect(nav.current.role).toBe('breach');
    nav.go({view:'home'});expect(location.hash).toBe('#view=home');
  });
  it('changes the central view with a shareable URL and lets native Back restore it', async () => {
    nav.go({view:'construction'});
    nav.go({view:'fleet'});
    expect(location.hash).toBe('#view=fleet');
    const popped = new Promise<void>(resolve => window.addEventListener('popstate', () => resolve(), {once:true}));
    history.back(); await popped;
    expect(nav.current.view).toBe('construction');
    expect(visited.at(-1)?.view).toBe('construction');
  });
  it('closes a short detail through history while preserving the workspace', async () => {
    nav.go({view:'construction'}); nav.go({detail:'resources'});
    expect(nav.current).toMatchObject({view:'construction',detail:'resources'});
    const popped = new Promise<void>(resolve => window.addEventListener('popstate', () => resolve(), {once:true}));
    nav.closeDetail(); await popped;
    expect(nav.current).toMatchObject({view:'construction',detail:null});
    expect(location.hash).toBe('#view=construction');
  });
  it('normalizes unknown links and closes a directly loaded detail without leaving the demo', () => {
    nav.dispose();
    history.replaceState(null, '', '#view=missing&detail=missing');
    nav = createDemoNavigation(() => {}, {views:['home'],details:['resources']});
    expect(nav.current).toMatchObject({view:'home',detail:null});
    nav.dispose(); history.replaceState(null, '', '#view=home&detail=resources');
    nav = createDemoNavigation(() => {}, {views:['home'],details:['resources']});
    nav.closeDetail();
    expect(nav.current).toMatchObject({view:'home',detail:null});
    expect(location.pathname).toBe('/uiux-demo/index.html');
  });
  it('keeps galaxy target selection and its report in browser history',async()=>{
    nav.dispose();history.replaceState(null,'','#view=galaxy&target=tarsis');
    nav=createDemoNavigation(()=>{},{views:['home','galaxy'],details:['intel'],targets:['tarsis','orion-relay']});
    nav.go({target:'orion-relay'});
    expect(location.hash).toBe('#view=galaxy&target=orion-relay');
    nav.go({detail:'intel'});
    const popped=new Promise<void>(resolve=>window.addEventListener('popstate',()=>resolve(),{once:true}));
    nav.closeDetail();await popped;
    expect(nav.current).toMatchObject({view:'galaxy',target:'orion-relay',detail:null});
    const back=new Promise<void>(resolve=>window.addEventListener('popstate',()=>resolve(),{once:true}));
    history.back();await back;
    expect(nav.current.target).toBe('tarsis');
  });
  it('normalizes unknown galaxy targets rather than exposing arbitrary URL data',()=>{
    nav.dispose();history.replaceState(null,'','#view=galaxy&target=unlisted');
    nav=createDemoNavigation(()=>{},{views:['home','galaxy'],details:['intel'],targets:['tarsis','orion-relay']});
    expect(nav.current.target).toBe('tarsis');
    expect(location.hash).toBe('#view=galaxy&target=tarsis');
  });
  it('carries the selected mission from briefing to practice and restores it with Back',async()=>{
    nav.dispose();history.replaceState(null,'','#view=career&mission=relay');
    nav=createDemoNavigation(()=>{},{views:['home','career','practice'],details:[],missions:['salvage','relay','convoy']});
    expect(nav.current.mission).toBe('relay');
    nav.go({view:'practice'});nav.go({mission:'convoy'});
    expect(location.hash).toBe('#view=practice&mission=convoy');
    const popped=new Promise<void>(resolve=>window.addEventListener('popstate',()=>resolve(),{once:true}));
    history.back();await popped;
    expect(nav.current).toMatchObject({view:'practice',mission:'relay'});
  });
  it('normalizes an unknown mission in a directly loaded practice URL',()=>{
    nav.dispose();history.replaceState(null,'','#view=practice&mission=unlisted');
    nav=createDemoNavigation(()=>{},{views:['home','career','practice'],details:[],missions:['salvage','relay']});
    expect(nav.current.mission).toBe('salvage');
    expect(location.hash).toBe('#view=practice&mission=salvage');
  });
});
