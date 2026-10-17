import {useId,useState} from 'react';
import {ExternalLink} from 'lucide-react';
import {resorts} from './resorts';
export default function ResortField({initial=''}:{initial?:string}) {
  const [value,setValue]=useState(initial);
  const choicesId=useId();
  const match=resorts.find(r=>r.name===value);
  // FormData and the draft capture read the live DOM value, like the other text fields.
  // Do not overwrite input/autofill/IME edits when the parent saves its draft.
  return <label className="field"><span>雪場<small className="required-mark">（必填）</small></span><input aria-label="雪場" name="resort" defaultValue={initial} onInput={e=>setValue(e.currentTarget.value)} list={choicesId} required maxLength={120} placeholder="選擇目錄雪場，或自行填寫"/><datalist id={choicesId}>{resorts.map(r=><option key={r.id} value={r.name}>{r.region} / {r.type}</option>)}</datalist><small>可選擇目錄雪場，也可保留自己的雪場或地區名稱。</small>{match&&<a className="resort-form-source" href={match.url} target="_blank" rel="noopener noreferrer">{match.linkLabel}<ExternalLink size={13}/></a>}</label>;
}

