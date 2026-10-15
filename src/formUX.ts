// Abort the network operation itself; no detached request continues after timeout.
export async function boundedFetch(input:RequestInfo|URL,init?:RequestInit):Promise<Response>{
 const controller=new AbortController();const upstream=init?.signal||(input instanceof Request?input.signal:undefined);
 const abort=()=>controller.abort(upstream?.reason);upstream?.addEventListener('abort',abort,{once:true});
 if(upstream?.aborted)abort();
 let timedOut=false;const timer=setTimeout(()=>{timedOut=true;controller.abort();},15000);
 try{return await fetch(input,{...init,signal:controller.signal});}
 catch(error){if(timedOut)throw Error('SNOWLOG_TIMEOUT');throw error;}
 finally{clearTimeout(timer);upstream?.removeEventListener('abort',abort);}
}
type Control=HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
const controls=(root:HTMLElement)=>Array.from(root.querySelectorAll<Control>('input,select,textarea'));
export function markRequired(root:HTMLElement){
 for(const c of controls(root))if(c.required){const label=c.closest('label');const span=label?.querySelector(':scope > span');if(span&&!span.textContent?.includes('必填')&&!span.querySelector('.required-mark')){const mark=document.createElement('small');mark.className='required-mark';mark.textContent='（必填）';span.append(mark);}if(span&&!c.hasAttribute('aria-label'))c.setAttribute('aria-label',span.textContent||'');}
}
export function validateForm(form:HTMLFormElement){
 form.querySelectorAll('[data-validation-error]').forEach(e=>e.remove());
 let first:Control|undefined;
 for(const c of controls(form)){
  c.removeAttribute('aria-invalid');c.removeAttribute('aria-errormessage');
  if(!c.willValidate)continue;
  let message='';const label=c.closest('label')?.querySelector(':scope > span')?.textContent?.replace('（必填）','')||'此欄位';
  if(c.required&&!c.value.trim())message=`請填寫${label}。`;
  else if(c.validity.typeMismatch)message=c instanceof HTMLInputElement&&c.type==='email'?'請輸入有效的電郵地址。':'請輸入完整連結，例如 https://example.com。';
  else if(c.validity.tooShort)message=`請輸入至少 ${(c as HTMLInputElement).minLength} 個字元。`;
  else if(c.validity.patternMismatch)message='請輸入 16 位邀請碼，只包含數字及 a–f。';
  else if(c.validity.rangeUnderflow)message=c.name==='endDate'?'結束日期不可早於開始日期。':'請檢查此欄位的範圍。';
  else if(!c.validity.valid)message='請檢查此欄位的格式。';
  if(message){const error=document.createElement('small');error.id=`validation-${c.name}`;error.dataset.validationError='true';error.className='field-error';error.setAttribute('role','alert');error.textContent=message;const existing=c.closest('label')?.querySelector<HTMLElement>('.date-hint');if(existing){existing.id=error.id;}else c.after(error);c.setAttribute('aria-invalid','true');c.setAttribute('aria-errormessage',error.id);first??=c;}
 }
 if(first){const details=first.closest('details');if(details)details.open=true;first.focus();first.scrollIntoView({block:'center'});}
 return !first;
}

export function clearFieldError(target:EventTarget|null){
 if(!(target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement))return;
 target.closest('label')?.querySelectorAll('[data-validation-error]').forEach(e=>e.remove());target.removeAttribute('aria-invalid');target.removeAttribute('aria-errormessage');
}
