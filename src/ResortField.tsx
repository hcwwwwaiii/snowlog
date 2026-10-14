import {useState} from 'react';
import {ExternalLink} from 'lucide-react';
import {resorts} from './resorts';
export default function ResortField({initial=''}:{initial?:string}) {
  const [value,setValue]=useState(initial);
  const match=resorts.find(r=>r.name===value);
  return <label className="field"><span>雪場 / 地區</span><input aria-label="雪場 / 地區" name="resort" value={value} onChange={e=>setValue(e.target.value)} list="trip-resort-choices" required maxLength={120} placeholder="選擇目錄雪場，或自行填寫"/><datalist id="trip-resort-choices">{resorts.map(r=><option key={r.id} value={r.name}>{r.region} / {r.type}</option>)}</datalist><small>可選擇目錄雪場，也可保留自己的雪場或地區名稱。</small>{match&&<a className="resort-form-source" href={match.url} target="_blank" rel="noopener noreferrer">{match.linkLabel}<ExternalLink size={13}/></a>}</label>;
}

