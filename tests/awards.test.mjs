import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import vm from 'node:vm';
import { createStore, topThreeProgress } from '../db.mjs';

function club(count=4,path=':memory:') {
  const store=createStore(path);
  for(let i=1;i<=count;i++)store.addPlayer({name:`Друг ${i}`});
  let minute=0;
  const play=(a,b,score='3:0')=>store.saveMatch({player_a:a,player_b:b,best_of:5,sets:score==='3:0'?[[11,5],[11,7],[11,9]]:score==='0:3'?[[5,11],[7,11],[9,11]]:[[11,5],[5,11],[11,7],[7,11],[11,9]],played_at:new Date(Date.UTC(2026,0,1,0,minute++)).toISOString()});
  const progress=id=>store.state().award_progress.find(row=>row.player_id===id);
  return {store,play,progress};
}

test('Top-three trophy requires three distinct opponents and exact 3:0; editing removes a false unlock',()=>{
  const {store,play,progress}=club();
  try{
    play(1,2);assert.equal(progress(1).completed,1);
    play(1,2);assert.equal(progress(1).completed,1);
    play(1,3,'3:2');assert.equal(progress(1).completed,1);
    play(3,1,'0:3');assert.equal(progress(1).completed,2);
    assert.ok(!store.state().earned.some(e=>e.player_id===1&&e.award_id==='knees'));
    const last=play(1,4);assert.equal(progress(1).completed,3);
    assert.equal(store.state().earned.filter(e=>e.player_id===1&&e.award_id==='knees').length,1);
    play(1,2,'0:3');assert.ok(store.state().earned.some(e=>e.player_id===1&&e.award_id==='knees'));
    const match=store.state().matches.find(m=>m.id===last);
    store.saveMatch({...match,sets:[[11,5],[5,11],[11,7],[7,11],[11,9]]},last);
    assert.equal(progress(1).completed,2);
    assert.ok(!store.state().earned.some(e=>e.player_id===1&&e.award_id==='knees'));
  }finally{store.close();}
});

test('Fewer than three opponents cannot finish the trophy',()=>{
  const {store,play,progress}=club(3);
  try{play(1,2);play(1,3);assert.equal(progress(1).completed,2);assert.equal(progress(1).total,3);assert.equal(progress(1).unlocked,false);assert.ok(!store.state().earned.some(e=>e.award_id==='knees'));}finally{store.close();}
});

test('Targets follow the current leaderboard and exclude the player; ties match leaderboard ordering',()=>{
  const players=[{id:1,rating:1500,wins:10},{id:2,rating:1200,wins:5},{id:3,rating:1200,wins:6},{id:4,rating:1000,wins:0},{id:5,rating:900,wins:0}];
  const wins=new Set([2,3,4]);
  assert.deepEqual(topThreeProgress(players,wins,1),{completed:3,total:3,rivals:[3,2,4],unlocked:true});
  players[4].rating=1300;
  assert.deepEqual(topThreeProgress(players,wins,1),{completed:2,total:3,rivals:[5,3,2],unlocked:false});
});

test('Existing SQLite history unlocks the new trophy when it is added on startup',()=>{
  const dir=mkdtempSync(join(tmpdir(),'ping-pong-awards-')),path=join(dir,'db.sqlite');
  const {store,play}=club(4,path);let reopened;
  try{
    play(1,2);play(1,3);play(1,4);
    store.db.prepare('DELETE FROM player_awards WHERE award_id=?').run('knees');
    store.db.prepare('DELETE FROM awards WHERE id=?').run('knees');
    store.close();reopened=createStore(path);
    assert.equal(reopened.state().awards.length,33);
    assert.ok(reopened.state().earned.some(e=>e.player_id===1&&e.award_id==='knees'));
  }finally{
    if(reopened)reopened.close();else try{store.close();}catch{}
    assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep+'ping-pong-awards-'));
    rmSync(dir,{recursive:true,force:true});
  }
});

test('Locked cards expose only progress; name, image, caption and descriptive ARIA labels appear at 100%',()=>{
  const placeholder={};
  const context=vm.createContext({document:{getElementById:()=>placeholder,addEventListener:()=>{}},window:{addEventListener:()=>{}},fetch:()=>new Promise(()=>{}),console,Intl,setTimeout,clearTimeout});
  vm.runInContext(readFileSync(new URL('../public/community.js',import.meta.url),'utf8'),context);
  vm.runInContext(readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),context);
  const award={id:'secret',kind:'up',threshold:1400,title:'Секретное имя',caption:'Секретная подпись',character:'Секретный персонаж',art:1};
  const person={id:1,rating:1399,min_rating:950};
  context.fixture={players:[person],awards:[award],earned:[],award_progress:[]};context.award=award;context.person=person;
  const locked=vm.runInContext('state=fixture; awardCard(award,person)',context);
  assert.ok(locked.includes('1399 / 1400 Elo'));assert.ok(locked.includes('value="99"'));
  for(const hidden of [award.title,award.caption,award.character,'award-art','<img','award-name'])assert.ok(!locked.includes(hidden));
  context.fixture.earned=[{player_id:1,award_id:'secret',earned_at:'2026-01-01T00:00:00Z'}];person.rating=950;
  const unlocked=vm.runInContext('awardCard(award,person)',context);
  assert.ok(unlocked.includes('value="100"'));assert.ok(unlocked.includes(award.title));assert.ok(unlocked.includes(award.caption));assert.ok(unlocked.includes('award-art'));
  assert.ok(unlocked.includes(award.character));
  award.id='knees';award.kind='top-three';award.threshold=3;context.fixture.earned=[];context.fixture.award_progress=[{player_id:1,award_id:'knees',completed:2}];
  const special=vm.runInContext('awardCard(award,person)',context);
  assert.ok(special.includes('2 / 3'));assert.ok(special.includes('value="66"'));assert.ok(!special.includes(award.title));
});
