import {readFileSync,writeFileSync} from 'node:fs';
const path=new URL('../public/app.js',import.meta.url);
let text=readFileSync(path,'utf8');
function replace(old,value){if(!text.includes(old))throw new Error('Missing expected source: '+old);text=text.replace(old,value);}
replace('return `<tr><td class="rank', 'return `<tr class="${podiumClass(p)}"><td class="rank');
replace('<span class="avatar">${esc(p.name.slice(0,1).toUpperCase())}</span>','${playerAvatar(p)}');
replace('трофеев`}</small></span></a>', 'трофеев`}</small>${i===0?leaderTenure(p):\'\'}</span></a>');
replace('<div class="profile-header"><span class="avatar large">${esc(p.name.slice(0,1).toUpperCase())}</span>', '<div class="profile-header ${podiumClass(p)}">${playerAvatar(p,true)}');
replace('<div class="eyebrow">Личное дело обитателя</div>', '<div class="eyebrow">${podiumRank(p)<=3?`${podiumRank(p)}-е место в рейтинге`:"Личное дело обитателя"}</div>');
replace('<h1>${esc(p.name)}</h1><div class="rating-pill">','<h1>${esc(p.name)}</h1>${podiumRank(p)===1?leaderTenure(p):\'\'}<div class="rating-pill">');
replace('${eloChart(p,matches)}<div class="collection-title">','${socialPanel(p)}${eloChart(p,matches)}<div class="collection-title">');
replace("else if(action==='main-award')", "else if(action==='edit-socials')editSocials(Number(button.dataset.player));else if(action==='main-award')");
replace("  if(event.target.id==='awards-form'){", "  if(event.target.id==='socials-form'){\n    event.preventDefault();const form=event.target;\n    await submitForm(form,async()=>{const data=new FormData(form),socials=Object.fromEntries(socialServices.map(([key])=>[key,String(data.get(key)||'')]));await mutate(`/api/players/${form.dataset.player}/socials`,'PUT',{socials});notify('Соцсети сохранены. Можно договариваться об игре.');});\n  }\n  if(event.target.id==='awards-form'){");
writeFileSync(path,text);
