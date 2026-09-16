import {randomBytes, createHash, timingSafeEqual, scrypt} from 'node:crypto';
import {promisify} from 'node:util';
import {validateMatch} from './db.mjs';

const derive = promisify(scrypt);
const now = () => new Date().toISOString();
const digest = value => createHash('sha256').update(value).digest('hex');
function fail(message, status=400) { const e=new Error(message);e.status=status;throw e; }
function equal(a,b) { const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y); }
function credentials(input) {
  const login=String(input.login||'').trim().toLowerCase();
  if(!/^[a-z0-9_]{3,32}$/.test(login)) fail('Логин: 3–32 латинские буквы, цифры или знак _.');
  if(typeof input.password!=='string'||input.password.length<10||input.password.length>128) fail('Пароль: от 10 до 128 символов.');
  return login;
}
async function passwordHash(password,salt=randomBytes(16).toString('hex')) {
  const hash=await derive(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
  return {salt,hash:hash.toString('hex')};
}
function reason(input) {
  if(typeof input.reason!=='string'||input.reason.trim().length<3||input.reason.length>300) fail('Укажите причину: от 3 до 300 символов.');
  return input.reason.trim();
}
export function createClub(store,{setupKey,publicUrl=''}={}) {
  const {db,transaction}=store;
  db.exec(`CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY, login TEXT NOT NULL UNIQUE, player_id INTEGER NOT NULL UNIQUE REFERENCES players(id),
    role TEXT NOT NULL CHECK(role IN ('admin','trusted','player')), blocked INTEGER NOT NULL DEFAULT 0,
    salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), csrf TEXT NOT NULL, expires_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS club_settings (id INTEGER PRIMARY KEY CHECK(id=1), join_until TEXT, public_url TEXT NOT NULL DEFAULT '');
    INSERT OR IGNORE INTO club_settings(id) VALUES(1);
    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY, submitted_by INTEGER NOT NULL REFERENCES accounts(id), player_a INTEGER NOT NULL REFERENCES players(id),
      player_b INTEGER NOT NULL REFERENCES players(id), best_of INTEGER NOT NULL, sets TEXT NOT NULL, played_at TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending','disputed','confirmed','rejected','withdrawn')),
      match_id INTEGER REFERENCES matches(id) ON DELETE SET NULL, created_at TEXT NOT NULL, decided_by INTEGER REFERENCES accounts(id),
      decision_reason TEXT, dispute_reason TEXT);
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY, actor_id INTEGER NOT NULL REFERENCES accounts(id), action TEXT NOT NULL, target TEXT NOT NULL,
      reason TEXT NOT NULL, before_json TEXT, after_json TEXT, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_proposal_status ON proposals(status,id);
    CREATE INDEX IF NOT EXISTS idx_session_expiry ON sessions(expires_at);`);
  const settings=()=>db.prepare('SELECT * FROM club_settings WHERE id=1').get();
  const ready=()=>!!db.prepare("SELECT 1 FROM accounts WHERE role='admin'").get();
  const account=id=>db.prepare('SELECT id,login,player_id,role,blocked FROM accounts WHERE id=?').get(id);
  function requireUser(user) {
    const fresh=user&&account(user.id);
    if(!fresh||fresh.blocked) fail('Войдите в свой аккаунт.',401);
    return fresh;
  }
  function requireRole(user,roles=['admin']) { const u=requireUser(user);if(!roles.includes(u.role)) fail('Недостаточно прав.',403);return u; }
  const audit=(user,action,target,why,before=null,after=null)=>db.prepare('INSERT INTO audit(actor_id,action,target,reason,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)').run(user.id,action,String(target),why,before===null?null:JSON.stringify(before),after===null?null:JSON.stringify(after),now());
  function session(token) {
    if(!token||!/^[a-f0-9]{64}$/.test(token)) return null;
    return db.prepare(`SELECT a.id,a.login,a.player_id,a.role,s.csrf FROM sessions s JOIN accounts a ON a.id=s.account_id
      WHERE s.token_hash=? AND s.expires_at>? AND a.blocked=0`).get(digest(token),now())||null;
  }
  function startSession(id) {
    const token=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');
    db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now());
    db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(digest(token),id,csrf,new Date(Date.now()+7*86400000).toISOString());
    return token;
  }
  function checkCsrf(user,csrf) { requireUser(user);if(!csrf||!equal(csrf,user.csrf)) fail('Обновите страницу и повторите действие.',403); }
  async function setup(input) {
    if(ready()) fail('Администратор уже создан.',409);
    if(!setupKey||!equal(input.setup_key||'',setupKey)) fail('Неверный код настройки.',403);
    const login=credentials(input),password=await passwordHash(input.password);
    return transaction(()=>{
      if(ready()) fail('Администратор уже создан.',409);
      let playerId=Number(input.player_id);
      if(playerId) { if(!db.prepare('SELECT id FROM players WHERE id=?').get(playerId)) fail('Игрок не найден.'); }
      else playerId=store.addPlayer({name:input.name});
      db.prepare("UPDATE players SET membership_status='active' WHERE id=?").run(playerId);
      const id=Number(db.prepare("INSERT INTO accounts(login,player_id,role,salt,password_hash,created_at) VALUES(?,?,'admin',?,?,?)").run(login,playerId,password.salt,password.hash,now()).lastInsertRowid);
      audit({id},'setup',playerId,'Создан администратор');
      return startSession(id);
    });
  }
  async function register(input) {
    if(!ready()) fail('Клуб ещё не настроен.',403);
    const open=settings().join_until;
    if(!open||open<=now()) fail('Вступление сейчас закрыто. Обратитесь к организатору.',403);
    const login=credentials(input),password=await passwordHash(input.password);
    return transaction(()=>{
      if(!settings().join_until||settings().join_until<=now()) fail('Вступление уже закрыто.',403);
      if(db.prepare('SELECT 1 FROM accounts WHERE login=?').get(login)) fail('Этот логин уже занят.');
      const playerId=store.addPlayer({name:input.name});
      db.prepare("UPDATE players SET membership_status='pending',socials_public=0 WHERE id=?").run(playerId);
      const id=Number(db.prepare("INSERT INTO accounts(login,player_id,role,salt,password_hash,created_at) VALUES(?,?,'player',?,?,?)").run(login,playerId,password.salt,password.hash,now()).lastInsertRowid);
      audit({id},'join',playerId,'Регистрация новичка');
      return startSession(id);
    });
  }
  async function login(input) {
    if(typeof input.login!=='string'||typeof input.password!=='string'||input.password.length>128) fail('Неверный логин или пароль.',401);
    const row=db.prepare('SELECT * FROM accounts WHERE login=?').get(input.login.trim().toLowerCase());
    const password=await passwordHash(input.password,row?.salt||'00000000000000000000000000000000');
    if(!row||!equal(password.hash,row.password_hash)||row.blocked) fail('Неверный логин или пароль.',401);
    // Account may have been blocked or reset while the password was being checked.
    const fresh=db.prepare('SELECT * FROM accounts WHERE id=?').get(row.id);
    if(fresh.blocked||fresh.password_hash!==row.password_hash) fail('Неверный логин или пароль.',401);
    return startSession(row.id);
  }
  function logout(token) { if(token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token)); }
  function state(user) {
    const fresh=user&&account(user.id),isAdmin=fresh?.role==='admin',isTrusted=isAdmin||fresh?.role==='trusted';
    const value=store.state();
    for(const p of value.players) {
      if(!p.socials_public&&!isAdmin&&fresh?.player_id!==p.id) p.socials={};
      p.socials_public=!!p.socials_public;
    }
    const memberRows=db.prepare('SELECT player_id,blocked,role FROM accounts').all();
    for(const p of value.players) {const member=memberRows.find(a=>a.player_id===p.id);p.blocked=!!member?.blocked;p.role=member?.role||'player';}
    value.newcomers=value.players.filter(p=>p.membership_status==='pending'&&memberRows.some(a=>a.player_id===p.id));
    value.players=value.players.filter(p=>p.membership_status==='active');
    value.auth={user:fresh&&!fresh.blocked?{...fresh,csrf:user.csrf}:null,setup_required:!ready()};
    const opts=settings();value.meeting={join_until:opts.join_until,open:ready()&&!!opts.join_until&&opts.join_until>now(),public_url:publicUrl||opts.public_url};
    const rows=fresh&&!fresh.blocked?db.prepare(`SELECT p.*,a.name AS name_a,b.name AS name_b,c.login AS submitter
      FROM proposals p JOIN players a ON a.id=p.player_a JOIN players b ON b.id=p.player_b JOIN accounts c ON c.id=p.submitted_by
      WHERE p.status IN ('pending','disputed') ORDER BY p.id DESC`).all():[];
    value.proposals=rows.filter(p=>isTrusted||p.player_a===fresh.player_id||p.player_b===fresh.player_id||p.submitted_by===fresh.id).map(p=>({...p,sets:JSON.parse(p.sets)}));
    value.accounts=isAdmin?db.prepare('SELECT a.id,a.login,a.player_id,a.role,a.blocked,p.name FROM accounts a JOIN players p ON p.id=a.player_id ORDER BY a.id').all():[];
    value.unclaimed=isAdmin?db.prepare('SELECT id,name FROM players WHERE NOT EXISTS(SELECT 1 FROM accounts WHERE player_id=players.id) ORDER BY name').all():[];
    value.audit=isTrusted?db.prepare('SELECT t.*,a.login AS actor FROM audit t JOIN accounts a ON a.id=t.actor_id ORDER BY t.id DESC LIMIT 100').all().map(t=>({...t,before:t.before_json?JSON.parse(t.before_json):null,after:t.after_json?JSON.parse(t.after_json):null,before_json:undefined,after_json:undefined})):[];
    return value;
  }
  function participants(a,b) {
    for(const id of [a,b]) {
      if(!db.prepare('SELECT id FROM players WHERE id=?').get(id)) fail('Игрок не найден.');
      if(db.prepare('SELECT 1 FROM accounts WHERE player_id=? AND blocked=1').get(id)) fail('Этот игрок заблокирован.');
    }
  }
  function submitMatch(user,input) {
    const u=requireUser(user),v=validateMatch(input),privileged=['admin','trusted'].includes(u.role);
    if(!privileged&&![v.a,v.b].includes(u.player_id)) fail('Можно записать только свой матч.',403);
    participants(v.a,v.b);
    return transaction(()=>{
      const duplicate=db.prepare("SELECT 1 FROM proposals WHERE status IN ('pending','disputed','confirmed') AND player_a=? AND player_b=? AND played_at=? AND sets=?").get(v.a,v.b,v.played_at,JSON.stringify(v.sets));
      if(duplicate) fail('Этот результат уже записан.');
      const id=Number(db.prepare("INSERT INTO proposals(submitted_by,player_a,player_b,best_of,sets,played_at,status,created_at) VALUES(?,?,?,?,?,?,'pending',?)").run(u.id,v.a,v.b,v.best,JSON.stringify(v.sets),v.played_at,now()).lastInsertRowid);
      audit(u,'submit',id,'Предложен результат',null,{player_a:v.a,player_b:v.b,sets:v.sets,played_at:v.played_at});
      if(privileged&&input.observed===true) decide(u,id,{decision:'confirm',reason:'Присутствовал при игре'});
      return id;
    });
  }
  function decide(user,id,input) {
    const u=requireUser(user),p=db.prepare('SELECT * FROM proposals WHERE id=?').get(id);
    if(!p||!['pending','disputed'].includes(p.status)) fail('Заявка уже рассмотрена или не найдена.',409);
    const privileged=['admin','trusted'].includes(u.role),participant=[p.player_a,p.player_b].includes(u.player_id);
    const why=reason(input);
    if(input.decision==='dispute') {
      if(!participant||p.submitted_by===u.id||p.status!=='pending') fail('Этот результат нельзя оспорить.',403);
      return transaction(()=>{db.prepare("UPDATE proposals SET status='disputed',dispute_reason=? WHERE id=?").run(why,id);audit(u,'dispute',id,why);});
    }
    if(input.decision==='withdraw') {
      if(p.submitted_by!==u.id||p.status!=='pending') fail('Отозвать можно только свою ожидающую заявку.',403);
      return transaction(()=>{db.prepare("UPDATE proposals SET status='withdrawn',decision_reason=? WHERE id=?").run(why,id);audit(u,'withdraw',id,why);});
    }
    if(!['confirm','reject'].includes(input.decision)) fail('Выберите решение.');
    if(p.status==='disputed'&&u.role!=='admin') fail('Спор разбирает администратор.',403);
    if(input.decision==='reject'&&u.role!=='admin') fail('Отклонить результат может администратор.',403);
    const members=db.prepare('SELECT membership_status FROM players WHERE id IN (?,?)').all(p.player_a,p.player_b);
    if(!privileged&&(!participant||p.submitted_by===u.id||members.some(m=>m.membership_status!=='active'))) fail('Первую игру новичка подтверждает организатор. Свой результат подтверждать нельзя.',403);
    if(input.decision==='confirm') participants(p.player_a,p.player_b);
    return transaction(()=>{
      let matchId=p.match_id;
      if(input.decision==='confirm') {
        db.prepare("UPDATE players SET ranked_at=CASE WHEN membership_status='pending' THEN ? ELSE ranked_at END,membership_status='active' WHERE id IN (?,?)").run(p.played_at,p.player_a,p.player_b);
        if(!matchId) matchId=store.saveMatch({player_a:p.player_a,player_b:p.player_b,best_of:p.best_of,sets:JSON.parse(p.sets),played_at:p.played_at});
      } else if(matchId) {
        const linked=db.prepare('SELECT id FROM proposals WHERE match_id=?').all(matchId);
        store.deleteMatch(matchId);
        for(const row of linked) db.prepare("UPDATE proposals SET status='rejected',decided_by=?,decision_reason=? WHERE id=?").run(u.id,why,row.id);
        matchId=null;
      }
      db.prepare('UPDATE proposals SET status=?,match_id=?,decided_by=?,decision_reason=? WHERE id=?').run(input.decision==='confirm'?'confirmed':'rejected',matchId,u.id,why,id);
      audit(u,input.decision,id,why,{status:p.status,match_id:p.match_id},{status:input.decision==='confirm'?'confirmed':'rejected',match_id:matchId});
      return matchId;
    });
  }
  function disputeMatch(user,id,input) {
    const u=requireUser(user),m=db.prepare('SELECT * FROM matches WHERE id=?').get(id),why=reason(input);
    if(!m||![m.player_a,m.player_b].includes(u.player_id)) fail('Можно оспорить только свой матч.',403);
    if(db.prepare("SELECT 1 FROM proposals WHERE match_id=? AND status='disputed'").get(id)) fail('Этот матч уже оспорен.',409);
    return transaction(()=>{
      const proposal=Number(db.prepare("INSERT INTO proposals(submitted_by,player_a,player_b,best_of,sets,played_at,status,match_id,created_at,dispute_reason) VALUES(?,?,?,?,?,?,'disputed',?,?,?)").run(u.id,m.player_a,m.player_b,m.best_of,m.sets,m.played_at,id,now(),why).lastInsertRowid);
      audit(u,'dispute-match',id,why);return proposal;
    });
  }
  function editProposal(user,id,input) {
    const u=requireRole(user),why=reason(input),v=validateMatch(input),before=db.prepare('SELECT * FROM proposals WHERE id=?').get(id);
    if(!before||before.match_id||!['pending','disputed'].includes(before.status)) fail('Заявка уже рассмотрена. Обновите страницу.',409);
    participants(v.a,v.b);
    return transaction(()=>{
      db.prepare("UPDATE proposals SET player_a=?,player_b=?,best_of=?,sets=?,played_at=?,status='pending',dispute_reason=NULL WHERE id=?").run(v.a,v.b,v.best,JSON.stringify(v.sets),v.played_at,id);
      audit(u,'edit-proposal',id,why,before,db.prepare('SELECT * FROM proposals WHERE id=?').get(id));
      return decide(u,id,{decision:'confirm',reason:why});
    });
  }
  function editMatch(user,id,input,remove=false) {
    const u=requireRole(user),why=reason(input),before=db.prepare('SELECT * FROM matches WHERE id=?').get(id);
    if(!before) fail('Матч не найден.');
    return transaction(()=>{
      const linked=db.prepare('SELECT id FROM proposals WHERE match_id=?').all(id);
      if(remove) store.deleteMatch(id);
      else {
        const v=validateMatch(input);participants(v.a,v.b);
        db.prepare("UPDATE players SET ranked_at=CASE WHEN membership_status='pending' THEN ? ELSE ranked_at END,membership_status='active' WHERE id IN (?,?)").run(v.played_at,v.a,v.b);
        store.saveMatch(input,id);
      }
      const after=remove?null:db.prepare('SELECT * FROM matches WHERE id=?').get(id);
      // A historical match can have multiple disputes; resolve every linked ticket.
      if(remove) for(const row of linked) db.prepare("UPDATE proposals SET status='rejected',decided_by=?,decision_reason=? WHERE id=?").run(u.id,why,row.id);
      else db.prepare("UPDATE proposals SET status='confirmed',player_a=?,player_b=?,best_of=?,sets=?,played_at=?,decided_by=?,decision_reason=? WHERE match_id=?").run(after.player_a,after.player_b,after.best_of,after.sets,after.played_at,u.id,why,id);
      audit(u,remove?'delete-match':'edit-match',id,why,before,after);return id;
    });
  }
  function saveMeeting(user,input) {
    const u=requireRole(user),hours=Number(input.hours);
    if(![0,1,3,6,12,24].includes(hours)) fail('Выберите длительность встречи.');
    let url=String(input.public_url||'').trim();
    if(url) {
      let parsed;try{parsed=new URL(url);}catch{fail('Проверьте адрес сайта.');}
      if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password||parsed.pathname!=='/'||parsed.search||parsed.hash||url.length>200) fail('Укажите адрес сайта без пути, например https://club.example.');
      url=parsed.origin;
    }
    transaction(()=>{const before=settings();db.prepare('UPDATE club_settings SET join_until=?,public_url=? WHERE id=1').run(hours?new Date(Date.now()+hours*3600000).toISOString():null,url);audit(u,'meeting','club',hours?'Открыто вступление':'Закрыто вступление',before,settings());});
  }
  async function manageAccount(user,id,input) {
    const u=requireRole(user),target=account(id),why=reason(input);
    if(!target) fail('Аккаунт не найден.');
    if(target.role==='admin') fail('Изменить администратора через этот раздел нельзя.');
    const role=input.role||target.role;
    if(!['player','trusted'].includes(role)||typeof input.blocked!=='boolean') fail('Проверьте роль и блокировку.');
    let password=null;
    if(input.password) {credentials({login:target.login,password:input.password});password=await passwordHash(input.password);}
    transaction(()=>{
      let playerId=input.player_id?Number(input.player_id):target.player_id;
      if(playerId!==target.player_id) {
        const old=db.prepare('SELECT wins,losses FROM players WHERE id=?').get(target.player_id);
        if(old.wins||old.losses||db.prepare('SELECT 1 FROM proposals WHERE player_a=? OR player_b=?').get(target.player_id,target.player_id)) fail('Профиль с играми или заявками нельзя перепривязать.');
        if(!db.prepare('SELECT id FROM players WHERE id=?').get(playerId)||db.prepare('SELECT 1 FROM accounts WHERE player_id=?').get(playerId)) fail('Выберите свободный профиль.');
        // The empty registration profile is retained outside the ranking for audit references.
        db.prepare("UPDATE players SET membership_status='pending' WHERE id=?").run(target.player_id);
      }
      db.prepare('UPDATE accounts SET role=?,blocked=?,player_id=? WHERE id=?').run(role,input.blocked?1:0,playerId,id);
      if(password) db.prepare('UPDATE accounts SET salt=?,password_hash=? WHERE id=?').run(password.salt,password.hash,id);
      db.prepare('DELETE FROM sessions WHERE account_id=?').run(id);
      audit(u,'account',id,why,target,account(id));
    });
  }
  async function createAccount(user,input) {
    const u=requireRole(user),login=credentials(input),password=await passwordHash(input.password),playerId=Number(input.player_id);
    if(!['player','trusted'].includes(input.role)) fail('Выберите роль игрока.');
    return transaction(()=>{
      if(!db.prepare('SELECT id FROM players WHERE id=?').get(playerId)||db.prepare('SELECT 1 FROM accounts WHERE player_id=?').get(playerId)) fail('Выберите свободный профиль.');
      if(db.prepare('SELECT 1 FROM accounts WHERE login=?').get(login)) fail('Этот логин уже занят.');
      const id=Number(db.prepare('INSERT INTO accounts(login,player_id,role,salt,password_hash,created_at) VALUES(?,?,?,?,?,?)').run(login,playerId,input.role,password.salt,password.hash,now()).lastInsertRowid);
      audit(u,'create-account',id,'Выдан доступ существующему игроку',null,{player_id:playerId,role:input.role,login});return id;
    });
  }
  function saveSocials(user,id,input) {
    const u=requireUser(user);if(u.role!=='admin'&&u.player_id!==id) fail('Можно менять только свой профиль.',403);
    if(typeof input.public!=='boolean') fail('Укажите видимость соцсетей.');
    transaction(()=>{store.saveSocials(id,input);db.prepare('UPDATE players SET socials_public=? WHERE id=?').run(input.public?1:0,id);audit(u,'socials',id,'Изменены соцсети и их видимость');});
  }
  function setMain(user,id,input) {
    const u=requireUser(user);if(u.role!=='admin'&&u.player_id!==id) fail('Можно менять только свой профиль.',403);
    store.setMain(id,input.award_id);
  }
  function addPlayer(user,input) { const u=requireRole(user);return transaction(()=>{const id=store.addPlayer(input);audit(u,'add-player',id,'Добавлен игрок',null,{name:input.name});return id;}); }
  function saveAwards(user,input) {const u=requireRole(user);transaction(()=>{const before=store.state().awards;store.saveAwards(input);audit(u,'awards','club','Изменены настройки наград',before,store.state().awards);});}
  return {state,session,checkCsrf,setup,register,login,logout,submitMatch,decide,disputeMatch,editProposal,editMatch,saveMeeting,createAccount,manageAccount,saveSocials,setMain,addPlayer,saveAwards};
}
