// Additional trophies use only confirmed match results, in chronological order.
export const MATCH_AWARDS = [
  ['still-here', 'match-comeback', 1, 'А я ещё здесь', 'Соперник уже собирал вещи. Зря.', 18],
  ['crown-off', 'upset', 1, 'Скинул корону', 'Таблицу видел. Не впечатлился.', 19],
  ['no-queue', 'win-streak', 5, 'Без очереди', 'Следующий. Следующий. Следующий.', 20],
  ['until-dark', 'long-set', 1, 'До темноты', 'Парк закрывается. Они продолжают.', 21],
  ['debt-paid', 'revenge', 1, 'Должок вернул', 'Ничего личного. Всё записано.', 22],
  ['knows-everyone', 'distinct-rivals', 10, 'Всех знает', 'Пришёл один. Теперь здоровается со всем парком.', 23],
  ['local-resident', 'match-count', 50, 'Местный житель', 'Стол уже узнаёт по шагам.', 24],
  ['zero-start', 'zero-comeback', 1, 'Ноль — это начало', 'Первую партию скачивал обновление.', 25],
  ['first-game', 'first-match', 1, 'Первый пошёл', 'Теперь отмазка «я просто посмотреть» не работает.', 26],
  ['second-wind', 'loss-comeback', 1, 'Второе дыхание', 'Ракетку из объявления о продаже убрал.', 27],
  ['one-by-one', 'daily-rivals', 3, 'Заходите по одному', 'Приём без записи.', 28],
  ['on-the-edge', 'close-match', 1, 'На тоненького', 'Нервные клетки в комплект не входили.', 29],
  ['swing-match', 'alternating-match', 1, 'Качели', 'Определился только к концу.', 30],
  ['points-not-all', 'fewer-points', 1, 'Счёт не главное', 'Бухгалтерия проиграла. Я победил.', 31],
  ['friendship-aside', 'personal-matches', 20, 'Дружба отдельно', 'Всё ещё здороваются. Уже достижение.', 32],
  ['next-please', 'leader-win', 1, 'Передайте следующему', 'Первое место попросили подвинуться.', 33],
];
export const MATCH_CONDITIONS = {
  'match-comeback': 'Выиграть матч до трёх побед, проигрывая 0:2 по партиям.',
  upset: 'Победить соперника, чей Elo перед матчем выше твоего минимум на 200.',
  'win-streak': 'Выиграть 5 своих матчей подряд.',
  'long-set': 'Выиграть партию со счётом 16:14 или выше. Победа в матче не обязательна.',
  revenge: 'После трёх или более поражений подряд от одного соперника победить его. Игры с другими соперниками не прерывают эту серию.',
  'distinct-rivals': 'Сыграть с 10 разными соперниками.',
  'match-count': 'Сыграть 50 матчей.',
  'zero-comeback': 'Проиграть партию 0:11, но выиграть этот же матч.',
  'first-match': 'Сыграть первый подтверждённый матч.',
  'loss-comeback': 'Выиграть свой следующий матч после пяти или более поражений подряд.',
  'daily-rivals': 'За один календарный день по московскому времени победить трёх разных соперников.',
  'close-match': 'Выиграть матч 3:2, в котором все пять партий закончились с разницей в два очка.',
  'alternating-match': 'Выиграть матч 3:2, чередуя победы и поражения в партиях: В–П–В–П–В.',
  'fewer-points': 'Выиграть матч, набрав суммарно меньше очков во всех партиях, чем соперник.',
  'personal-matches': 'Сыграть 20 подтверждённых матчей с одним соперником, независимо от результата.',
  'leader-win': 'Победить действующего лидера рейтинга перед матчем. Лидер определяется после первой подтверждённой игры; при равенстве Elo учитываются победы, затем порядок добавления игроков.',
};
export const CLUB_TIMEZONE = 'Europe/Moscow';
const dayFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:CLUB_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'});
export function matchDay(playedAt) { return dayFormatter.format(new Date(playedAt)); }
export function newMatchStats() {
  return { matches: 0, opponents: new Set(), streak: 0, lossStreak:0, rivalLosses: new Map(), personalMatches:new Map(),dailyWins:new Map(),day:null, events: new Set() };
}
export function advanceMatchStats(stats, match, playerId) {
  const side = match.player_a === playerId ? 0 : 1;
  const rival = side === 0 ? match.player_b : match.player_a;
  const won = match.winner_id === playerId;
  const lostToRival = stats.rivalLosses.get(rival) || 0;
  const previousLosses=stats.lossStreak;
  stats.matches++;
  stats.events.add('first-match');
  stats.opponents.add(rival);
  stats.personalMatches.set(rival,(stats.personalMatches.get(rival)||0)+1);
  stats.day=matchDay(match.played_at);
  if(!stats.dailyWins.has(stats.day))stats.dailyWins.set(stats.day,new Set());
  stats.streak = won ? stats.streak + 1 : 0;
  stats.lossStreak=won?0:previousLosses+1;
  stats.rivalLosses.set(rival, won ? 0 : lostToRival + 1);
  if (match.sets.some(s => s[side] >= 16 && s[side] > s[1-side])) stats.events.add('long-set');
  if (!won) return;
  stats.dailyWins.get(stats.day).add(rival);
  if(previousLosses>=5)stats.events.add('loss-comeback');
  if(match.best_of===5&&match.sets.length===5) {
    if(match.sets.every(s=>Math.abs(s[0]-s[1])===2))stats.events.add('close-match');
    if(match.sets.every((s,i)=>(s[side]>s[1-side])===(i%2===0)))stats.events.add('alternating-match');
  }
  if(match.sets.reduce((sum,s)=>sum+s[side]-s[1-side],0)<0)stats.events.add('fewer-points');
  if(match.leader_before===rival)stats.events.add('leader-win');
  const ownRating = side === 0 ? match.before_a : match.before_b;
  const rivalRating = side === 0 ? match.before_b : match.before_a;
  if (rivalRating - ownRating >= 200) stats.events.add('upset');
  if (lostToRival >= 3) stats.events.add('revenge');
  if (match.best_of === 5 && match.sets.slice(0, 2).every(s => s[side] < s[1-side])) stats.events.add('match-comeback');
  if (match.sets.some(s => s[side] === 0 && s[1-side] === 11)) stats.events.add('zero-comeback');
}
export function matchAwardCompleted(stats, kind) {
  if (kind === 'win-streak') return stats.streak;
  if (kind === 'distinct-rivals') return stats.opponents.size;
  if (kind === 'match-count') return stats.matches;
  if(kind==='personal-matches')return Math.max(0,...stats.personalMatches.values());
  if(kind==='daily-rivals')return stats.dailyWins.get(stats.day)?.size||0;
  return stats.events.has(kind) ? 1 : 0;
}
