import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ExternalLink, MapPin, MountainSnow, Search, SlidersHorizontal, Snowflake, X } from 'lucide-react';
import { resorts, type Resort } from './resorts';
import { trapDialogFocus } from './dialogFocus';

function SnowScene({indoor,region}:{indoor:boolean;region:string}) {
  return <div className={'snow-scene '+(indoor?'indoor':'outdoor')} aria-hidden="true">
    <span className="scene-region">{region}</span>
    <svg viewBox="0 0 620 260" preserveAspectRatio="xMidYMid slice">
      {indoor?<><path className="scene-building" d="M40 216V68L550 28l30 188Z"/><path className="scene-roof" d="M40 68 550 28 580 216M150 60v156M260 51v165M370 42v174M480 34v182"/><path className="scene-back" d="M40 216 496 97 580 216Z"/><path className="scene-front" d="M40 216 440 156 580 216Z"/><path className="scene-track" d="M483 112C387 143 290 118 323 159S165 167 123 205"/></>:<><path className="scene-back" d="M-20 250 146 71 249 174 402 30 645 250Z"/><path className="scene-front" d="M-20 260 199 116 353 260 460 120 645 260Z"/><path className="scene-snow" d="m146 71-43 47 43-15 32 20Zm256-41-49 47 46-13 42 21ZM199 116l-46 30 44-7 38 23Z"/><path className="scene-track" d="M401 89c-115 29 99 44-27 71S217 184 266 239"/></>}
      <path className="scene-lift" d={indoor?'M120 210 487 91':'M108 234 382 104'}/>
      <path className="scene-lift" d={indoor?'M302 157v40M475 95v60':'M190 199v44M318 131v58'}/>
    </svg><small>場景示意</small>
  </div>;
}

export function ResortField({initial=''}:{initial?:string}) {
  const [value,setValue]=useState(initial);
  const match=resorts.find(r=>r.name===value);
  return <label className="field"><span>雪場 / 地區</span><input aria-label="雪場 / 地區" name="resort" value={value} onChange={e=>setValue(e.target.value)} list="trip-resort-choices" required maxLength={120} placeholder="選擇目錄雪場，或自行填寫"/><datalist id="trip-resort-choices">{resorts.map(r=><option key={r.id} value={r.name}>{r.region} / {r.type}</option>)}</datalist><small>可選擇目錄雪場，也可保留自己的雪場或地區名稱。</small>{match&&<a className="resort-form-source" href={match.url} target="_blank" rel="noopener noreferrer">{match.linkLabel}<ExternalLink size={13}/></a>}</label>;
}

