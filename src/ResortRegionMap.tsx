import {useState,type CSSProperties,type MouseEvent} from 'react';
import {ArrowUpRight,MountainSnow} from 'lucide-react';
import {resorts} from './resorts';
import {resortRegions} from './resortRegions';
import {projectRegion,regionMapGeometry} from './regionMapGeometry';
import {japanPrefectures,projectJapan} from './japanMapGeometry';

export default function ResortRegionMap({area,onOpen}:{area:'日本'|'大灣區';onOpen:(route:string)=>void}){
 const [highlight,setHighlight]=useState<string|null>(null);
 const regions=resortRegions.filter(r=>r.area===area),japan=area==='日本';
 const destinations=(id:string)=>resorts.filter(r=>regions.find(region=>region.id===id)!.regions.includes(r.region));
 const total=regions.reduce((n,r)=>n+destinations(r.id).length,0);
 const open=(event:MouseEvent,id:string)=>{event.preventDefault();onOpen('region/'+id);};
 const selectedRegion=regions.find(r=>r.id===highlight);
 return <section className={'region-map-panel resort-atlas '+(japan?'japan-atlas':'bay-atlas')} aria-label={`${area}地區地圖`}>
  <div className="region-map-visual atlas-visual">
   <div className="atlas-map-heading"><MountainSnow size={18}/><span>{japan?'沿著日本，找到雪山。':'把週末，留給真雪。'}</span></div>
   <svg viewBox={japan?'60 35 625 580':'0 0 600 540'} className="region-map-svg atlas-svg" role="group" aria-label={`${area}地圖，可點選地區`}>
    <title>{area}滑雪目的地</title><desc>選擇地區查看已收錄的雪場；標記為地區概略位置。</desc>
    {japan?<g aria-hidden="true" className="atlas-base-land">{japanPrefectures.map(p=><path d={p.path} key={p.code} fillRule="evenodd"/>)}</g>:<><g aria-hidden="true" className="region-map-land">{regionMapGeometry.bay.map((d,i)=><path d={d} key={i}/>)}</g><text className="map-water-label" x="420" y="394" aria-hidden="true">珠江口</text></>}
    {japan&&<g aria-hidden="true" className="atlas-ocean-text"><text x="165" y="180">日本海</text><text x="535" y="575">太平洋</text></g>}
    {regions.map(r=>{
     const [x,y]=japan?projectJapan(r.longitude,r.latitude):projectRegion(r.longitude,r.latitude,area);
     const [lx,ly]=r.mapLabel||[x+r.labelOffset[0]-8,y+r.labelOffset[1]-28];
     const width=japan?130:116,height=64;const targetX=lx>x?lx:lx+width,targetY=ly+height/2;
     return <a key={r.id} role="link" tabIndex={0} href={'#resorts/region/'+r.id} aria-label={`${r.name}，${destinations(r.id).length} 個滑雪目的地`} className={'atlas-zone'+(highlight===r.id?' highlighted':'')} style={{'--region-color':r.tone||'#abc6d5'} as CSSProperties} onMouseEnter={()=>setHighlight(r.id)} onMouseLeave={()=>setHighlight(null)} onFocus={()=>setHighlight(r.id)} onBlur={()=>setHighlight(null)} onClick={e=>open(e,r.id)}>
      <title>{r.name}，{destinations(r.id).length} 個滑雪目的地</title>
      {japan&&japanPrefectures.filter(p=>p.region===r.id).map(p=><path className="atlas-zone-shape" d={p.path} fillRule="evenodd" key={p.code}/>)}
      <path className="atlas-leader" d={`M${x} ${y}Q${(x+targetX)/2} ${y} ${targetX} ${targetY}`}/>
      <circle className="atlas-pin-ring" cx={x} cy={y} r="19"/><circle className="atlas-pin" cx={x} cy={y} r="11"/>
      <path className="atlas-pin-mountain" d={`M${x-5} ${y+3}L${x-1} ${y-4}L${x+1} ${y}L${x+3} ${y-2}L${x+6} ${y+3}`} />
      <g transform={`translate(${lx} ${ly})`} className="atlas-label"><rect className="atlas-label-bg" width={width} height={height} rx="6"/><text className="atlas-label-name" x="12" y="30">{r.name}</text><text className="atlas-label-count" x="12" y="55">{destinations(r.id).length} 個目的地</text></g>
     </a>;
    })}
   </svg>
   <div className="atlas-map-foot"><span className="atlas-map-hint">點選地區，探索雪場</span><span>{selectedRegion?.name||'地區位置示意'}</span></div>
  </div>
  <div className="region-map-list atlas-region-list"><header className="atlas-list-heading"><p>{area}滑雪之旅</p><h2>下一站，想去哪裡？</h2><span>{total} 個滑雪目的地，{regions.length} 個地區</span></header>
   <nav aria-label={`${area}雪場地區`}>
    {regions.map(r=><a key={r.id} href={'#resorts/region/'+r.id} className={'map-region-row atlas-region-row'+(highlight===r.id?' highlighted':'')} style={{'--region-color':r.tone||'#abc6d5'} as CSSProperties} onMouseEnter={()=>setHighlight(r.id)} onMouseLeave={()=>setHighlight(null)} onFocus={()=>setHighlight(r.id)} onBlur={()=>setHighlight(null)} onClick={e=>open(e,r.id)}><span className="atlas-region-swatch" aria-hidden="true"/><div><div className="map-region-row-title"><h3>{r.name}</h3><span>{destinations(r.id).length} 個目的地</span></div><p>{destinations(r.id).slice(0,3).map(v=>v.name).join('、')}{destinations(r.id).length>3?' 等':''}</p></div><ArrowUpRight size={18}/></a>)}
   </nav>
   <p className="map-data-note">地圖顯示地區概略位置；交通及雪道請查看雪場官方資訊。<br/><a href={import.meta.env.BASE_URL+'MAP-SOURCES.md'} target="_blank" rel="noopener noreferrer">地圖資料：Natural Earth</a></p>
  </div>
 </section>;
}
