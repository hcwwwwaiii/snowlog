import type {SupabaseClient} from '@supabase/supabase-js';
export type JournalMedia={id:string;path:string;kind:'image'|'video';type:string;size:number;name:string};
export type MediaService={upload:(file:File)=>Promise<JournalMedia>;sign:(paths:string[])=>Promise<Record<string,string>>;remove:(paths:string[])=>Promise<void>};
export const MEDIA_BUCKET='snowlog-journal-media';
const extensions:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'};
export const readMedia=(value:unknown):JournalMedia[]=>Array.isArray(value)?value.filter(m=>m&&typeof m.path==='string'&&typeof m.id==='string'&&typeof m.name==='string'&&extensions[m.type]&&['image','video'].includes(m.kind)&&Number.isFinite(m.size)).slice(0,6):[];
export function validateMediaFiles(files:File[],existing:JournalMedia[]):string{
 if(existing.length+files.length>6)return '每篇日誌最多 6 個相片或影片，請先移除部分影像。';
 for(const f of files){if(!extensions[f.type])return `不支援「${f.name}」。請選 JPEG、PNG、WebP、MP4、WebM 或 MOV。`;
  if(!f.size||f.size>(f.type.startsWith('image/')?10:50)*1024*1024)return `「${f.name}」超過大小限制，或是空白檔案。相片上限 10 MB，影片上限 50 MB。`;}
 if(existing.reduce((n,m)=>n+m.size,0)+files.reduce((n,f)=>n+f.size,0)>100*1024*1024)return '每篇日誌影像合計上限 100 MB。';
 return '';
}
export function createMediaService(client:SupabaseClient,userId:string):MediaService{
 const bucket=client.storage.from(MEDIA_BUCKET);
 return {
  async upload(file){const error=validateMediaFiles([file],[]);if(error)throw Error(error);
   const id=crypto.randomUUID(),path=`${userId}/${id}.${extensions[file.type]}`;
   const result=await bucket.upload(path,file,{contentType:file.type,upsert:false,cacheControl:'600'});
   if(result.error){void bucket.remove([path]);throw Error(result.error.message.includes('SNOWLOG_TIMEOUT')?'上傳逾時，請縮短影片或檢查網絡後重試。':'影像未能上傳，請檢查網絡及檔案大小後重試。');}
   return {id,path,kind:file.type.startsWith('image/')?'image':'video',type:file.type,size:file.size,name:file.name.slice(0,200)||'練習影像'};
  },
  async sign(paths){if(!paths.length)return {};const {data,error}=await bucket.createSignedUrls(paths,600);if(error)throw Error('暫時未能讀取影像，請重試。');return Object.fromEntries((data||[]).map(m=>[m.path||'',m.signedUrl||'']));},
  async remove(paths){if(!paths.length)return;const {error}=await bucket.remove(paths);if(error)throw Error('暫時未能清理已移除的影像。');}
 };
}
