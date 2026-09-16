import {readFileSync,writeFileSync} from 'node:fs';
const path=new URL('../public/index.html',import.meta.url);
writeFileSync(path,readFileSync(path,'utf8').replace('Мемные трофеи <span>25</span>','Мемные трофеи <span></span>'));
