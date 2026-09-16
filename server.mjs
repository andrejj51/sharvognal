import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import {randomBytes} from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, resolve, sep } from 'node:path';
import {isIP} from 'node:net';
import { createStore } from './db.mjs';
import {createClub} from './club.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const store = createStore(process.env.PINGPONG_DB || join(root, 'data', 'ping-pong.sqlite'));
const publicDir = join(root, 'public');
const runtimeDir = process.env.PINGPONG_RUNTIME || join(root, '.runtime');
const port = Number(process.env.PORT || 8787);
const host = process.env.PINGPONG_HOST || '127.0.0.1';
const publicUrl = process.env.PINGPONG_PUBLIC_URL || '';
if(publicUrl && !/^https?:\/\/[^/]+$/.test(publicUrl)) throw new Error('PINGPONG_PUBLIC_URL должен быть адресом сайта без пути и завершающего /.');
mkdirSync(runtimeDir,{recursive:true});
const setupPath=join(runtimeDir,'setup-key');
if(!existsSync(setupPath)) writeFileSync(setupPath,randomBytes(24).toString('hex'),{mode:0o600});
const club=createClub(store,{setupKey:readFileSync(setupPath,'utf8').trim(),publicUrl});
const setupGuide=process.env.PINGPONG_SETUP_GUIDE || join(root,'ADMIN-SETUP.txt');
if(club.state(null).auth.setup_required) writeFileSync(setupGuide,`Откройте сайт → «Настроить клуб».\nКод первой настройки: ${readFileSync(setupPath,'utf8').trim()}\nВыберите свой существующий профиль либо создайте новый, задайте логин и пароль.\nЭтот код позволяет создать только первого администратора. Не передавайте его новым игрокам.\n`,{mode:0o600});
const allowedOrigins=new Set([`http://127.0.0.1:${port}`,`http://localhost:${port}`,...(publicUrl?[new URL(publicUrl).origin]:[])]);
const allowedHosts=new Set([...allowedOrigins].map(origin=>new URL(origin).host));
const attempts=new Map();
const trustedProxyAddresses=new Set(['127.0.0.1','::1','::ffff:127.0.0.1']);
function clientAddress(req) {
  const remote=req.socket.remoteAddress||'unknown';
  if(!trustedProxyAddresses.has(remote)) return remote;
  const header=Array.isArray(req.headers['x-forwarded-for'])?req.headers['x-forwarded-for'][0]:req.headers['x-forwarded-for'];
  const forwarded=String(header||'').split(',')[0].trim();
  return isIP(forwarded)?forwarded:remote;
}
function limit(req) {
  const key=clientAddress(req),time=Date.now(),old=attempts.get(key);
  const item=old&&old.until>time?old:{count:0,until:time+15*60000};
  if(++item.count>30) {const e=new Error('Слишком много попыток. Повторите через 15 минут.');e.status=429;throw e;}
  if(attempts.size>5000) for(const [k,v] of attempts) if(v.until<=time) attempts.delete(k);
  attempts.set(key,item);
}
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const server = http.createServer(async (req, res) => {
  const json = (code, value) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
  try {
    const url = new URL(req.url, `http://${host}:${port}`);
    if (!allowedHosts.has(req.headers.host)) return json(403, { error: 'Недопустимый адрес запроса.' });
    if (req.headers.origin && !allowedOrigins.has(req.headers.origin)) return json(403, { error: 'Запрос разрешён только с этого сайта.' });
    if(req.headers['sec-fetch-site']==='cross-site'&&url.pathname.startsWith('/api/')) return json(403,{error:'Запрос разрешён только с этого сайта.'});
    const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('pp_session='))?.slice(11);
    const user=club.session(token);
    if (url.pathname === '/api/health' && req.method === 'GET') return json(200, { app: 'zazerkalye-ping-pong', ready: true });
    if (url.pathname === '/api/state' && req.method === 'GET') return json(200, club.state(user));
    if (url.pathname.startsWith('/api/')) {
      if (!['POST', 'PUT', 'DELETE'].includes(req.method)) return json(405, { error: 'Метод не поддерживается.' });
      if (req.method !== 'DELETE' && !req.headers['content-type']?.startsWith('application/json')) return json(415, { error: 'Ожидается JSON.' });
      let size = 0, chunks = [];
      for await (const chunk of req) { size += chunk.length; if (size > 65536) { json(413, { error: 'Слишком большой запрос.' }); return; } chunks.push(chunk); }
      let input = {};
      if (chunks.length) { try { input = JSON.parse(Buffer.concat(chunks).toString()); } catch { return json(400, { error: 'Некорректный JSON.' }); } }
      if (!input || typeof input !== 'object' || Array.isArray(input)) return json(400, { error: 'Некорректный запрос.' });
      let id;
      if(/^\/api\/auth\/(setup|register|login)$/.test(url.pathname)&&req.method==='POST') {
        limit(req);
        const action=url.pathname.split('/').pop(),next=await club[action](input);
        res.setHeader('Set-Cookie',`pp_session=${next}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${publicUrl.startsWith('https:')?'; Secure':''}`);
        if(action==='setup') writeFileSync(setupGuide,'Администратор создан. Для входа используйте свой логин и пароль.\n');
        return json(200,{state:club.state(club.session(next))});
      }
      club.checkCsrf(user,req.headers['x-csrf-token']);
      if(url.pathname==='/api/auth/logout'&&req.method==='POST') {
        club.logout(token);res.setHeader('Set-Cookie','pp_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return json(200,{state:club.state(null)});
      }
      if (url.pathname === '/api/players' && req.method === 'POST') id = club.addPlayer(user,input);
      else if (url.pathname === '/api/matches' && req.method === 'POST') id = club.submitMatch(user,input);
      else if (/^\/api\/matches\/\d+$/.test(url.pathname) && req.method === 'PUT') id = club.editMatch(user,Number(url.pathname.split('/').pop()),input);
      else if (/^\/api\/matches\/\d+$/.test(url.pathname) && req.method === 'DELETE') club.editMatch(user,Number(url.pathname.split('/').pop()),input,true);
      else if (/^\/api\/matches\/\d+\/dispute$/.test(url.pathname) && req.method === 'POST') id=club.disputeMatch(user,Number(url.pathname.split('/')[3]),input);
      else if (/^\/api\/proposals\/\d+\/decision$/.test(url.pathname) && req.method === 'POST') id=club.decide(user,Number(url.pathname.split('/')[3]),input);
      else if (/^\/api\/proposals\/\d+$/.test(url.pathname) && req.method === 'PUT') id=club.editProposal(user,Number(url.pathname.split('/')[3]),input);
      else if(url.pathname==='/api/meeting'&&req.method==='PUT') club.saveMeeting(user,input);
      else if(url.pathname==='/api/accounts'&&req.method==='POST') id=await club.createAccount(user,input);
      else if(/^\/api\/accounts\/\d+$/.test(url.pathname)&&req.method==='PUT') await club.manageAccount(user,Number(url.pathname.split('/')[3]),input);
      else if (url.pathname === '/api/awards' && req.method === 'PUT') club.saveAwards(user,input);
      else if (/^\/api\/players\/\d+\/main-award$/.test(url.pathname) && req.method === 'PUT') club.setMain(user,Number(url.pathname.split('/')[3]),input);
      else if (/^\/api\/players\/\d+\/socials$/.test(url.pathname) && req.method === 'PUT') club.saveSocials(user,Number(url.pathname.split('/')[3]), input);
      else return json(404, { error: 'Действие не найдено.' });
      return json(200, { id, state: club.state(club.session(token)) });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(405, { error: 'Метод не поддерживается.' });
    const file = resolve(publicDir, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(publicDir + sep)) return json(404, { error: 'Файл не найден.' });
    try {
      if (!(await stat(file)).isFile()) throw new Error('not-file');
      const content = await readFile(file);
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'", 'Referrer-Policy': 'no-referrer' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch { json(404, { error: 'Файл не найден.' }); }
  } catch (error) { if (!error.status) console.error(error); json(error.status || 500, { error: error.status ? error.message : 'Не удалось сохранить данные. Попробуйте ещё раз.' }); }
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Порт ${port} занят. Закройте другой сервер или задайте PORT.` : error); store.close(); process.exit(1); });
server.listen(port, host, () => {
  mkdirSync(runtimeDir, { recursive: true });
  writeFileSync(join(runtimeDir, 'server.pid'), String(process.pid));
  console.log(`Local: http://${host}:${port}\nSQLite: ${process.env.PINGPONG_DB || join(root, 'data', 'ping-pong.sqlite')}`);
});
function stop() { server.close(() => { store.close(); rmSync(join(runtimeDir, 'server.pid'), { force: true }); process.exit(0); }); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
