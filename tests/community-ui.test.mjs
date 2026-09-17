import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createStore} from '../db.mjs';
import {createClub} from '../club.mjs';
function context(fixture){
  const ctx=vm.createContext({document:{getElementById:()=>({}),addEventListener:()=>{}},window:{addEventListener:()=>{}},fetch:()=>new Promise(()=>{}),URL,location:{origin:'http://127.0.0.1:8787'},Intl,console,setTimeout,clearTimeout});
  for(const name of ['qrcodegen.js','community.js','app.js'])vm.runInContext(readFileSync(new URL('../public/'+name,import.meta.url),'utf8'),ctx);
  ctx.fixture=fixture;vm.runInContext('state=fixture',ctx);return ctx;
}
const base={players:[{id:1,name:'Один',rating:1000},{id:2,name:'Два',rating:1000}],newcomers:[],awards:[],earned:[],award_progress:[],matches:[],auth:{user:null,setup_required:false},meeting:{open:true,join_until:'2026-09-16T20:00:00Z',public_url:''},proposals:[],accounts:[],audit:[]};
test('Registered players appear in the table immediately and gain a rank after their first confirmed match',async t=>{
  const store=createStore();t.after(()=>store.close());
  const club=createClub(store,{setupKey:'table-test-secret'});
  const owner=club.session(await club.setup({setup_key:'table-test-secret',name:'Тимофей',login:'owner',password:'owner-password'}));
  club.saveMeeting(owner,{hours:3});
  const newcomer=club.session(await club.register({name:'Андрей',login:'andrey',password:'andrey-password'}));
  const playerRow=html=>[...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(m=>m[0]).find(row=>row.includes(`href="#player/${newcomer.player_id}"`));
  for(const user of [null,owner,newcomer]){
    const ctx=context(club.state(user)),html=vm.runInContext('tablePage()',ctx),row=playerRow(html);
    assert.ok(row,'A registered newcomer must be visible to guests, the organizer and themselves');
    assert.ok(html.includes('<span>Игроков</span><strong>2</strong>'));
    assert.ok(row.includes('Андрей'));assert.ok(row.includes('Ждёт первого матча'));
    assert.ok(row.includes('Пока без места в рейтинге'));assert.ok(row.includes('>1000</td>'));assert.ok(row.includes('>0 / 0</td>'));
    assert.ok(!row.includes('podium'));assert.ok(!row.includes('leader-tenure'));
  }
  const match=club.submitMatch(newcomer,{player_a:newcomer.player_id,player_b:owner.player_id,best_of:1,sets:[[11,5]],played_at:new Date(Date.now()-60000).toISOString()});
  club.decide(owner,match,{decision:'confirm',reason:'Видел первую игру'});
  const html=vm.runInContext('tablePage()',context(club.state(null))),row=playerRow(html);
  assert.equal([...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].filter(m=>m[0].includes(`href="#player/${newcomer.player_id}"`)).length,1);
  assert.ok(row.includes('podium-1'));assert.ok(row.includes('>01</td>'));assert.ok(row.includes('>1016</td>'));
  assert.ok(!html.includes('Ждёт первого матча'));assert.ok(html.includes('<span>Игроков</span><strong>2</strong>'));
});
test('Joining, invitations and pending profiles render without external services or podium frames',()=>{
  const ctx=context(structuredClone(base));
  let html=vm.runInContext('joinPage()',ctx);assert.ok(html.includes('join-form'));assert.ok(html.includes('1000 Elo'));
  assert.match(html,/<input type="password"[^>]*minlength="6"/);assert.ok(html.includes('От 6 символов'));
  html=vm.runInContext('invitationPanel()',ctx);assert.ok(html.includes('<svg'));assert.ok(html.includes('http://127.0.0.1:8787/#join'));assert.ok(html.includes('локальный адрес'));assert.ok(!html.includes('<img'));
  vm.runInContext("state.newcomers=[{id:3,name:'Новичок',membership_status:'pending',rating:1000}];state.auth.user={id:3,player_id:3,role:'player'}",ctx);
  html=vm.runInContext('playerAvatar(player(3))',ctx);assert.ok(!html.includes('podium-'));assert.ok(!html.includes('Infinity'));
  assert.equal(vm.runInContext('matchPlayers().length',ctx),3);
});
test('Profile point totals include all confirmed sets on either side and follow corrections and deletions',async t=>{
  const store=createStore();t.after(()=>store.close());
  for(const name of ['Андрей','Боря','Вера','Новичок'])store.addPlayer({name});
  const club=createClub(store,{setupKey:'points-secret'});
  const owner=club.session(await club.setup({setup_key:'points-secret',player_id:1,login:'owner',password:'owner6'}));
  const match={player_a:1,player_b:2,best_of:3,sets:[[11,7],[9,11],[13,11]],played_at:'2026-01-01T12:00:00Z'};
  const id=store.saveMatch(match);
  store.saveMatch({player_a:3,player_b:1,best_of:1,sets:[[11,5]],played_at:'2026-01-02T12:00:00Z'});
  store.saveMatch({player_a:2,player_b:3,best_of:1,sets:[[11,9]],played_at:'2026-01-03T12:00:00Z'});
  club.submitMatch(owner,{player_a:1,player_b:3,best_of:1,sets:[[11,0]],played_at:'2026-01-04T12:00:00Z'});
  const profile=id=>vm.runInContext(`profilePage(${id})`,context(club.state(null)));
  let html=profile(1);
  assert.ok(html.includes('class="stats profile-stats"'));assert.ok(html.includes('Набрано / пропущено'));
  assert.ok(html.includes('class="point-score">38 / 40</span>'));assert.match(html,/class="point-share"[^>]*>48,7%<\/small>/);
  html=profile(2);assert.ok(html.includes('class="point-score">40 / 42</span>'));assert.match(html,/class="point-share"[^>]*>48,8%<\/small>/);
  html=profile(4);assert.ok(html.includes('class="point-score">0 / 0</span>'));assert.match(html,/class="point-share"[^>]*>0%<\/small>/);
  assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));
  club.editMatch(owner,id,{...match,sets:[[11,0],[11,0]],reason:'Исправлен счёт партий'});
  html=profile(1);assert.ok(html.includes('class="point-score">27 / 11</span>'));assert.match(html,/class="point-share"[^>]*>71,1%<\/small>/);
  club.editMatch(owner,id,{reason:'Матч внесён ошибочно'},true);
  html=profile(1);assert.ok(html.includes('class="point-score">5 / 11</span>'));assert.match(html,/class="point-share"[^>]*>31,3%<\/small>/);
});
test('Player sees confirmation controls but no admin actions; admin can correct unconfirmed scores',()=>{
  const fixture=structuredClone(base);fixture.auth.user={id:1,player_id:1,role:'player'};
  const proposal={id:1,player_a:1,player_b:2,name_a:'Один',name_b:'Два',submitted_by:2,submitter:'two',sets:[[11,7]],played_at:'2026-09-01T00:00:00Z',status:'pending'};
  fixture.proposals=[proposal];const ctx=context(fixture);ctx.proposal=proposal;
  let html=vm.runInContext('proposalCard(proposal)',ctx);assert.ok(html.includes('Подтвердить'));assert.ok(html.includes('Оспорить'));assert.ok(!html.includes('Исправить счёт'));assert.ok(!html.includes('Отклонить'));
  vm.runInContext("state.auth.user.role='admin'",ctx);html=vm.runInContext('proposalCard(proposal)',ctx);assert.ok(html.includes('edit-proposal'));assert.ok(html.includes('Отклонить'));
  const qr=vm.runInContext("qrcodegen.QrCode.encodeText('https://club.example/#join',qrcodegen.QrCode.Ecc.MEDIUM)",ctx);assert.ok(qr.size>=21);assert.equal(qr.getModule(-1,-1),false);
});
