// Candidates remain plugin state until an explicit unmodified Tab accepts them.
export function replyDraftInputEmpty(input){return !!input&&input.draft===''&&input.phase==='plain'&&!input.claim&&Array.isArray(input.attachmentIds)&&input.attachmentIds.length===0&&Array.isArray(input.occurrences)&&input.occurrences.length===0;}
export function replyDraftSessionReady(session){return !!session&&session.openState==='open'&&!session.running&&!session.removed&&Array.isArray(session.pendingSubmissions)&&session.pendingSubmissions.length===0;}
export function replyDraftReady(state){return !!state.sessionId&&!!state.sourceMessageId&&replyDraftInputEmpty(state.input)&&replyDraftSessionReady(state.session)&&state.editable&&!state.composing&&typeof state.actions?.captureInsertion==='function'&&typeof state.actions?.insertText==='function';}
export function replyDraftCanApply(before,after){return replyDraftReady(after)&&before.sessionId===after.sessionId&&before.sourceMessageId===after.sourceMessageId&&before.actions===after.actions&&before.editor===after.editor&&before.touch===after.touch&&before.epoch===after.epoch&&before.input.draftRev===after.input.draftRev&&before.input.attachmentIds===after.input.attachmentIds;}
export async function generateReplyDraft({read,call,automatic=false}){
 const before=read();if(!replyDraftReady(before))return null;
 const span=before.actions.captureInsertion();if(span.start!==0||span.end!==0||span.draftRev!==before.input.draftRev)return null;
 const result=await call('reply-draft',{sessionId:before.sessionId,sourceMessageId:before.sourceMessageId,automatic});
 if(!result||typeof result.text!=='string'||!result.text.trim()||result.reasoningEffort!=='low'||result.sourceMessageId!==before.sourceMessageId)throw Error('Invalid reply draft response');
 return replyDraftCanApply(before,read())?{before,span,result}:null;
}
export function acceptReplyDraft(candidate,state){return !!candidate&&replyDraftCanApply(candidate.before,state)&&candidate.before.actions.insertText(candidate.result.text,candidate.span);}
export function replyDraftTab(event){return event.key==='Tab'&&!event.shiftKey&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&!event.isComposing&&!event.repeat;}
export function scheduleReplyDraft({ready,auto,delaySeconds,sourceMessageId,attempted,run,set=setTimeout,clear=clearTimeout}){
 if(!ready||!auto||!sourceMessageId||attempted.has(sourceMessageId)||!Number.isInteger(delaySeconds)||delaySeconds<0||delaySeconds>60)return()=>{};
 const timer=set(()=>{if(attempted.has(sourceMessageId))return;attempted.add(sourceMessageId);run();},delaySeconds*1000);return()=>clear(timer);
}
export function observeReplyDraftEditor(editor,changed,{now=Date.now,Observer=globalThis.MutationObserver}={}){
 let touch=0,composing=false,until=0,active=true,timer;
 const notify=()=>{touch++;changed();};const start=()=>{composing=true;notify();};const end=()=>{composing=false;until=now()+10;notify();clearTimeout(timer);timer=setTimeout(()=>active&&changed(),11);};
 const edits=['beforeinput','input','paste','drop','cut'],capture={capture:true};editor.addEventListener('compositionstart',start,capture);editor.addEventListener('compositionend',end,capture);for(const type of edits)editor.addEventListener(type,notify,capture);
 const observer=Observer?new Observer(notify):null;observer?.observe(editor,{attributes:true,attributeFilter:['data-composer-composing','contenteditable']});
 return{read:()=>({editor,touch,editable:active&&editor.isConnected&&editor.isContentEditable,composing:composing||now()<until||editor.hasAttribute('data-composer-composing')}),dispose(){active=false;clearTimeout(timer);observer?.disconnect();editor.removeEventListener('compositionstart',start,capture);editor.removeEventListener('compositionend',end,capture);for(const type of edits)editor.removeEventListener(type,notify,capture);}};
}
export function loadReplyOptions({call,success,failure,set=setTimeout,clear=clearTimeout}){
 let active=true,timer,attempt=0;
 const run=async()=>{try{const value=await call('reply-options',{});if(active)success(value);}catch(error){if(!active)return;failure(error);if(attempt<3)timer=set(run,[1000,3000,8000][attempt++]);}};
 run();return()=>{active=false;clear(timer);};
}
export function installReplyDraft(ctx,React,call){
 const h=React.createElement,views=new Map();
 function channel(id){if(!views.has(id))views.set(id,{text:'',listeners:new Set()});return views.get(id);}
 function publish(id,text){const view=channel(id);if(view.text===text)return;view.text=text;for(const fn of view.listeners)fn();}
 function Candidate(props){const view=channel(props.sessionId);const text=React.useSyncExternalStore(fn=>{view.listeners.add(fn);return()=>view.listeners.delete(fn);},()=>view.text);return text?h('div',{'data-atelier-reply-candidate':'',className:'atelier-reply-candidate','aria-live':'polite'},h('span',null,text),h('small',null,' Tab ↹')):null;}
 function ReplyDraft(props){
  React.useSyncExternalStore(fn=>ctx.locale.subscribe(fn),()=>ctx.locale.getSnapshot());const zh=ctx.locale.getSnapshot().active.startsWith('zh'),t=(cn,en)=>zh?cn:en;
  const anchor=React.useRef(null),watch=React.useRef(null),live=React.useRef({}),epoch=React.useRef(0),mounted=React.useRef(false),flight=React.useRef(false),candidate=React.useRef(null),attempted=React.useRef(new Set());
  const[optionsError,setOptionsError]=React.useState(''),[settingsOpen,setSettingsOpen]=React.useState(false),[busy,setBusy]=React.useState(false),[options,setOptions]=React.useState(null),[form,setForm]=React.useState(null),[saving,setSaving]=React.useState(false),[message,setMessage]=React.useState(''),[tick,rerender]=React.useState(0);
  const selectInput=React.useCallback(input=>{live.current.input=input;return input;},[]),selectSession=React.useCallback(session=>{live.current.session=session;return session;},[]);
  const input=props.useInput(selectInput),session=props.useSession(selectSession),sourceMessageId=props.useProjection('atelierReplySource',s=>s?.messageId??null);
  live.current={...live.current,input,session,sourceMessageId,sessionId:props.sessionId,actions:props.inputActions};
  const read=()=>({...live.current,...(watch.current?.read()??{editable:false,composing:true}),epoch:epoch.current});
  const drop=()=>{candidate.current=null;publish(props.sessionId,'');};
  React.useLayoutEffect(()=>{
   mounted.current=true;epoch.current++;flight.current=false;setBusy(false);drop();setMessage('');attempted.current=new Set();
   const editor=anchor.current?.closest('[data-composer-card]')?.querySelector('[data-composer-input]');
   watch.current=editor?observeReplyDraftEditor(editor,()=>{drop();if(mounted.current)rerender(n=>n+1);}):null;
   const keys=event=>{if(event.key==='Escape'){drop();return;}if(!replyDraftTab(event)||!candidate.current)return;const state=read();if(state.editor!==event.target||!replyDraftCanApply(candidate.current.before,state)){drop();return;}event.preventDefault();event.stopImmediatePropagation();const chosen=candidate.current;drop();acceptReplyDraft(chosen,state);};
   editor?.addEventListener('keydown',keys,true);
   const visibility=()=>{drop();epoch.current++;rerender(n=>n+1);};document.addEventListener('visibilitychange',visibility);rerender(n=>n+1);
   return()=>{mounted.current=false;epoch.current++;drop();watch.current?.dispose();watch.current=null;editor?.removeEventListener('keydown',keys,true);document.removeEventListener('visibilitychange',visibility);};
  },[props.sessionId,props.inputActions]);
  React.useEffect(()=>loadReplyOptions({call,success:value=>{setOptions(value);setForm({auto:value.auto,delaySeconds:value.delaySeconds});setOptionsError('');},failure:error=>setOptionsError(t('草稿设置读取失败：','Draft settings unavailable: ')+String(error.message??error))}),[props.sessionId,settingsOpen]);
  React.useEffect(()=>{if(candidate.current&&!replyDraftCanApply(candidate.current.before,read()))drop();},[input,session,sourceMessageId,tick]);
  async function generate(automatic=false){
   if(flight.current||!replyDraftReady(read())||document.visibilityState!=='visible')return;
   flight.current=true;setBusy(true);drop();setMessage('');const token=epoch.current;
   try{const result=await generateReplyDraft({read,call,automatic});if(!mounted.current||token!==epoch.current)return;if(result){candidate.current=result;publish(props.sessionId,result.result.text);}}
   catch(error){if(automatic&&String(error.message??error).includes('already-attempted'))return;if(mounted.current&&token===epoch.current)setMessage(t('生成失败：','Generation failed: ')+String(error.message??error));}
   finally{if(mounted.current){flight.current=false;setBusy(false);}}
  }
  const state=read(),ready=replyDraftReady(state)&&document.visibilityState==='visible';
  React.useEffect(()=>scheduleReplyDraft({ready:ready&&!busy&&!settingsOpen&&!candidate.current,auto:!optionsError&&options?.auto===true,delaySeconds:options?.delaySeconds,sourceMessageId,attempted:attempted.current,run:()=>generate(true)}),[ready,busy,settingsOpen,sourceMessageId,input,session,tick,options,optionsError]);
  async function save(event){event.preventDefault();if(!form||!Number.isInteger(form.delaySeconds)||form.delaySeconds<0||form.delaySeconds>60)return;setSaving(true);try{const value=await call('reply-options',{revision:options.revision,replyOptions:form});setOptions(value);setForm({auto:value.auto,delaySeconds:value.delaySeconds});drop();setMessage(t('已保存','Saved'));}catch(error){setMessage(String(error.message??error));}finally{setSaving(false);}}
  const help=t('自动生成使用上一条助手模型的low档位，可能收费；候选按Tab采纳，正常输入即丢弃，不自动发送。','Automatic drafts use the previous assistant model at low reasoning and may incur charges. Tab accepts; typing discards. Never sends.');
  return h('span',{ref:anchor,className:'atelier-reply-draft'},
   h('style',null,'.atelier-reply-draft{display:inline-flex;align-items:center;gap:4px;font:inherit;color:var(--dsw-alias-label-secondary)}.atelier-reply-draft button,.atelier-reply-draft summary{font:inherit;color:inherit;background:transparent;border:0;border-radius:6px;padding:5px 7px;cursor:pointer}.atelier-reply-draft button:disabled{opacity:.45}.atelier-reply-draft details{position:relative}.atelier-reply-draft details>form{position:absolute;bottom:100%;right:0;width:280px;padding:12px;z-index:25;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-specific-input-major);display:grid;gap:10px}.atelier-reply-draft label{display:flex;align-items:center;gap:8px}.atelier-reply-draft input[type=number]{width:70px}.atelier-reply-candidate{position:absolute;top:12px;left:16px;right:16px;pointer-events:none;color:var(--dsw-alias-label-tertiary);font:inherit;line-height:24px;white-space:pre-wrap;overflow:hidden;max-height:96px;z-index:2}.atelier-reply-candidate small{display:inline-block;margin-left:8px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;padding:0 4px;font-size:11px}.atelier-reply-error{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}'),
   h('button',{type:'button',disabled:busy||!ready,onClick:()=>generate(false),title:help,'data-atelier-reply-draft-button':''},busy?t('生成中…','Drafting…'):t('回复草稿','Reply draft')),
   h('details',{onToggle:event=>setSettingsOpen(event.currentTarget.open)},h('summary',{'aria-label':t('回复草稿设置','Reply draft settings')},'⚙'),settingsOpen&&form&&h('form',{onSubmit:save},h('label',null,h('input',{type:'checkbox',checked:form.auto,disabled:saving,onChange:event=>setForm({...form,auto:event.target.checked})}),t('自动生成（可能收费）','Auto generate (may incur charges)')),h('label',null,t('空闲等待（秒）','Idle delay (seconds)'),h('input',{type:'number',min:0,max:60,step:1,value:form.delaySeconds,disabled:saving,onChange:event=>setForm({...form,delaySeconds:event.target.value===''?'':Number(event.target.value)})})),h('small',null,t('0–60秒，默认5秒；每条回复自动尝试一次。Tab采纳，不自动发送。','0–60s; default 5s. One automatic attempt per reply. Tab accepts; never sends.')),h('button',{type:'submit',disabled:saving||!Number.isInteger(form.delaySeconds)||form.delaySeconds<0||form.delaySeconds>60},t('保存','Save')))),
   h('span',{role:'status',className:'atelier-reply-error',title:optionsError||message},optionsError||message));
 }
 const cleanups=[ctx.slots.inject('conversation.input.right',()=>ctx.slots.register({name:'conversation.input.right',id:'atelier-reply-draft',order:40},ReplyDraft)),ctx.slots.inject('conversation.input.overlay',()=>ctx.slots.register({name:'conversation.input.overlay',id:'atelier-reply-candidate',order:40},Candidate))];return()=>{for(const dispose of cleanups)dispose();views.clear();};
}
