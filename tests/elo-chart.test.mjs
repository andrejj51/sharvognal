import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createStore} from '../db.mjs';

function chartContext(state){
  const context=vm.createContext({document:{getElementById:()=>({}),addEventListener:()=>{}},window:{addEventListener:()=>{}},fetch:()=>new Promise(()=>{}),Intl,console,setTimeout,clearTimeout});
  vm.runInContext(readFileSync(new URL('../public/community.js',import.meta.url),'utf8'),context);
  vm.runInContext(readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),context);
  context.fixture=state;vm.runInContext('state=fixture',context);return context;
}
test('Graph counts only this player’s games, starts at 1000 and uses chronological Elo for either side',()=>{
  const store=createStore();
  try{
    for(const name of ['Аня','Боря','Даша'])store.addPlayer({name});
    const base={best_of:1,sets:[[11,7]]};
    store.saveMatch({...base,player_a:2,player_b:3,played_at:'2026-01-01T00:00:00Z'});
    const later=store.saveMatch({...base,player_a:1,player_b:2,played_at:'2026-01-01T02:00:00Z'});
    store.saveMatch({...base,sets:[[7,11]],player_a:1,player_b:3,played_at:'2026-01-01T01:00:00Z'});
    let context=chartContext(store.state());
    let series=JSON.parse(vm.runInContext('JSON.stringify(eloSeries(player(1),state.matches))',context));
    assert.deepEqual(series.map(p=>[p.game,p.rating]),[[0,1000],[1,983],[2,1001]]);
    assert.equal(series[1].opponent,'Даша');assert.equal(series[2].opponent,'Боря');
    const other=JSON.parse(vm.runInContext('JSON.stringify(eloSeries(player(2),state.matches))',context));
    assert.equal(other.at(-1).delta,-18);assert.equal(other.at(-1).rating,998);
    const match=store.state().matches.find(m=>m.id===later);
    store.saveMatch({...match,sets:[[7,11]]},later);
    context=chartContext(store.state());
    series=JSON.parse(vm.runInContext('JSON.stringify(eloSeries(player(1),state.matches))',context));
    assert.equal(series.at(-1).rating,store.state().players.find(p=>p.id===1).rating);
    assert.equal(series.length,3);
    const html=vm.runInContext('eloChart(player(1),state.matches)',context);
    assert.ok(html.includes('Сыграно матчей'));assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));
    const profile=vm.runInContext('profilePage(1)',context);
    assert.ok(profile.indexOf('Динамика Elo')<profile.indexOf('Полка трофеев'));
  }finally{store.close();}
});

test('Player with no games gets a finite chart and a disabled selector at starting Elo',()=>{
  const store=createStore();
  try{store.addPlayer({name:'Новичок'});const context=chartContext(store.state());
    const html=vm.runInContext('eloChart(player(1),state.matches)',context);
    assert.ok(html.includes('max="0"'));assert.ok(html.includes('disabled'));assert.ok(html.includes('До первого матча · 1000 Elo'));
    assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));
  }finally{store.close();}
});
