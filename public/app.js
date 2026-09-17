'use strict';
let state = null;
const app = document.getElementById('app'), dialog = document.getElementById('dialog');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed = n => n > 0 ? `+${n}` : String(n);
const pointWords = new Intl.PluralRules('ru');
const points = n => `${n} ${{one:'очко',few:'очка',many:'очков',other:'очка'}[pointWords.select(n)]}`;
const fmtDate = (date, full = false) => new Date(date).toLocaleString('ru-RU', full ? {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'} : {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
const player = id => [...state.players,...(state.newcomers||[])].find(p => p.id === Number(id));
const earnedFor = id => state.earned.filter(e => e.player_id === Number(id));
function notify(message, error = false) { const el=document.getElementById('toast');el.textContent=message;el.className=`toast show${error?' error':''}`;clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.className='toast',4500); }
async function api(path, method='GET', body) {
  const response = await fetch(path, {method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(state?.auth?.user?.csrf?{'X-CSRF-Token':state.auth.user.csrf}:{})},body:body ? JSON.stringify(body) : undefined});
  const data = await response.json();
  if(!response.ok) throw new Error(data.error || 'Не удалось выполнить действие.');
  return data;
}
function empty(title, text, button='') { return `<div class="empty"><div class="empty-symbol">◒</div><h2>${title}</h2><p>${text}</p>${button}</div>`; }
function stats(items,cls='') { return `<div class="stats${cls?' '+cls:''}">${items.map(([label,value])=>`<div class="stat"><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>`; }
function pointStats(id,matches) {
  let scored=0,conceded=0;
  for(const m of matches){
    if(m.player_a!==id&&m.player_b!==id)continue;
    const side=m.player_a===id?0:1;
    for(const set of m.sets){scored+=set[side];conceded+=set[1-side];}
  }
  const total=scored+conceded,percent=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(total?scored/total*100:0);
  return `<span class="point-score">${scored} / ${conceded}</span><small class="point-share" title="Доля набранных очков от всех очков в подтверждённых матчах" aria-label="Доля набранных очков: ${percent}%">${percent}%</small>`;
}
function awardCardId(playerId,awardId) {return `award-${playerId}-${awardId}`;}
function matchAwards(m) {
  const groups=new Map();
  for(const earned of state.earned.filter(e=>e.match_id===m.id)){
    const p=player(earned.player_id),a=state.awards.find(a=>a.id===earned.award_id);
    if(!p||!a)continue;
    if(!groups.has(p.id))groups.set(p.id,{player:p,awards:[]});
    groups.get(p.id).awards.push(a);
  }
  return groups.size?`<div class="match-awards" aria-label="Достижения за матч">${[...groups.values()].map(({player:p,awards})=>`<p>${esc(p.name)}: ${awards.map(a=>`<a href="#player/${p.id}/award/${encodeURIComponent(a.id)}" data-action="show-award">«${esc(a.title)}»</a>`).join(', ')}</p>`).join('')}</div>`:'';
}
function focusAward(route) {
  if(route[0]!=='player'||route[2]!=='award'||!route[3])return false;
  let awardId;try{awardId=decodeURIComponent(route[3]);}catch{return false;}
  const id=Number(route[1]);
  if(!earnedFor(id).some(e=>e.award_id===awardId))return false;
  const card=document.getElementById(awardCardId(id,awardId));
  if(!card)return false;
  card.classList.add('award-highlight');
  card.focus({preventScroll:true});
  card.scrollIntoView({block:'start'});
  return true;
}
function matchRow(m, edit=false, profileId=null) {
  const wa=m.sets.filter(s=>s[0]>s[1]).length, wb=m.sets.length-wa;
  const delta=profileId===m.player_b ? -m.delta_a : m.delta_a;
  return `<div class="match-row"><div class="match-date">${fmtDate(m.played_at)}</div><div class="match-pair"><a href="#player/${m.player_a}" class="${m.winner_id===m.player_a?'winner':''}">${esc(m.name_a)}</a> <span class="meta">vs</span> <a href="#player/${m.player_b}" class="${m.winner_id===m.player_b?'winner':''}">${esc(m.name_b)}</a><div class="set-scores">${m.sets.map(s=>`${s[0]}:${s[1]}`).join(' · ')}</div>${matchAwards(m)}</div><div class="match-score">${wa}:${wb}</div>${profileId ? `<strong class="${delta>=0?'positive':'negative'}">${signed(delta)}</strong>` : ''}${edit&&admin()?`<div class="actions"><button class="button small ghost" data-action="edit-match" data-id="${m.id}" aria-label="Исправить матч ${esc(m.name_a)} — ${esc(m.name_b)}">Изменить</button></div>`:edit&&currentUser()&&[m.player_a,m.player_b].includes(currentUser().player_id)?`<button class="button small ghost" data-action="dispute-match" data-id="${m.id}">Оспорить</button>`:''}</div>`;
}
const socialServices=[['telegram','Telegram','TG','https://t.me/имя или @username'],['vk','VK','VK','https://vk.com/имя'],['instagram','Instagram','IG','https://instagram.com/имя'],['discord','Discord','DS','https://discord.com/users/ID или discord.gg/…'],['other','Другая ссылка','↗','https://…/профиль']];
function podiumRank(p) {const index=state.players.findIndex(row=>row.id===p.id);return index<0?Infinity:index+1;}
function podiumClass(p) {const rank=podiumRank(p);return rank<=3?`podium podium-${rank}`:'';}
function playerAvatar(p,large=false) {const rank=podiumRank(p);return `<span class="avatar ${large?'large':''} ${podiumClass(p)}">${esc(p.name.slice(0,1).toUpperCase())}${rank<=3?`<span class="podium-medal" aria-label="${rank}-е место">${rank===1?'♛':rank}</span>`:''}</span>`;}
function leaderTenure(p) {const days=p.leader_days||0;return `<span class="leader-tenure" title="Суммарное время на первом месте по истории матчей">♛ ${days} ${{one:'день',few:'дня',many:'дней',other:'дней'}[pointWords.select(days)]} в лидерах</span>`;}
function socialPanel(p) {
  const links=socialServices.filter(([key])=>p.socials?.[key]);
  return `<section class="panel social-panel"><div class="panel-head"><div><h2>Вызвать на игру</h2><p class="meta">Договоритесь о времени и встрече у стола</p></div><button class="button small ghost" data-action="edit-socials" data-player="${p.id}">${links.length?'Изменить соцсети':'Добавить соцсети'}</button></div>${links.length?`<div class="social-links">${links.map(([key,label,icon])=>`<a class="social-link social-${key}" href="${esc(p.socials[key])}" target="_blank" rel="noopener noreferrer" aria-label="Вызвать ${esc(p.name)} на игру: ${label}"><span class="social-icon" aria-hidden="true">${icon}</span><span>${label==='Другая ссылка'?'Профиль':label}<small>Вызвать на игру</small></span><span class="social-arrow" aria-hidden="true">↗</span></a>`).join('')}</div>`:'<p class="social-empty">Добавьте свои соцсети, чтобы друзья могли позвать вас сыграть.</p>'}</section>`;
}
function editSocials(id) {
  const p=player(id);if(!p)return;if(!canEditProfile(id)){notify('Можно менять только свой профиль.',true);return;}
  modal('Соцсети · '+p.name,`<form id="socials-form" data-player="${p.id}">
    <p class="form-help">Добавьте ссылки, чтобы другие игроки могли позвать вас к столу. Ненужные поля оставьте пустыми.</p>
    <div class="social-fields">${socialServices.map(([key,label,icon,placeholder])=>`<label class="field ${key==='other'?'social-field-wide':''}">${label}<input name="${key}" value="${esc(p.socials?.[key]||'')}" placeholder="${esc(placeholder)}" maxlength="300" autocomplete="off" spellcheck="false"></label>`).join('')}</div>
    <label class="checkbox-field social-visibility"><input name="public" type="checkbox" ${p.socials_public?'checked':''}><span><strong>Показывать соцсети другим игрокам</strong><small>Если выключить, ссылки будут видны только вам и администратору.</small></span></label>
    <p class="form-error" role="alert"></p><div class="form-footer"><button class="button ghost" type="button" data-action="close">Отмена</button><button class="button primary">Сохранить соцсети</button></div>
  </form>`,'socials-dialog');
}
function leaderboardRow(p,index) {
  const newcomer=p.membership_status==='pending',main=state.awards.find(a=>a.id===p.main_award);
  return `<tr class="${newcomer?'newcomer':podiumClass(p)}"><td class="rank ${!newcomer&&index===0?'first':''}"${newcomer?' aria-label="Пока без места в рейтинге"':''}>${newcomer?'—':String(index+1).padStart(2,'0')}</td><td><a class="player-link" href="#player/${p.id}">${playerAvatar(p)}<span>${esc(p.name)}<small>${main?esc(main.title):`${earnedFor(p.id).length} / ${state.awards.length} трофеев`}</small>${newcomer?'<small class="newcomer-status">Ждёт первого матча</small>':index===0?leaderTenure(p):''}</span></a></td><td class="rating">${p.rating}</td><td class="number">${p.wins} / ${p.losses}</td><td>${p.wins+p.losses?Math.round(p.wins/(p.wins+p.losses)*100):0}%</td></tr>`;
}
function tablePage() {
  const players=[...state.players,...(state.newcomers||[])];
  return `<div class="page-head table-scene"><div><div class="eyebrow">Зазеркальный стол · рейтинг компании</div><h1>Таблица друзей</h1><p>Рейтинг меняется. Трофеи остаются.</p></div><button class="button ghost" data-action="new-player">＋ Добавить друга</button></div>${stats([['Игроков',players.length],['Матчей',state.matches.length],['Открыто трофеев',state.earned.length]])}<div class="dashboard-grid"><div><section class="panel"><div class="panel-head"><h2>Рейтинг</h2><span class="meta">Elo · K = 32</span></div>${players.length?`<div class="table-wrap"><table class="leaderboard"><thead><tr><th>#</th><th>Игрок</th><th>Elo</th><th>В / П</th><th>Победы</th></tr></thead><tbody>${players.map((p,i)=>leaderboardRow(p,i)).join('')}</tbody></table></div>`:empty('Стол пока свободен','Добавьте себя и друзей. Каждый начнёт с 1000 очков.', '<button class="button primary" data-action="new-player">Добавить первого игрока</button>')}</section><section class="panel recent"><div class="panel-head"><h2>Последние матчи</h2><a class="meta" href="#history">Вся история →</a></div>${state.matches.length?state.matches.slice(0,5).map(m=>matchRow(m)).join(''):empty('Первый матч ещё впереди','После игры внесите счёт — рейтинг и награды обновятся сами.',`<button class="button" data-action="new-match" ${matchPlayers().length<2?'disabled':''}>Записать матч</button>`)}</section></div><aside class="side-stack"><section class="rule-card"><div class="eyebrow">Цена одной победы</div><h2>Сильнее соперник —<br>больше очков</h2><div class="rule-line"><span>Равный рейтинг</span><strong>+16 / −16</strong></div><div class="rule-line"><span>Соперник сильнее на 200</span><strong>+24 / −8</strong></div><div class="rule-line"><span>Соперник слабее на 200</span><strong>+8 / −24</strong></div><p>Очки за весь матч. Счёт 3:0 и 3:2 влияет на статистику, но не на рейтинг.</p></section><section class="preview-card"><div class="eyebrow">Секретная коллекция</div><h2>Трофеи пока<br>в тени</h2><p>Доведите прогресс до 100%, чтобы узнать, кто поселится в вашем профиле.</p><a href="#awards" class="button small ghost">Все ${state.awards.length} наград →</a></section></aside></div>`;
}
function historyPage() {return `<div class="page-head"><div><div class="eyebrow">Всё записано</div><h1>История матчей</h1><p>Исправление результата пересчитает рейтинг и награды по всей истории.</p></div><button class="button primary" data-action="new-match" ${matchPlayers().length<2?'disabled':''}>＋ Добавить матч</button></div><section class="panel"><div class="panel-head"><h2>Сыгранные встречи</h2><span class="history-stats">${state.matches.length} матчей</span></div>${state.matches.length?state.matches.map(m=>matchRow(m,true)).join(''):empty('История начинается с первой игры','Добавьте двух друзей и запишите результат матча.')}</section>`;}
function render() {
  if(!state) return;
  const route=(location.hash.slice(1)||'table').split('/');
  updateCommunity();
  document.querySelectorAll('[data-nav]').forEach(el=>el.classList.toggle('active',el.dataset.nav===(route[0]==='player'?'table':route[0])));
  document.querySelector('.topbar [data-action="new-match"]').disabled=matchPlayers().length<2;
  document.querySelector('[data-nav="awards"] span').textContent=state.awards.length;
  if(route[0]==='history') app.innerHTML=historyPage();
  else if(route[0]==='awards') app.innerHTML=`<div class="page-head"><div><div class="eyebrow">Коллекция Зазеркалья</div><h1>Мемные трофеи</h1><p>Награды открываются только при 100% прогресса.</p></div><button class="button ghost" data-action="settings">Настроить награды</button></div><p class="section-note">Имена и изображения закрытых наград скрыты. Прогресс вашей коллекции — в профиле игрока.</p>${collections(null)}`;
  else if(route[0]==='join') app.innerHTML=joinPage();
  else if(route[0]==='moderation') app.innerHTML=moderationPage();
  else if(route[0]==='player') app.innerHTML=profilePage(Number(route[1]));
  else app.innerHTML=tablePage();
  decorateCommunity(route);
  return focusAward(route);
}
async function load() {try{state=await api('/api/state');render();}catch(error){app.innerHTML=`<div class="error-panel"><h2>Не удалось загрузить таблицу</h2><p>${esc(error.message)}</p><button class="button" data-action="reload">Попробовать ещё раз</button></div>`;}}
function modal(title, body, cls='') {dialog.className=cls;document.getElementById('dialog-content').innerHTML=`<div class="dialog-head"><h2>${title}</h2><button class="close" data-action="close" aria-label="Закрыть">×</button></div><div class="dialog-body">${body}</div>`;dialog.showModal();}
function newPlayer() {modal('Добавить друга',`<form id="player-form"><label class="field">Имя<input name="name" maxlength="32" required placeholder="Как зовём за столом?" autocomplete="off" autofocus></label><p class="form-help">Начальный рейтинг — 1000. Трофеи нужно заслужить.</p><p class="form-error" role="alert"></p><div class="form-footer"><button type="button" class="button ghost" data-action="close">Отмена</button><button class="button primary">Добавить игрока</button></div></form>`);}
const matchAchievementKinds=['top-three','clean-set','rival-wins','match-comeback','upset','win-streak','long-set','revenge','distinct-rivals','match-count','zero-comeback','first-match','loss-comeback','daily-rivals','close-match','alternating-match','fewer-points','personal-matches','leader-win'];
function progressFor(a,p,earned) {
  if(earned) return {percent:100,label:'Получено',note:fmtDate(earned.earned_at,true)};
  if(matchAchievementKinds.includes(a.kind)) {
    const completed=p?(state.award_progress||[]).find(row=>row.player_id===p.id&&row.award_id===a.id)?.completed||0:0;
    return {percent:Math.floor(Math.min(1,completed/a.threshold)*100),label:`${Math.min(completed,a.threshold)} / ${a.threshold}`,note:''};
  }
  if(!p) return {percent:0,label:a.kind==='comeback'?'Вернуться к 1000':`${a.kind==='up'?'Достичь':'Опуститься до'} ${a.threshold}`,note:'Прогресс появится в профиле'};
  let fraction=0,note='';
  if(a.kind==='up') {fraction=(p.rating-1000)/(a.threshold-1000);note=`До открытия — ${points(Math.max(0,a.threshold-p.rating))}`;}
  if(a.kind==='down') {fraction=(1000-p.rating)/(1000-a.threshold);note=`До открытия — ${points(Math.max(0,p.rating-a.threshold))} вниз`;}
  if(a.kind==='comeback') {
    if(p.min_rating>=1000)return {percent:0,label:`${p.rating} / 1000 Elo`,note:''};
    fraction=(p.rating-p.min_rating)/(1000-p.min_rating);note=`До реабилитации — ${points(Math.max(0,1000-p.rating))}`;
  }
  return {percent:Math.floor(Math.max(0,Math.min(1,fraction))*100),label:`${p.rating} / ${a.threshold} Elo`,note};
}
function awardCard(a,p) {
  const earned=p?earnedFor(p.id).find(e=>e.award_id===a.id):null;
  const progress=progressFor(a,p,earned);
  if(!earned) {
    const label=p?progress.label:matchAchievementKinds.includes(a.kind)?`0 / ${a.threshold}`:`${a.threshold} Elo`;
    return `<article class="award-card locked ${a.kind}"><div class="award-content"><div class="progress-block"><div class="progress-info"><span>${esc(label)}</span><strong>${progress.percent}%</strong></div><progress max="100" value="${progress.percent}" aria-label="Прогресс закрытой награды"></progress></div></div></article>`;
  }
  const x=(a.art%4)/3*100,y=Math.floor(a.art/4)/3*100;
  const specialBadges={'match-comeback':'КАМБЭК · 0:2 → 3:2',upset:'ПОБЕДА · +200 ELO','win-streak':'СЕРИЯ · 5 ПОБЕД','long-set':'ПАРТИЯ · 16:14',revenge:'РЕВАНШ','distinct-rivals':'10 СОПЕРНИКОВ','match-count':'50 МАТЧЕЙ','zero-comeback':'КАМБЭК · ПОСЛЕ 0:11','first-match':'ПЕРВАЯ ИГРА','loss-comeback':'ПОСЛЕ 5 ПОРАЖЕНИЙ','daily-rivals':'ТРОЕ ЗА ДЕНЬ','close-match':'3:2 · НА ТОНЕНЬКОГО','alternating-match':'В–П–В–П–В','fewer-points':'ПОБЕДА ВОПРЕКИ ОЧКАМ','personal-matches':'20 ЛИЧНЫХ ВСТРЕЧ','leader-win':'ПОБЕДА НАД ЛИДЕРОМ'};
  const badge=a.kind==='up'?`↑ ${a.threshold} Elo`:a.kind==='down'?`↓ ${a.threshold} Elo`:specialBadges[a.kind]|| (a.kind==='top-three'?'ОСОБОЕ · ТОП-3':a.kind==='clean-set'?'ОСОБОЕ · 11:0':a.kind==='rival-wins'?'ОСОБОЕ · СОПЕРНИК':'ОСОБОЕ · ВОЗВРАЩЕНИЕ');
  const obtained=earned.obtained;
  const details=`<div class="award-earned-info"><span class="eyebrow">Как получена</span><p>${esc(a.condition||'')}</p>${obtained?`<p class="award-earned-detail">${esc(obtained.description)}</p><button class="text-button award-match-link" data-action="award-match" data-id="${obtained.match_id}">Посмотреть игру →</button>`:''}</div>`;
  return `<article id="${esc(awardCardId(p.id,a.id))}" tabindex="-1" class="award-card ${a.kind} ${earned?'earned':'locked'}"><div class="award-art" role="img" aria-label="Иллюстрация: ${esc(a.character||a.title)}" style="${a.image?`background-image:url('${esc(a.image)}');background-size:cover;background-position:center;`:`--art-x:${x}%;--art-y:${y}%`}"></div><div class="award-content"><div class="award-tag"><span>${badge}</span><span class="${earned?'earned-badge':''}">${earned?'✓ Получено':'Закрыто'}</span></div>${a.character?`<p class="award-character">${esc(a.character)}</p>`:''}<h3 class="award-name">${esc(a.title)}</h3><p class="award-caption">«${esc(a.caption)}»</p>${details}<div class="progress-block"><div class="progress-info"><span>${progress.label}</span><strong>${progress.percent}%</strong></div><progress max="100" value="${progress.percent}" aria-label="Прогресс награды ${esc(a.title)}"></progress><p class="progress-note">${esc(progress.note)}</p></div>${earned&&p&&canEditProfile(p.id)?`<button class="button small ghost" data-action="main-award" data-player="${p.id}" data-award="${a.id}">${p.main_award===a.id?'★ Главный трофей':'Сделать главным'}</button>`:''}</div></article>`;
}
function collections(p) {
  const groups=[['up','Обитатели верхнего стола','За рост рейтинга'],['down','Попущенные Зазеркалья','За падение ниже 1000'],['comeback','Условная реабилитация','Особое достижение'],[matchAchievementKinds,'Особые подвиги','За результаты матчей']];
  return groups.map(([kind,title,subtitle])=>{const awards=state.awards.filter(a=>Array.isArray(kind)?kind.includes(a.kind):a.kind===kind).sort((a,b)=>kind==='down'?b.threshold-a.threshold:a.threshold-b.threshold);return `<section><div class="collection-title"><h2>${title}</h2><span>${subtitle}</span></div><div class="awards-grid">${awards.map(a=>awardCard(a,p)).join('')}</div></section>`;}).join('');
}
function eloSeries(p,matches) {
  const ordered=matches.filter(m=>m.player_a===p.id||m.player_b===p.id)
    .slice().sort((a,b)=>a.played_at.localeCompare(b.played_at)||a.id-b.id);
  return [{game:0,rating:state.config?.start||1000,delta:0,date:null,opponent:null},
    ...ordered.map((m,i)=>({game:i+1,rating:m.player_a===p.id?m.after_a:m.after_b,
      delta:m.player_a===p.id?m.delta_a:-m.delta_a,date:m.played_at,
      opponent:m.player_a===p.id?m.name_b:m.name_a}))];
}
function eloPointText(point) {
  return point.game===0?'До первого матча · 1000 Elo':`Матч ${point.game} · ${fmtDate(point.date)} · ${point.rating} Elo (${signed(point.delta)}) · vs ${point.opponent}`;
}
function eloChart(p,matches) {
  const series=eloSeries(p,matches),last=series.at(-1),count=series.length-1;
  const ratings=series.map(point=>point.rating),min=Math.min(...ratings),max=Math.max(...ratings);
  const span=Math.max(80,max-min),step=[20,25,50,100,200,500,1000].find(n=>n>=span/4)||Math.ceil(span/4/1000)*1000;
  let lower=Math.floor(min/step)*step,upper=Math.ceil(max/step)*step;
  if(upper-lower<step*2){lower-=step;upper+=step;}
  const y=rating=>(upper-rating)/(upper-lower)*260,x=game=>count?game/count*1000:0;
  const points=series.map(point=>`${x(point.game).toFixed(2)},${y(point.rating).toFixed(2)}`).join(' ');
  const area=`0,260 ${points} ${x(count)},260`;
  const ticks=[];for(let tick=upper;tick>=lower;tick-=step)ticks.push(tick);
  const xTicks=[...new Set(Array.from({length:Math.min(count,4)+1},(_,i)=>Math.round(i*count/Math.max(1,Math.min(count,4)))))];
  return `<section class="panel elo-chart" aria-labelledby="elo-chart-title" data-points="${esc(JSON.stringify(series))}" data-lower="${lower}" data-upper="${upper}"><div class="panel-head"><h2 id="elo-chart-title">Динамика Elo</h2><span class="meta">${count} матчей</span></div><div class="elo-body"><div class="elo-legend"><span><i class="elo-line-key"></i>Рейтинг Elo</span><span><i class="elo-baseline-key"></i>Старт · 1000</span></div><div class="elo-axes"><div class="elo-y-axis" aria-hidden="true">${ticks.map(tick=>`<span style="top:${y(tick)/260*100}%">${tick}</span>`).join('')}</div><div class="elo-plot"><svg class="elo-svg" viewBox="0 0 1000 260" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="elo-fill-${p.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#cbef8a" stop-opacity=".2"/><stop offset="100%" stop-color="#cbef8a" stop-opacity="0"/></linearGradient></defs>${ticks.map(tick=>`<line class="elo-grid" x1="0" x2="1000" y1="${y(tick)}" y2="${y(tick)}"/>`).join('')}<line class="elo-baseline" x1="0" x2="1000" y1="${y(1000)}" y2="${y(1000)}"/>${count?`<polygon points="${area}" fill="url(#elo-fill-${p.id})"/><polyline class="elo-line" points="${points}"/>`:''}<line class="elo-cursor" x1="${x(last.game)}" x2="${x(last.game)}" y1="0" y2="260"/><circle class="elo-dot" cx="${x(last.game)}" cy="${y(last.rating)}" r="5" vector-effect="non-scaling-stroke"/></svg><div class="elo-x-axis" aria-hidden="true">${xTicks.map(game=>`<span style="left:${count?game/count*100:0}%;transform:translateX(${game===0?'0':game===count?'-100':'-50'}%)">${game}</span>`).join('')}</div></div></div><div class="elo-axis-label">Сыграно матчей</div><label class="elo-slider-label" for="elo-game-${p.id}">Выберите матч на графике</label><input class="elo-slider" id="elo-game-${p.id}" type="range" min="0" max="${count}" step="1" value="${count}" aria-valuetext="${esc(eloPointText(last))}" ${!count?'disabled':''}><output class="elo-readout" for="elo-game-${p.id}" aria-live="polite">${esc(eloPointText(last))}</output>${!count?'<p class="form-help">После первой игры здесь появится изменение рейтинга.</p>':''}</div></section>`;
}
function selectEloGame(chart,index) {
  const series=JSON.parse(chart.dataset.points),game=Math.max(0,Math.min(series.length-1,index)),point=series[game];
  const slider=chart.querySelector('.elo-slider');
  slider.value=game;slider.setAttribute('aria-valuetext',eloPointText(point));
  chart.querySelector('.elo-readout').textContent=eloPointText(point);
  const x=series.length>1?game/(series.length-1)*1000:0;
  const y=(Number(chart.dataset.upper)-point.rating)/(Number(chart.dataset.upper)-Number(chart.dataset.lower))*260;
  const cursor=chart.querySelector('.elo-cursor');cursor.setAttribute('x1',x);cursor.setAttribute('x2',x);
  const dot=chart.querySelector('.elo-dot');dot.setAttribute('cx',x);dot.setAttribute('cy',y);
}
document.addEventListener('input',event=>{if(event.target.matches('.elo-slider'))selectEloGame(event.target.closest('.elo-chart'),Number(event.target.value));});
function pointFromPointer(event) {
  const plot=event.target.closest('.elo-plot');if(!plot)return;
  const chart=plot.closest('.elo-chart'),box=plot.getBoundingClientRect(),count=Number(chart.querySelector('.elo-slider').max);
  selectEloGame(chart,Math.round((event.clientX-box.left)/Math.max(1,box.width)*count));
}
document.addEventListener('pointerdown',pointFromPointer);
document.addEventListener('pointermove',event=>{if(event.pointerType==='mouse'||event.buttons===1)pointFromPointer(event);});
function profilePage(id) {
  const p=player(id);if(!p)return empty('Игрок не найден','Вернитесь в таблицу друзей.','<a class="button" href="#table">К таблице</a>');
  const matches=state.matches.filter(m=>m.player_a===id||m.player_b===id),earned=earnedFor(id),main=state.awards.find(a=>a.id===p.main_award);
  const h2h=new Map();
  for(const m of matches){const other=m.player_a===id?m.player_b:m.player_a;let row=h2h.get(other)||{id:other,wins:0,losses:0};row[m.winner_id===id?'wins':'losses']++;h2h.set(other,row);}
  return `<a class="back" href="#table">← Таблица друзей</a><div class="profile-header ${podiumClass(p)}">${playerAvatar(p,true)}<div><div class="eyebrow">${podiumRank(p)<=3?`${podiumRank(p)}-е место в рейтинге`:"Личное дело обитателя"}</div><h1>${esc(p.name)}</h1>${podiumRank(p)===1?leaderTenure(p):''}<div class="rating-pill">${p.rating}<small>Elo</small></div></div><div class="profile-main-award"><small>Главный трофей</small><strong>${main?esc(main.title):'Пока не назначен'}</strong></div></div>${stats([['Матчей / победы',`${matches.length} / ${p.wins}`],['Процент побед',`${matches.length?Math.round(p.wins/matches.length*100):0}%`],['Рекорд Elo',p.max_rating],['Набрано / пропущено',pointStats(id,matches)]],'profile-stats')}${socialPanel(p)}${eloChart(p,matches)}<div class="collection-title"><h2>Полка трофеев</h2><span>${earned.length} из ${state.awards.length} открыто</span></div><p class="section-note">Полученные награды сохраняются после новых игр. Исправление истории пересчитывает достижения. Прогресс закрытых карточек зависит от рейтинга и результатов матчей.</p>${collections(p)}<div class="collection-title"><h2>Личные встречи</h2><span>Победы / поражения</span></div>${h2h.size?`<div class="h2h-grid">${[...h2h.values()].map(r=>`<a href="#player/${r.id}" class="h2h-item"><span>${esc(player(r.id).name)}</span><strong><span class="positive">${r.wins}</span> / ${r.losses}</strong></a>`).join('')}</div>`:'<p class="section-note">После первого матча здесь появятся ваши соперники.</p>'}<section class="panel recent"><div class="panel-head"><h2>Матчи игрока</h2><span class="meta">Минимум: ${p.min_rating} Elo</span></div>${matches.length?matches.map(m=>matchRow(m,true,id)).join(''):empty('Летопись пока пуста','Пора сыграть первый матч.')}</section>`;
}
function localDatetime(date) {const d=new Date(date);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
function setRow(index,values=['','']) {return `<div class="set-row"><span>Партия ${index}</span><input type="number" min="0" max="100" step="1" required value="${values[0]}" aria-label="Очки первого игрока в партии ${index}"><span>:</span><input type="number" min="0" max="100" step="1" required value="${values[1]}" aria-label="Очки второго игрока в партии ${index}"><button class="close" type="button" data-action="remove-set" aria-label="Убрать партию ${index}">×</button></div>`;}
function renumberSets(){document.querySelectorAll('#sets .set-row').forEach((row,i)=>{row.querySelector('span').textContent=`Партия ${i+1}`;const inputs=row.querySelectorAll('input');inputs[0].setAttribute('aria-label',`Очки первого игрока в партии ${i+1}`);inputs[1].setAttribute('aria-label',`Очки второго игрока в партии ${i+1}`);row.querySelector('button').setAttribute('aria-label',`Убрать партию ${i+1}`);});}
function addSet() {const form=document.getElementById('match-form'),list=form.querySelector('#sets'),best=Number(form.elements.best_of.value);if(list.children.length>=best){form.querySelector('.form-error').textContent='Максимальное число партий для выбранного формата уже добавлено.';return;}list.insertAdjacentHTML('beforeend',setRow(list.children.length+1));renumberSets();form.querySelector('.form-error').textContent='';}
function newMatch(id,proposal=false) {
  if(!currentUser()){loginDialog();return;}
  if(id&&!admin()){notify('Исправлять матчи может администратор.',true);return;}
  const candidates=matchPlayers();
  if(candidates.length<2){notify('Нужен ещё один участник.');return;}
  const m=id?(proposal?state.proposals:state.matches).find(m=>m.id===id):null;
  if(id&&!m){notify('Матч не найден.',true);return;}
  const options=selected=>candidates.map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${esc(p.name)} · ${p.rating}</option>`).join('');
  modal(m?'Исправить матч':'Записать матч',`<form id="match-form" data-id="${id||''}" data-proposal="${proposal}"><div class="form-grid"><label class="field">Первый игрок<select name="player_a">${options(m?m.player_a:currentUser().player_id)}</select></label><label class="field">Второй игрок<select name="player_b">${options(m?m.player_b:candidates.find(p=>p.id!==currentUser().player_id).id)}</select></label></div><div class="form-grid"><label class="field">Формат<select name="best_of">${[[1,'Одна партия'],[3,'До 2 побед'],[5,'До 3 побед'],[7,'До 4 побед']].map(([v,t])=>`<option value="${v}" ${(m?m.best_of:1)===v?'selected':''}>${t}</option>`).join('')}</select></label><label class="field">Когда играли<input name="played_at" type="datetime-local" value="${localDatetime(m?m.played_at:new Date())}" required max="${localDatetime(new Date(Date.now()+60000))}"></label></div><label class="field" style="margin-bottom:6px">Счёт по партиям</label><div id="sets">${(m?m.sets:[['','']]).map((s,i)=>setRow(i+1,s)).join('')}</div><button type="button" class="button small ghost" data-action="add-set">＋ Ещё партия</button><p class="form-help">До 11 очков. При 10:10 — до разницы в два. Рейтинг начисляется после подтверждения результата.</p>${m?'<label class="field">Причина исправления<textarea name="reason" required minlength="3" maxlength="300" rows="2"></textarea></label>':trusted()?'<label class="checkbox-field"><input type="checkbox" name="observed"> Я присутствовал при игре — подтвердить сразу</label>':'<p class="form-help">Счёт подтвердит соперник. Первую игру новичка подтверждает организатор.</p>'}<p class="form-error" role="alert"></p><div class="form-footer">${m&&!proposal?`<button type="button" class="button danger ghost" data-action="delete-match" data-id="${m.id}">Удалить</button>`:'<button type="button" class="button ghost" data-action="close">Отмена</button>'}<button class="button primary">${proposal?'Сохранить и подтвердить':m?'Сохранить изменения':'Сохранить матч'}</button></div></form>`);
}
document.addEventListener('change',event=>{if(event.target.name!=='best_of')return;const form=event.target.form,best=Number(event.target.value),list=form.querySelector('#sets');while(list.children.length>best)list.lastElementChild.remove();});
document.addEventListener('submit',async event=>{
  if(event.target.id==='match-form'){
    event.preventDefault();const form=event.target;
    await submitForm(form,async()=>{
      const data=new FormData(form),id=form.dataset.id;
      const existing=id?(form.dataset.proposal==='true'?state.proposals:state.matches).find(m=>m.id===Number(id)):null,chosenDate=String(data.get('played_at'));
      const playedAt=existing&&localDatetime(existing.played_at)===chosenDate?existing.played_at:new Date(chosenDate).toISOString();
      const input={reason:String(data.get('reason')||''),observed:form.elements.observed?.checked===true,player_a:Number(data.get('player_a')),player_b:Number(data.get('player_b')),best_of:Number(data.get('best_of')),played_at:playedAt,sets:[...form.querySelectorAll('.set-row')].map(row=>[...row.querySelectorAll('input')].map(i=>Number(i.value)))};
      const before=new Set(state.earned.map(e=>`${e.player_id}/${e.award_id}`));
      await mutate(form.dataset.proposal==='true'?`/api/proposals/${id}`:`/api/matches${id?'/'+id:''}`,id?'PUT':'POST',input);
      const unlocked=state.earned.filter(e=>!before.has(`${e.player_id}/${e.award_id}`));
      notify(unlocked.length?`Матч сохранён. Открыто трофеев: ${unlocked.length}!`:id?'Матч исправлен. Рейтинг пересчитан.':trusted()&&input.observed?'Матч подтверждён. Рейтинг обновлён.':'Результат отправлен на подтверждение.');
    });
  }
  if(event.target.id==='socials-form'){
    event.preventDefault();const form=event.target;
    await submitForm(form,async()=>{const data=new FormData(form),socials=Object.fromEntries(socialServices.map(([key])=>[key,String(data.get(key)||'')]));await mutate(`/api/players/${form.dataset.player}/socials`,'PUT',{socials,public:form.elements.public.checked});notify('Соцсети сохранены. Можно договариваться об игре.');});
  }
  if(event.target.id==='awards-form'){
    event.preventDefault();const form=event.target;
    await submitForm(form,async()=>{const awards=[...form.querySelectorAll('.edit-award')].map(row=>({id:row.dataset.id,title:row.querySelector('[name="title"]').value,caption:row.querySelector('[name="caption"]').value,threshold:Number(row.querySelector('[name="threshold"]').value)}));await mutate('/api/awards','PUT',{awards});notify('Награды обновлены по истории матчей.');});
  }
});
function deletePrompt(id) {const m=state.matches.find(m=>m.id===id);dialog.close();modal('Удалить этот матч?',`<p>${esc(m.name_a)} — ${esc(m.name_b)} · ${fmtDate(m.played_at,true)}</p><p class="form-help">Результат будет удалён из истории. Рейтинг и награды пересчитаются без этого матча.</p><label class="field">Причина удаления<textarea id="delete-reason" minlength="3" maxlength="300" rows="2"></textarea></label><p class="form-error" role="alert"></p><div class="form-footer"><button class="button ghost" data-action="close">Отмена</button><button class="button danger" data-action="confirm-delete" data-id="${id}">Удалить матч</button></div>`);}
async function removeMatch(id) {const button=dialog.querySelector('[data-action="confirm-delete"]');button.disabled=true;try{await mutate(`/api/matches/${id}`,'DELETE',{reason:dialog.querySelector('#delete-reason').value});dialog.close();notify('Матч удалён. История пересчитана.');}catch(error){dialog.querySelector('.form-error').textContent=error.message;button.disabled=false;}}
function settings() {modal('Настроить награды',`<form id="awards-form"><p class="form-help">Настройки организатора: здесь видны все названия. Сохранение пересчитает награды по истории. Особые условия фиксированы.</p>${state.awards.map(a=>`<section class="edit-award" data-id="${a.id}"><div class="eyebrow">${a.kind==='up'?'За рост':a.kind==='down'?'За снижение':a.kind==='top-three'?'За победы 3:0 над топ-3':a.kind==='clean-set'?'За партию 11:0':a.kind==='rival-wins'?'За 5 побед над одним соперником':matchAchievementKinds.includes(a.kind)?esc(a.condition):'За возвращение'}</div><div class="form-grid"><label class="field">Название<input name="title" value="${esc(a.title)}" maxlength="80" required></label><label class="field">${a.kind==='top-three'?'Соперников':a.kind==='clean-set'?'Партий 11:0':a.kind==='rival-wins'?'Побед над соперником':matchAchievementKinds.includes(a.kind)?'Условие фиксировано':'Порог Elo'}<input name="threshold" type="number" value="${a.threshold}" min="${a.kind==='up'?1001:0}" max="${a.kind==='down'?999:5000}" ${['comeback',...matchAchievementKinds].includes(a.kind)?'readonly':''} required></label></div><label class="field">Подпись<input name="caption" value="${esc(a.caption)}" maxlength="180"></label></section>`).join('')}<p class="form-error" role="alert"></p><div class="form-footer"><button class="button ghost" type="button" data-action="close">Отмена</button><button class="button primary">Сохранить награды</button></div></form>`,'settings-dialog');}
async function chooseMain(id,award) {try{await mutate(`/api/players/${id}/main-award`,'PUT',{award_id:award});notify('Главный трофей выбран.');}catch(error){notify(error.message,true);}}
if(document.modelContext?.registerTool){
  const tools=[
    {name:'read_pingpong_stats',title:'Статистика клуба',description:'Read the current local players, match history and earned trophies.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:async()=>{await load();return state;}},
    {name:'create_pingpong_players',title:'Добавить игроков',description:'Create players in this local club and update the visible table. Each starts at 1000 Elo.',inputSchema:{type:'object',properties:{names:{type:'array',items:{type:'string'},minItems:1,maxItems:20}},required:['names'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!input||!Array.isArray(input.names)||!input.names.length||input.names.length>20||input.names.some(n=>typeof n!=='string'||!n.trim()||n.length>32))throw new Error('Передайте от 1 до 20 корректных имён.');const ids=[];for(const name of input.names){const result=await mutate('/api/players','POST',{name});ids.push(result.id);}return {ids};}},
    {name:'create_pingpong_match',title:'Записать матч',description:'Submit a completed table-tennis match for confirmation; Elo and trophies change only after an authorized confirmation.',inputSchema:{type:'object',properties:{player_a:{type:'integer'},player_b:{type:'integer'},best_of:{type:'integer',enum:[1,3,5,7]},sets:{type:'array',items:{type:'array',items:{type:'integer'},minItems:2,maxItems:2}},played_at:{type:'string'}},required:['player_a','player_b','best_of','sets','played_at'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{const result=await mutate('/api/matches','POST',input);return {id:result.id,players:state.players.map(({id,name,rating})=>({id,name,rating}))};}},
  ];
  for(const tool of tools)try{Promise.resolve(document.modelContext.registerTool(tool)).catch(console.warn);}catch(error){console.warn(error);}
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;if(action==='close')dialog.close();else if(action==='show-award'&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){dialog.close();if(location.hash===button.getAttribute('href')){event.preventDefault();render();}}else if(action==='new-player')newPlayer();else if(action==='reload')load();else if(action==='new-match')newMatch();else if(action==='edit-match')newMatch(Number(button.dataset.id));else if(action==='add-set')addSet();else if(action==='remove-set'){button.closest('.set-row').remove();renumberSets();}else if(action==='delete-match')deletePrompt(Number(button.dataset.id));else if(action==='confirm-delete')removeMatch(Number(button.dataset.id));else if(action==='settings')settings();else if(action==='edit-socials')editSocials(Number(button.dataset.player));else if(action==='main-award')chooseMain(Number(button.dataset.player),button.dataset.award);});
document.addEventListener('submit',async event=>{if(event.target.id!=='player-form')return;event.preventDefault();await submitForm(event.target,async()=>{await mutate('/api/players','POST',{name:new FormData(event.target).get('name')});notify('Друг добавлен. Допуск к столу оформлен.');});});
async function mutate(path,method,body) {const result=await api(path,method,body);state=result.state;render();return result;}
async function submitForm(form,fn) {const submit=form.querySelector('button:not([type="button"])');submit.disabled=true;form.querySelector('.form-error').textContent='';try{await fn();dialog.close();}catch(error){form.querySelector('.form-error').textContent=error.message;}finally{submit.disabled=false;}}
window.addEventListener('hashchange',()=>{if(!render())window.scrollTo(0,0);});
load();
