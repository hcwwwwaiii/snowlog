import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {Camera,Film,Plus,RefreshCw,Trash2,X} from 'lucide-react';
import {trapDialogFocus} from './dialogFocus';
import {readMedia,validateMediaFiles,type JournalMedia,type MediaService} from './journalMediaService';
import './journalMedia.css';
export const MediaContext=createContext<MediaService|null>(null);

function PhotoViewer({url,name,onClose}:{url:string;name:string;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
 return <dialog ref={ref} className="media-viewer" aria-label="查看日誌照片" onKeyDown={e=>{e.stopPropagation();trapDialogFocus(e);}} onCancel={e=>{e.preventDefault();e.stopPropagation();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}><button type="button" className="icon-button" aria-label="關閉照片" onClick={onClose}><X size={22}/></button><img src={url} alt={name}/><p>{name}</p></dialog>;
}
export function JournalGallery({items}:{items:unknown}){
 const service=useContext(MediaContext),media=readMedia(items),key=media.map(m=>m.path).join('|');
 const [urls,setUrls]=useState<Record<string,string>>({}),[error,setError]=useState(''),[retry,setRetry]=useState(0),[failed,setFailed]=useState<string[]>([]),[photo,setPhoto]=useState<JournalMedia|null>(null);
 useEffect(()=>{let active=true;setUrls({});setFailed([]);if(!service||!key)return;
  const refresh=()=>{service.sign(key.split('|')).then(value=>{if(active){setUrls(value);setError('');}}).catch(e=>{if(active)setError(e.message);});};refresh();
  const timer=setInterval(refresh,8*60*1000);return()=>{active=false;clearInterval(timer);};
 },[service,key,retry]);
 if(!media.length)return null;
 return <div className="journal-media" aria-label="日誌相片與影片">{error&&<p className="media-error" role="alert">{error}<button type="button" onClick={()=>setRetry(v=>v+1)}><RefreshCw size={13}/>重試</button></p>}<div className="journal-media-grid">{media.map(m=><figure key={m.id}>{urls[m.path]&&!failed.includes(m.path)?m.kind==='image'?<button type="button" className="journal-photo-open" aria-label={'放大照片：'+m.name} onClick={()=>setPhoto(m)}><img src={urls[m.path]} alt={m.name} loading="lazy" onError={()=>setFailed(v=>[...v,m.path])}/></button>:<video src={urls[m.path]} aria-label={'練習影片：'+m.name} controls playsInline preload="none" onError={()=>setFailed(v=>[...v,m.path])}/>:<div className="media-placeholder">{m.kind==='image'?<Camera size={24}/>:<Film size={24}/>}<span>{failed.includes(m.path)?'此瀏覽器未能顯示影像':urls[m.path]=== ''?'未能取得影像':service?'正在讀取影像…':'登入後可查看影像'}</span>{failed.includes(m.path)&&urls[m.path]&&<a href={urls[m.path]} target="_blank" rel="noopener noreferrer">開啟原檔</a>}{urls[m.path]=== ''&&<button type="button" onClick={()=>setRetry(v=>v+1)}>重新讀取</button>}</div>}<figcaption><span>{m.kind==='image'?'相片':'影片'}</span>{m.name}</figcaption></figure>)}</div>{photo&&urls[photo.path]&&<PhotoViewer url={urls[photo.path]} name={photo.name} onClose={()=>setPhoto(null)}/>}</div>;
}

export function JournalMediaEditor({value,onChange,onBusy,original=[]}:{value:JournalMedia[];onChange:(value:JournalMedia[])=>void;onBusy:(busy:boolean)=>void;original?:JournalMedia[]}){
 const service=useContext(MediaContext),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),input=useRef<HTMLInputElement>(null),active=useRef(true);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 async function add(files:File[]){if(!service||busy||!files.length)return;const error=validateMediaFiles(files,value);setError(error);if(error){if(input.current)input.current.value='';return;}
  setBusy(true);onBusy(true);let next=[...value];
  try{for(let i=0;i<files.length;i++){setMessage(`正在上傳 ${i+1} / ${files.length}：${files[i].name}`);const media=await service.upload(files[i]);if(!active.current){void service.remove([media.path]);return;}next=[...next,media];onChange(next);}setMessage('影像已上傳至私人草稿，儲存日誌後才會加入紀錄。');}
  catch(e){if(active.current)setError(e instanceof Error?e.message:'上傳失敗，已完成的影像會保留，請重試未完成檔案。');}
  finally{if(active.current){setBusy(false);onBusy(false);if(input.current)input.current.value='';}}
 }
 function remove(m:JournalMedia){onChange(value.filter(v=>v.id!==m.id));if(service&&!original.some(v=>v.path===m.path))void service.remove([m.path]).catch(()=>setError('影像已移出草稿；網絡恢復後可重新開啟此表單。'));}
 return <section className="media-editor" aria-labelledby="media-editor-title"><div className="section-heading"><h3 id="media-editor-title"><Camera size={18}/>相片與影片</h3><span>{value.length} / 6</span></div><p>跟隨日誌的私人／同行分享設定。每篇最多 6 個，合計 100 MB。</p><input ref={input} className="media-file-input" type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" aria-label="選擇日誌相片或影片" disabled={busy||!service||value.length>=6} onChange={e=>void add(Array.from(e.target.files||[]))}/><small>相片：JPEG、PNG、WebP，最多 10 MB。影片：MP4、WebM、MOV，最多 50 MB；建議 MP4，MOV 播放視瀏覽器支援。</small>{value.length>0&&<><JournalGallery items={value}/><ul className="media-edit-list">{value.map(m=><li key={m.id}><span>{m.kind==='image'?<Camera size={15}/>:<Film size={15}/>} {m.name}<small>{(m.size/1048576).toFixed(1)} MB</small></span><button type="button" className="icon-button" disabled={busy} aria-label={'移除影像：'+m.name} onClick={()=>remove(m)}><Trash2 size={16}/></button></li>)}</ul></>}{!value.length&&<div className="media-empty"><Plus size={22}/><span>留下動作、雪況或當天的片段。</span></div>}{message&&<p className="media-upload-status" role="status">{message}</p>}{error&&<p className="form-error" role="alert">{error}</p>}</section>;
}
