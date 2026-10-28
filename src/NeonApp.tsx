import {useEffect, useMemo, useRef, useState, type FormEvent} from 'react';
import {createClient, SupabaseAuthAdapter} from '@neondatabase/neon-js';
import type {Session} from '@supabase/supabase-js';
import Snowlog from './Snowlog';
import {validateSnapshot, withDeadline, connectionMessage} from './connection';
import {validateForm, clearFieldError, boundedFetch} from './formUX';
import {blankData, type Row} from './catalog';
import {MediaContext} from './JournalMedia';
import {validateMediaFiles, type MediaService} from './journalMediaService';
import {trapDialogFocus} from './dialogFocus';
import './styles.css';
import './design.css';
import './resorts.css';
import './resortAtlas.css';
import './referenceTypography.css';
import './practice.css';
import './formUX.css';

// Public Neon endpoints; credentials are held by Neon Auth and the media function.
const neon = createClient({
  auth: {adapter: SupabaseAuthAdapter(), url: import.meta.env.VITE_NEON_AUTH_URL || 'https://ep-tiny-brook-azbqru6d.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth'},
  dataApi: {url: import.meta.env.VITE_NEON_DATA_API_URL || 'https://ep-tiny-brook-azbqru6d.apirest.c-3.ap-southeast-1.aws.neon.tech/neondb/rest/v1', options:{global:{fetch:boundedFetch}}},
});
const mediaUrl = import.meta.env.VITE_NEON_MEDIA_URL || 'https://br-noisy-shape-az269c00-snowlogmedia.compute.c-3.ap-southeast-1.aws.neon.tech';
function authMessage(cause: unknown) {
  const text = connectionMessage(cause);
  if (/Invalid email or password|Invalid login/i.test(text)) return '電郵或密碼不正確。';
  if (/not verified|not confirmed/i.test(text)) return '請先完成電郵驗證，再登入。';
  if (/already exist/i.test(text)) return '這個電郵已註冊，請登入或重設密碼。';
  if (/Invalid OTP|expired|invalid.*code/i.test(text)) return '驗證碼不正確或已過期，請重新取得驗證碼。';
  return text;
}
function mediaService(): MediaService {
  async function request(action: string, body: BodyInit, contentType: string) {
    const token = await withDeadline(neon.auth.getJWTToken(false));
    if (!token) throw Error('請先登入');
    const response = await boundedFetch(`${mediaUrl}/${action}`, {method:'POST', headers:{authorization:`Bearer ${token}`, 'content-type':contentType}, body});
    if (!response.ok) throw Error('影像操作未完成，請檢查網絡後重試。');
    return response.json();
  }
  return {
    async upload(file) {
      const error = validateMediaFiles([file], []); if (error) throw Error(error);
      return {...await request('upload', file, file.type), name:file.name.slice(0,200) || '練習影像'};
    },
    async sign(paths) {if (!paths.length) return {}; return request('sign', JSON.stringify({paths}), 'application/json');},
    async remove(paths) {if (paths.length) await request('remove', JSON.stringify({paths}), 'application/json');},
  };
}