export default function ResortExplorer({selectedId,onOpen,onPlan}:{selectedId:string|null;onOpen:(id:string|null)=>void;onPlan:(resort:Resort)=>void}) {
  const [area,setArea]=useState('全部'),[region,setRegion]=useState('全部'),[type,setType]=useState('全部'),[query,setQuery]=useState(''),[showFilters,setShowFilters]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(showFilters)dialog.current?.showModal();return()=>dialog.current?.close();},[showFilters]);
  const areas=['全部','日本','香港附近','香港'];
  const availableRegions=Array.from(new Set(resorts.filter(r=>area==='全部'||(area==='日本'?r.country==='日本':area==='香港附近'?r.country==='中國內地':false)).map(r=>r.region)));
  const filtered=resorts.filter(r=>(area==='全部'||(area==='日本'?r.country==='日本':area==='香港附近'?r.country==='中國內地':false))&&(region==='全部'||region===r.region)&&(type==='全部'||r.type===type)&&`${r.name} ${r.localName} ${r.region} ${r.country}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const reset=()=>{setArea('全部');setRegion('全部');setType('全部');setQuery('');};
  const active=[area,region,type].filter(v=>v!=='全部').length;
  function filters(){return <><label className="field"><span>目的地</span><select aria-label="目的地" value={area} onChange={e=>{setArea(e.target.value);setRegion('全部');}}>{areas.map(a=><option key={a}>{a}</option>)}</select></label><label className="field"><span>地區</span><select aria-label="地區" value={region} onChange={e=>setRegion(e.target.value)}><option>全部</option>{availableRegions.map(a=><option key={a}>{a}</option>)}</select></label><label className="field"><span>雪場類型</span><select aria-label="雪場類型" value={type} onChange={e=>setType(e.target.value)}>{['全部','戶外雪場','室內真雪'].map(a=><option key={a}>{a}</option>)}</select></label></>;}
  const selected=resorts.find(r=>r.id===selectedId);
  if(selectedId&&!selected)return <section className="resort-empty"><MountainSnow size={32}/><h1>沒有找到這個雪場</h1><p>這個目錄連結可能已更新。請返回探索頁重新選擇。</p><button className="primary" onClick={()=>onOpen(null)}>返回雪場探索</button></section>;
  if(selected)return <div className="resort-detail">
    <button className="text-button resort-back" onClick={()=>onOpen(null)}><ChevronLeft size={16}/>返回雪場探索</button>
    <section className="resort-detail-hero"><SnowScene indoor={selected.type==='室內真雪'} region={selected.region}/><div className="resort-detail-intro"><span className="badge">{selected.country} / {selected.type}</span><h1>{selected.name}</h1><p className="resort-local-name">{selected.localName}</p><p>{selected.summary}</p><button className="primary" onClick={()=>onPlan(selected)}>在此規劃雪旅<ArrowUpRight size={18}/></button><small>帶入雪場與官方連結，接著安排自己的行程。</small></div></section>
    <div className="resort-detail-columns"><div><section className="resort-info-section"><h2>雪場概覽</h2><ul className="resort-highlights">{selected.highlights.map(v=><li key={v}><Snowflake size={16}/>{v}</li>)}</ul><p className="muted small">戶外雪道依雪況開放；室內真雪由場館造雪。圖案為場景示意，並非實景或雪道圖。</p></section><section className="resort-info-section"><h2>位置與交通</h2><p className="resort-address"><MapPin size={18}/>{selected.address}</p><p>{selected.access}</p><a className="text-button" href={selected.id==='shenzhen-huafa'?'https://amap.com/place/B0LA5ZQDSF':selected.id==='guangzhou-bonski'?'https://ditu.amap.com/place/B0IDZR80JA':`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.localName+' '+selected.address)}`} target="_blank" rel="noopener noreferrer">在地圖查看位置<ExternalLink size={14}/></a></section><section className="resort-info-section"><h2>行前確認</h2><p>{selected.planning}</p><p>出發前確認開放日期、當日雪道、票種、裝備及交通。票價與營業時間請查看官方最新公告。</p></section></div><aside className="resort-source-panel"><h2>出發前，回到官方確認。</h2><p>這是雪旅規劃用的目錄，沒有即時雪況或可預約名額。</p><a className="secondary" href={selected.url} target="_blank" rel="noopener noreferrer">{selected.linkLabel}<ExternalLink size={15}/></a><div className="resort-sources"><h3>資料來源</h3>{selected.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.title}<ExternalLink size={12}/></a>)}<small>資料核對：{selected.verified}<br/>並非當日營業確認。</small></div></aside></div>
  </div>;
  return <section className="resort-explorer">
    <header className="resort-intro"><div><p className="resort-intro-note"><MountainSnow size={18}/>下一趟，從這裡開始。</p><h1>遠方的雪山，<br/>週末的雪場。</h1><p>探索日本與香港附近的真雪雪場，<br/>把想去的地方，變成自己的雪旅。</p></div><div className="resort-intro-art"><SnowScene indoor={area==='香港附近'||type==='室內真雪'} region={area==='日本'?'日本雪旅':'尋找下一道雪跡'}/></div></header>
    <div className="resort-area-tabs" aria-label="目的地篩選">{areas.map(a=><button key={a} aria-pressed={area===a} className={area===a?'selected':''} onClick={()=>{setArea(a);setRegion('全部');}}>{a==='全部'?'所有目的地':a}</button>)}</div>
    <div className="resort-search-row"><label className="search"><Search size={17}/><input aria-label="搜尋雪場" placeholder="雪場名稱或地區" value={query} onChange={e=>setQuery(e.target.value)}/></label><button className="secondary resort-mobile-filter" onClick={()=>setShowFilters(true)}><SlidersHorizontal size={17}/>篩選{active>0&&<span>（{active}）</span>}</button><div className="resort-desktop-filters">{filters()}</div></div>
    <div className="resort-results"><p role="status">{filtered.length} 個雪場{area==='香港附近'&&<span> / 深圳、廣州</span>}</p>{(active>0||query)&&<button className="text-button" onClick={reset}>清除篩選<X size={14}/></button>}</div>
    {filtered.length?<div className="resort-grid">{filtered.map(r=><a key={r.id} className="resort-card" href={'#resorts/'+r.id} onClick={e=>{e.preventDefault();onOpen(r.id);}}><SnowScene indoor={r.type==='室內真雪'} region={r.region}/><div className="resort-card-content"><div className="row-between"><span className="badge">{r.type}</span><ArrowUpRight size={19}/></div><h2>{r.name}</h2><p>{r.summary}</p><div className="resort-card-bottom"><span>{r.country} / {r.region}</span><span>查看雪場</span></div></div></a>)}</div>:<div className="resort-empty"><MountainSnow size={34}/><h2>{area==='香港'?'香港真雪雪場，尚待收錄。':'沒有符合條件的雪場'}</h2><p>{area==='香港'?'目前未核實到可收錄的香港真雪滑雪場。可先查看深圳與廣州的室內真雪雪場。':'試試其他目的地、地區或雪場類型。'}</p><button className="secondary" onClick={()=>{setArea('香港附近');setRegion('全部');setType('室內真雪');setQuery('');}}>查看香港附近室內真雪</button><button className="text-button" onClick={reset}>清除所有篩選</button></div>}
    <p className="footnote resort-directory-note">首批收錄 {resorts.length} 個雪場，資料核對於 2026-10-14。只收錄戶外雪場與室內真雪；票價、雪況及營業時間請以官方公告為準。</p>
    {showFilters&&<dialog ref={dialog} className="resort-filter-dialog" aria-labelledby="resort-filter-title" onKeyDown={trapDialogFocus} onCancel={e=>{e.preventDefault();setShowFilters(false);}}><div className="modal-heading"><h2 id="resort-filter-title">找到想去的雪場</h2><button className="icon-button" aria-label="關閉雪場篩選" onClick={()=>setShowFilters(false)}><X size={21}/></button></div><div className="form-fields">{filters()}</div><div className="resort-filter-footer"><button className="secondary" onClick={reset}>清除篩選</button><button className="primary" onClick={()=>setShowFilters(false)}>查看 {filtered.length} 個雪場</button></div></dialog>}
  </section>;
}
