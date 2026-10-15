import {skills,type Row,type Snapshot} from './catalog';
const validDay=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export const hongKongDay=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export const seasonFor=(day:string)=>Number(day.slice(0,4))-(Number(day.slice(5,7))<7?1:0);
export const seasonLabel=(year:number)=>`${year} / ${year+1}`;
export function seasonStats(data:Snapshot,today=hongKongDay()){
 const bySeason=new Map<number,Set<string>>([[seasonFor(today),new Set()]]);
 for(const j of data.journals)if(validDay(j.date)&&j.date<=today){const season=seasonFor(j.date);if(!bySeason.has(season))bySeason.set(season,new Set());bySeason.get(season)!.add(j.date);}
 return [...bySeason].sort(([a],[b])=>a-b).map(([year,days])=>({year,days:days.size,label:seasonLabel(year)}));
}
export function skillJourneys(data:Snapshot,today=hongKongDay()){
 return skills.map(skill=>{
  const current=data.progress.find(p=>p.skill_id===skill.id),history=(data.progressHistory||[]).filter(h=>h.skill_id===skill.id);
  const journalDays=[...new Set<string>(data.journals.filter(j=>j.skillIds?.includes(skill.id)&&validDay(j.date)&&j.date<=today).map(j=>j.date))].sort();
  const realHistory:Array<Row&{day:string}>=history.filter(h=>!h.baseline&&h.recorded_at&&!Number.isNaN(Date.parse(h.recorded_at))).map(h=>({...h,day:hongKongDay(new Date(h.recorded_at))})).filter(h=>h.day<=today).sort((a,b)=>a.day.localeCompare(b.day));
  const historicalStable=history.some(h=>h.baseline&&h.snapshot?.status===3);
  const finish=historicalStable?null:realHistory.find(h=>h.snapshot?.status===3&&h.previous_status!==3)?.day||null;
  const candidates=[...journalDays,...realHistory.filter(h=>h.snapshot?.status===1||h.snapshot?.status===2).map(h=>h.day)].filter(day=>!finish||day<=finish).sort();
  const start=candidates[0]||null;
  const elapsed=start&&finish?Math.round((Date.parse(finish)-Date.parse(start))/86400000):null;
  const practiceDays=journalDays.filter(day=>(!start||day>=start)&&(!finish||day<=finish)).length;
  const everStable=current?.status===3||history.some(h=>h.snapshot?.status===3);
  return {skill,status:current?.status||0,start,finish,elapsed,practiceDays,everStable,hasRecords:!!current||history.length>0||journalDays.length>0};
 });
}
export function milestoneStats(data:Snapshot,today=hongKongDay()){
 const seasons=seasonStats(data,today),days=seasons.reduce((n,s)=>n+s.days,0),stable=skillJourneys(data,today).filter(j=>j.everStable).length;
 return [
  {id:'first-day',name:'第一道雪跡',description:'累計留下 1 個滑雪日',value:days,target:1,unit:'日'},
  {id:'five-days',name:'五日累積',description:'累計留下 5 個滑雪日',value:days,target:5,unit:'日'},
  {id:'ten-days',name:'十日雪跡',description:'累計留下 10 個滑雪日',value:days,target:10,unit:'日'},
  {id:'first-stable',name:'第一次穩定',description:'1 項技巧曾自評為指定條件下穩定',value:stable,target:1,unit:'項'},
  {id:'three-stable',name:'穩定累積',description:'3 項技巧曾留下穩定自評',value:stable,target:3,unit:'項'},
  {id:'two-seasons',name:'跨季再出發',description:'在 2 個雪季留下滑雪日誌',value:seasons.filter(s=>s.days>0).length,target:2,unit:'季'}
 ];
}
