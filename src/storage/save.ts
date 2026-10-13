import { MISSIONS, MODULES, ROSTER, SUPPORTS } from '../game/content.ts';
import { initialState, reduceGame } from '../game/state.ts';
import type { GameState, ModuleId } from '../game/types.ts';

export const SAVE_KEY = 'delta-nova.command-center.v1';
export interface StoragePort { getItem(key:string):string|null; setItem(key:string,value:string):void }
export type LoadResult = {status:'fresh'|'loaded';state:GameState} | {status:'invalid'|'unavailable';state:GameState;reason:string};
export type SaveResult = {ok:true} | {ok:false;reason:string};
const invalid = () => { throw new Error('저장 형식 또는 작전 기록을 확인할 수 없습니다.'); };
function requireThat(condition:unknown):asserts condition { if(!condition)invalid(); }
function object(value:unknown):Record<string,unknown> {
  requireThat(value !== null && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string,unknown>;
}
function integer(value:unknown,min=0,max=1_000_000):number {
  requireThat(typeof value==='number' && Number.isSafeInteger(value) && value>=min && value<=max);
  return value;
}
function canonical(value:unknown,depth=0):string {
  requireThat(depth<20);
  if(Array.isArray(value))return '['+value.map(v=>canonical(v,depth+1)).join(',')+']';
  if(value!==null && typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v,depth+1)).join(',')+'}';
  return JSON.stringify(value);
}

export function decodeSave(raw:string):GameState {
  requireThat(raw.length<=512_000);
  const root=object(JSON.parse(raw));
  requireThat(root.schemaVersion===1 && root.rulesVersion==='command-center-v1');
  requireThat(root.message===null || (typeof root.message==='string' && root.message.length<=240));
  const p=object(root.profile), best=object(p.best);
  const state=initialState();
  state.profile.research=integer(p.research);
  state.profile.totalSorties=integer(p.totalSorties);
  state.nextOperationId=integer(root.nextOperationId,1,1_000_001);
  requireThat(state.nextOperationId===state.profile.totalSorties+1);
  requireThat(Array.isArray(p.unlocked) && p.unlocked.length<=MODULES.length);
  requireThat(new Set(p.unlocked).size===p.unlocked.length);
  requireThat(p.unlocked.every(id=>MODULES.some(m=>m.id===id)));
  state.profile.unlocked=p.unlocked as ModuleId[];
  requireThat(p.active==='none' || state.profile.unlocked.includes(p.active as ModuleId));
  state.profile.active=p.active as ModuleId;
  for(const m of MISSIONS) {
    const score=integer(best[m.id],0,(m.loot+m.bonusLoot)*10);
    requireThat(score%10===0);state.profile.best[m.id]=score;
  }
  const spent=MODULES.filter(m=>state.profile.unlocked.includes(m.id)).reduce((sum,m)=>sum+m.cost,0);
  requireThat(state.profile.research===Object.values(state.profile.best).reduce((a,b)=>a+b,0)-spent);
  requireThat(state.profile.totalSorties>0 || state.profile.research===0);
  state.message=root.message as string|null;
  if(root.operation!==null) {
    const op=object(root.operation);
    requireThat(integer(op.id,1)===state.profile.totalSorties);
    requireThat(MISSIONS.some(m=>m.id===op.missionId));
    requireThat(SUPPORTS.some(s=>s.id===op.support));
    requireThat(op.approach==='direct'||op.approach==='flank');
    requireThat(op.module===state.profile.active);
    requireThat(op.phase==='checkpoint'||op.phase==='result');
    requireThat(Array.isArray(op.fleet)&&op.fleet.length>=1&&op.fleet.length<=6);
    const fleetIds=op.fleet.map(u=>object(u).id);
    requireThat(fleetIds.every(id=>ROSTER.some(r=>r.id===id)));
    requireThat(Array.isArray(op.battles)&&op.battles.length>=1&&op.battles.length<=2);
    const gained=integer(op.gained,0,150);
    const missionId=op.missionId as string;
    const previous=structuredClone(state);
    previous.profile.research-=gained;
    previous.profile.best[missionId]-=gained;
    requireThat(previous.profile.research>=0&&previous.profile.best[missionId]>=0);
    previous.profile.totalSorties--;
    previous.nextOperationId=op.id as number;
    // Rebuild from the departure snapshot. This validates every nested unit,
    // event and settlement against the versioned deterministic rules.
    let replay=reduceGame(previous,{type:'launch',missionId,fleetIds:fleetIds as string[],support:op.support as never,approach:op.approach});
    requireThat(replay.operation!==null);
    if(op.battles.length===2)replay=reduceGame(replay,{type:'advance'});
    else if(op.phase==='result')replay=reduceGame(replay,{type:'return'});
    requireThat(canonical(replay.operation)===canonical(op));
    requireThat(canonical(replay.profile)===canonical(state.profile));
    state.operation=replay.operation;
  }
  requireThat(canonical(root)===canonical(state));
  return state;
}
export function encodeSave(state:GameState):string { const raw=JSON.stringify(state);decodeSave(raw);return raw; }
export function loadGame(storage:StoragePort):LoadResult {
  let raw:string|null;
  try {raw=storage.getItem(SAVE_KEY);} catch {return {status:'unavailable',state:initialState(),reason:'브라우저 저장소에 접근할 수 없습니다. 현재 창에서만 진행됩니다.'};}
  if(raw===null)return {status:'fresh',state:initialState()};
  try {return {status:'loaded',state:decodeSave(raw)};} catch {return {status:'invalid',state:initialState(),reason:'저장 기록을 읽을 수 없습니다. 기존 기록은 보존되어 있습니다.'};}
}
export function saveGame(storage:StoragePort,state:GameState):SaveResult {
  try {storage.setItem(SAVE_KEY,encodeSave(state));return {ok:true};}
  catch {return {ok:false,reason:'진행을 저장하지 못했습니다. 창을 닫으면 이번 변경을 잃을 수 있습니다.'};}
}
