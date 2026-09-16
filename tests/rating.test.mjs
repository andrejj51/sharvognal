import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { createStore, eloDelta, validateMatch } from '../db.mjs';

function setup() {const store=createStore();store.addPlayer({name:'Аня'});store.addPlayer({name:'Боря'});let index=0;return {store,play:(won=true,extra={})=>store.saveMatch({player_a:1,player_b:2,best_of:1,sets:[won?[11,7]:[7,11]],played_at:new Date(Date.UTC(2026,0,1,0,index++)).toISOString(),...extra})};}
test('Elo price matches the promised examples and preserves total rating',()=>{
  assert.equal(eloDelta(1000,1000,true),16);assert.equal(eloDelta(1000,1000,false),-16);
  assert.equal(eloDelta(1000,1200,true),24);assert.equal(eloDelta(1000,1200,false),-8);
  const {store,play}=setup();try{for(let i=0;i<20;i++)play(i%3===0);const s=store.state();assert.equal(s.players.reduce((n,p)=>n+p.rating,0),2000);assert.equal(s.players.reduce((n,p)=>n+p.wins,0),20);assert.equal(s.players.reduce((n,p)=>n+p.losses,0),20);}finally{store.close();}
});
test('Below-1000 rewards remain earned after recovery; comeback requires a real fall first',()=>{
  const {store,play}=setup();try{
    assert.equal(store.state().earned.length,0);
    play(false);assert.equal(store.state().players.find(p=>p.id===1).rating,984);
    assert.ok(!store.state().earned.some(e=>e.player_id===1&&e.award_id==='comeback'));
    play(false);assert.ok(store.state().earned.some(e=>e.player_id===1&&e.award_id==='under-table'));
    play(true);assert.ok(!store.state().earned.some(e=>e.player_id===1&&e.award_id==='comeback'));
    play(true);const s=store.state();assert.ok(s.players.find(p=>p.id===1).rating>=1000);
    assert.equal(s.earned.filter(e=>e.player_id===1&&e.award_id==='comeback').length,1);
    assert.ok(s.earned.some(e=>e.player_id===1&&e.award_id==='under-table'));
    play(false);play(true);assert.equal(store.state().earned.filter(e=>e.player_id===1&&e.award_id==='comeback').length,1);
  }finally{store.close();}
});
test('Upper reward survives normal losses but correcting the triggering match removes a false reward',()=>{
  const {store,play}=setup();try{const ids=[play(),play(),play(),play()];assert.ok(store.state().earned.some(e=>e.player_id===1&&e.award_id==='bobyl'));play(false);assert.ok(store.state().earned.some(e=>e.player_id===1&&e.award_id==='bobyl'));store.setMain(1,'bobyl');store.saveMatch({player_a:1,player_b:2,best_of:1,sets:[[7,11]],played_at:new Date(Date.UTC(2026,0,1,0,3)).toISOString()},ids[3]);assert.ok(!store.state().earned.some(e=>e.player_id===1&&e.award_id==='bobyl'));assert.equal(store.state().players.find(p=>p.id===1).main_award,null);store.deleteMatch(ids[0]);assert.equal(store.state().matches.length,4);}finally{store.close();}
});
test('Match validation rejects unfinished, impossible and extra sets without changing data',()=>{
  const {store,play}=setup();try{play();const before=store.state();const base={player_a:1,player_b:2,best_of:1,played_at:'2026-01-02T00:00:00Z'};
    for(const bad of [{sets:[[10,8]]},{sets:[[12,9]]},{sets:[[11,10]]},{sets:[[11,7]],best_of:3},{sets:[[11,7]],player_b:1},{sets:[[11.5,7]]},{sets:[[11,7]],played_at:'not-a-date'},{sets:[[11,7],[11,5],[3,11]],best_of:3}])assert.throws(()=>store.saveMatch({...base,...bad}));
    assert.deepEqual(store.state(),before);
    assert.doesNotThrow(()=>validateMatch({...base,sets:[[19,17]]}));
    assert.doesNotThrow(()=>validateMatch({...base,best_of:3,sets:[[11,4],[7,11],[12,10]]}));
  }finally{store.close();}
});
test('Backdated insertion uses played time, not insertion order, and SQLite survives reopening',()=>{
  const dir=mkdtempSync(join(tmpdir(),'ping-pong-test-')),path=join(dir,'db.sqlite');let store=createStore(path);try{store.addPlayer({name:'Аня'});store.addPlayer({name:'Боря'});const input={player_a:1,player_b:2,best_of:1};store.saveMatch({...input,sets:[[11,7]],played_at:'2026-01-02T00:00:00Z'});store.saveMatch({...input,sets:[[7,11]],played_at:'2026-01-01T00:00:00Z'});const before=store.state();const old=before.matches.find(m=>m.played_at.startsWith('2026-01-01'));assert.equal(old.before_a,1000);assert.equal(before.matches.find(m=>m.played_at.startsWith('2026-01-02')).before_a,984);store.close();store=createStore(path);assert.deepEqual(store.state(),before);}finally{store.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep+'ping-pong-test-'));rmSync(dir,{recursive:true,force:true});}
});
test('Award settings validate atomically and recalculate thresholds',()=>{
  const {store,play}=setup();try{play();const settings=store.state().awards.map(a=>({...a}));settings.find(a=>a.id==='bobyl').threshold=1010;store.saveAwards({awards:settings});assert.ok(store.state().earned.some(e=>e.player_id===1&&e.award_id==='bobyl'));const before=store.state();settings.find(a=>a.id==='comeback').threshold=900;assert.throws(()=>store.saveAwards({awards:settings}));assert.deepEqual(store.state(),before);assert.throws(()=>store.addPlayer({name:'аня'}));}finally{store.close();}
});
