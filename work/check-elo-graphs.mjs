import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const root='C:/Users/peche/Documents/ChatGPT/ranked';
const response=await fetch('http://127.0.0.1:8787/api/state');
if(!response.ok)throw new Error('Не удалось загрузить данные сайта');
const fixture=await response.json();
const context=vm.createContext({document:{getElementById:()=>({}),addEventListener:()=>{}},window:{addEventListener:()=>{}},fetch:()=>new Promise(()=>{}),Intl,console,setTimeout,clearTimeout,fixture});
vm.runInContext(readFileSync(root+'/public/app.js','utf8'),context);
vm.runInContext('state=fixture',context);
for(const person of fixture.players){
  context.person=person;
  const series=JSON.parse(vm.runInContext('JSON.stringify(eloSeries(person,state.matches))',context));
  if(series.length!==person.wins+person.losses+1||series.at(-1).rating!==person.rating)throw new Error('Некорректная история Elo');
  const html=vm.runInContext('eloChart(person,state.matches)',context);
  if(/NaN|Infinity/.test(html))throw new Error('Некорректные координаты');
}
const asset=await fetch('http://127.0.0.1:8787/app.js');
if(!asset.ok||!(await asset.text()).includes('Динамика Elo'))throw new Error('Новая версия графика не обслуживается');
console.log(JSON.stringify({profilesChecked:fixture.players.length,matches:fixture.matches.length,served:true}));
