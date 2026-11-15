import type {Row} from './catalog';
import {gearHistory} from './gearSetup';

export const maintenanceTypes=['打蠟','修邊','維修','清潔','其他'];
export type PackingItem={id:string;text:string;checked:boolean;gearId:string|null};
export function addPackingGear(items:PackingItem[],gear:Row[],makeId:()=>string):PackingItem[]{
 const result=[...items],ids=new Set(items.map(i=>i.gearId));
 for(const g of gear){
  if(result.length>=100)break;
  if(g.status==='已退役'||ids.has(g.id))continue;
  result.push({id:makeId(),text:g.name,checked:false,gearId:g.id});ids.add(g.id);
 }
 return result;
}
export function maintenanceUseDays(id:string,date:string,usage:Row[],journals:Row[],today:string):number{
 return new Set(gearHistory(id,usage,journals,today).entries.filter(e=>e.journal.date>date&&e.journal.date<=today).map(e=>e.journal.date)).size;
}
