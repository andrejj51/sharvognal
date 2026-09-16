import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../db.mjs';
import {createClub} from '../club.mjs';
import {matchDay} from '../match-awards.mjs';

function fixture(t,count=4) {
  const store=createStore(':memory:');t.after(()=>store.close());
  for(let i=1;i<=count;i++)store.addPlayer({name:`Друг ${i}`});
  let minute=0;
  const game=(sets=[[11,5]],a=1,b=2,best=sets.length===1?1:3,at)=>({player_a:a,player_b:b,best_of:best,sets,played_at:at||new Date(Date.UTC(2026,0,1,0,minute++)).toISOString()});
  return {store,game,play:(...args)=>store.saveMatch(game(...args))};
}
const earned=(store,id,player=1)=>store.state().earned.find(e=>e.award_id===id&&e.player_id===player);
const progress=(store,id,player=1)=>store.state().award_progress.find(e=>e.award_id===id&&e.player_id===player).completed;

test('First confirmed game awards both players, pending games do not; deletion revokes',async t=>{
  const {store,game}=fixture(t);
  const club=createClub(store,{setupKey:'secret'}),admin=club.session(await club.setup({setup_key:'secret',player_id:1,login:'admin',password:'admin-password'}));
  const pending=club.submitMatch(admin,game());assert.ok(!earned(store,'first-game'));
  club.decide(admin,pending,{decision:'confirm',reason:'Видел игру'});
  assert.ok(earned(store,'first-game'));assert.ok(earned(store,'first-game',2));assert.ok(!earned(store,'first-game',3));
  store.deleteMatch(store.state().matches[0].id);assert.ok(!earned(store,'first-game'));assert.ok(!earned(store,'first-game',2));
});

test('Second wind needs five own consecutive losses, across rivals; wins reset the run',t=>{
  const {store,play}=fixture(t);
  for(let i=0;i<4;i++)play([[5,11]]);
  play();assert.ok(!earned(store,'second-wind'));
  for(let i=0;i<5;i++){play([[5,11]],1,i%2?2:3);play([[11,5]],2,4);}
  const id=play();assert.equal(earned(store,'second-wind').match_id,id);
  store.deleteMatch(id);assert.ok(!earned(store,'second-wind'));
  play([[11,5]],2,1);assert.ok(!earned(store,'second-wind',2));
});

test('Three daily rivals use Moscow midnight and distinct winning opponents',t=>{
  assert.equal(matchDay('2026-01-01T20:59:00Z'),'2026-01-01');
  assert.equal(matchDay('2026-01-01T21:00:00Z'),'2026-01-02');
  const {store,play}=fixture(t);
  play([[11,5]],1,2,1,'2026-01-01T20:58:00Z');
  play([[11,5]],1,3,1,'2026-01-01T20:59:00Z');
  play([[11,5]],1,4,1,'2026-01-01T21:00:00Z');assert.ok(!earned(store,'one-by-one'));assert.equal(progress(store,'one-by-one'),1);
  play([[11,5]],1,4,1,'2026-01-01T21:01:00Z');assert.equal(progress(store,'one-by-one'),1);
  play([[5,11]],1,2,1,'2026-01-01T21:02:00Z');assert.equal(progress(store,'one-by-one'),1);
  play([[11,5]],1,2,1,'2026-01-01T21:03:00Z');
  const id=play([[11,5]],1,3,1,'2026-01-01T21:04:00Z');assert.equal(earned(store,'one-by-one').match_id,id);
  play([[5,11]],1,2,1,'2026-01-02T21:00:00Z');assert.equal(progress(store,'one-by-one'),0);assert.ok(earned(store,'one-by-one'));
  store.deleteMatch(id);assert.ok(!earned(store,'one-by-one'));
});

test('Close match and swings award winners on either side; one wide set invalidates close match',t=>{
  const {store,game,play}=fixture(t);
  const sets=[[11,9],[9,11],[14,12],[12,14],[11,9]];
  const id=play(sets,1,2,5);assert.ok(earned(store,'on-the-edge'));assert.ok(earned(store,'swing-match'));assert.ok(!earned(store,'on-the-edge',2));
  play(sets.map(s=>[...s].reverse()),3,4,5);assert.ok(earned(store,'on-the-edge',4));assert.ok(earned(store,'swing-match',4));
  store.saveMatch(game([[11,8],...sets.slice(1)],1,2,5),id);assert.ok(!earned(store,'on-the-edge'));assert.ok(earned(store,'swing-match'));
  store.saveMatch(game([[9,11],[11,9],[11,9],[9,11],[11,9]],1,2,5),id);assert.ok(earned(store,'on-the-edge'));assert.ok(!earned(store,'swing-match'));
});

test('Winning with fewer total points is strict and independent of set wins',t=>{
  const {store,game,play}=fixture(t);
  const id=play([[0,11],[11,9],[11,9]]);assert.ok(earned(store,'points-not-all'));assert.ok(!earned(store,'points-not-all',2));
  play([[11,0],[9,11],[9,11]],3,4);assert.ok(earned(store,'points-not-all',4));
  store.saveMatch(game([[11,7],[7,11],[11,7]]),id);assert.ok(!earned(store,'points-not-all'));
  store.saveMatch(game([[11,7],[3,11],[11,7]]),id);assert.ok(!earned(store,'points-not-all'));
});

test('Twenty personal matches count both players and losses, not all opponents combined',t=>{
  const {store,play}=fixture(t);
  for(let i=0;i<19;i++)play([[5,11]]);
  play([[11,5]],1,3);assert.ok(!earned(store,'friendship-aside'));assert.equal(progress(store,'friendship-aside'),19);
  const id=play([[5,11]]);assert.equal(earned(store,'friendship-aside').match_id,id);assert.equal(earned(store,'friendship-aside',2).match_id,id);
  store.deleteMatch(id);assert.ok(!earned(store,'friendship-aside'));assert.equal(progress(store,'friendship-aside'),19);
});

test('Leader is measured before a game and is absent for the first game; history corrections replay',t=>{
  const {store,game,play}=fixture(t);
  const first=play([[5,11]]);assert.ok(!earned(store,'next-please',2));
  const id=play();assert.equal(earned(store,'next-please').match_id,id);assert.ok(!earned(store,'next-please',2));
  store.saveMatch(game([[11,5]],1,2,1,'2026-01-01T00:00:00Z'),first);
  assert.ok(!earned(store,'next-please'));
  const second=play([[5,11]]);assert.equal(earned(store,'next-please',2).match_id,second);
  store.deleteMatch(first);assert.ok(!earned(store,'next-please'));
});
