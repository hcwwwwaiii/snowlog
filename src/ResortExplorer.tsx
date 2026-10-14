import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, ExternalLink, MapPin, MountainSnow, Search, SlidersHorizontal, X } from 'lucide-react';
import { resorts, type Resort } from './resorts';
import {resortPhotos} from './resortPhotos';
import ResortRegionMap from './ResortRegionMap';
import {resortRegions,regionForResort} from './resortRegions';
import ResortGuideContent from './ResortGuideContent';
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

function ResortVisual({resort}:{resort:Resort}){
 const photo=resortPhotos[resort.id];const [failed,setFailed]=useState(false);
 if(!photo||failed)return <div className="resort-visual-fallback"><SnowScene indoor={resort.type==='室內真雪'} region={resort.region}/><span className="resort-photo-status">{failed?'照片暫未載入':'實景請見官方介紹'}</span></div>;
 return <figure className="resort-photo"><img src={import.meta.env.BASE_URL+photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" onError={()=>setFailed(true)}/><figcaption><span>{resort.region}</span><span>{resort.id==='biwako-valley'?'綠季實景':resort.id==='shenzhen-huafa'?'場館外觀':'歷史實景'}</span></figcaption></figure>;
}

export default function ResortExplorer({selectedId,onOpen,onPlan}:{selectedId:string|null;onOpen:(id:string|null)=>void;onPlan:(resort:Resort)=>void}) {
  const [mapArea,setMapArea]=useState<'日本'|'大灣區'>('日本');
  const [area,setArea]=useState('全部'),[region,setRegion]=useState('全部'),[type,setType]=useState('全部'),[query,setQuery]=useState(''),[showFilters,setShowFilters]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const selectedRegion=selectedId?.startsWith('region/')?resortRegions.find(r=>r.id===selectedId.slice(7)):undefined;
  const selected=resorts.find(r=>r.id===selectedId);
  const isRoot=!selectedId;
  useEffect(()=>{if(showFilters)dialog.current?.showModal();return()=>dialog.current?.close();},[showFilters]);
  useEffect(()=>{setShowFilters(false);setArea('全部');setRegion('全部');setType('全部');setQuery('');},[selectedId]);
  const areas=['全部','日本','大灣區'];
  const base=selectedRegion?resorts.filter(r=>selectedRegion.regions.includes(r.region)):resorts;
  const availableRegions=Array.from(new Set(base.filter(r=>area==='全部'||(area==='日本'?r.country==='日本':r.country==='中國內地')).map(r=>r.region)));
  const filtered=base.filter(r=>(area==='全部'||(area==='日本'?r.country==='日本':r.country==='中國內地'))&&(region==='全部'||region===r.region)&&(type==='全部'||r.type===type)&&`${r.name} ${r.localName} ${r.region} ${r.country}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const reset=()=>{setArea('全部');setRegion('全部');setType('全部');setQuery('');};
  const active=[area,region,type].filter(v=>v!=='全部').length;
  function filters(){return <>{!selectedRegion&&<label className="field"><span>目的地</span><select aria-label="目的地" value={area} onChange={e=>{setArea(e.target.value);setRegion('全部');}}>{areas.map(a=><option key={a}>{a}</option>)}</select></label>}<label className="field"><span>地區</span><select aria-label="地區" value={region} onChange={e=>setRegion(e.target.value)}><option>全部</option>{availableRegions.map(a=><option key={a}>{a}</option>)}</select></label><label className="field"><span>雪場類型</span><select aria-label="雪場類型" value={type} onChange={e=>setType(e.target.value)}>{['全部','戶外雪場','室內真雪'].map(a=><option key={a}>{a}</option>)}</select></label></>;}
  function card(r:Resort){return <a key={r.id} className="resort-card" href={'#resorts/'+r.id} onClick={e=>{e.preventDefault();onOpen(r.id);}}><ResortVisual key={r.id} resort={r}/><div className="resort-card-content"><div className="row-between"><span className="badge">{r.kind||r.type}</span><ArrowUpRight size={19}/></div><h2>{r.name}</h2><p>{r.summary}</p><div className="resort-card-bottom"><span>{r.country} / {r.region}</span><span>查看雪場</span></div></div></a>;}
  const directoryNote=<p className="footnote resort-directory-note">目前收錄 {resorts.length} 個滑雪目的地（含志賀高原滑雪區域），資料核對於 2026-10-14。只收錄戶外雪場與室內真雪；票價、雪況及營業時間請以官方公告為準。</p>;
  if(selectedId&&!selected&&!selectedRegion&&selectedId!=='all')return <section className="resort-empty"><MountainSnow size={32}/><h1>沒有找到這個地區或雪場</h1><p>這個目錄連結可能已更新。請返回探索頁重新選擇。</p><button className="primary" onClick={()=>onOpen(null)}>返回雪場探索</button></section>;
  if(selected){const parent=regionForResort(selected.region);return <div className="resort-detail">
    <div className="resort-detail-breadcrumb"><a href="#resorts" onClick={e=>{e.preventDefault();onOpen(null);}}>雪場探索</a><ChevronRight size={13}/>{parent&&<><a href={'#resorts/region/'+parent.id} onClick={e=>{e.preventDefault();onOpen('region/'+parent.id);}}>{parent.name}</a><ChevronRight size={13}/></>}<span>{selected.name}</span></div>
    <section className="resort-detail-hero"><ResortVisual key={selected.id} resort={selected}/><div className="resort-detail-intro"><span className="badge">{selected.country} / {selected.kind||selected.type}</span><h1>{selected.name}</h1><p className="resort-local-name">{selected.localName}</p><p>{selected.summary}</p><button className="primary" onClick={()=>onPlan(selected)}>在此規劃滑雪之旅<ArrowUpRight size={18}/></button><small>帶入雪場與參考連結，接著安排自己的行程。</small></div></section>
    <div className="resort-detail-columns"><div><ResortGuideContent resort={selected}/><section className="resort-info-section"><h2>位置與交通</h2><p className="resort-address"><MapPin size={18}/>{selected.address}</p><p>{selected.access}</p><a className="text-button" href={selected.id==='shenzhen-huafa'?'https://amap.com/place/B0LA5ZQDSF':selected.id==='guangzhou-bonski'?'https://ditu.amap.com/place/B0IDZR80JA':`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.localName+' '+selected.address)}`} target="_blank" rel="noopener noreferrer">在地圖查看位置<ExternalLink size={14}/></a></section><section className="resort-info-section"><h2>行前確認</h2><p>{selected.planning}</p><p>出發前確認開放日期、當日雪道、票種、裝備及交通。票價與營業時間請查看官方最新公告。</p></section></div><aside className="resort-source-panel"><h2>出發前，回到官方確認。</h2><p>這是滑雪之旅規劃用的目錄，沒有即時雪況或可預約名額。</p><a className="secondary" href={selected.url} target="_blank" rel="noopener noreferrer">{selected.linkLabel}<ExternalLink size={15}/></a>{selected.klook&&<div className="resort-klook"><h3>Klook 參考連結</h3><p>{selected.klook.label}</p><a className="secondary" href={selected.klook.url} target="_blank" rel="noopener noreferrer">在 Klook 查看<ExternalLink size={15}/></a><small>{selected.klook.note||'票種、適用雪季及可選日期以 Klook 頁面為準。'}<br/>連結核對：{selected.klook.verified}</small></div>}<div className="resort-sources"><h3>資料來源</h3>{selected.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.title}<ExternalLink size={12}/></a>)}<small>資料核對：{selected.verified}<br/>並非當日營業確認。</small></div></aside></div>
    <button className="text-button resort-back" onClick={()=>onOpen(parent?'region/'+parent.id:null)}><ChevronLeft size={16}/>返回{parent?.name||'雪場探索'}</button>
  </div>;}
  return <section className="resort-explorer">
    {isRoot?<><header className="resort-map-intro"><div><p className="resort-intro-note"><MountainSnow size={18}/>下一趟，從這裡開始。</p><h1>找到下一趟滑雪之旅。</h1><p>從地圖選一個地區，探索雪場，再安排自己的行程。</p></div><a className="secondary" href="#resorts/all" onClick={e=>{e.preventDefault();onOpen('all');}}>查看全部 {resorts.length} 個目的地<ArrowUpRight size={17}/></a></header><div className="resort-area-tabs" aria-label="地圖目的地">{(['日本','大灣區'] as const).map(a=><button key={a} aria-pressed={mapArea===a} className={mapArea===a?'selected':''} onClick={()=>setMapArea(a)}>{a}</button>)}</div><ResortRegionMap key={mapArea} area={mapArea} onOpen={onOpen}/><div className="resort-quick-search"><label className="search"><Search size={17}/><input aria-label="搜尋所有雪場" placeholder="已有目的地？搜尋雪場名稱或地區" value={query} onChange={e=>setQuery(e.target.value)}/></label></div></>:<><button className="text-button resort-back" onClick={()=>onOpen(null)}><ChevronLeft size={16}/>返回地圖探索</button><header className="resort-region-heading"><div><p>{selectedRegion?.area||'日本與大灣區'}</p><h1>{selectedRegion?selectedRegion.name+'滑雪之旅':'所有雪場'}</h1><p>{selectedRegion?.description||'選擇目的地與雪場，開始安排自己的行程。'}</p></div><MountainSnow size={52}/></header></>}
    {(!isRoot||query.trim())&&<><div className="resort-search-row">{!isRoot&&<label className="search"><Search size={17}/><input aria-label="搜尋雪場" placeholder="雪場名稱或地區" value={query} onChange={e=>setQuery(e.target.value)}/></label>}<button className="secondary resort-mobile-filter" onClick={()=>setShowFilters(true)}><SlidersHorizontal size={17}/>篩選{active>0&&<span>（{active}）</span>}</button><div className="resort-desktop-filters">{filters()}</div></div><div className="resort-results"><p role="status">{filtered.length} 個目的地</p>{(active>0||query)&&<button className="text-button" onClick={reset}>清除篩選<X size={14}/></button>}</div>{filtered.length?<div className="resort-grid">{filtered.map(card)}</div>:<div className="resort-empty"><MountainSnow size={34}/><h2>沒有符合條件的雪場</h2><p>試試其他名稱、地區或雪場類型。</p><button className="secondary" onClick={reset}>清除篩選</button></div>}</>}
    {directoryNote}
    {showFilters&&<dialog ref={dialog} className="resort-filter-dialog" aria-labelledby="resort-filter-title" onKeyDown={trapDialogFocus} onCancel={e=>{e.preventDefault();setShowFilters(false);}}><div className="modal-heading"><h2 id="resort-filter-title">找到想去的雪場</h2><button className="icon-button" aria-label="關閉雪場篩選" onClick={()=>setShowFilters(false)}><X size={21}/></button></div><div className="form-fields">{filters()}</div><div className="resort-filter-footer"><button className="secondary" onClick={reset}>清除篩選</button><button className="primary" onClick={()=>setShowFilters(false)}>查看 {filtered.length} 個目的地</button></div></dialog>}
  </section>;
}

