import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../db.mjs';
import {createClub} from '../club.mjs';
import {MATCH_AWARDS,newMatchStats,advanceMatchStats,matchAwardCompleted} from '../match-awards.mjs';

function fixture(t,count=3,path=':memory:') {
  const store=createStore(path);t.after(()=>store.close());
  for(let i=1;i<=count;i++)store.addPlayer({name:`Друг ${i}`});
  let minute=0;
  const game=(sets=[[11,5]],a=1,b=2,best=sets.length===1?1:3)=>({player_a:a,player_b:b,best_of:best,sets,played_at:new Date(Date.UTC(2026,0,1,0,minute++)).toISOString()});
  return {store,game,play:(...args)=>store.saveMatch(game(...args))};
}
const earned=(store,id,player=1)=>store.state().earned.find(e=>e.award_id===id&&e.player_id===player);
const progress=(store,id,player=1)=>store.state().award_progress.find(e=>e.award_id===id&&e.player_id===player).completed;

test('0:2 comeback requires best-of-five and works for both sides; corrections revoke it',t=>{
  const {store,game,play}=fixture(t);
  const sets=[[5,11],[5,11],[11,5],[11,5],[11,5]];
  const id=play(sets,1,2,5);assert.equal(earned(store,'still-here').match_id,id);
  assert.ok(earned(store,'still-here').obtained.description.includes('3:2'));
  play(sets.map(s=>[...s].reverse()),1,2,5);assert.ok(earned(store,'still-here',2));
  store.setMain(1,'still-here');store.saveMatch(game([[11,5],[5,11],[5,11],[11,5],[11,5]],1,2,5),id);
  assert.ok(!earned(store,'still-here'));assert.equal(store.state().players.find(p=>p.id===1).main_award,null);
  play([...sets,[11,5]],1,2,7);assert.ok(!earned(store,'still-here'));
});

test('Long sets can unlock despite a lost match; zero comeback requires winning the match',t=>{
  const {store,play}=fixture(t);
  play([[16,14],[5,11],[5,11]]);assert.ok(earned(store,'until-dark'));assert.ok(!earned(store,'until-dark',2));
  play([[14,16],[11,5],[11,5]]);assert.ok(earned(store,'until-dark',2));
  play([[0,11],[11,5],[11,5]]);assert.ok(earned(store,'zero-start'));assert.ok(!earned(store,'zero-start',2));
  play([[11,0],[5,11],[5,11]]);assert.ok(earned(store,'zero-start',2));
  assert.ok(earned(store,'zero-start').obtained.description.includes('0:11'));
});

test('Upset uses pre-match Elo with an inclusive 200-point boundary',t=>{
  for(const side of [0,1])for(const gap of [199,200]) {
    const stats=newMatchStats();advanceMatchStats(stats,{player_a:1,player_b:2,winner_id:side+1,best_of:1,sets:side===0?[[11,5]]:[[5,11]],before_a:side===0?1000:1000+gap,before_b:side===0?1000+gap:1000,played_at:'2026-01-01T00:00:00Z'},side+1);
    assert.equal(matchAwardCompleted(stats,'upset'),gap===200?1:0);
  }
  const {store,play}=fixture(t);
  for(let i=0;i<12;i++)play([[5,11]]);
  const s=store.state();assert.ok(s.players.find(p=>p.id===2).rating-s.players.find(p=>p.id===1).rating>=200);
  const id=play();const e=earned(store,'crown-off');assert.equal(e.match_id,id);
  const m=store.state().matches.find(m=>m.id===id);assert.ok(m.before_b-m.before_a>=200);
  assert.ok(e.obtained.description.includes(String(m.before_b)));assert.ok(!earned(store,'crown-off',2));
});

test('Streak follows own games chronologically, survives later loss, and replays after deletion',t=>{
  const {store,game}=fixture(t,4);
  const games=Array.from({length:5},()=>game());const ids=[];
  for(const g of [...games].reverse())ids.push(store.saveMatch(g));
  const e=earned(store,'no-queue');assert.equal(e.match_id,ids[0]);assert.ok(e.obtained.description.includes('5-ю'));
  store.saveMatch(game([[11,5]],3,4));assert.equal(progress(store,'no-queue'),5);
  store.saveMatch(game([[5,11]]));assert.equal(progress(store,'no-queue'),0);assert.ok(earned(store,'no-queue'));
  store.deleteMatch(ids[2]);assert.ok(!earned(store,'no-queue'));
});

test('Revenge requires three consecutive personal losses; other rivals do not interrupt them',t=>{
  const {store,play}=fixture(t);
  play([[5,11]]);play([[5,11]]);play();assert.ok(!earned(store,'debt-paid'));
  for(let i=0;i<3;i++){play([[5,11]]);play([[11,5]],1,3);}
  const id=play();assert.equal(earned(store,'debt-paid').match_id,id);
  assert.ok(earned(store,'debt-paid').obtained.description.includes('3 поражений'));
  store.deleteMatch(id);assert.ok(!earned(store,'debt-paid'));
});

test('Participation requires ten distinct rivals and fifty own matches, including losses',t=>{
  const {store,play}=fixture(t,11);
  for(let i=0;i<10;i++)play([[5,11]]);assert.equal(progress(store,'knows-everyone'),1);assert.ok(!earned(store,'knows-everyone'));
  for(let rival=3;rival<=10;rival++)play([[5,11]],1,rival);
  assert.equal(progress(store,'knows-everyone'),9);
  const tenth=play([[5,11]],1,11);assert.equal(earned(store,'knows-everyone').match_id,tenth);
  for(let i=19;i<49;i++)play([[5,11]]);assert.ok(!earned(store,'local-resident'));assert.equal(progress(store,'local-resident'),49);
  const fiftieth=play([[5,11]]);assert.equal(earned(store,'local-resident').match_id,fiftieth);
  assert.ok(earned(store,'local-resident').obtained.description.includes('50-й'));
});

test('Pending games count only after confirmation; old history earns new awards on startup',async t=>{
  const {store,game}=fixture(t);
  const club=createClub(store,{setupKey:'secret'}),admin=club.session(await club.setup({setup_key:'secret',player_id:1,login:'admin',password:'admin-password'}));
  const pending=club.submitMatch(admin,game([[0,11],[11,5],[11,5]]));
  assert.ok(!earned(store,'zero-start'));assert.equal(progress(store,'local-resident'),0);
  club.decide(admin,pending,{decision:'confirm',reason:'Видел игру'});assert.ok(earned(store,'zero-start'));assert.equal(progress(store,'local-resident'),1);
  const dir=mkdtempSync(join(tmpdir(),'match-awards-')),path=join(dir,'db.sqlite');let persistent=createStore(path);
  t.after(()=>{persistent.close();rmSync(dir,{recursive:true,force:true});});
  persistent.addPlayer({name:'Аня'});persistent.addPlayer({name:'Боря'});persistent.saveMatch(game([[0,11],[11,5],[11,5]]));
  for(const a of MATCH_AWARDS){persistent.db.prepare('DELETE FROM player_awards WHERE award_id=?').run(a[0]);persistent.db.prepare('DELETE FROM awards WHERE id=?').run(a[0]);}
  const before=persistent.state();persistent.close();persistent=createStore(path);
  assert.ok(earned(persistent,'zero-start'));assert.deepEqual(persistent.state().players,before.players);assert.deepEqual(persistent.state().matches,before.matches);
  for(const a of MATCH_AWARDS){const awards=persistent.state().awards.map(row=>({...row}));awards.find(row=>row.id===a[0]).threshold++;assert.throws(()=>persistent.saveAwards({awards}),/Особые условия/);}
});
