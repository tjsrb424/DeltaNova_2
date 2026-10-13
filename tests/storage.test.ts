import { describe, expect, it } from 'vitest';
import { initialState, reduceGame } from '../src/game/state.ts';
import { decodeSave, encodeSave, loadGame, saveGame, SAVE_KEY } from '../src/storage/save.ts';
import type { GameState } from '../src/game/types.ts';
const started = () => reduceGame(initialState(), {type:'launch',missionId:'salvage',fleetIds:['striker-01','striker-02','guardian-01','salvage-01'],support:'jam',approach:'direct'});
const memory = (raw:string|null=null) => ({raw,getItem(){return this.raw;},setItem(_key:string,value:string){this.raw=value;}});
describe('save boundary', () => {
  it('roundtrips fresh, checkpoint, result and module progress', () => {
    const finished=reduceGame(started(),{type:'return'});
    const bought=reduceGame(reduceGame(finished,{type:'dismiss'}),{type:'unlock-module',module:'cargo'});
    for(const s of [initialState(),started(),finished,bought])expect(decodeSave(encodeSave(s))).toEqual(s);
  });
  it.each(['{','null','[]','{"schemaVersion":99}'])('rejects malformed or unknown save %s',raw=>expect(()=>decodeSave(raw)).toThrow());
  it.each([
    (s:GameState)=>{s.profile.research=-1;},
    (s:GameState)=>{s.profile.research=NaN;},
    (s:GameState)=>{s.profile.active='unknown' as never;},
    (s:GameState)=>{s.operation!.fleet[0].hp=999999;},
    (s:GameState)=>{s.operation!.fleet[0].shipId='unknown';},
    (s:GameState)=>{s.operation!.fleet[0].cargo=-1;},
    (s:GameState)=>{s.operation!.battles[0].events=[];},
    (s:GameState)=>{s.operation!.battles=[];},
  ])('rejects invalid nested state',mutate=>{const s=started();mutate(s);expect(()=>decodeSave(JSON.stringify(s))).toThrow();});
  it('never overwrites invalid input during load',()=>{const storage=memory('bad save');expect(loadGame(storage).status).toBe('invalid');expect(storage.raw).toBe('bad save');});
  it('distinguishes fresh, loaded and denied storage',()=>{
    expect(loadGame(memory()).status).toBe('fresh');
    const storage=memory();expect(saveGame(storage,started()).ok).toBe(true);expect(loadGame(storage).status).toBe('loaded');
    expect(loadGame({getItem(){throw Error('denied');},setItem(){}}).status).toBe('unavailable');
  });
  it('reports quota failure and keeps the current state untouched',()=>{
    const s=started(),before=structuredClone(s);
    expect(saveGame({getItem:()=>null,setItem(){throw Error('quota');}},s).ok).toBe(false);expect(s).toEqual(before);expect(SAVE_KEY).toContain('delta-nova');
  });
});
