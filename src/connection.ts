import type {Snapshot} from './catalog';

export function withDeadline<T>(work:PromiseLike<T>,milliseconds=20000):Promise<T>{
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('SNOWLOG_TIMEOUT')),milliseconds);
    Promise.resolve(work).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
  });
}

export function connectionMessage(error:unknown):string{
  const message=error instanceof Error?error.message:typeof error==='string'?error:String((error as {message?:unknown})?.message||'');
  if(/SNOWLOG_TIMEOUT|timeout|timed out|AbortError/i.test(message))return '連線逾時，請檢查網絡後重試。';
  if(/Failed to fetch|NetworkError|Load failed|fetch failed/i.test(message))return '未能連接服務，請檢查網絡後重試。';
  return message||'未能讀取資料，請稍後重試。';
}

export function validateSnapshot(value:unknown):Snapshot{
  const snapshot=value as Snapshot;
  if(!snapshot||!snapshot.profile||typeof snapshot.profile!=='object'||Array.isArray(snapshot.profile)||
    !(['progress','journals','trips','members','sharedJournals','resources'] as const).every(key=>Array.isArray(snapshot[key])&&snapshot[key].every(row=>row&&typeof row==='object'))||
    (snapshot.progressHistory!==undefined&&!Array.isArray(snapshot.progressHistory)))throw Error('資料未完整載入，請重新整理資料。');
  return snapshot;
}
