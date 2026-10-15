import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";
import { X } from "lucide-react";
import Snowlog from "./Snowlog";
import AuthForm from "./AuthForm";
import {boundedFetch} from "./formUX";
import "./formUX.css";
import { blankData, type Row, type Snapshot } from "./catalog";
import "./styles.css";
import "./design.css";
import "./resorts.css";
import "./resortAtlas.css";
import "./referenceTypography.css";
import "./practice.css";

function friendly(message:string){
  if(message.includes("SNOWLOG_TIMEOUT"))return "連線逾時，請檢查網絡後重試。若剛才在註冊或重設密碼，請先查看信箱。";
  if(message.includes("Invalid login credentials"))return "電郵或密碼不正確。";
  if(message.includes("Email not confirmed"))return "請先到信箱確認電郵，再登入。";
  if(message.includes("rate limit"))return "操作次數較多，請稍後再試。";
  if(message.includes("Signups not allowed"))return "此專案暫未開放註冊，請聯絡建立者。";
  if(message.includes("permission denied")||message.includes("JWT"))return "登入已失效，請重新登入。";
  if(message.includes("Failed to fetch")||message.includes("NetworkError"))return "未能連接資料庫，請檢查網絡後重試。";
  if(message.includes("non-authorized")||message.includes("Email address")&&message.includes("not authorized"))return "目前電郵服務未允許這個地址。請聯絡網站建立者設定 Supabase 的電郵服務。";
  return message;
}

function App(){
  const [client,setClient]=useState<SupabaseClient|null>(null),[session,setSession]=useState<Session|null>(null),[ready,setReady]=useState(false),[setupError,setSetupError]=useState("");
  const [authOpen,setAuthOpen]=useState(0);
  const [authMode,setAuthMode]=useState<string|null>(null),[notice,setNotice]=useState("");
  useEffect(()=>{let active=true;let unsubscribe:(()=>void)|undefined;
    (async()=>{try{
      const response=await boundedFetch(`${import.meta.env.BASE_URL}config.json`,{cache:"no-store"});if(!response.ok)throw Error("未能讀取連線設定，請重新整理。");
      const config=await response.json() as {supabaseUrl:string;supabasePublishableKey:string};
      if(!config.supabaseUrl||!config.supabasePublishableKey?.startsWith("sb_publishable_"))throw Error("網站的 Supabase 連線設定尚未完成。");
      const c=createClient(config.supabaseUrl,config.supabasePublishableKey,{global:{fetch:boundedFetch}});const {data,error}=await c.auth.getSession();if(error)throw error;if(!active)return;
      setClient(c);setSession(data.session);setReady(true);
      const {data:listener}=c.auth.onAuthStateChange((event,s)=>{if(active){setSession(s);if(event==="PASSWORD_RECOVERY")setAuthMode("update");}});unsubscribe=()=>listener.subscription.unsubscribe();
    }catch(e){if(active){setSetupError(friendly(e instanceof Error?e.message:"連線設定無效"));setReady(true);}}})();
    return()=>{active=false;unsubscribe?.();};
  },[]);
  const user=session?{userId:session.user.id,email:session.user.email||"",fullName:null,displayName:session.user.user_metadata?.display_name||session.user.email?.split("@")[0]||"滑雪同伴"}:null;
  async function loadData():Promise<Snapshot>{if(!client||!session)throw Error("請先登入");const {data,error}=await client.rpc("snowlog_snapshot");if(error)throw Error(friendly(error.message));return data as Snapshot;}
  async function saveData(action:string,data:Row){if(!client||!session)throw Error("請先登入");const {error}=await client.rpc("snowlog_save",{p_action:action,p_data:data});if(error)throw Error(friendly(error.message));}
  const login=()=>{if(!client){setNotice(setupError||"連線準備中，請稍後再試。");return;}setAuthOpen(v=>v+1);setAuthMode("login");};
  const logout=async()=>{if(client){const {error}=await client.auth.signOut();if(!error&&session){try{for(const key of Object.keys(sessionStorage))if(key.startsWith("snowlog:draft:"+session.user.id+":"))sessionStorage.removeItem(key);}catch{/* Storage may be unavailable. */}}if(error)setNotice(friendly(error.message));}};
  return <>{!ready&&<div className="connection-status" role="status">正在準備連線…</div>}{setupError&&<div className="setup-error" role="alert">{setupError}</div>}<Snowlog key={user?.userId||"guest"} user={user} loadData={loadData} saveData={saveData} onLogin={login} onLogout={()=>void logout()}/>{authMode&&client&&<AuthForm key={authMode+authOpen} client={client} mode={authMode} setMode={setAuthMode} onClose={()=>setAuthMode(null)}/>} {notice&&<div className="toast" role="status">{notice}<button aria-label="關閉提示" onClick={()=>setNotice("")}><X size={15}/></button></div>}</>;
}
createRoot(document.getElementById("root")!).render(<App/>);

