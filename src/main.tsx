import { createRoot } from "react-dom/client";
import { useEffect, useState, useRef, type FormEvent } from "react";
import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";
import { MountainSnow, X } from "lucide-react";
import Snowlog from "./Snowlog";
import { trapDialogFocus } from "./dialogFocus";
import { blankData, type Row, type Snapshot } from "./catalog";
import "./styles.css";
import "./design.css";
import "./resorts.css";
import "./referenceTypography.css";
import "./practice.css";

function friendly(message:string){
  if(message.includes("Invalid login credentials"))return "電郵或密碼不正確。";
  if(message.includes("Email not confirmed"))return "請先到信箱確認電郵，再登入。";
  if(message.includes("rate limit"))return "操作次數較多，請稍後再試。";
  if(message.includes("Signups not allowed"))return "此專案暫未開放註冊，請聯絡建立者。";
  if(message.includes("permission denied")||message.includes("JWT"))return "登入已失效，請重新登入。";
  if(message.includes("Failed to fetch")||message.includes("NetworkError"))return "未能連接資料庫，請檢查網絡後重試。";
  if(message.includes("non-authorized")||message.includes("Email address")&&message.includes("not authorized"))return "目前電郵服務未允許這個地址。請聯絡網站建立者設定 Supabase 的電郵服務。";
  return message;
}
const returnUrl=()=>`${window.location.origin}${window.location.pathname}`;
function AuthForm({client,mode,setMode,onClose}:{client:SupabaseClient;mode:string;setMode:(v:string)=>void;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close();},[]);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  useEffect(()=>{setError("");setMessage("");},[mode]);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");setMessage("");const f=new FormData(e.currentTarget),email=String(f.get("email")||"").trim(),password=String(f.get("password")||"");
    try{
      if(mode==="login"){const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;onClose();}
      else if(mode==="signup"){const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:returnUrl(),data:{display_name:String(f.get("name")||"").trim()}}});if(error)throw error;if(data.session)onClose();else setMessage("請查看信箱並確認電郵，完成後即可登入。若電郵沒有送達，請聯絡網站建立者。");}
      else if(mode==="reset"){const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:returnUrl()});if(error)throw error;setMessage("若此電郵有已註冊帳戶，密碼重設連結將寄到信箱。");}
      else {const {error}=await client.auth.updateUser({password});if(error)throw error;setMessage("密碼已更新，可以關閉此視窗繼續使用。");}
    }catch(e){setError(friendly(e instanceof Error?e.message:String((e as {message?:string})?.message||"未能完成操作")));}finally{setBusy(false);}
  }
  return <dialog ref={dialog} className="auth-overlay" aria-labelledby="auth-title" onKeyDown={trapDialogFocus} onCancel={e=>{e.preventDefault();if(!busy)onClose();}} onClick={e=>{if(e.target===dialog.current&&!busy)onClose();}}><section className="auth-card"><div className="modal-heading"><div><MountainSnow size={29} color="#21574d"/><h2 id="auth-title">{mode==="login"?"登入雪跡":mode==="signup"?"建立你的滑雪帳戶":mode==="reset"?"重設密碼":"設定新密碼"}</h2></div><button className="icon-button" aria-label="關閉登入視窗" disabled={busy} onClick={onClose}><X size={20}/></button></div><p className="muted auth-intro">登入後，你的日誌與進度會同步到雲端。</p><form onSubmit={submit}><fieldset disabled={busy} className="form-fields">{mode==="signup"&&<label className="field"><span>顯示名稱</span><input name="name" required maxLength={120} autoComplete="nickname"/></label>}{mode!=="update"&&<label className="field"><span>電郵</span><input type="email" name="email" required autoComplete="email" maxLength={254}/></label>}{mode!=="reset"&&<label className="field"><span>{mode==="update"?"新密碼":"密碼"}</span><input type="password" name="password" required minLength={mode==="login"?1:8} maxLength={128} autoComplete={mode==="login"?"current-password":"new-password"}/>{mode!=="login"&&<small>至少 8 個字元。</small>}</label>}</fieldset>{error&&<p className="form-error" role="alert">{error}</p>}{message&&<p className="auth-message" role="status">{message}</p>}<button className="primary auth-submit" disabled={busy} type="submit">{busy?"處理中…":mode==="login"?"登入":mode==="signup"?"註冊帳戶":mode==="reset"?"寄送重設連結":"更新密碼"}</button></form><div className="auth-links">{mode==="login"?<><button onClick={()=>setMode("signup")}>建立帳戶</button><button onClick={()=>setMode("reset")}>忘記密碼</button></>:<button onClick={()=>setMode("login")}>返回登入</button>}</div><p className="footnote">每人使用自己的帳戶。同行邀請碼只分享指定行程，私人紀錄仍只屬於你。</p></section></dialog>;
}
function App(){
  const [client,setClient]=useState<SupabaseClient|null>(null),[session,setSession]=useState<Session|null>(null),[ready,setReady]=useState(false),[setupError,setSetupError]=useState("");
  const [authMode,setAuthMode]=useState<string|null>(null),[notice,setNotice]=useState("");
  useEffect(()=>{let active=true;let unsubscribe:(()=>void)|undefined;
    (async()=>{try{
      const response=await fetch(`${import.meta.env.BASE_URL}config.json`,{cache:"no-store"});if(!response.ok)throw Error("未能讀取連線設定，請重新整理。");
      const config=await response.json() as {supabaseUrl:string;supabasePublishableKey:string};
      if(!config.supabaseUrl||!config.supabasePublishableKey?.startsWith("sb_publishable_"))throw Error("網站的 Supabase 連線設定尚未完成。");
      const c=createClient(config.supabaseUrl,config.supabasePublishableKey);const {data,error}=await c.auth.getSession();if(error)throw error;if(!active)return;
      setClient(c);setSession(data.session);setReady(true);
      const {data:listener}=c.auth.onAuthStateChange((event,s)=>{if(active){setSession(s);if(event==="PASSWORD_RECOVERY")setAuthMode("update");}});unsubscribe=()=>listener.subscription.unsubscribe();
    }catch(e){if(active){setSetupError(friendly(e instanceof Error?e.message:"連線設定無效"));setReady(true);}}})();
    return()=>{active=false;unsubscribe?.();};
  },[]);
  const user=session?{userId:session.user.id,email:session.user.email||"",fullName:null,displayName:session.user.user_metadata?.display_name||session.user.email?.split("@")[0]||"滑雪同伴"}:null;
  async function loadData():Promise<Snapshot>{if(!client||!session)throw Error("請先登入");const {data,error}=await client.rpc("snowlog_snapshot");if(error)throw Error(friendly(error.message));return data as Snapshot;}
  async function saveData(action:string,data:Row){if(!client||!session)throw Error("請先登入");const {error}=await client.rpc("snowlog_save",{p_action:action,p_data:data});if(error)throw Error(friendly(error.message));}
  const login=()=>{if(!client){setNotice(setupError||"連線準備中，請稍後再試。");return;}setAuthMode("login");};
  const logout=async()=>{if(client){const {error}=await client.auth.signOut();if(error)setNotice(friendly(error.message));}};
  return <>{!ready&&<div className="connection-status" role="status">正在準備連線…</div>}{setupError&&<div className="setup-error" role="alert">{setupError}</div>}<Snowlog key={user?.userId||"guest"} user={user} loadData={loadData} saveData={saveData} onLogin={login} onLogout={()=>void logout()}/>{authMode&&client&&<AuthForm key={authMode} client={client} mode={authMode} setMode={setAuthMode} onClose={()=>setAuthMode(null)}/>} {notice&&<div className="toast" role="status">{notice}<button aria-label="關閉提示" onClick={()=>setNotice("")}><X size={15}/></button></div>}</>;
}
createRoot(document.getElementById("root")!).render(<App/>);

