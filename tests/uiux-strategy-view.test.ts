// @vitest-environment jsdom
import {describe,it,expect} from 'vitest';
import {initialDemo} from '../public/uiux-demo/model.js';
// @ts-expect-error Independent demo browser modules.
import {renderWorkspace} from '../public/uiux-demo/workspace.js';
describe('strategy-first workspaces',()=>{
  it('begins with a destination and direct fleet commands rather than a separate training task',()=>{
    const host=document.createElement('div');host.innerHTML=renderWorkspace('career',initialDemo());
    expect(host.querySelector('#strategy-target-tarsis')).not.toBeNull();
    expect(host.textContent).toContain('목표 선택');
    expect(host.textContent).not.toContain('이 작전으로 편성 연습');
  });
  it('organizes alliance coordination around a shared target and arrival times',()=>{
    const host=document.createElement('div');host.innerHTML=renderWorkspace('guild',initialDemo());
    expect(host.querySelector('#strategy-alliance-join')).not.toBeNull();
    expect(host.textContent).toContain('예정 도착');
    expect(host.querySelector('[data-alliance-role]')).toBeNull();
  });
});
