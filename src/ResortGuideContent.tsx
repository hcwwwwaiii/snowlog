import { Coffee, ExternalLink, MountainSnow, Route, Snowflake } from 'lucide-react';
import type { Resort } from './resorts';
import { resortGuides } from './resortGuides';
import { resortPhotos } from './resortPhotos';
import './resortGuide.css';

export default function ResortGuideContent({ resort }: { resort: Resort }) {
  const guide = resortGuides[resort.id];
  const photo = resortPhotos[resort.id];
  return <>
    <section className="resort-info-section resort-guide-overview">
      <h2>{resort.kind ? '認識這個滑雪區域' : '認識這個雪場'}</h2>
      <p className="resort-guide-lead">{guide?.intro || resort.summary}</p>
      <dl className="resort-guide-facts">
        <div><dt>地區</dt><dd>{resort.region}</dd></div>
        <div><dt>場地類型</dt><dd>{resort.kind || resort.type}</dd></div>
        <div><dt>主要據點</dt><dd>{guide?.base || resort.address}</dd></div>
      </dl>
      <ul className="resort-highlights">{resort.highlights.map(v => <li key={v}><Snowflake size={15} aria-hidden="true"/>{v}</li>)}</ul>
    </section>
    {guide && <>
      <section className="resort-info-section resort-guide-topic">
        <h2><MountainSnow size={24} aria-hidden="true"/>滑行地形</h2>
        <p>{guide.terrain}</p>
      </section>
      <section className="resort-info-section resort-guide-topic">
        <h2><Coffee size={23} aria-hidden="true"/>特色與設施</h2>
        <p>{guide.facilities}</p>
      </section>
      <section className="resort-guide-day">
        <h2><Route size={23} aria-hidden="true"/>安排自己的滑行日</h2>
        <p>{guide.dayPlan}</p>
        <small>Snowlog 行程建議，可按自己與同伴的程度調整。</small>
      </section>
    </>}
    {photo ? <details className="resort-photo-credits resort-credit-disclosure">
      <summary>相片說明與授權</summary>
      <p>{photo.caption}</p>
      <p>攝影：{photo.author} · {photo.licenseUrl?<a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a>:photo.license}</p>
      {photo.date && <p>來源標示的拍攝日期：{photo.date}</p>}
      {photo.source&&<a className="text-button" href={photo.source} target="_blank" rel="noopener noreferrer">查看原始相片與作者<ExternalLink size={14}/></a>}
      <small>{photo.changes}。相片不代表當日開放及雪況；其他相片的改作按所列授權使用。</small>
    </details> : <section className="resort-photo-credits">
      <h2>場館實景</h2><p>官方有場館照片，目前未確認可轉載授權。可先在官方頁面查看實景。</p>
      <a className="text-button" href={resort.url} target="_blank" rel="noopener noreferrer">查看官方實景相片<ExternalLink size={14}/></a>
    </section>}
  </>;
}
