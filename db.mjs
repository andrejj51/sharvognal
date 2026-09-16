import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { MATCH_AWARDS, MATCH_CONDITIONS, CLUB_TIMEZONE, matchDay, newMatchStats, advanceMatchStats, matchAwardCompleted } from './match-awards.mjs';

export const START = 1000;
export const AWARD_CHARACTERS = {
  bobyl:'Лесной бобыль', pacanoid:'Круглый Толик', oleg:'Пыльный Глеб', artem:'Летописный Артём',
  sator:'Сатор Арепыч', archivist:'Акакий Куролесов', wizard:'Дядюшка Фантасмагор',
  'under-table':'Казимир', 'no-paddle':'Подводный Гоша', slippers:'Доктор Эпикантус',
  'loss-book':'Колбасный страж', reverse:'Болотный Скрипач', 'broken-wizard':'Поленыч',
  comeback:'Пацаноид', knees:'Коленыч',
  'shar-vognal':'Зуб Зубыч', niche:'Пескарь',
  'still-here':'Многоликий Филипп', 'crown-off':'Желейный Князь',
  'no-queue':'Братья Мишеневы', 'until-dark':'Большой Дима',
  'debt-paid':'Пахомий', 'knows-everyone':'Тётя Варя',
  'local-resident':'Истуканус', 'zero-start':'Жвачник',
  'first-game':'Баба Жуля', 'second-wind':'Духа', 'one-by-one':'Орлундий', 'on-the-edge':'Алевтина',
  'swing-match':'Баранча', 'points-not-all':'Григорий', 'friendship-aside':'Горбатый крупоед', 'next-please':'Евдокия',
};
export const AWARD_IMAGES = {'shar-vognal':'/award-shar-vognal-net-v2.png',niche:'/award-niche-net-v2.png',...Object.fromEntries(MATCH_AWARDS.map(a=>[a[0],`/awards/${a[0]}-zazerkalye.png`])),'first-game':'/awards/first-game-baba-zhulya-v2-zazerkalye.png'};
export const DEFAULT_AWARDS = [
  ['bobyl', 'up', 1050, 'Бобыль с ракеткой', 'Обнаружил стол. Начал подозревать правила.', 0],
  ['pacanoid', 'up', 1100, 'Круглый Толик подачи', 'Округлил рейтинг. Теперь округляет соперников.', 1],
  ['oleg', 'up', 1200, 'Пыльный Глеб', 'От соперника осталась пыль.', 2],
  ['artem', 'up', 1300, 'Летописный Артём', 'Ваши победы внесены в сомнительную летопись.', 3],
  ['sator', 'up', 1400, 'Сатор Арепыч подачи', 'Принимать подачу уже поздно.', 4],
  ['archivist', 'up', 1500, 'Акакий Куролесов у стола', 'Собрал корзину побед. Ни одной несъедобной.', 5],
  ['wizard', 'up', 1600, 'Дядюшка Фантасмагор', 'Мяч вернулся с другой стороны зеркала.', 6],
  ['under-table', 'down', 975, 'Казимир под столом', 'Ложки украл. Победу унести не получилось.', 7],
  ['no-paddle', 'down', 950, 'Подводный Гоша на дне', 'Ракетка утонула. Рейтинг последовал за ней.', 8],
  ['slippers', 'down', 900, 'Доктор Эпикантус в тапочках', 'Диагноз: хронический приём в сетку.', 9],
  ['loss-book', 'down', 850, 'Колбасный страж без защиты', 'Охранял колбасу. Пропустил все подачи.', 10],
  ['reverse', 'down', 800, 'Болотный Скрипач поражений', 'Заиграл реквием. По собственному рейтингу.', 11],
  ['broken-wizard', 'down', 700, 'Поленыч без отскока', 'Деревянная ракетка. Деревянный приём. Всё сходится.', 12],
  ['comeback', 'comeback', 1000, 'В полтинниках пока побудешь', 'Из-под стола выпущен. За взрослый стол пока не приглашён.', 13],
  ['knees', 'top-three', 3, 'На колени поставит', 'Трое у стола. Все трое теперь ниже уровня сетки.', 15],
  ['shar-vognal', 'clean-set', 1, 'Шар вогнал', 'Одиннадцать раз объяснил. Ответа так и не получил.', 16],
  ['niche', 'rival-wins', 5, 'Нишевый', 'Широкой известности не получил. В узком кругу — опасен.', 17],
  ...MATCH_AWARDS,
];

