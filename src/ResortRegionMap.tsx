import {useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {resorts} from './resorts';
import {resortRegions} from './resortRegions';
import {projectRegion,regionMapGeometry} from './regionMapGeometry';

export default function ResortRegionMap({area,onOpen}:{area:'日本'|'大灣區';onOpen:(route:string)=>void}){
  const [highlight,setHighlight]=useState<string|null>(null);
  const regions=resortRegions.filter(r=>r.area===area);
  const paths=area==='日本'?regionMapGeometry.japan:regionMapGeometry.bay;
  const count=(id:string)=>{const region=regions.find(r=>r.id===id)!;return resorts.filter(r=>region.regions.includes(r.region)).length;};
  return <section className="region-map-panel" aria-label={`${area}地區地圖`}>
    <div className="region-map-visual"><svg viewBox="0 0 600 540" className="region-map-svg" aria-label={`${area}輪廓與地區連結`}>
      <g aria-hidden="true" className="region-map-grid"><path d="M60 135H550M60 270H550M60 405H550M180 35V505M330 35V505M480 35V505"/></g>
      <g aria-hidden="true" className="region-map-land">{paths.map((d,i)=><path d={d} key={i}/>)}</g>
      {area==='大灣區'&&<text className="map-water-label" x="420" y="394" aria-hidden="true">珠江口</text>}
      {regions.map(r=>{const [x,y]=projectRegion(r.longitude,r.latitude,area),[dx,dy]=r.labelOffset;return <a key={r.id} href={'#resorts/region/'+r.id} aria-label={`${r.name}，${count(r.id)} 個雪場`} className={'map-region-pin'+(highlight===r.id?' highlighted':'')} onMouseEnter={()=>setHighlight(r.id)} onMouseLeave={()=>setHighlight(null)} onFocus={()=>setHighlight(r.id)} onBlur={()=>setHighlight(null)} onClick={e=>{e.preventDefault();onOpen('region/'+r.id);}}>
        <title>{r.name}，{count(r.id)} 個雪場</title>
        <path className="map-leader" d={`M${x} ${y}L${x+dx} ${y+dy}`}/><circle className="map-pin-halo" cx={x} cy={y} r="20"/><circle className="map-pin-dot" cx={x} cy={y} r="7"/><circle className="map-pin-core" cx={x} cy={y} r="2.3"/>
        <g transform={`translate(${x+dx-8} ${y+dy-28})`}><rect className="map-pin-label-bg" width="96" height="47" rx="5"/><text className="map-pin-name" x="10" y="20">{r.name}</text><text className="map-pin-count" x="10" y="37">{count(r.id)} 個雪場</text></g>
      </a>;})}
      <text x="65" y="524" className="map-position-note" aria-hidden="true">地區位置示意，非導航地圖</text>
    </svg></div>
    <div className="region-map-list"><div className="region-map-heading"><h2>{area==='日本'?'沿著日本，找到雪山。':'把週末，留給真雪。'}</h2><p>{area==='日本'?'從北海道到本州，選一個地方開始。':'深圳、廣州、珠海，三個室內滑行目的地。'}</p></div>{regions.map(r=><a key={r.id} href={'#resorts/region/'+r.id} className={'map-region-row'+(highlight===r.id?' highlighted':'')} onMouseEnter={()=>setHighlight(r.id)} onMouseLeave={()=>setHighlight(null)} onFocus={()=>setHighlight(r.id)} onBlur={()=>setHighlight(null)} onClick={e=>{e.preventDefault();onOpen('region/'+r.id);}}><div><div className="map-region-row-title"><h3>{r.name}</h3><span>{count(r.id)} 個雪場</span></div><p>{r.description}</p></div><ArrowUpRight size={21}/></a>)}<p className="map-data-note">輪廓資料：Natural Earth。標記顯示地區概略位置。</p></div>
  </section>;
}
