import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const response=await fetch('http://127.0.0.1:8787/api/state');assert.equal(response.status,200);const fixture=await response.json();
assert.equal(fixture.players.length,7);assert.equal(fixture.matches.length,62);
assert.ok(fixture.players.every(p=>typeof p.socials==='object'&&Number.isInteger(p.leader_days)));
const context=vm.createContext({document:{getElementById:()=>({}),addEventListener:()=>{}},window:{addEventListener:()=>{}},fetch:()=>new Promise(()=>{}),Intl,console,setTimeout,clearTimeout});
vm.runInContext(readFileSync('public/app.js','utf8'),context);context.fixture=fixture;vm.runInContext('state=fixture',context);
const table=vm.runInContext('tablePage()',context);
assert.equal((table.match(/<tr class="podium podium-/g)||[]).length,3);
assert.equal((table.match(/в лидерах/g)||[]).length,1);
for(let i=0;i<4;i++){
  context.id=fixture.players[i].id;const profile=vm.runInContext('profilePage(id)',context);
  assert.ok(profile.includes('Добавить соцсети'));
  assert.equal(profile.includes('profile-header podium'),i<3);
  assert.equal(profile.includes('в лидерах'),i===0);
  assert.ok(!profile.includes('NaN'));
}
context.id=fixture.players[0].id;vm.runInContext("player(id).socials={telegram:'https://t.me/pingclub'}",context);
const panel=vm.runInContext('socialPanel(player(id))',context);
assert.ok(panel.includes('href="https://t.me/pingclub"'));assert.ok(panel.includes('target="_blank" rel="noopener noreferrer"'));assert.ok(panel.includes('Изменить соцсети'));
console.log(JSON.stringify({players:fixture.players.length,matches:fixture.matches.length,top3:fixture.players.slice(0,3).map(p=>({name:p.name,leader_days:p.leader_days})),profileChecks:'passed'}));
