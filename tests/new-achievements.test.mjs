import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import vm from 'node:vm';
import {createStore,DEFAULT_AWARDS} from '../db.mjs';
import {createClub} from '../club.mjs';
function fixture(t){const store=createStore();t.after(()=>store.close());for(const name of ['Аня','Боря','Вера'])store.addPlayer({name});return store;}
const game=(day,sets=[[11,5]],player_b=2)=>({player_a:1,player_b,best_of:sets.length===1?1:3,sets,played_at:`2026-01-${String(day).padStart(2,'0')}T00:00:00Z`});
test('11:0 unlocks for either side even if the entire match is lost; correction removes the false unlock',t=>{
  const store=fixture(t);const id=store.saveMatch(game(1,[[11,0],[5,11],[5,11]]));
  let s=store.state();const e=s.earned.find(e=>e.player_id===1&&e.award_id==='shar-vognal');assert.ok(e);assert.equal(s.matches[0].winner_id,2);
  assert.ok(e.obtained.description.includes('партия')||e.obtained.description.includes('партию №1'));assert.ok(e.obtained.description.includes('Боря'));assert.equal(e.obtained.match_id,id);
  store.saveMatch(game(2,[[0,11]]));s=store.state();assert.ok(s.earned.some(e=>e.player_id===2&&e.award_id==='shar-vognal'));assert.equal(s.earned.find(e=>e.player_id===1&&e.award_id==='shar-vognal').match_id,id);
  store.setMain(1,'shar-vognal');store.saveMatch(game(1,[[11,1],[5,11],[5,11]]),id);
  s=store.state();assert.ok(!s.earned.some(e=>e.player_id===1&&e.award_id==='shar-vognal'));assert.equal(s.players.find(p=>p.id===1).main_award,null);
});
test('Niche tracks wins over the same opponent, not total wins, and records the fifth chronological win',t=>{
  const store=fixture(t);for(const day of [6,4,2,1])store.saveMatch(game(day));
  store.saveMatch(game(3,[[11,5]],3));let s=store.state();assert.ok(!s.earned.some(e=>e.award_id==='niche'));
  assert.equal(s.award_progress.find(e=>e.player_id===1&&e.award_id==='niche').completed,4);
  const fifth=store.saveMatch(game(5));s=store.state();const e=s.earned.find(e=>e.player_id===1&&e.award_id==='niche');
  const chronological=s.matches.filter(m=>m.player_b===2).sort((a,b)=>a.played_at.localeCompare(b.played_at));assert.equal(e.match_id,chronological[4].id);assert.ok(e.obtained.description.includes('5-ю'));assert.ok(e.obtained.description.includes('Боря'));
  store.saveMatch(game(7,[[5,11]]));assert.ok(store.state().earned.some(e=>e.award_id==='niche'));
  store.saveMatch(game(5,[[5,11]]),fifth);s=store.state();assert.ok(!s.earned.some(e=>e.player_id===1&&e.award_id==='niche'));assert.equal(s.award_progress.find(e=>e.player_id===1&&e.award_id==='niche').completed,4);
});
test('Unconfirmed perfect games count toward neither new achievement',async t=>{
  const store=fixture(t),club=createClub(store,{setupKey:'secret'}),admin=club.session(await club.setup({setup_key:'secret',player_id:1,login:'admin',password:'admin-password'}));
  const pending=club.submitMatch(admin,game(1,[[11,0]]));let s=club.state(admin);assert.equal(s.earned.length,0);assert.equal(s.award_progress.find(p=>p.player_id===1&&p.award_id==='shar-vognal').completed,0);
  club.decide(admin,pending,{decision:'confirm',reason:'Видел игру'});s=club.state(admin);assert.ok(s.earned.some(e=>e.award_id==='shar-vognal'));assert.equal(s.award_progress.find(p=>p.player_id===1&&p.award_id==='niche').completed,1);
});
test('All earned cards explain their condition and specific acquisition; closed cards reveal neither',t=>{
  const store=fixture(t),s=store.state();const ctx=vm.createContext({document:{getElementById:()=>({}),addEventListener:()=>{}},window:{addEventListener:()=>{}},fetch:()=>new Promise(()=>{}),Intl,console,setTimeout,clearTimeout});
  for(const file of ['community.js','app.js'])vm.runInContext(readFileSync(new URL('../public/'+file,import.meta.url),'utf8'),ctx);
  ctx.fixture=s;vm.runInContext('state=fixture',ctx);
  for(const a of s.awards){ctx.award=a;let html=vm.runInContext('awardCard(award,player(1))',ctx);assert.ok(!html.includes(a.title));assert.ok(!html.includes(a.condition));assert.ok(!html.includes('Как получена'));assert.ok(!html.includes('award-art'));
    s.earned=[{player_id:1,award_id:a.id,earned_at:'2026-01-01T00:00:00Z',obtained:{description:'Конкретная игра получения',match_id:1}}];
    html=vm.runInContext('awardCard(award,player(1))',ctx);assert.ok(html.includes('Как получена'));assert.ok(html.includes(a.condition));assert.ok(html.includes('Конкретная игра получения'));assert.ok(html.includes('Посмотреть игру'));if(a.image)assert.ok(html.includes(a.image));s.earned=[];
  }
});
test('New special thresholds are fixed and old SQLite history is used on migration',t=>{
  const temp=mkdtempSync(join(tmpdir(),'new-awards-')),path=join(temp,'club.sqlite');let store=createStore(path);t.after(()=>{store.close();rmSync(temp,{recursive:true,force:true});});
  store.addPlayer({name:'Аня'});store.addPlayer({name:'Боря'});for(let i=1;i<=5;i++)store.saveMatch(game(i,[[11,0]]));
  store.db.exec("DELETE FROM player_awards WHERE award_id IN ('shar-vognal','niche'); DELETE FROM awards WHERE id IN ('shar-vognal','niche')");store.close();store=createStore(path);
  let s=store.state();assert.equal(s.awards.length,33);assert.ok(s.earned.some(e=>e.award_id==='shar-vognal'));assert.ok(s.earned.some(e=>e.award_id==='niche'));
  for(const id of ['shar-vognal','niche']){const awards=s.awards.map(a=>({...a}));awards.find(a=>a.id===id).threshold++;assert.throws(()=>store.saveAwards({awards}),/Особые условия/);assert.deepEqual(store.state(),s);}
  assert.equal(DEFAULT_AWARDS.length,33);
});
