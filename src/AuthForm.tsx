import {useEffect,useState,useRef,type FormEvent} from "react";
import type {SupabaseClient} from "@supabase/supabase-js";
import {MountainSnow,X} from "lucide-react";
import {trapDialogFocus} from "./dialogFocus";
import {validateForm,markRequired,clearFieldError} from "./formUX";
function friendly(message:string,mode:string){
  if(/SNOWLOG_TIMEOUT|timeout|timed out/i.test(message))return "連線逾時，請檢查網絡後重試。"+(mode==='signup'||mode==='reset'?'請先查看信箱，確認是否已收到電郵。':'');
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
export default function AuthForm({client,mode,setMode,onClose}:{client:SupabaseClient;mode:string;setMode:(v:string)=>void;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close();},[]);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  const [elapsed,setElapsed]=useState(0);
  useEffect(()=>{if(!busy)return;const started=Date.now();setElapsed(0);const timer=setInterval(()=>setElapsed(Math.floor((Date.now()-started)/1000)),1000);return()=>clearInterval(timer);},[busy]);
  useEffect(()=>{if(dialog.current)markRequired(dialog.current);},[mode]);
  useEffect(()=>{setError("");setMessage("");},[mode]);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(busy||!validateForm(e.currentTarget))return;setBusy(true);setError("");setMessage("");const f=new FormData(e.currentTarget),email=String(f.get("email")||"").trim(),password=String(f.get("password")||"");
    try{
      if(mode==="login"){const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;onClose();}
      else if(mode==="signup"){const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:returnUrl(),data:{display_name:String(f.get("name")||"").trim()}}});if(error)throw error;if(data.session)onClose();else setMessage("請查看信箱並確認電郵，完成後即可登入。若電郵沒有送達，請聯絡網站建立者。");}
      else if(mode==="reset"){const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:returnUrl()});if(error)throw error;setMessage("若此電郵有已註冊帳戶，密碼重設連結將寄到信箱。");}
      else {const {error}=await client.auth.updateUser({password});if(error)throw error;setMessage("密碼已更新，可以關閉此視窗繼續使用。");}
    }catch(e){setError(friendly(e instanceof Error?e.message:String((e as {message?:string})?.message||"未能完成操作"),mode));}finally{setBusy(false);}
  }
  return <dialog ref={dialog} className="auth-overlay" aria-labelledby="auth-title" onKeyDown={trapDialogFocus} onCancel={e=>{e.preventDefault();if(!busy)onClose();}} onClick={e=>{if(e.target===dialog.current&&!busy)onClose();}}><section className="auth-card"><div className="modal-heading"><div><MountainSnow size={29} color="#21574d"/><h2 id="auth-title">{mode==="login"?"登入雪跡":mode==="signup"?"建立你的滑雪帳戶":mode==="reset"?"重設密碼":"設定新密碼"}</h2></div><button className="icon-button" aria-label="關閉登入視窗" disabled={busy} onClick={onClose}><X size={20}/></button></div><p className="muted auth-intro">登入後，你的日誌與進度會同步到雲端。</p><form noValidate onSubmit={submit} onInput={e=>{clearFieldError(e.target);setError("");setMessage("");}}><fieldset disabled={busy} className="form-fields">{mode==="signup"&&<label className="field"><span>顯示名稱</span><input name="name" required maxLength={120} autoComplete="nickname"/></label>}{mode!=="update"&&<label className="field"><span>電郵</span><input type="email" name="email" required autoComplete="email" maxLength={254}/></label>}{mode!=="reset"&&<label className="field"><span>{mode==="update"?"新密碼":"密碼"}</span><input type="password" name="password" required minLength={mode==="login"?1:8} maxLength={128} autoComplete={mode==="login"?"current-password":"new-password"}/>{mode!=="login"&&<small>至少 8 個字元。</small>}</label>}</fieldset>{busy&&<p className="auth-wait" role="status">{elapsed<3?"正在驗證帳戶…":elapsed<8?"仍在連接登入服務，請稍候。":"連接比平常慢；每次連線會在約 15 秒逾時，之後可重試。"}（{elapsed} 秒）</p>}{error&&<p className="form-error" role="alert">{error}</p>}{message&&<p className="auth-message" role="status">{message}</p>}<button className="primary auth-submit" disabled={busy} type="submit">{busy?"處理中…":mode==="login"?"登入":mode==="signup"?"註冊帳戶":mode==="reset"?"寄送重設連結":"更新密碼"}</button></form><div className="auth-links">{mode==="login"?<><button disabled={busy} onClick={()=>setMode("signup")}>建立帳戶</button><button disabled={busy} onClick={()=>setMode("reset")}>忘記密碼</button></>:<button disabled={busy} onClick={()=>setMode("login")}>返回登入</button>}</div><p className="footnote">每人使用自己的帳戶。同行邀請碼只分享指定行程，私人紀錄仍只屬於你。</p></section></dialog>;
}
