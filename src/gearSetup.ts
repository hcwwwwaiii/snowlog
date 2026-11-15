import type {Row,Snapshot} from './catalog';

export const gearSpecFields:Record<string,{key:string;label:string;unit?:string}[]>={
 '單板':[{key:'length',label:'板長',unit:'cm'},{key:'profile',label:'板型／拱形'},{key:'flex',label:'硬度'}],
 '固定器':[{key:'flex',label:'硬度'},{key:'mounting',label:'安裝系統'}],
 '雪鞋':[{key:'lacing',label:'綁帶系統'},{key:'flex',label:'硬度'}],
 '頭盔／護具':[{key:'protection',label:'護具種類／規格'}],
 '雪鏡':[{key:'lens',label:'鏡片／透光資訊'}],
 '衣物':[{key:'layer',label:'衣物層次'},{key:'waterproof',label:'防水規格'}],
 '其他':[{key:'detail',label:'其他規格'}],
};
export type GearChoice={mode:'keep'|'set'|'clear';gearIds:string[];setId:string|null;setup:Row};
export const emptyChoice=():GearChoice=>({mode:'clear',gearIds:[],setId:null,setup:{}});
export function setChoice(set:Row):GearChoice{return{mode:'set',gearIds:[...set.gear_ids],setId:set.id,setup:{...set.setup}};}
export function initialJournalGear(data:Snapshot,journal:Row,draft?:GearChoice):GearChoice{
 if(data.gearError)return{...emptyChoice(),mode:'keep'};
 if(draft&&['keep','set','clear'].includes(draft.mode)&&Array.isArray(draft.gearIds))return{...draft,setup:{...draft.setup}};
 const saved=data.journalGear?.find(u=>u.journal_id===journal.id)?.snapshot;
 if(saved)return{mode:'keep',gearIds:saved.items.map((g:Row)=>g.id),setId:saved.setId||null,setup:{...saved.setup}};
 const preset=!journal.id&&data.gearSets?.find(s=>s.is_default&&s.gear_ids.length&&s.gear_ids.every((id:string)=>data.gear?.some(g=>g.id===id&&g.status!=='已退役')));
 return preset?setChoice(preset):emptyChoice();
}
export function gearSpecText(gear:Row):string[]{return(gearSpecFields[gear.category]||[]).filter(f=>gear.specs?.[f.key]!==undefined&&gear.specs[f.key]!=='').map(f=>`${f.label}：${gear.specs[f.key]}${f.unit?' '+f.unit:''}`);}
export function setupText(setup:Row={}):string[]{return[setup.stance,...(['frontAngle','backAngle','stanceWidth'] as const).map((k,i)=>setup[k]!==undefined&&setup[k]!==''?`${['前腳角度','後腳角度','站距'][i]} ${setup[k]}${i===2?' cm':'°'}`:'')].filter(Boolean);}
export function gearHistory(id:string,usage:Row[],journals:Row[],today:string):{entries:Row[];days:number}{
 const entries=usage.filter(u=>u.snapshot?.items?.some((g:Row)=>g.id===id)).flatMap(u=>{const j=journals.find(j=>j.id===u.journal_id);return j?[{...u,journal:j}]:[];}).sort((a,b)=>b.journal.date.localeCompare(a.journal.date));
 return{entries,days:new Set(entries.filter(e=>e.journal.date<=today).map(e=>e.journal.date)).size};
}
