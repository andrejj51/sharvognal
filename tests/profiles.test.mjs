import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {createStore,leadershipStats,validateSocials} from '../db.mjs';

test('Leadership sums separate stints, uses chronological matches, and starts after first game',()=>{
  const players=[{id:1},{id:2}],date=n=>new Date(Date.UTC(2026,0,1+n)).toISOString();
  const matches=[
    {id:3,player_a:1,player_b:2,winner_id:1,after_a:1016,after_b:984,played_at:date(4)},
    {id:1,player_a:1,player_b:2,winner_id:1,after_a:1016,after_b:984,played_at:date(0)},
    {id:2,player_a:1,player_b:2,winner_id:2,after_a:999,after_b:1001,played_at:date(2)}];
  const s=leadershipStats(players,matches,Date.parse(date(6)));
  assert.deepEqual(s.get(1),{leader_days:4,leader_since:date(4)});
  assert.deepEqual(s.get(2),{leader_days:2,leader_since:null});
  assert.deepEqual(leadershipStats(players,[],Date.parse(date(6))).get(1),{leader_days:0,leader_since:null});
  assert.equal(leadershipStats(players,matches,Date.parse(date(0))+86399999).get(1).leader_days,0);
});
test('Equal ratings use wins then player ID; same-time matches do not add days',()=>{
  const date='2026-01-01T00:00:00.000Z',players=[{id:2},{id:1}];
  const matches=[{id:1,player_a:1,player_b:2,winner_id:2,after_a:1000,after_b:1000,played_at:date},
    {id:2,player_a:1,player_b:2,winner_id:1,after_a:1000,after_b:1000,played_at:date}];
  const s=leadershipStats(players,matches,Date.parse(date)+86400000);
  assert.equal(s.get(1).leader_days,1);assert.equal(s.get(2).leader_days,0);
});
test('Social links normalize Telegram handles and reject unsafe URLs atomically',()=>{
  const store=createStore();try{
    const id=store.addPlayer({name:'Аня'});
    store.saveSocials(id,{socials:{telegram:'@annaping',vk:'vk.com/annaping',discord:'https://discord.gg/club',other:''}});
    const before=store.state();
    assert.deepEqual(before.players[0].socials,{telegram:'https://t.me/annaping',vk:'https://vk.com/annaping',discord:'https://discord.gg/club'});
    for(const bad of [{telegram:'javascript:alert(1)'},{telegram:'https://t.me.evil.com/name'},{vk:'https://instagram.com/name'},{other:'http://example.com/name'},{other:'https://user:pass@example.com/name'},{other:'data:text/html,hello'},{telegram:23},{unknown:'https://example.com/name'}]){
      assert.throws(()=>store.saveSocials(id,{socials:bad}));assert.deepEqual(store.state(),before);
    }
    assert.throws(()=>store.saveSocials(999,{socials:{}}));
    store.saveSocials(id,{socials:{telegram:'',vk:''}});
    assert.deepEqual(store.state().players[0].socials,{});
    assert.equal(store.state().players[0].rating,before.players[0].rating);
    assert.deepEqual(validateSocials({instagram:'https://instagram.com/annaping'}),{instagram:'https://instagram.com/annaping'});
  }finally{store.close();}
});
test('Old databases migrate without losing players, and saved socials survive reopening',()=>{
  const dir=mkdtempSync(join(tmpdir(),'pingpong-socials-')),path=join(dir,'test.sqlite');let store=createStore(path);
  try{
    const id=store.addPlayer({name:'Игрок'});store.close();
    const raw=new DatabaseSync(path);raw.exec('ALTER TABLE players DROP COLUMN socials');raw.close();
    store=createStore(path);assert.equal(store.state().players[0].name,'Игрок');assert.deepEqual(store.state().players[0].socials,{});
    store.saveSocials(id,{socials:{telegram:'@pingclub'}});store.close();store=createStore(path);
    assert.equal(store.state().players[0].socials.telegram,'https://t.me/pingclub');
  }finally{store.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep+'pingpong-socials-'));rmSync(dir,{recursive:true,force:true});}
});