export default function NeonApp() {
  const [ready, setReady] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [identityError, setIdentityError] = useState('');
  const [identityAttempt, setIdentityAttempt] = useState(0);
  const [loginOpen, setLoginOpen] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [authMode, setAuthMode] = useState<'login'|'signup'|'verify'|'reset'|'reset-code'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const [version, setVersion] = useState(0);
  const media = useMemo(() => session ? mediaService() : null, [session]);
  useEffect(() => {if (!loginOpen) return; const node = dialog.current; node?.showModal(); return () => node?.close();}, [loginOpen]);
  useEffect(() => {
    let active = true;
    void withDeadline(neon.auth.getSession()).then(({data, error}) => {if (error) throw error; if (active) setSession(data.session as Session | null);}).catch(cause => {if (active) setSetupError(connectionMessage(cause));}).finally(() => {if (active) setReady(true);});
    const {data} = neon.auth.onAuthStateChange((_event, next) => {if (active) setSession(next as Session | null);});
    return () => {active = false; data.subscription.unsubscribe();};
  }, []);
  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => {if (document.visibilityState === 'visible' && location.hash.startsWith('#resources')) setVersion(v => v + 1);}, 30000);
    return () => clearInterval(timer);
  }, [session]);
  useEffect(() => {
    let active = true; setOwnerId(null); setIdentityError('');
    if (session) void (async () => {
      for (let attempt = 0; attempt < 3 && active; attempt++) {
        try {
          const {data, error} = await withDeadline(neon.rpc('snowlog_migration_snapshot'));
          const id = (data as {userId?: unknown} | null)?.userId;
          if (!error && typeof id === 'string') {if (active) setOwnerId(id); return;}
        } catch { /* A temporary connection failure can be retried. */ }
        if (attempt < 2 && active) await new Promise(resolve => setTimeout(resolve, 1000));
      }
      if (active) setIdentityError('未能載入帳戶資料，請檢查網絡後重試。');
    })();
    return () => {active = false;};
  }, [session?.user.id, identityAttempt]);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !validateForm(event.currentTarget)) return; setError(''); setMessage(''); setBusy(true);
    const fields = new FormData(event.currentTarget), email = String(fields.get('email') || authEmail).trim(), password = String(fields.get('password') || ''), otp = String(fields.get('otp') || '').trim();
    // SDK bundles emailOTPClient; its beta declarations lose plugin inference with patched Better Auth.
    const auth = neon.auth.getBetterAuthInstance() as ReturnType<typeof neon.auth.getBetterAuthInstance> & {emailOtp:{
      verifyEmail(input:{email:string;otp:string}):Promise<{error:unknown}>;
      sendVerificationOtp(input:{email:string;type:'forget-password'|'email-verification'}):Promise<{error:unknown}>;
      resetPassword(input:{email:string;otp:string;password:string}):Promise<{error:unknown}>;
    }};
    try {
      if (authMode === 'login') {
        const {error} = await neon.auth.signInWithPassword({email, password}); if (error) throw error;
        setLoginOpen(false);
      } else if (authMode === 'signup') {
        const {error} = await auth.signUp.email({email, password, name:String(fields.get('name') || '').trim()}); if (error) throw error;
        setAuthEmail(email); setAuthMode('verify');
      } else if (authMode === 'verify') {
        const {error} = await auth.emailOtp.verifyEmail({email:authEmail, otp}); if (error) throw error;
        const {data} = await neon.auth.getSession({forceFetch:true}); setSession(data.session as Session | null);
        if (data.session) setLoginOpen(false); else {setAuthMode('login'); setMessage('電郵已驗證，請登入。');}
      } else if (authMode === 'reset') {
        const {error} = await auth.emailOtp.sendVerificationOtp({email, type:'forget-password'}); if (error) throw error;
        setAuthEmail(email); setAuthMode('reset-code');
      } else {
        const {error} = await auth.emailOtp.resetPassword({email:authEmail, otp, password}); if (error) throw error;
        setAuthMode('login'); setMessage('密碼已更新，請登入。');
      }
    } catch (cause) {setError(authMessage(cause));} finally {setBusy(false);}
  }
  const user = session && ownerId ? {userId: ownerId, email: session.user.email || '', fullName: null, displayName: session.user.email?.split('@')[0] || '滑雪同伴'} : null;
  async function loadData() {
    if (!session) return blankData;
    const {data, error} = await withDeadline(neon.rpc('snowlog_migration_snapshot'));
    if (error) throw Error(error.message);
    return validateSnapshot(data);
  }
  async function saveData(action: string, data: Row) {
    const result = await withDeadline(neon.rpc('snowlog_migration_save', {p_action: action, p_data: data}));
    if (result.error) throw Error(result.error.message);
  }
  if (!ready) return <div className="connection-status" role="status">正在準備連線…</div>;
  if (setupError) return <div className="empty" role="alert"><h3>未能連接登入服務</h3><p>{setupError}</p><button className="secondary" onClick={() => location.reload()}>重試</button></div>;
  if (session && !ownerId) return <div role="status">{identityError || '正在確認帳戶資料…'}{identityError && <><button onClick={() => setIdentityAttempt(n => n + 1)}>重試</button><button onClick={() => void neon.auth.signOut()}>登出</button></>}</div>;
  return <>
    <MediaContext.Provider value={media}><Snowlog key={user?.userId || 'guest'} user={user} loadData={loadData} saveData={saveData} resourceVersion={version} resourceSync="每 30 秒更新" onLogin={() => {setError(''); setMessage(''); setAuthMode('login'); setLoginOpen(true);}} onLogout={() => {if (ownerId) for (const key of Object.keys(sessionStorage)) if (key.startsWith('snowlog:draft:'+ownerId+':')) sessionStorage.removeItem(key); void neon.auth.signOut();}}/></MediaContext.Provider>
    {loginOpen && <dialog ref={dialog} className="auth-overlay" aria-labelledby="neon-auth-title" onKeyDown={trapDialogFocus} onCancel={event => {event.preventDefault(); if (!busy) setLoginOpen(false);}} onClick={event => {if (event.target === dialog.current && !busy) setLoginOpen(false);}}><section className="auth-card"><h2 id="neon-auth-title">{authMode === 'signup' ? '建立帳戶' : authMode === 'verify' ? '驗證電郵' : authMode === 'reset' || authMode === 'reset-code' ? '重設密碼' : '登入 Snowlog'}</h2><p className="auth-intro muted">原有用戶請以相同電郵建立帳戶、設定新密碼並完成驗證，即可取回舊紀錄。</p><form noValidate onSubmit={login} onInput={event => {clearFieldError(event.target); setError('');}}>
      {authMode === 'signup' && <label className="field">顯示名稱（必填）<input name="name" required maxLength={120}/></label>}
      {authMode !== 'verify' && authMode !== 'reset-code' ? <label className="field">電郵（必填）<input name="email" type="email" required defaultValue={authEmail} autoComplete="email"/></label> : <p>請輸入寄往 {authEmail} 的驗證碼。</p>}
      {(authMode === 'verify' || authMode === 'reset-code') && <label className="field">驗證碼（必填）<input name="otp" required inputMode="numeric" autoComplete="one-time-code"/></label>}
      {authMode !== 'verify' && authMode !== 'reset' && <label className="field">密碼（必填）<input name="password" type="password" required minLength={authMode === 'login' ? 1 : 8} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}/></label>}
      {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}<button className="primary auth-submit" type="submit" disabled={busy}>{busy ? '處理中…' : authMode === 'login' ? '登入' : authMode === 'signup' ? '註冊' : authMode === 'reset' ? '寄送驗證碼' : '確認'}</button><button type="button" disabled={busy} onClick={() => setLoginOpen(false)}>關閉</button></form>
      <div className="auth-links">{authMode === 'login' ? <><button onClick={() => {setError(''); setAuthMode('signup');}}>建立帳戶</button><button onClick={() => {setError(''); setAuthMode('reset');}}>忘記密碼</button></> : <button onClick={() => {setError(''); setAuthMode('login');}}>返回登入</button>}</div>
    </section></dialog>}
  </>;
}

