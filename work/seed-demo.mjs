import { createStore } from '../db.mjs';
import { writeFileSync } from 'node:fs';
const names=['Макс (демо)','Саша (демо)','Даша (демо)','Лёша (демо)','Олег (демо)','Кирилл (демо)'];
const initial=await (await fetch('http://127.0.0.1:8787/api/state')).json();
if(initial.players.some(p=>names.includes(p.name)))throw new Error('Демонстрационные игроки уже добавлены. Повторный запуск остановлен.');
const sim=createStore();
for(const p of initial.players)sim.addPlayer({name:p.name});
const ids=names.map(name=>sim.addPlayer({name}));
const [max,sasha,dasha,lesha,oleg,kirill]=ids;
const plan=[];
function game(a,b,format='close') {
  const sets=format==='sweep'?[[11,7],[11,5],[12,10]]:format==='single'?[[11,8]]:[[11,8],[8,11],[11,9]];
  const best_of=format==='sweep'?5:format==='single'?1:3;
  const input={player_a:a,player_b:b,best_of,sets,played_at:new Date(Date.now()-12*86400000+plan.length*10800000).toISOString()};
  sim.saveMatch(input);plan.push(input);
}
game(kirill,lesha);game(kirill,lesha);
for(let i=0;i<3;i++)game(lesha,kirill);
for(let i=0;i<4;i++)game(lesha,oleg);
for(let i=0;i<11;i++)game(sasha,oleg,i%4===0?'single':'close');
for(let i=0;i<10;i++)game(dasha,kirill);
for(let i=0;i<15;i++)game(max,oleg,i%5===0?'single':'close');
game(max,sasha,'sweep');game(max,dasha,'sweep');game(max,lesha,'sweep');
for(let i=0;i<4;i++)game(max,i%2?sasha:dasha);
game(kirill,sasha,'sweep');game(dasha,max,'sweep');game(lesha,oleg);
for(let i=0;i<6;i++)game(max,i%2?sasha:dasha);
game(dasha,lesha,'sweep');
const preview=sim.state();
if(!preview.earned.some(e=>e.player_id===max&&e.award_id==='knees'))throw new Error('План не открывает На колени поставит');
if(!preview.earned.some(e=>e.player_id===lesha&&e.award_id==='comeback'))throw new Error('План не открывает возвращение');
if(!preview.players.some(p=>p.rating<900)||!preview.players.some(p=>p.rating>=1200))throw new Error('Недостаточный разброс рейтинга');
if(process.argv.includes('--preview')){
  console.log(JSON.stringify({demoMatches:plan.length,players:preview.players.map(p=>({name:p.name,rating:p.rating,awards:preview.earned.filter(e=>e.player_id===p.id).map(e=>e.award_id)}))},null,2));sim.close();process.exit(0);
}
async function request(path,method,body){const r=await fetch('http://127.0.0.1:8787'+path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw new Error(result.error);return result;}
const mapping=new Map(),manifest={created_at:new Date().toISOString(),players:[],matches:[]};
const manifestPath='C:/Users/peche/Documents/ChatGPT/ranked/work/demo-manifest.json';
function saveManifest(){writeFileSync(manifestPath,JSON.stringify(manifest,null,2));}
for(let i=0;i<names.length;i++){const added=await request('/api/players','POST',{name:names[i]});mapping.set(ids[i],added.id);manifest.players.push({id:added.id,name:names[i]});saveManifest();}
const beginning=Date.now()-10*86400000,end=Date.now()-3600000;
for(let i=0;i<plan.length;i++){
  const input={...plan[i],player_a:mapping.get(plan[i].player_a),player_b:mapping.get(plan[i].player_b),played_at:new Date(beginning+(end-beginning)*i/(plan.length-1)).toISOString()};
  const added=await request('/api/matches','POST',input);manifest.matches.push(added.id);saveManifest();
}
for(const [person,award] of [[max,'knees'],[sasha,'pacanoid'],[dasha,'pacanoid'],[lesha,'comeback'],[oleg,'loss-book'],[kirill,'slippers']]){
  if(preview.earned.some(e=>e.player_id===person&&e.award_id===award))await request(`/api/players/${mapping.get(person)}/main-award`,'PUT',{award_id:award});
}
const final=await (await fetch('http://127.0.0.1:8787/api/state')).json();
console.log(JSON.stringify({addedPlayers:manifest.players.length,addedMatches:manifest.matches.length,earnedAwards:final.earned.length,profiles:{trophies:'http://127.0.0.1:8787/#player/'+mapping.get(max),comeback:'http://127.0.0.1:8787/#player/'+mapping.get(lesha),lower:'http://127.0.0.1:8787/#player/'+mapping.get(oleg)},players:final.players.map(p=>({name:p.name,rating:p.rating}))},null,2));
sim.close();
