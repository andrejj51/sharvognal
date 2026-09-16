import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {MATCH_AWARDS} from '../match-awards.mjs';
const app=new URL('../public/app.js',import.meta.url);
let source=readFileSync(app,'utf8');
source=source.replace("a.kind==='rival-wins'?'За 5 побед над одним соперником':'За возвращение'", "a.kind==='rival-wins'?'За 5 побед над одним соперником':matchAchievementKinds.includes(a.kind)?esc(a.condition):'За возвращение'");
source=source.replace("a.kind==='rival-wins'?'Побед над соперником':'Порог Elo'", "a.kind==='rival-wins'?'Побед над соперником':matchAchievementKinds.includes(a.kind)?'Условие фиксировано':'Порог Elo'");
source=source.replace('Полученные награды остаются навсегда. Прогресс закрытых карточек зависит от текущего рейтинга.', 'Полученные награды сохраняются после новых игр. Исправление истории пересчитывает достижения. Прогресс закрытых карточек зависит от рейтинга и результатов матчей.');
writeFileSync(app,source);
const index=new URL('../public/index.html',import.meta.url);
writeFileSync(index,readFileSync(index,'utf8').replace('Мемные трофеи <span>15</span>','Мемные трофеи <span></span>'));
const icons=[
  '<path d="M88 155a53 53 0 1 1 86 16"/><path d="m80 129 8 26 27-7"/><path d="m119 139 19-22 23 15"/>',
  '<path d="m82 103 19 41h62l18-41-29 17-22-38-21 38z"/><path d="M103 155h61M89 178l82-9"/><path d="m175 73 8-15m13 30 17-5"/>',
  '<path d="m98 147 17-47 18 29 19-51 19 64-37 39z"/><path d="m69 129 8-21m-5 46 8-18"/>',
  '<path d="M159 76a60 60 0 1 0 25 96 50 50 0 0 1-25-96z"/><path d="m182 97 4 9 10 2-8 7 1 10-9-5-9 5 2-10-7-7 10-2z"/>',
  '<path d="M83 111h89l-19-19m19 19-19 19M177 151H88l19 19m-19-19 19-19"/><circle cx="131" cy="132" r="10"/>',
  '<circle cx="130" cy="99" r="15"/><circle cx="84" cy="119" r="11"/><circle cx="176" cy="119" r="11"/><path d="M104 155v-10a26 26 0 0 1 52 0v10M65 162v-17a19 19 0 0 1 27-17m103 34v-17a19 19 0 0 0-27-17"/>',
  '<path d="m82 122 48-42 48 42M95 113v60h70v-60M120 173v-34h20v34"/><path d="M78 187h104"/>',
  '<ellipse cx="113" cy="126" rx="27" ry="35" transform="rotate(30 113 126)"/><path d="m99 154-19 30M145 150l25-25m-14 0h14v14"/><circle cx="174" cy="91" r="10"/>',
];
const dir=new URL('../public/awards/',import.meta.url);mkdirSync(dir,{recursive:true});
for(const [i,a] of MATCH_AWARDS.filter(a=>a[5]<=25).entries()) {
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260"><defs><radialGradient id="bg"><stop stop-color="#405742"/><stop offset="1" stop-color="#15261f"/></radialGradient></defs><rect width="260" height="260" fill="url(#bg)"/><path d="m86 169-14 69 40-16 18 24 18-24 40 16-14-69" fill="#7f4c33" stroke="#bc8b56" stroke-width="3"/><circle cx="130" cy="130" r="87" fill="#273c2c" stroke="#d6b977" stroke-width="5"/><circle cx="130" cy="130" r="76" fill="none" stroke="#7b8c58" stroke-width="2" stroke-dasharray="3 8"/><g fill="none" stroke="#ead3a1" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${icons[i]}</g><circle cx="130" cy="207" r="4" fill="#ead3a1"/></svg>`;
  writeFileSync(new URL(a[0]+'.svg',dir),svg);
}
