// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { initialDemo } from '../public/uiux-demo/model.js';
// @ts-expect-error Independent browser demo modules.
import { renderWorkspace } from '../public/uiux-demo/workspace.js';
// @ts-expect-error Independent browser demo modules.
import { initialAlliance, transitionAlliance, allianceSummary, allianceAssignments } from '../public/uiux-demo/alliance.js';

describe('alliance demo workspace', () => {
  it('offers one cooperative target and arrival coordination without exclusive role reservations', () => {
    const host = document.createElement('div');
    host.innerHTML = renderWorkspace('guild', initialDemo());
    expect(host.textContent).toContain('타르시스 외곽 관문');
    expect(host.querySelectorAll('[data-alliance-role]')).toHaveLength(0);
    expect(host.querySelector('#strategy-alliance-join')).not.toBeNull();
    expect(host.textContent).toContain('예정 도착');
  });
  it('derives optional supports and a valid formation without using game assets', () => {
    const state=initialDemo(),before=JSON.stringify(state),ui=initialAlliance();
    expect(allianceSummary(ui,state.planets[0])).toMatchObject({total:4,command:10,cargo:7,valid:true,supports:['recon']});
    const reviewed=transitionAlliance(ui,{type:'review'},state.planets[0]);
    expect(reviewed.review).toMatchObject({role:'breach',planet:'nova',scenario:'preparing',total:4});
    expect(Object.isFrozen(reviewed.review.counts)).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
  });
  it('blocks missing role vessels and completed or reserved roles with recoverable reasons', () => {
    const p=initialDemo().planets[0];
    let ui=transitionAlliance(initialAlliance(),{type:'role',id:'jam'},p);
    ui=transitionAlliance(ui,{type:'formation',value:'light'},p);
    expect(allianceSummary(ui,p)).toMatchObject({valid:false,total:2});
    expect(allianceSummary(ui,p).issues.join('')).toContain('베일');
    expect(transitionAlliance(ui,{type:'review'},p).review).toBeNull();
    for(const role of ['recon','supply']){
      const selected=transitionAlliance(initialAlliance(),{type:'role',id:role},p);
      expect(allianceSummary(selected,p).valid).toBe(false);
      expect(transitionAlliance(selected,{type:'review'},p).review).toBeNull();
    }
  });
  it('keeps planet and role drafts independent and clears obsolete review snapshots', () => {
    const [nova,vesper]=initialDemo().planets;
    let ui=transitionAlliance(initialAlliance(),{type:'formation',value:'light'},nova);
    ui=transitionAlliance(ui,{type:'review'},nova);
    expect(ui.review).not.toBeNull();
    ui=transitionAlliance(ui,{type:'role',id:'jam'},nova);
    expect(ui.review).toBeNull();
    expect(allianceSummary(ui,nova).draft).toBe('recommended');
    expect(allianceSummary(ui,vesper)).toMatchObject({valid:false,total:0});
    ui=transitionAlliance(ui,{type:'role',id:'breach'},nova);
    expect(allianceSummary(ui,nova).draft).toBe('light');
    ui=transitionAlliance(ui,{type:'review'},nova);
    ui=transitionAlliance(ui,{type:'scenario',value:'ready'},nova);
    expect(ui.review).toBeNull();
    expect(allianceSummary(ui,nova)).toMatchObject({valid:true,supports:['recon','jam','supply']});
    ui=transitionAlliance(ui,{type:'scenario',value:'complete'},nova);
    expect(allianceSummary(ui,nova).valid).toBe(false);
    expect(Object.values(allianceAssignments(ui)).every((a:any)=>a.status==='complete')).toBe(true);
  });
  it('rejects arbitrary route and form identifiers', () => {
    const p=initialDemo().planets[0],ui=initialAlliance();
    for(const action of [{type:'role',id:'__proto__'},{type:'scenario',value:'real'},{type:'formation',value:'unlisted'}])expect(transitionAlliance(ui,action,p)).toBe(ui);
    expect(transitionAlliance(ui,{type:'review'},{id:'unknown'})).toBe(ui);
  });
  it('renders unique IDs and hides unavailable alliance snapshots', () => {
    const state=initialDemo(),host=document.createElement('div');
    host.innerHTML=renderWorkspace('guild',state);
    const ids=[...host.querySelectorAll('[id]')].map(el=>el.id);
    expect(new Set(ids).size).toBe(ids.length);
    host.innerHTML=renderWorkspace('guild',{...state,connection:'offline'});
    expect(host.querySelector('#alliance-formation')).toBeNull();
    expect(host.textContent).not.toContain('오로라 협약');
  });
});
