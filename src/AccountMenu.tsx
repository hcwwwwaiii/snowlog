import {useEffect,useRef} from 'react';
import {Backpack,ChevronDown,Settings,LogOut} from 'lucide-react';

export default function AccountMenu({name,onGear,onProfile,onLogout}:{name:string;onGear:()=>void;onProfile:()=>void;onLogout:()=>void}){
 const ref=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{const close=(e:PointerEvent)=>{if(e.target instanceof Node&&!ref.current?.contains(e.target)&&ref.current)ref.current.open=false;};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[]);
 const choose=(action:()=>void)=>{if(ref.current)ref.current.open=false;action();};
 return <details ref={ref} className="account-menu" onKeyDown={e=>{if(e.key==='Escape'&&ref.current?.open){ref.current.open=false;ref.current.querySelector('summary')?.focus();e.stopPropagation();}}}><summary className="account" aria-label="帳戶選單"><span className="avatar">{name.slice(0,1)}</span><span className="account-name">{name}</span><ChevronDown size={16}/></summary><div className="account-menu-panel"><button onClick={()=>choose(onGear)}><Backpack size={17}/>我的裝備</button><button onClick={()=>choose(onProfile)}><Settings size={17}/>個人資料</button><button onClick={()=>choose(onLogout)}><LogOut size={17}/>登出</button></div></details>;
}
