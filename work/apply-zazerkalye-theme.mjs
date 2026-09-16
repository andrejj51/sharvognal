import {readFileSync,writeFileSync} from 'node:fs';
const path=new URL('../public/app.js',import.meta.url);let source=readFileSync(path,'utf8');
const old='<div class="page-head"><div><div class="eyebrow">Кто сегодня за столом</div>';
if(!source.includes(old))throw new Error('Table heading not found');
source=source.replace(old,'<div class="page-head table-scene"><div><div class="eyebrow">Зазеркальный стол · рейтинг компании</div>');
writeFileSync(path,source);
