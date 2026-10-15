import {useState} from 'react';
import {Check,Plus,Flag,Minus} from 'lucide-react';
import {assessmentDefinitions,conditionFields,sideStatuses,readAssessment,type Assessment} from './assessmentCatalog';

export function AssessmentEditor({skillId,value,onChange,initialBlocker=""}:{initialBlocker?:string;skillId:string;value:Assessment;onChange:(v:Assessment)=>void}){
 const definition=assessmentDefinitions[skillId];const [newBlocker,setNewBlocker]=useState(initialBlocker);
 if(!definition)return null;
 const updateBlocker=(id:string,patch:Partial<Assessment['blockers'][number]>)=>onChange({...value,blockers:value.blockers.map(b=>b.id===id?{...b,...patch}:b)});
 function addBlocker(){const text=newBlocker.trim();if(!text||value.blockers.length>=30)return;onChange({...value,blockers:[...value.blockers,{id:crypto.randomUUID(),text,resolved:false,note:''}]});setNewBlocker('');}
 return <div className="assessment-editor"><input type="hidden" name="pendingBlocker" value={newBlocker}/>
  <fieldset className="assessment-section"><legend>我已觀察到</legend><p>勾選能重複做到的項目。這是自評參考，整體狀態仍由你設定。</p><div className="assessment-checks">{definition.checks.map((text,i)=>{const id=`c${i+1}`;return <label key={id}><input type="checkbox" checked={value.checked.includes(id)} onChange={()=>onChange({...value,checked:value.checked.includes(id)?value.checked.filter(c=>c!==id):[...value.checked,id].sort()})}/><span>{text}</span></label>;})}</div><small>已勾選 {value.checked.length} / {definition.checks.length} 項</small></fieldset>
  {!!definition.sides.length&&<fieldset className="assessment-section"><legend>分邊／方向程度</legend><p>兩邊分開記錄，不會自動合併成整體程度。</p><div className="assessment-side-fields">{definition.sides.map(side=><label className="field" key={side.id}><span>{side.label}</span><select aria-label={side.label} value={value.sides[side.id]??0} onChange={e=>onChange({...value,sides:{...value.sides,[side.id]:Number(e.target.value)}})}>{sideStatuses.map((label,i)=><option value={i} key={label}>{label}</option>)}</select></label>)}</div></fieldset>}
  <fieldset className="assessment-section"><legend>這次做到的條件</legend><p>記錄實際環境。坡度與速度是自己的描述，並非統一評級。</p><div className="form-grid">{conditionFields.map(f=><label className="field" key={f.id}><span>{f.label}</span><select aria-label={f.label} value={value.conditions[f.id]||''} onChange={e=>onChange({...value,conditions:{...value.conditions,[f.id]:e.target.value}})}><option value="">未記錄</option>{f.options.map(o=><option key={o}>{o}</option>)}</select></label>)}</div></fieldset>
  <fieldset className="assessment-section"><legend>卡關與待改善</legend><p>解決後勾選保留，也可以取消勾選重新練習。</p>{value.blockers.map(b=><div key={b.id} className={'blocker-edit'+(b.resolved?' resolved':'')}><strong>{b.text}</strong><label className="check-line"><input type="checkbox" checked={b.resolved} onChange={e=>updateBlocker(b.id,{resolved:e.target.checked})}/>已解決</label><label className="field"><span>處理方法／觀察：{b.text}</span><textarea rows={2} maxLength={1000} value={b.note} onChange={e=>updateBlocker(b.id,{note:e.target.value})} placeholder="例如：把視線放遠後，換刃比較順"/></label></div>)}<label className="field"><span>新增待改善事項</span><textarea rows={2} maxLength={240} value={newBlocker} onChange={e=>setNewBlocker(e.target.value)} placeholder="例如：後刃轉前刃時容易失去平衡" disabled={value.blockers.length>=30}/></label><button type="button" className="secondary" disabled={!newBlocker.trim()||value.blockers.length>=30} onClick={addBlocker}><Plus size={15}/>加入待改善事項</button>{newBlocker.trim()&&<small role="status">儲存時會一併加入這項事項。</small>}{value.blockers.length>=30&&<small>這項技巧已保存 30 項事項，請在現有事項補充觀察。</small>}</fieldset>
 </div>;
}

const hkDate=(v:string)=>new Intl.DateTimeFormat('zh-HK',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v));
export function AssessmentSummary({skillId,value,compact=false,onEdit}:{onEdit?:()=>void;skillId:string;value:unknown;compact?:boolean}){
 const d=assessmentDefinitions[skillId];if(!d)return null;const a=readAssessment(value);
 const has=!!(a.checked.length||Object.values(a.sides).some(Boolean)||Object.values(a.conditions).some(Boolean)||a.blockers.length);
 if(compact&&!has)return null;
 return <div className={'assessment-summary'+(compact?' compact':'')}>
  <section><h3>掌握項目 <span>{a.checked.length} / {d.checks.length}</span></h3>{onEdit&&<button className="text-button assessment-edit-action" onClick={onEdit}>編輯掌握項目與整體狀態</button>}<ul className="assessment-observations">{d.checks.map((text,i)=><li className={a.checked.includes(`c${i+1}`)?'checked':''} key={text}><span className="observation-mark" >{a.checked.includes(`c${i+1}`)?<><Check size={13}/>已觀察</>:<><Minus size={13}/>待觀察</>}</span><span>{text}</span></li>)}</ul><small>此處為已儲存的自評摘要。掌握項目及整體狀態請在編輯視窗更新。</small></section>
  {!!d.sides.length&&<section><h3>分邊／方向程度</h3><dl className="assessment-sides">{d.sides.map(s=><div key={s.id}><dt>{s.label}</dt><dd>{sideStatuses[a.sides[s.id]||0]}</dd></div>)}</dl></section>}
  <section><h3>成功條件</h3><dl className="assessment-conditions">{conditionFields.map(f=><div key={f.id}><dt>{f.label}</dt><dd>{a.conditions[f.id]||'未記錄'}</dd></div>)}</dl></section>
  <section><h3><Flag size={16}/>卡關與待改善 <span>{a.blockers.filter(b=>!b.resolved).length} 項待改善</span></h3>{a.blockers.length?<ul className="assessment-blockers">{a.blockers.map(b=><li key={b.id} className={b.resolved?'resolved':''}><div><strong>{b.text}</strong><span className={'badge '+(b.resolved?'green':'')}>{b.resolved?'已解決':'待改善'}</span></div>{b.note&&<p className="preserve">{b.note}</p>}{b.resolved_at&&<small>解決於 {hkDate(b.resolved_at)}</small>}</li>)}</ul>:<p className="muted small">尚未加入待改善事項。</p>}</section>
 </div>;
}