export function awardCondition(award) {
  return award.kind==='up'?`Достичь ${award.threshold} Elo.`:
    award.kind==='down'?`Опуститься до ${award.threshold} Elo или ниже.`:
    award.kind==='comeback'?'Опуститься ниже 1000 Elo, затем вернуться к 1000 или выше.':
    award.kind==='top-three'?'Победить каждого из трёх лучших соперников рейтинга хотя бы раз со счётом 3:0.':
    award.kind==='clean-set'?'Выиграть хотя бы одну партию 11:0 в подтверждённом матче. Победа во всём матче не обязательна.':
    award.kind==='rival-wins'?`Одержать ${award.threshold} побед над одним соперником в подтверждённых матчах.`:MATCH_CONDITIONS[award.kind]||'';
}

export function topThreeProgress(players, victories, playerId) {
  const rivals = [...players].filter(p => p.id !== playerId)
    .sort((a, b) => b.rating - a.rating || b.wins - a.wins || a.id - b.id).slice(0, 3);
  const completed = rivals.filter(p => victories.has(p.id)).length;
  return { completed, total: 3, rivals: rivals.map(p => p.id), unlocked: rivals.length === 3 && completed === 3 };
}

function fail(message) { const error = new Error(message); error.status = 400; throw error; }
export function leadershipStats(players, matches, now = Date.now()) {
  const result = new Map(players.map(p => [p.id, { leader_days: 0, leader_since: null }]));
  const ranking = new Map(players.map(p => [p.id, { id:p.id, rating:START, wins:0 }]));
  const durations = new Map(players.map(p => [p.id, 0]));
  let leader = null, previous = null, since = null;
  const ordered = [...matches].sort((a,b) => a.played_at.localeCompare(b.played_at) || a.id-b.id);
  for (const m of ordered) {
    const time = new Date(m.played_at).getTime();
    if (time > now) break;
    if (leader !== null) durations.set(leader, durations.get(leader) + time-previous);
    ranking.get(m.player_a).rating = m.after_a;
    ranking.get(m.player_b).rating = m.after_b;
    ranking.get(m.winner_id).wins++;
    const eligible=new Set(players.filter(p=>!p.ranked_at||p.ranked_at<=m.played_at).map(p=>p.id));
    const next = [...ranking.values()].filter(p=>eligible.has(p.id)).sort((a,b) => b.rating-a.rating || b.wins-a.wins || a.id-b.id)[0].id;
    if (next !== leader) since = m.played_at;
    leader = next; previous = time;
  }
  if (leader !== null) {
    durations.set(leader, durations.get(leader) + now-previous);
    result.get(leader).leader_since = since;
  }
  for (const [id, duration] of durations) result.get(id).leader_days = Math.floor(duration/86400000);
  return result;
}
export function validateSocials(input) {
  const hosts = {telegram:['t.me','telegram.me'],vk:['vk.com','www.vk.com','vk.ru','www.vk.ru'],instagram:['instagram.com','www.instagram.com'],discord:['discord.com','www.discord.com','discord.gg'],other:null};
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Укажите ссылки на соцсети.');
  const result = {};
  for (const [service, value] of Object.entries(input)) {
    if (!Object.hasOwn(hosts, service) || typeof value !== 'string' || value.length > 300) fail('Проверьте ссылки на соцсети.');
    let text = value.trim(); if (!text) continue;
    if (service === 'telegram' && /^@[A-Za-z0-9_]{5,32}$/.test(text)) text = 'https://t.me/'+text.slice(1);
    if (!/^[a-z][a-z\d+.-]*:/i.test(text)) text = 'https://'+text;
    let url; try { url = new URL(text); } catch { fail('Укажите полную ссылку на профиль.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.hostname.includes('.') || url.pathname === '/' || url.hostname.endsWith('.')) fail('Укажите ссылку на профиль, начинающуюся с https://.');
    if (hosts[service] && !hosts[service].includes(url.hostname)) fail('Ссылка должна вести в выбранную соцсеть.');
    result[service] = url.href;
  }
  return result;
}
export function eloDelta(a, b, won) {
  return Math.round(32 * ((won ? 1 : 0) - 1 / (1 + 10 ** ((b - a) / 400))));
}
export function validateMatch(input) {
  const a = Number(input.player_a), b = Number(input.player_b), best = Number(input.best_of);
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || a < 1 || b < 1 || a === b) fail('Выберите двух разных игроков.');
  if (![1, 3, 5, 7].includes(best)) fail('Выберите формат матча.');
  if (!Array.isArray(input.sets) || !input.sets.length || input.sets.length > best) fail('Добавьте счёт всех сыгранных партий.');
  let winsA = 0, winsB = 0;
  const target = Math.ceil(best / 2);
  const sets = input.sets.map((set) => {
    if (winsA === target || winsB === target) fail('Матч уже завершился: после решающей партии нельзя добавлять новые.');
    if (!Array.isArray(set) || set.length !== 2 || set.some(n => typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 100)) fail('Счёт партии — целые числа от 0 до 100.');
    const [x, y] = set, hi = Math.max(x, y), lo = Math.min(x, y);
    if (!((hi === 11 && lo <= 9) || (hi > 11 && hi - lo === 2))) fail('Партия играется до 11, при 10:10 — до преимущества в два очка. Проверьте счёт.');
    x > y ? winsA++ : winsB++;
    return [x, y];
  });
  if (winsA !== target && winsB !== target) fail(`Матч не завершён: одному игроку нужно выиграть ${target} ${target === 1 ? 'партию' : 'партии'}.`);
  const date = new Date(input.played_at);
  if (typeof input.played_at !== 'string' || !Number.isFinite(date.getTime()) || date.getTime() > Date.now() + 60000) fail('Укажите корректную дату матча, не в будущем.');
  return { a, b, best, sets, played_at: date.toISOString(), winner_a: winsA > winsB };
}

export function createStore(path = ':memory:') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      rating INTEGER NOT NULL DEFAULT 1000, min_rating INTEGER NOT NULL DEFAULT 1000,
      max_rating INTEGER NOT NULL DEFAULT 1000, wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0, main_award TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY, player_a INTEGER NOT NULL REFERENCES players(id),
      player_b INTEGER NOT NULL REFERENCES players(id), best_of INTEGER NOT NULL,
      sets TEXT NOT NULL, played_at TEXT NOT NULL, winner_id INTEGER REFERENCES players(id),
      delta_a INTEGER NOT NULL DEFAULT 0, before_a INTEGER NOT NULL DEFAULT 1000,
      before_b INTEGER NOT NULL DEFAULT 1000, after_a INTEGER NOT NULL DEFAULT 1000,
      after_b INTEGER NOT NULL DEFAULT 1000, CHECK(player_a <> player_b));
    CREATE INDEX IF NOT EXISTS idx_matches_played_at ON matches(played_at, id);
    CREATE TABLE IF NOT EXISTS awards (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL, threshold INTEGER NOT NULL,
      title TEXT NOT NULL, caption TEXT NOT NULL, art INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS player_awards (
      player_id INTEGER NOT NULL REFERENCES players(id), award_id TEXT NOT NULL REFERENCES awards(id),
      earned_at TEXT NOT NULL, match_id INTEGER NOT NULL REFERENCES matches(id),
      PRIMARY KEY(player_id, award_id));
    PRAGMA optimize;`);
  if (!db.prepare('PRAGMA table_info(players)').all().some(c => c.name === 'socials')) db.exec("ALTER TABLE players ADD COLUMN socials TEXT NOT NULL DEFAULT '{}'");
  if (!db.prepare('PRAGMA table_info(players)').all().some(c => c.name === 'membership_status')) db.exec("ALTER TABLE players ADD COLUMN membership_status TEXT NOT NULL DEFAULT 'active'");
  if (!db.prepare('PRAGMA table_info(players)').all().some(c => c.name === 'socials_public')) db.exec('ALTER TABLE players ADD COLUMN socials_public INTEGER NOT NULL DEFAULT 1');
  if (!db.prepare('PRAGMA table_info(players)').all().some(c => c.name === 'ranked_at')) db.exec('ALTER TABLE players ADD COLUMN ranked_at TEXT');
  db.exec('CREATE TABLE IF NOT EXISTS app_migrations (id TEXT PRIMARY KEY)');
  const seed = db.prepare('INSERT OR IGNORE INTO awards VALUES (?, ?, ?, ?, ?, ?)');
  let newAwards = 0;
  for (const row of DEFAULT_AWARDS) newAwards += Number(seed.run(...row).changes);
  function transaction(fn) {
    if (db.isTransaction) return fn();
    db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  function replay() {
    db.exec('DELETE FROM player_awards');
    const matchStats = new Map(db.prepare('SELECT id FROM players').all().map(p=>[p.id,newMatchStats()]));
    const players = new Map(db.prepare('SELECT id, membership_status, ranked_at FROM players').all().map(p => [p.id, { id: p.id, active:p.membership_status==='active', ranked_at:p.ranked_at, rating: START, min: START, max: START, wins: 0, losses: 0, below: false, sweeps: new Set(),rivalWins:new Map() }]));
    const awards = db.prepare('SELECT * FROM awards').all();
    const unlock = db.prepare('INSERT OR IGNORE INTO player_awards VALUES (?, ?, ?, ?)');
    const updateMatch = db.prepare('UPDATE matches SET winner_id=?, delta_a=?, before_a=?, before_b=?, after_a=?, after_b=? WHERE id=?');
    let playedMatches=0;
    for (const match of db.prepare('SELECT * FROM matches ORDER BY played_at, id').all()) {
      const leaderBefore=playedMatches?[...players.values()].filter(p=>p.active&&(!p.ranked_at||p.ranked_at<=match.played_at)).sort((a,b)=>b.rating-a.rating||b.wins-a.wins||a.id-b.id)[0]?.id:null;
      playedMatches++;
      const a = players.get(match.player_a), b = players.get(match.player_b);
      const sets = JSON.parse(match.sets);
      const won = sets.filter(s => s[0] > s[1]).length > sets.filter(s => s[1] > s[0]).length;
      const delta = eloDelta(a.rating, b.rating, won), beforeA = a.rating, beforeB = b.rating;
      a.rating += delta; b.rating -= delta;
      a[won ? 'wins' : 'losses']++; b[won ? 'losses' : 'wins']++;
      const winner=won?a:b,loser=won?b:a;
      winner.rivalWins.set(loser.id,(winner.rivalWins.get(loser.id)||0)+1);
      if (match.best_of === 5 && sets.length === 3 && sets.every(s => won ? s[0] > s[1] : s[1] > s[0])) {
        (won ? a : b).sweeps.add(won ? b.id : a.id);
      }
      updateMatch.run(won ? a.id : b.id, delta, beforeA, beforeB, a.rating, b.rating, match.id);
      for (const p of [a, b]) {
        const stats=matchStats.get(p.id);
        advanceMatchStats(stats,{...match,sets,winner_id:winner.id,before_a:beforeA,before_b:beforeB,leader_before:leaderBefore},p.id);
        p.min = Math.min(p.min, p.rating); p.max = Math.max(p.max, p.rating);
        if (p.rating < START) p.below = true;
        for (const award of awards) {
          if ((award.kind === 'up' && p.rating >= award.threshold) ||
              (award.kind === 'down' && p.rating <= award.threshold) ||
              (award.kind === 'comeback' && p.below && p.rating >= START) ||
              (award.kind === 'clean-set' && sets.some(s=>p.id===a.id?s[0]===11&&s[1]===0:s[1]===11&&s[0]===0)) ||
              (award.kind === 'rival-wins' && p.id===winner.id && winner.rivalWins.get(loser.id)>=award.threshold) ||
              (Object.hasOwn(MATCH_CONDITIONS,award.kind) && matchAwardCompleted(stats,award.kind)>=award.threshold)) unlock.run(p.id, award.id, match.played_at, match.id);
        }
      }
      for (const p of players.values()) {
        if (topThreeProgress([...players.values()].filter(p=>p.active&&(!p.ranked_at||p.ranked_at<=match.played_at)), p.sweeps, p.id).unlocked) {
          for (const award of awards.filter(a => a.kind === 'top-three')) unlock.run(p.id, award.id, match.played_at, match.id);
        }
      }
    }
    const updatePlayer = db.prepare('UPDATE players SET rating=?, min_rating=?, max_rating=?, wins=?, losses=? WHERE id=?');
    for (const p of players.values()) updatePlayer.run(p.rating, p.min, p.max, p.wins, p.losses, p.id);
    db.exec(`UPDATE players SET main_award=NULL WHERE main_award IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM player_awards WHERE player_id=players.id AND award_id=players.main_award)`);
  }
  function obtained(earned,players,matches) {
    const award=db.prepare('SELECT * FROM awards WHERE id=?').get(earned.award_id),match=matches.find(m=>m.id===earned.match_id);
    if(!award||!match)return null;
    const side=match.player_a===earned.player_id?0:1,rating=side===0?match.after_a:match.after_b;
    const opponent=players.find(p=>p.id===(side===0?match.player_b:match.player_a));
    const ordered=[...matches].sort((a,b)=>a.played_at.localeCompare(b.played_at)||a.id-b.id);
    const history=ordered.slice(0,ordered.findIndex(m=>m.id===match.id)+1);
    let description='';
    if(Object.hasOwn(MATCH_CONDITIONS,award.kind)) {
      const ownHistory=history.filter(m=>[m.player_a,m.player_b].includes(earned.player_id));
      if(award.kind==='match-comeback') description=`Победил 3:2 после 0:2 по партиям. Соперник: ${opponent.name}.`;
      if(award.kind==='upset') {
        const own=side===0?match.before_a:match.before_b,rival=side===0?match.before_b:match.before_a;
        description=`Победил ${opponent.name}: перед игрой ${own} против ${rival} Elo, разница ${rival-own}.`;
      }
      if(award.kind==='win-streak') {
        let count=0;for(const m of [...ownHistory].reverse()){if(m.winner_id!==earned.player_id)break;count++;}
        description=`Одержал ${count}-ю победу подряд. Соперник: ${opponent.name}.`;
      }
      if(award.kind==='long-set') {
        const index=match.sets.findIndex(s=>s[side]>=16&&s[side]>s[1-side]),set=match.sets[index];
        description=`Выиграл партию №${index+1} со счётом ${set[side]}:${set[1-side]}. Соперник: ${opponent.name}.`;
      }
      if(award.kind==='revenge') {
        let count=0;for(const m of ownHistory.filter(m=>[m.player_a,m.player_b].includes(opponent.id)).slice(0,-1).reverse()){if(m.winner_id===earned.player_id)break;count++;}
        description=`Победил ${opponent.name} после ${count} поражений подряд в личных встречах.`;
      }
      if(award.kind==='distinct-rivals') {
        const rivals=new Set(ownHistory.map(m=>m.player_a===earned.player_id?m.player_b:m.player_a));
        description=`Сыграл с ${rivals.size}-м разным соперником: ${opponent.name}.`;
      }
      if(award.kind==='match-count') description=`Сыграл свой ${ownHistory.length}-й матч. Соперник: ${opponent.name}.`;
      if(award.kind==='zero-comeback') {
        const index=match.sets.findIndex(s=>s[side]===0&&s[1-side]===11);
        description=`Проиграл партию №${index+1} со счётом 0:11, но победил в матче. Соперник: ${opponent.name}.`;
      }
      if(award.kind==='first-match')description=`Сыграл свой первый подтверждённый матч. Соперник: ${opponent.name}.`;
      if(award.kind==='loss-comeback') {
        let count=0;for(const m of ownHistory.slice(0,-1).reverse()){if(m.winner_id===earned.player_id)break;count++;}
        description=`Победил после ${count} поражений подряд. Соперник: ${opponent.name}.`;
      }
      if(award.kind==='daily-rivals') {
        const day=matchDay(match.played_at),wins=ownHistory.filter(m=>m.winner_id===earned.player_id&&matchDay(m.played_at)===day);
        const rivals=[...new Set(wins.map(m=>m.player_a===earned.player_id?m.player_b:m.player_a))].map(id=>players.find(p=>p.id===id).name);
        description=`За день ${day} по московскому времени победил ${rivals.length} разных соперников: ${rivals.join(', ')}.`;
      }
      if(award.kind==='close-match')description=`Выиграл 3:2, все пять партий — с разницей в два очка. Соперник: ${opponent.name}.`;
      if(award.kind==='alternating-match')description=`Выиграл 3:2 с чередованием партий В–П–В–П–В. Соперник: ${opponent.name}.`;
      if(award.kind==='fewer-points') {
        const own=match.sets.reduce((sum,s)=>sum+s[side],0),rival=match.sets.reduce((sum,s)=>sum+s[1-side],0);
        description=`Выиграл матч при суммарных очках ${own}:${rival}. Соперник: ${opponent.name}.`;
      }
      if(award.kind==='personal-matches') {
        const count=ownHistory.filter(m=>[m.player_a,m.player_b].includes(opponent.id)).length;
        description=`Сыграл ${count}-й матч с одним соперником: ${opponent.name}.`;
      }
      if(award.kind==='leader-win')description=`Победил действующего лидера перед этой игрой: ${opponent.name}, ${side===0?match.before_b:match.before_a} Elo.`;
    }
    if(award.kind==='up')description=`Достиг ${rating} Elo после этой игры — порог ${award.threshold} пройден.`;
    if(award.kind==='down')description=`После этой игры рейтинг опустился до ${rating} Elo — порог ${award.threshold} пройден.`;
    if(award.kind==='comeback')description=`После падения ниже 1000 вернулся к ${rating} Elo в этой игре.`;
    if(award.kind==='clean-set') {
      const set=match.sets.findIndex(s=>s[side]===11&&s[1-side]===0)+1;
      description=`Выиграл партию №${set} со счётом 11:0. Соперник: ${opponent.name}.`;
    }
    if(award.kind==='rival-wins') {
      const count=history.filter(m=>m.winner_id===earned.player_id&&[m.player_a,m.player_b].includes(opponent.id)).length;
      description=`Одержал ${count}-ю победу над одним соперником в этой игре. Соперник: ${opponent.name}.`;
    }
    if(award.kind==='top-three') {
      const ranked=players.filter(p=>p.membership_status==='active'&&(!p.ranked_at||p.ranked_at<=match.played_at)).map(p=>({...p,rating:START,wins:0}));
      for(const m of history) {
        for(const p of ranked) {if(p.id===m.player_a)p.rating=m.after_a;if(p.id===m.player_b)p.rating=m.after_b;if(p.id===m.winner_id)p.wins++;}
      }
      const rivals=topThreeProgress(ranked,new Set(),earned.player_id).rivals.map(id=>players.find(p=>p.id===id).name);
      description=`Победил 3:0 каждого из трёх лучших соперников на момент получения: ${rivals.join(', ')}.`;
    }
    return {description,match_id:match.id,played_at:match.played_at};
  }
  function state() {
    const players = db.prepare('SELECT * FROM players ORDER BY rating DESC, wins DESC, id').all();
    const matches = db.prepare(`SELECT m.*, a.name AS name_a, b.name AS name_b FROM matches m
        JOIN players a ON a.id=m.player_a JOIN players b ON b.id=m.player_b ORDER BY played_at DESC, m.id DESC`).all().map(m => ({ ...m, sets: JSON.parse(m.sets) })),
      sweeps = new Map(players.map(p => [p.id, new Set()])),
      rivalWins=new Map(players.map(p=>[p.id,new Map()])),cleanSets=new Set();
    const matchStats=new Map(players.map(p=>[p.id,newMatchStats()]));
    const ranking=new Map(players.map(p=>[p.id,{...p,rating:START,wins:0}]));let playedMatches=0;
    for(const match of [...matches].reverse()) {
      const leaderBefore=playedMatches?[...ranking.values()].filter(p=>p.membership_status==='active'&&(!p.ranked_at||p.ranked_at<=match.played_at)).sort((a,b)=>b.rating-a.rating||b.wins-a.wins||a.id-b.id)[0]?.id:null;
      for(const id of [match.player_a,match.player_b])advanceMatchStats(matchStats.get(id),{...match,leader_before:leaderBefore},id);
      ranking.get(match.player_a).rating=match.after_a;ranking.get(match.player_b).rating=match.after_b;ranking.get(match.winner_id).wins++;playedMatches++;
    }
    const active = players.filter(p=>p.membership_status==='active');
    const leadership = leadershipStats(active, matches);
    for (const p of players) { p.socials = JSON.parse(p.socials); Object.assign(p, leadership.get(p.id)); }
    for (const match of matches) {
      const loser=match.winner_id===match.player_a?match.player_b:match.player_a;
      const wins=rivalWins.get(match.winner_id);wins.set(loser,(wins.get(loser)||0)+1);
      if(match.sets.some(s=>s[0]===11&&s[1]===0))cleanSets.add(match.player_a);
      if(match.sets.some(s=>s[1]===11&&s[0]===0))cleanSets.add(match.player_b);
      if (match.best_of === 5 && match.sets.length === 3) {
        const wonA = match.winner_id === match.player_a;
        if (match.sets.every(s => wonA ? s[0] > s[1] : s[1] > s[0])) sweeps.get(match.winner_id).add(wonA ? match.player_b : match.player_a);
      }
    }
    return {
      players, matches,
      awards: db.prepare('SELECT * FROM awards ORDER BY art').all().map(a => ({...a, character:AWARD_CHARACTERS[a.id],image:AWARD_IMAGES[a.id],condition:awardCondition(a)})),
      earned: db.prepare('SELECT * FROM player_awards').all().map(e=>({...e,obtained:obtained(e,players,matches)})),
      award_progress: players.flatMap(p => [
        { player_id: p.id, award_id: 'knees', ...topThreeProgress(active, sweeps.get(p.id), p.id) },
        {player_id:p.id,award_id:'shar-vognal',completed:cleanSets.has(p.id)?1:0,total:1},
        {player_id:p.id,award_id:'niche',completed:Math.max(0,...rivalWins.get(p.id).values()),total:5},
        ...MATCH_AWARDS.map(a=>({player_id:p.id,award_id:a[0],completed:matchAwardCompleted(matchStats.get(p.id),a[1]),total:a[2]})),
      ]),
      config: { start: START, k: 32,timezone:CLUB_TIMEZONE },
    };
  }
  function addPlayer(input) {
    const name = String(input.name ?? '').normalize('NFC').trim();
    if (!name || name.length > 32) fail('Имя должно содержать от 1 до 32 символов.');
    if (db.prepare('SELECT name FROM players').all().some(p => p.name.toLocaleLowerCase('ru') === name.toLocaleLowerCase('ru'))) fail('Игрок с таким именем уже есть.');
    const row = db.prepare('INSERT INTO players(name, created_at) VALUES (?, ?)').run(name, new Date().toISOString());
    return Number(row.lastInsertRowid);
  }
  function saveMatch(input, id) {
    const value = validateMatch(input);
    if (!db.prepare('SELECT id FROM players WHERE id=?').get(value.a) || !db.prepare('SELECT id FROM players WHERE id=?').get(value.b)) fail('Игрок не найден.');
    if (id && !db.prepare('SELECT id FROM matches WHERE id=?').get(id)) fail('Матч не найден.');
    return transaction(() => {
      let matchId = id;
      if (id) db.prepare('UPDATE matches SET player_a=?, player_b=?, best_of=?, sets=?, played_at=? WHERE id=?').run(value.a, value.b, value.best, JSON.stringify(value.sets), value.played_at, id);
      else matchId = Number(db.prepare('INSERT INTO matches(player_a,player_b,best_of,sets,played_at) VALUES (?,?,?,?,?)').run(value.a, value.b, value.best, JSON.stringify(value.sets), value.played_at).lastInsertRowid);
      replay();
      return matchId;
    });
  }
  function deleteMatch(id) {
    if (!db.prepare('SELECT id FROM matches WHERE id=?').get(id)) fail('Матч не найден.');
    transaction(() => { db.prepare('DELETE FROM player_awards WHERE match_id=?').run(id); db.prepare('DELETE FROM matches WHERE id=?').run(id); replay(); });
  }
  function saveAwards(input) {
    if (!Array.isArray(input.awards) || input.awards.length !== DEFAULT_AWARDS.length) fail('Передайте все награды.');
    const current = db.prepare('SELECT * FROM awards').all();
    const ids = new Set();
    for (const item of input.awards) {
      const old = current.find(a => a.id === item.id);
      if (!old || ids.has(item.id)) fail('Неизвестная или повторяющаяся награда.');
      ids.add(item.id);
      if (typeof item.title !== 'string' || !item.title.trim() || item.title.length > 80 || typeof item.caption !== 'string' || item.caption.length > 180) fail('Проверьте название и подпись награды.');
      const t = item.threshold;
      if(Object.hasOwn(MATCH_CONDITIONS,old.kind)&&t!==MATCH_AWARDS.find(a=>a[0]===old.id)[2])fail('Особые условия фиксированы.');
      if (!Number.isSafeInteger(t) || (old.kind === 'up' && (t <= 1000 || t > 5000)) || (old.kind === 'down' && (t >= 1000 || t < 0)) || (old.kind === 'comeback' && t !== 1000) || (old.kind === 'top-three' && t !== 3) || (old.kind==='clean-set'&&t!==1) || (old.kind==='rival-wins'&&t!==5)) fail('Проверьте пороги: верхние выше 1000, нижние от 0 до 999. Особые условия фиксированы.');
    }
    transaction(() => { for (const a of input.awards) db.prepare('UPDATE awards SET title=?, caption=?, threshold=? WHERE id=?').run(a.title.trim(), a.caption.trim(), a.threshold, a.id); replay(); });
  }
  function setMain(playerId, awardId) {
    if (!db.prepare('SELECT id FROM players WHERE id=?').get(playerId)) fail('Игрок не найден.');
    if (awardId !== null && typeof awardId !== 'string') fail('Выберите полученную награду.');
    if (awardId !== null && !db.prepare('SELECT 1 FROM player_awards WHERE player_id=? AND award_id=?').get(playerId, awardId)) fail('Можно выбрать только полученную награду.');
    db.prepare('UPDATE players SET main_award=? WHERE id=?').run(awardId, playerId);
  }
  function saveSocials(playerId, input) {
    if (!db.prepare('SELECT id FROM players WHERE id=?').get(playerId)) fail('Игрок не найден.');
    const socials = validateSocials(input.socials);
    db.prepare('UPDATE players SET socials=? WHERE id=?').run(JSON.stringify(socials), playerId);
  }
  if (newAwards) transaction(replay);
  if (!db.prepare('SELECT 1 FROM app_migrations WHERE id=?').get('unique-characters-v1')) transaction(() => {
    const oldTitles = {pacanoid:'Пацаноид с ракеткой',oleg:'Пыльный Олег',archivist:'Грибной архивариус побед',
      'under-table':'Пацаноид под столом','no-paddle':'Бобыль без ракетки',slippers:'Пыльный Олег в тапочках',
      'loss-book':'Летописный Артём поражений',reverse:'Сатор Арепыч обратной подачи','broken-wizard':'Дядюшка Расфантасмагор'};
    for (const [id,old] of Object.entries(oldTitles)) {
      const row=DEFAULT_AWARDS.find(a=>a[0]===id);
      db.prepare('UPDATE awards SET title=?, caption=? WHERE id=? AND title=?').run(row[3],row[4],id,old);
    }
    db.prepare('INSERT INTO app_migrations VALUES (?)').run('unique-characters-v1');
  });
  return { db, transaction, replay, state, addPlayer, saveMatch, deleteMatch, saveAwards, setMain, saveSocials, close: () => db.close() };
}
