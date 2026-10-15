import {ArrowUpRight,ChevronLeft,Flag,Plus,Pencil,BookOpen,ExternalLink,Clock,Search} from 'lucide-react';
import {skills,skillGroups,statuses,focusSkillIds,type Snapshot} from './catalog';
import SkillIcon from './SkillIcon';
import ProgressInsights from './ProgressInsights';
import {JournalGallery} from './JournalMedia';
import {AssessmentSummary} from './SkillAssessment';
import {readAssessment} from './assessmentCatalog';

type Props={data:Snapshot;selectedId:string|null;filter:string;query:string;disabled:boolean;onFilter:(v:string)=>void;onQuery:(v:string)=>void;onSelect:(id:string|null)=>void;onManageFocus:()=>void;onEdit:(id:string)=>void;onQuickRecord:(id:string)=>void};
const safeLink=(url:string)=>/^https?:\/\//i.test(url);
const eventTime=(v:string)=>{const d=new Date(v);return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat('zh-HK',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);};


export default function SkillProgress(p:Props){
 const {data,selectedId,filter,query,disabled,onFilter,onQuery,onSelect,onManageFocus,onEdit,onQuickRecord}=p;
 if(selectedId==='insights')return <ProgressInsights data={data} onBack={()=>onSelect(null)}/>;
 const focus=focusSkillIds(data),progress=new Map(data.progress.map(v=>[v.skill_id,v]));
 const journalsFor=(id:string)=>data.journals.filter(j=>j.skillIds?.includes(id)).sort((a,b)=>b.date.localeCompare(a.date)||String(b.updated_at||'').localeCompare(String(a.updated_at||'')));
 const selected=skills.find(s=>s.id===selectedId);
 const active=data.progress.filter(v=>v.status===1||v.status===2).length,stable=data.progress.filter(v=>v.status===3).length;
 if(selectedId&&!selected)return <section className="empty"><h1>找不到這項技巧</h1><button className="secondary" onClick={()=>onSelect(null)}>返回所有技巧</button></section>;
 if(selected){
  const current=progress.get(selected.id)||{status:0};const journals=journalsFor(selected.id);
  const history=(data.progressHistory||[]).filter(h=>h.skill_id===selected.id);
  const entries=[...journals.map(j=>({id:'journal-'+j.id,kind:'journal',date:j.date,time:Date.parse(j.date+'T12:00:00+08:00'),row:j})),...history.map(h=>({id:'progress-'+h.id,kind:'progress',date:h.recorded_at,time:Date.parse(h.recorded_at),row:h}))].sort((a,b)=>b.time-a.time||a.id.localeCompare(b.id));
  return <section className="skill-detail">
   <button className="text-button skill-detail-back" onClick={()=>onSelect(null)}><ChevronLeft size={16}/>返回所有技巧</button>
   <header className="skill-detail-heading"><div><p>{skillGroups[selected.group]}</p><h1>{selected.name}</h1></div><span className={`badge status-${current.status}`}>{statuses[current.status]}</span></header>
   <div className="skill-detail-intro"><SkillIcon id={selected.id}/><div><p>{selected.description}</p><div className="button-group"><button className="primary" disabled={disabled} onClick={()=>onQuickRecord(selected.id)}><Plus size={17}/>記錄這項練習</button><button className="secondary" disabled={disabled} onClick={()=>onEdit(selected.id)}><Pencil size={15}/>更新技巧與自評</button></div>{focus.includes(selected.id)&&<small className="focus-included"><Flag size={13}/>已加入我的練習重點</small>}</div></div>
   <div className="skill-detail-facts"><div><strong>{journals.length}</strong><span>篇練習日誌</span></div><div><span>最近練習</span><b>{journals[0]?.date||'尚未記錄'}</b></div></div>
   <div className="skill-detail-columns"><div>
    <section className="skill-current"><h2>目前做到哪裡</h2><dl><div><dt>已做到的條件</dt><dd>{current.conditions||'寫下雪道、雪況和正腳／反腳，讓進度更具體。'}</dd></div><div><dt>下一步練習</dt><dd>{current.next_step||'選一個下次想重溫的小重點。'}</dd></div>{current.notes&&<div><dt>練習心得</dt><dd>{current.notes}</dd></div>}{current.feedback&&<div><dt>教練回饋</dt><dd>{current.feedback}</dd></div>}</dl>{current.video&&safeLink(current.video)&&<a className="text-button" href={current.video} target="_blank" rel="noopener noreferrer">目前的影片或照片<ExternalLink size={14}/></a>}<AssessmentSummary skillId={selected.id} value={current.assessment} onEdit={disabled?undefined:()=>onEdit(selected.id)}/></section>
    <section className="skill-timeline"><div className="section-heading"><h2>我的練習時間軸</h2><BookOpen size={20}/></div><p className="muted small">日誌按滑雪日期排列；技巧更新按香港時間顯示。</p>
     {entries.length?<ol>{entries.map(e=>{const r=e.row,s=r.snapshot||{};return <li key={e.id} className={'timeline-entry '+e.kind}><span className="timeline-dot" aria-hidden="true"/><article><div className="timeline-meta"><time dateTime={e.date}>{e.kind==='journal'?e.date:eventTime(e.date)}</time><span>{e.kind==='journal'?'練習日誌':r.baseline?'既有進度快照':'技巧更新'}</span></div>{e.kind==='journal'?<><h3>{r.resort}</h3>{r.snow&&<p className="timeline-conditions">{r.snow}</p>}<p className="preserve">{r.notes||'已記錄這項練習。'}</p>{r.next_step&&<p className="timeline-next"><Flag size={13}/>下次：{r.next_step}</p>}<JournalGallery items={r.media}/>{r.video&&safeLink(r.video)&&<a href={r.video} target="_blank" rel="noopener noreferrer">查看影片或照片<ExternalLink size={13}/></a>}</>:<><h3>{r.baseline?'首次納入時間軸':r.previous_status===null?'首次記錄技巧':r.previous_status!==s.status?`${statuses[r.previous_status]} → ${statuses[s.status]}`:'補充練習紀錄'}</h3><span className={`badge status-${s.status}`}>{statuses[s.status]}</span>{s.conditions&&<p>條件：{s.conditions}</p>}{s.notes&&<p className="preserve">{s.notes}</p>}{s.next_step&&<p className="timeline-next"><Flag size={13}/>下一步：{s.next_step}</p>}{s.feedback&&<p className="preserve">教練回饋：{s.feedback}</p>}{s.video&&safeLink(s.video)&&<a href={s.video} target="_blank" rel="noopener noreferrer">查看當時的影片或照片<ExternalLink size={13}/></a>}{s.assessment&&<details className="timeline-assessment"><summary>查看當時的自評與卡關</summary><AssessmentSummary skillId={selected.id} value={s.assessment} compact/></details>}{r.baseline&&<small>以當時已保存的進度作為起點，沒有更早的狀態變化紀錄。</small>}</>}</article></li>;})}</ol>:<div className="skill-history-empty"><Clock size={25}/><h3>第一筆練習，從今天開始。</h3><p>記錄一次滑行，或更新技巧與自評，讓自己的變化留在這裡。</p><button className="secondary" disabled={disabled} onClick={()=>onQuickRecord(selected.id)}>記錄一次練習<Plus size={15}/></button></div>}
    </section>
   </div><aside className="skill-detail-aside"><h2>帶著一個重點上雪</h2><p>{current.next_step||'先寫下下一次想練習的部分，再留下每次滑行的發現。'}</p><button className="secondary" disabled={disabled} onClick={onManageFocus}><Flag size={15}/>{focus.includes(selected.id)?'調整練習重點':'選擇練習重點'}</button><h3>相關收藏</h3>{data.resources.filter(r=>r.skill_id===selected.id).map(r=><div className="skill-linked-resource" key={r.id}><strong>{r.title}</strong>{r.notes&&<p className="preserve">{r.notes}</p>}{r.url&&safeLink(r.url)&&<a className="text-button" href={r.url} target="_blank" rel="noopener noreferrer">開啟收藏<ExternalLink size={13}/></a>}</div>)}{!data.resources.some(r=>r.skill_id===selected.id)&&<p className="small">收藏教學或筆記時，可連結這項技巧。</p>}</aside></div>
  </section>;
 }
 const filtered=skills.filter(s=>(filter==='全部'||skillGroups[s.group]===filter)&&s.name.toLowerCase().includes(query.toLowerCase()));
 return <section className="practice-progress">
  <div className="page-title"><div><h1>我的進度</h1><p>帶著重點上雪，留下每一次練習。</p></div><button className="secondary" onClick={()=>onSelect("insights")}>查看雪季成長<ArrowUpRight size={16}/></button></div>
  <section className="practice-focus" aria-labelledby="focus-title"><header><div><p>下一次上雪</p><h2 id="focus-title">我的練習重點</h2><span>選 1–3 項技巧，把注意力放在下一個小進步。</span></div><button className="secondary" disabled={disabled} onClick={onManageFocus}><Flag size={15}/>{focus.length?'調整重點':'選擇重點'}</button></header>
   {focus.length?<div className="focus-grid">{focus.map(id=>{const s=skills.find(s=>s.id===id)!,v=progress.get(id)||{status:0},j=journalsFor(id);return <article key={id} className="focus-card"><div className="focus-card-heading"><SkillIcon id={id}/><span className={`badge status-${v.status}`}>{statuses[v.status]}</span></div><h3>{s.name}</h3><p>{v.next_step||'進入技巧頁，寫下一個下次想練的重點。'}</p><small>最近練習：{j[0]?.date||'尚未記錄'}</small><div className="focus-card-actions"><button className="primary" disabled={disabled} onClick={()=>onQuickRecord(id)}><Plus size={14}/>記錄練習</button><button className="text-button" onClick={()=>onSelect(id)}>查看歷程<ArrowUpRight size={14}/></button></div></article>;})}</div>:<div className="focus-empty"><Flag size={24}/><p>想重溫後刃，還是練習下一道彎？<br/>把這次想專注的技巧放在這裡。</p></div>}
  </section>
  <div className="skill-summary"><div><strong>{skills.length}</strong><span>可記錄的技巧</span></div><div><strong>{active}</strong><span>正在練習</span></div><div><strong>{stable}</strong><span>指定條件下穩定</span></div><p>每一次進步，<br/>都從一個具體的練習開始。</p></div>
  <div className="toolbar"><div className="filters">{['全部',...skillGroups].map(v=><button className={filter===v?'filter selected':'filter'} key={v} onClick={()=>onFilter(v)}>{v}</button>)}</div><label className="search"><Search size={16}/><input aria-label="搜尋技巧" value={query} onChange={e=>onQuery(e.target.value)} placeholder="搜尋技巧"/></label></div>
  <div className="skill-grid">{filtered.map(s=>{const v=progress.get(s.id)||{status:0},j=journalsFor(s.id);return <button className={'skill-card group-'+s.group} key={s.id} onClick={()=>onSelect(s.id)}><div className="row-between"><span className="muted small">{skillGroups[s.group]}</span><span className={`badge status-${v.status}`}>{statuses[v.status]}</span></div><SkillIcon id={s.id}/><h3>{s.name}{focus.includes(s.id)&&<Flag size={13} className="skill-focus-flag" aria-label="練習重點"/>}</h3><p>{v.conditions||s.description}</p>{readAssessment(v.assessment).blockers.some(b=>!b.resolved)&&<small className="skill-blocker-hint"><Flag size={13}/>{readAssessment(v.assessment).blockers.filter(b=>!b.resolved).length} 項待改善</small>}<div className="skill-footer"><span>{j.length?`${j.length} 篇練習日誌`:'開始留下練習'}</span><span>查看時間軸<ArrowUpRight size={14}/></span></div></button>;})}</div>
  {!filtered.length&&<div className="empty"><h3>沒有找到技巧</h3><p>試試其他名稱，或切換分類。</p></div>}
  <p className="footnote">練習重點與技巧更新只有你能查看。日誌需自行選擇是否分享給同行同伴；資料收藏則為全體登入用戶共用。</p>
 </section>;
}


