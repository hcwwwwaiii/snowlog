import type {SupabaseClient} from '@supabase/supabase-js';

// Realtime is optional: connection failure must never prevent reading or saving.
export function startResourceSync(client:Pick<SupabaseClient,'channel'|'removeChannel'>,changed:()=>void,status:(message:string)=>void){
  let active=true,connected=false,pending:ReturnType<typeof setTimeout>|undefined;
  const refresh=()=>{if(!active)return;clearTimeout(pending);pending=setTimeout(()=>{if(active)changed();},250);};
  const degraded=()=>{connected=false;if(active)status('即時同步暫時中斷；每 30 秒更新，也可手動重新整理');};
  let channel:ReturnType<typeof client.channel>|undefined;
  status('正在連接同步');
  try{
    channel=client.channel('snowlog-shared-resources').on('postgres_changes',{event:'*',schema:'public',table:'snowlog_resources'},refresh);
    channel.subscribe(state=>{if(!active)return;connected=state==='SUBSCRIBED';if(connected){status('即時同步已連接');refresh();}else degraded();});
  }catch{degraded();}
  const fallback=setInterval(()=>{if(!connected&&document.visibilityState==='visible'&&location.hash.startsWith('#resources'))refresh();},30000);
  const focus=()=>{if(location.hash.startsWith('#resources'))refresh();};
  window.addEventListener('focus',focus);
  return()=>{active=false;clearTimeout(pending);clearInterval(fallback);window.removeEventListener('focus',focus);if(channel){try{void client.removeChannel(channel).catch(()=>{});}catch{/* Already disconnected. */}}};
}
