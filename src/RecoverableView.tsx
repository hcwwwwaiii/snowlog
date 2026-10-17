import {Component,lazy,Suspense,useMemo,useState,type ComponentType,type ReactNode} from 'react';
import {withDeadline} from './connection';

export class ViewBoundary extends Component<{children:ReactNode;label:string;onRetry?:()=>void},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){
    if(!this.state.failed)return this.props.children;
    return <section className="empty" role="alert"><h2>{this.props.label}暫時無法顯示</h2><p>可能是連線中斷或網站版本已更新。請檢查網絡後重試；未儲存的表單草稿仍保留在此分頁。</p><div className="button-group">{this.props.onRetry&&<button className="primary" onClick={this.props.onRetry}>重新載入這部分</button>}<button className="secondary" onClick={()=>location.reload()}>重新整理網頁</button></div></section>;
  }
}

// Create a fresh React.lazy instance on retry: a rejected lazy promise stays rejected.
export function recoverableView<P extends object>(loader:()=>Promise<{default:ComponentType<P>}>,label:string){
  return function RecoverableView(props:P){
    const [attempt,setAttempt]=useState(0);
    const View=useMemo(()=>lazy(()=>withDeadline(loader(),15000)),[attempt]);
    return <ViewBoundary key={attempt} label={label} onRetry={()=>setAttempt(v=>v+1)}><Suspense fallback={<section className="empty" role="status">正在載入{label}…連線較慢時會在約 15 秒後提供重試。</section>}><View {...props}/></Suspense></ViewBoundary>;
  };
}
