import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {createStore,DEFAULT_AWARDS,AWARD_CHARACTERS} from '../db.mjs';

test('All trophies have distinct Zazerkalye characters; new ones have separate illustrations',()=>{
  const store=createStore();try{
    const awards=store.state().awards;
    assert.equal(awards.length,33);
    const characters=awards.filter(a=>a.character),newArt=awards.filter(a=>a.art>=18);
    assert.equal(characters.length,33);assert.equal(new Set(characters.map(a=>a.character)).size,33);
    assert.equal(new Set(awards.map(a=>a.art)).size,33);
    assert.ok(characters.every(a=>AWARD_CHARACTERS[a.id]===a.character));
    assert.equal(newArt.length,16);assert.equal(new Set(newArt.map(a=>a.image)).size,16);
    assert.ok(newArt.every(a=>a.image.endsWith('-zazerkalye.png')));
    assert.equal(awards.find(a=>a.id==='comeback').title,'В полтинниках пока побудешь');
    assert.equal(awards.find(a=>a.id==='knees').title,'На колени поставит');
  }finally{store.close();}
});
test('Character migration preserves game history, earned awards, main trophy, socials and custom titles',()=>{
  const dir=mkdtempSync(join(tmpdir(),'pingpong-characters-')),path=join(dir,'db.sqlite');let store=createStore(path);
  try{
    store.addPlayer({name:'Аня'});store.addPlayer({name:'Боря'});
    for(let i=0;i<4;i++)store.saveMatch({player_a:1,player_b:2,best_of:1,sets:[[11,5]],played_at:`2026-01-0${i+1}T00:00:00Z`});
    store.setMain(1,'bobyl');store.saveSocials(1,{socials:{telegram:'@annaping'}});
    store.db.prepare('UPDATE awards SET title=? WHERE id=?').run('Пацаноид с ракеткой','pacanoid');
    store.db.prepare('UPDATE awards SET title=? WHERE id=?').run('Моя награда','oleg');
    store.db.prepare('DELETE FROM app_migrations WHERE id=?').run('unique-characters-v1');
    const before=store.state();store.close();store=createStore(path);const after=store.state();
    assert.deepEqual(after.players,before.players);assert.deepEqual(after.matches,before.matches);assert.deepEqual(after.earned,before.earned);
    assert.equal(after.awards.find(a=>a.id==='pacanoid').title,DEFAULT_AWARDS.find(a=>a[0]==='pacanoid')[3]);
    assert.equal(after.awards.find(a=>a.id==='oleg').title,'Моя награда');
    store.db.prepare('UPDATE awards SET title=? WHERE id=?').run('Пацаноид с ракеткой','pacanoid');
    store.close();store=createStore(path);
    assert.equal(store.state().awards.find(a=>a.id==='pacanoid').title,'Пацаноид с ракеткой');
  }finally{store.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep+'pingpong-characters-'));rmSync(dir,{recursive:true,force:true});}
});
