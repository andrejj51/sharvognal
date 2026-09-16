import {readFileSync,writeFileSync} from 'node:fs';
const path=new URL('../public/app.js',import.meta.url);let source=readFileSync(path,'utf8');
const old='<h3 class="award-name">${esc(a.title)}</h3>';
if(!source.includes(old))throw new Error('Award title markup missing');
source=source.replace(old,'${a.character?`<p class="award-character">${esc(a.character)}</p>`:\'\'}'+old);
source=source.replace('aria-label="Иллюстрация: ${esc(a.title)}"','aria-label="Иллюстрация: ${esc(a.character||a.title)}"');
writeFileSync(path,source);
