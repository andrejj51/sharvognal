'use strict';
let communityTab='pending';
const currentUser=()=>state?.auth?.user;
const admin=()=>currentUser()?.role==='admin';
const trusted=()=>['admin','trusted'].includes(currentUser()?.role);
const canEditProfile=id=>!!currentUser()&&(admin()||currentUser().player_id===id);
const matchPlayers=()=>[...state.players,...(state.newcomers||[])].filter(p=>!p.blocked);
const roleName=role=>({admin:'Администратор',trusted:'Доверенный игрок',player:'Игрок'}[role]||role);
const authFooter=label=>`<p class="form-error" role="alert"></p><div class="form-footer"><button class="button ghost" type="button" data-action="close">Отмена</button><button class="button primary">${label}</button></div>`;
function authFields() {return `<label class="field">Логин<input name="login" required minlength="3" maxlength="32" pattern="[A-Za-z0-9_]{3,32}" autocomplete="username" placeholder="Например, lesha_ping"></label><label class="field">Пароль<input type="password" name="password" required minlength="6" maxlength="128" autocomplete="new-password"><small>От 6 символов</small></label>`;}
function loginDialog() {
  modal('Войти в клуб',`<form id="login-form"><label class="field">Логин<input name="login" required maxlength="32" autocomplete="username" autofocus></label><label class="field">Пароль<input type="password" name="password" required maxlength="128" autocomplete="current-password"></label><p class="form-help">Забыли пароль? Организатор может задать вам новый.</p>${authFooter('Войти')}</form>`);
}
function setupDialog() {
  const options=state.players.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  modal('Настроить клуб',`<form id="setup-form"><p class="form-help">Создайте свой аккаунт администратора. Можно подключить существующий профиль со всей его статистикой.</p><label class="field">Код первой настройки<input name="setup_key" required autocomplete="off"><small>Код находится в файле ADMIN-SETUP.txt в папке сайта.</small></label><label class="field">Ваш профиль<select name="player_id"><option value="0">Создать новый профиль</option>${options}</select></label><label class="field">Имя для нового профиля<input name="name" maxlength="32" placeholder="Не нужно, если выбран существующий профиль"></label>${authFields()}${authFooter('Создать администратора')}</form>`);
}
function joinPage() {
  if(state.auth.setup_required) return empty('Клуб ещё не настроен','Организатору нужно создать аккаунт администратора.','<button class="button primary" data-action="setup-club">Настроить клуб</button>');
  if(currentUser()) return `<div class="page-head"><div><div class="eyebrow">Вы уже в клубе</div><h1>До встречи у стола</h1><p>Запишите свою игру или пригласите нового соперника.</p></div><a class="button primary" href="#player/${currentUser().player_id}">Мой профиль</a></div>${invitationPanel()}`;
  if(!state.meeting.open) return `<div class="page-head"><div><div class="eyebrow">Парк · пинг-понг · друзья</div><h1>Присоединиться</h1><p>Вступление откроется на время следующей встречи.</p></div></div>${empty('Сейчас регистрация закрыта','Если вы уже играете с нами, войдите в свой аккаунт.','<button class="button primary" data-action="login">Войти</button>')}`;
  return `<div class="page-head"><div><div class="eyebrow">Место у стола найдётся</div><h1>Присоединиться к клубу</h1><p>Начните с 1000 Elo. Первый матч подтвердит организатор.</p></div></div><section class="panel join-panel"><form id="join-form"><label class="field">Имя у стола<input name="name" required maxlength="32" autocomplete="nickname" placeholder="Как вас зовут?" autofocus></label>${authFields()}<p class="form-help">Регистрация открыта до ${fmtDate(state.meeting.join_until,true)}. Сразу после регистрации вы появитесь в таблице друзей. Место в рейтинге появится после первой подтверждённой игры.</p><p class="form-error" role="alert"></p><button class="button primary">Занять место у стола</button><p class="form-help">Уже есть аккаунт? <button type="button" class="text-button" data-action="login">Войти</button></p></form></section>`;
}
function qrSvg(text) {
  const qr=qrcodegen.QrCode.encodeText(text,qrcodegen.QrCode.Ecc.MEDIUM),size=qr.size+8,parts=[];
  for(let y=0;y<qr.size;y++) for(let x=0;x<qr.size;x++) if(qr.getModule(x,y)) parts.push(`M${x+4},${y+4}h1v1h-1z`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="QR-код приглашения в клуб" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="white"/><path d="${parts.join('')}" fill="#101910"/></svg>`;
}
const inviteUrl=()=>`${state.meeting.public_url||location.origin}/#join`;
function invitationPanel() {
  if(!state.meeting.open) return '';
  const url=inviteUrl(),local=/^(localhost|127\.0\.0\.1)$/.test(new URL(url).hostname);
  return `<section class="panel invite-panel"><div class="invite-qr">${qrSvg(url)}</div><div><div class="eyebrow">Новый соперник? Покажите код</div><h2>Вступить в Зазеркалье</h2><p>Регистрация открыта до ${fmtDate(state.meeting.join_until,true)}.</p><p class="invite-url">${esc(url)}</p>${local?'<p class="form-help">Сейчас код ведёт на локальный адрес этого компьютера. Для телефонов нужен общий доступный адрес клуба.</p>':''}<button class="button small ghost" data-action="copy-invite">Скопировать ссылку</button> <button class="button small ghost" data-action="download-qr">Скачать QR</button></div></section>`;
}
function proposalCard(p) {
  const u=currentUser(),participant=[p.player_a,p.player_b].includes(u.player_id),newcomer=[p.player_a,p.player_b].some(id=>state.newcomers.some(n=>n.id===id));
  const canConfirm=p.status==='disputed'?admin():trusted()||(participant&&p.submitted_by!==u.id&&!newcomer);
  return `<article class="proposal-card"><div class="proposal-meta"><span class="status-tag ${p.status}">${p.status==='disputed'?'Спор':newcomer?'Первая игра новичка':'Ожидает подтверждения'}</span><span class="meta">${fmtDate(p.played_at,true)}</span></div><h3><a href="#player/${p.player_a}">${esc(p.name_a)}</a> <span class="meta">vs</span> <a href="#player/${p.player_b}">${esc(p.name_b)}</a></h3><p class="set-scores">${p.sets.map(s=>s.join(':')).join(' · ')}</p><p class="meta">Записал: ${esc(p.submitter)}</p>${p.dispute_reason?`<p class="dispute-text">Причина спора: ${esc(p.dispute_reason)}</p>`:''}${p.match_id?'<p class="form-help">Матч уже учтён в рейтинге. Изменения вступят в силу после решения администратора.</p>':'<p class="form-help">Elo и награды пока не начислены.</p>'}<div class="community-actions">${canConfirm?`<button class="button small primary" data-action="proposal-decision" data-id="${p.id}" data-decision="confirm">${p.status==='disputed'?'Оставить результат':'Подтвердить'}</button>`:''}${participant&&p.submitted_by!==u.id&&p.status==='pending'?`<button class="button small ghost" data-action="proposal-decision" data-id="${p.id}" data-decision="dispute">Оспорить</button>`:''}${p.submitted_by===u.id&&p.status==='pending'?`<button class="button small ghost" data-action="proposal-decision" data-id="${p.id}" data-decision="withdraw">Отозвать</button>`:''}${admin()?`<button class="button small danger ghost" data-action="proposal-decision" data-id="${p.id}" data-decision="reject">${p.match_id?'Отменить матч':'Отклонить'}</button>`:''}${admin()?`<button class="button small ghost" data-action="${p.match_id?'edit-match':'edit-proposal'}" data-id="${p.match_id||p.id}">Исправить счёт</button>`:''}</div>${newcomer&&!trusted()?'<p class="form-help">Попросите администратора или доверенного игрока подтвердить первую игру.</p>':''}</article>`;
}
const auditNames={'setup':'Настройка клуба','join':'Регистрация','submit':'Записан результат','confirm':'Подтверждён результат','reject':'Отклонён результат','dispute':'Оспорен результат','withdraw':'Отозвана заявка','dispute-match':'Оспорен матч','delete-match':'Удалён матч','edit-match':'Исправлен матч','meeting':'Вступление','account':'Настройки аккаунта','socials':'Настройки соцсетей','add-player':'Добавлен игрок','create-account':'Выдан доступ','awards':'Настройки наград'};
auditNames['edit-proposal']='Исправлена заявка';
function auditSnapshot(value) {
  if(!value) return '—';
  if(value.sets) {const sets=typeof value.sets==='string'?JSON.parse(value.sets):value.sets;return `${player(value.player_a)?.name||value.player_a} — ${player(value.player_b)?.name||value.player_b}: ${sets.map(s=>s.join(':')).join(' · ')}`;}
  if(value.role) return `${value.login||''} · ${roleName(value.role)}${value.blocked?' · Заблокирован':''}`;
  if(value.status) return ({pending:'Ожидает',disputed:'Спор',confirmed:'Подтверждён',rejected:'Отклонён',withdrawn:'Отозван'}[value.status]||value.status);
  if(value.join_until!==undefined) return value.join_until?`Открыто до ${fmtDate(value.join_until,true)}`:'Закрыто';
  if(Array.isArray(value)) return `${value.length} наград`;
  return value.name||'Обновлено';
}
function journal() {return state.audit.length?`<section class="panel audit-list">${state.audit.map(t=>`<article class="audit-row"><div><strong>${auditNames[t.action]||esc(t.action)}</strong><span class="meta">${esc(t.actor)} · ${fmtDate(t.created_at,true)} · №${esc(t.target)}</span></div><p>${esc(t.reason)}</p>${t.before||t.after?`<p class="audit-change"><span>${esc(auditSnapshot(t.before))}</span> → <span>${esc(auditSnapshot(t.after))}</span></p>`:''}</article>`).join('')}</section>`:empty('Журнал пока пуст','Здесь появятся подтверждения и изменения.');}
function accountsPanel() {
  return `<section class="panel"><div class="panel-head"><h2>Участники и права</h2><button class="button small ghost" data-action="create-account" ${state.unclaimed.length?'':'disabled'}>Выдать доступ</button></div>${state.accounts.map(a=>`<div class="account-row"><div><strong>${esc(a.name)}</strong><small>${esc(a.login)} · ${roleName(a.role)}${a.blocked?' · Заблокирован':''}</small></div>${a.role!=='admin'?`<button class="button small ghost" data-action="manage-account" data-id="${a.id}">Настроить</button>`:'<span class="status-tag">Владелец клуба</span>'}</div>`).join('')}</section>`;
}
function meetingPanel() {
  return `<section class="panel meeting-panel"><div class="panel-head"><h2>Встреча в парке</h2><span class="status-tag">${state.meeting.open?'Вступление открыто':'Вступление закрыто'}</span></div><form id="meeting-form"><label class="field">Открыть регистрацию<select name="hours"><option value="0">Закрыть вступление</option>${[1,3,6,12,24].map(n=>`<option value="${n}" ${n===3?'selected':''}>На ${n} ${n===1?'час':n===3?'часа':'часов'}</option>`).join('')}</select></label><label class="field">Адрес клуба для приглашений<input name="public_url" value="${esc(state.meeting.public_url)}" maxlength="200" placeholder="https://адрес-клуба"><small>Оставьте пустым, чтобы использовать текущий адрес сайта.</small></label>${state.meeting.open?`<p class="form-help">Открыто до ${fmtDate(state.meeting.join_until,true)}. Сохранение начнёт новый отсчёт.</p>`:''}<p class="form-error" role="alert"></p><button class="button primary">Сохранить</button></form></section>${invitationPanel()}`;
}
function moderationPage() {
  if(!currentUser()) return empty('Войдите в клуб','Подтверждение результатов доступно участникам.','<button class="button primary" data-action="login">Войти</button>');
  const tabs=[['pending','Ожидают подтверждения'],['disputed','Споры'],...(trusted()?[['journal','Журнал']]:[]),...(admin()?[['accounts','Участники'],['meeting','Встреча и QR']]:[])];
  if(!tabs.some(([id])=>id===communityTab)) communityTab='pending';
  const list=state.proposals.filter(p=>p.status===communityTab);
  const content=communityTab==='journal'?journal():communityTab==='accounts'?accountsPanel():communityTab==='meeting'?meetingPanel():list.length?`<div class="proposal-grid">${list.map(proposalCard).join('')}</div>`:empty(communityTab==='disputed'?'Споров нет':'Все результаты рассмотрены',communityTab==='disputed'?'Если счёт вызывает вопросы, оспорьте его в истории матчей.':'Новые заявки появятся после записи матча.');
  return `<div class="page-head"><div><div class="eyebrow">${roleName(currentUser().role)}</div><h1>${trusted()?'Модерация':'Подтверждение матчей'}</h1><p>Результаты учитываются после подтверждения. Первую игру новичка проверяет организатор.</p></div><button class="button ghost" data-action="reload">Обновить</button></div><div class="community-tabs" role="group" aria-label="Разделы модерации">${tabs.map(([id,label])=>`<button class="button small ${communityTab===id?'primary':'ghost'}" data-action="community-tab" data-tab="${id}">${label}${['pending','disputed'].includes(id)?` <span>${state.proposals.filter(p=>p.status===id).length}</span>`:''}</button>`).join('')}</div>${content}`;
}
function decisionDialog(id,decision) {
  const labels={confirm:'Подтвердить результат',reject:'Отклонить результат',dispute:'Оспорить результат',withdraw:'Отозвать заявку'};
  modal(labels[decision],`<form id="decision-form" data-id="${id}" data-decision="${decision}"><label class="field">${decision==='confirm'?'Подтверждение':'Причина'}<textarea name="reason" required minlength="3" maxlength="300" rows="3">${decision==='confirm'?'Счёт верный, подтверждаю':''}</textarea></label><p class="form-help">${decision==='reject'?'Если матч уже учтён, его отмена пересчитает рейтинг и награды.':decision==='dispute'?'Заявку рассмотрит администратор.':'Решение будет записано в журнал.'}</p>${authFooter(labels[decision])}</form>`);
}
function accountDialog(id) {
  const a=state.accounts.find(a=>a.id===id);if(!a)return;
  modal('Доступ · '+a.name,`<form id="account-form" data-id="${id}"><label class="field">Роль<select name="role"><option value="player" ${a.role==='player'?'selected':''}>Игрок</option><option value="trusted" ${a.role==='trusted'?'selected':''}>Доверенный игрок</option></select></label><p class="form-help">Доверенный игрок принимает новичков и подтверждает игры, которые видел. Споры и исправления остаются администратору.</p><label class="checkbox-field"><input type="checkbox" name="blocked" ${a.blocked?'checked':''}> Заблокировать доступ</label><label class="field">Новый пароль<input type="password" name="password" minlength="6" maxlength="128" autocomplete="new-password"><small>Оставьте пустым, чтобы сохранить текущий.</small></label><label class="field">Привязка профиля<select name="player_id"><option value="${a.player_id}">${esc(a.name)} (текущий)</option>${state.unclaimed.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><small>Перепривязка доступна, пока новый профиль не участвовал в играх и заявках.</small></label><label class="field">Причина изменения<textarea name="reason" required minlength="3" maxlength="300" rows="2"></textarea></label>${authFooter('Сохранить')}</form>`);
}
function createAccountDialog() {
  modal('Выдать доступ игроку',`<form id="create-account-form"><p class="form-help">Подключите аккаунт к существующему профилю. Его рейтинг и награды сохранятся.</p><label class="field">Профиль<select name="player_id">${state.unclaimed.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label>${authFields()}<label class="field">Роль<select name="role"><option value="player">Игрок</option><option value="trusted">Доверенный игрок</option></select></label>${authFooter('Выдать доступ')}</form>`);
}
function updateCommunity() {
  const u=currentUser(),bar=document.getElementById('account-bar');
  bar.innerHTML=u?`<a class="button small ghost" href="#player/${u.player_id}">${esc(player(u.player_id)?.name||u.login)}</a><button class="button small ghost" data-action="logout">Выйти</button>`:`${state.auth.setup_required?'<button class="button small ghost" data-action="setup-club">Настроить клуб</button>':'<a class="button small ghost" href="#join">Присоединиться</a>'}<button class="button small ghost" data-action="login">Войти</button>`;
  const nav=document.querySelector('[data-nav="moderation"]');nav.hidden=!u;nav.innerHTML=`${trusted()?'Модерация':'Подтвердить матчи'} <span>${state.proposals.length}</span>`;
  document.querySelector('[data-nav="join"]').hidden=!!u&&!state.meeting.open;
  document.querySelector('.local-label').textContent=state.meeting.open?'Встреча в парке':'Пинг-понг клуб';
}
function decorateCommunity(route) {
  app.querySelectorAll('[data-action="new-player"],[data-action="settings"]').forEach(b=>b.hidden=!admin());
  app.querySelectorAll('[data-action="edit-socials"],[data-action="main-award"]').forEach(b=>b.hidden=!canEditProfile(Number(b.dataset.player)));
  if(route[0]==='table'&&state.auth.setup_required) app.insertAdjacentHTML('afterbegin',`<div class="community-notice"><div><strong>Настройте клуб перед первой встречей</strong><p>Создайте аккаунт администратора, чтобы управлять игроками и результатами.</p></div><button class="button small primary" data-action="setup-club">Настроить клуб</button></div>`);
  if(route[0]==='table'&&!state.auth.setup_required&&!currentUser()&&state.meeting.open) app.insertAdjacentHTML('afterbegin',`<div class="community-notice"><div><strong>Играете с нами в парке?</strong><p>Присоединитесь к клубу и начните с 1000 Elo.</p></div><a class="button small primary" href="#join">Присоединиться</a></div>`);
  if(route[0]==='player'&&player(Number(route[1]))?.membership_status==='pending') app.insertAdjacentHTML('afterbegin','<div class="community-notice"><div><strong>Первый шаг к рейтингу</strong><p>Вы уже в таблице друзей. После первой игры попросите организатора подтвердить результат — тогда появится место в рейтинге.</p></div></div>');
  if(currentUser()&&['history','player'].includes(route[0])&&state.proposals.length) app.insertAdjacentHTML('afterbegin',`<div class="community-notice"><a href="#moderation">На рассмотрении: ${state.proposals.length} · Открыть заявки →</a></div>`);
}
document.addEventListener('click',async event=>{
  const b=event.target.closest('[data-action]');if(!b)return;
  try {
    if(b.dataset.action==='login')loginDialog();
    else if(b.dataset.action==='setup-club')setupDialog();
    else if(b.dataset.action==='logout'){await mutate('/api/auth/logout','POST',{});notify('Вы вышли из аккаунта.');}
    else if(b.dataset.action==='community-tab'){communityTab=b.dataset.tab;render();}
    else if(b.dataset.action==='proposal-decision')decisionDialog(Number(b.dataset.id),b.dataset.decision);
    else if(b.dataset.action==='manage-account')accountDialog(Number(b.dataset.id));
    else if(b.dataset.action==='create-account')createAccountDialog();
    else if(b.dataset.action==='edit-proposal')newMatch(Number(b.dataset.id),true);
    else if(b.dataset.action==='award-match'){
      const m=state.matches.find(m=>m.id===Number(b.dataset.id));
      if(!m){notify('Матч не найден. Обновите страницу.',true);return;}
      modal('Подтверждённый матч',`<p class="form-help">${fmtDate(m.played_at,true)}</p>${matchRow(m)}<p class="form-help">${esc(m.name_a)}: ${m.before_a} → ${m.after_a} Elo<br>${esc(m.name_b)}: ${m.before_b} → ${m.after_b} Elo</p><div class="form-footer"><a class="button ghost" href="#history" data-action="close">Вся история</a><button class="button primary" data-action="close">Закрыть</button></div>`);
    }
    else if(b.dataset.action==='dispute-match')modal('Оспорить матч',`<form id="dispute-form" data-id="${b.dataset.id}"><label class="field">Что нужно исправить?<textarea name="reason" required minlength="3" maxlength="300" rows="3"></textarea></label><p class="form-help">До решения администратора текущий результат остаётся в рейтинге.</p>${authFooter('Отправить спор')}</form>`);
    else if(b.dataset.action==='copy-invite'){await navigator.clipboard.writeText(inviteUrl());notify('Ссылка скопирована.');}
    else if(b.dataset.action==='download-qr'){
      const blob=new Blob([qrSvg(inviteUrl())],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='zazerkalye-invite.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
  }catch(e){notify(e.message,true);}
});
document.addEventListener('submit',async event=>{
  const form=event.target,paths={'login-form':'/api/auth/login','setup-form':'/api/auth/setup','join-form':'/api/auth/register','meeting-form':'/api/meeting','create-account-form':'/api/accounts'};
  if(!paths[form.id]&&!['decision-form','account-form','dispute-form'].includes(form.id))return;
  event.preventDefault();
  await submitForm(form,async()=>{
    const data=Object.fromEntries(new FormData(form));
    let path=paths[form.id],method=form.id==='meeting-form'?'PUT':'POST';
    if(form.id==='decision-form'){path=`/api/proposals/${form.dataset.id}/decision`;data.decision=form.dataset.decision;}
    if(form.id==='dispute-form')path=`/api/matches/${form.dataset.id}/dispute`;
    if(form.id==='account-form'){path=`/api/accounts/${form.dataset.id}`;method='PUT';data.blocked=form.elements.blocked.checked;}
    await mutate(path,method,data);
    if(['setup-form','join-form','login-form'].includes(form.id))location.hash=`player/${currentUser().player_id}`;
    notify(form.id==='join-form'?'Вы в клубе! Пора сыграть первый матч.':form.id==='login-form'?'Вы вошли в клуб.':'Сохранено.');
  });
});
