import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
const root='C:/Users/peche/Documents/ChatGPT/ranked';
if(process.argv[2]==='backup'){
  mkdirSync(root+'/work/backups',{recursive:true});
  const db=new DatabaseSync(root+'/data/ping-pong.sqlite');
  const path=root+'/work/backups/before-awards-update-'+Date.now()+'.sqlite';
  db.prepare('VACUUM INTO ?').run(path);
  console.log(JSON.stringify({backup:true,players:db.prepare('SELECT count(*) AS n FROM players').get().n,matches:db.prepare('SELECT count(*) AS n FROM matches').get().n}));
  db.close();
}else{
  const response=await fetch('http://127.0.0.1:8787/api/state');
  if(!response.ok)throw new Error('Local app unavailable');
  const state=await response.json();
  if(state.awards.length!==15||!state.awards.some(a=>a.id==='knees')||!Array.isArray(state.award_progress))throw new Error('Updated app not running');
  console.log(JSON.stringify({ready:true,players:state.players.length,matches:state.matches.length,awards:state.awards.length}));
}
