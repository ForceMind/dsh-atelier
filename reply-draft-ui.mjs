// Candidates remain plugin state until explicit Tab acceptance or a user click on Send suggestion.
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
const submittedCandidates=new WeakSet();
export async function sendReplyDraft(candidate,{read,settle=()=>Promise.resolve()}){
 if(!candidate||submittedCandidates.has(candidate))return false;
 const before=read();if(typeof before.actions?.submit!=='function'||!replyDraftCanApply(candidate.before,before))return false;
 submittedCandidates.add(candidate);
 if(!acceptReplyDraft(candidate,before))return false;
 await settle();
 const after=read();
 if(after.sessionId!==before.sessionId||after.actions!==before.actions||after.sourceMessageId!==before.sourceMessageId||after.epoch!==before.epoch||after.editor!==before.editor||!after.editable||after.composing||!replyDraftSessionReady(after.session)||after.input.phase!=='plain'||after.input.claim||after.input.draft!==candidate.result.text||after.input.draftRev!==before.input.draftRev+1||after.input.attachmentIds.length||after.input.occurrences.length)return false;
 after.actions.submit();return true;
}
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
export function replySuggestionStyles(){return `.atelier-reply-draft{position:relative;display:inline-flex;align-items:center;gap:4px;font:inherit;color:var(--dsw-alias-label-secondary)}.atelier-reply-draft button{font:inherit;color:inherit;background:transparent;border:0;border-radius:8px;padding:5px 8px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}.atelier-reply-draft button:hover{background:var(--dsw-alias-interactive-bg-hover)}.atelier-reply-draft button:disabled{opacity:.45;cursor:default}.atelier-reply-settings{position:absolute;bottom:calc(100% + 10px);left:0;width:min(310px,75vw);box-sizing:border-box;padding:14px;z-index:25;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-specific-input-major);box-shadow:var(--dsw-elevation-soft);display:grid;gap:14px;font-size:13px}.atelier-reply-settings header,.atelier-reply-settings footer{display:flex;justify-content:space-between;align-items:center}.atelier-reply-settings label{display:flex;align-items:center;gap:8px}.atelier-reply-settings .atelier-reply-model-label{display:grid;gap:6px}.atelier-reply-settings input[type=number]{width:64px}.atelier-reply-settings select{width:100%;min-width:0;padding:7px;border-radius:6px;font:inherit;color:inherit;background:var(--dsw-specific-input-major);border:1px solid var(--dsw-alias-border-l2)}.atelier-reply-settings small{line-height:1.5;color:var(--dsw-alias-label-tertiary)}[data-composer-card]:has([data-atelier-reply-candidate]) [data-composer-placeholder]{visibility:hidden}.atelier-reply-candidate{position:absolute;top:12px;left:16px;right:16px;padding-right:136px;pointer-events:none;color:var(--dsw-alias-label-tertiary);font:inherit;line-height:24px;white-space:pre-wrap;overflow:hidden;max-height:72px;z-index:2}.atelier-reply-candidate small{position:absolute;right:84px;top:1px;border:1px solid var(--dsw-alias-border-l2);border-radius:5px;padding:0 5px;font-size:11px;line-height:22px}.atelier-send-suggestion{position:absolute;right:0;top:0;pointer-events:auto;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-specific-input-major);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:24px;padding:0 7px}.atelier-send-suggestion:hover{background:var(--dsw-alias-interactive-bg-hover)}.atelier-send-suggestion:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.atelier-reply-error{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}`;}
export function installReplyDraft(ctx,React,call){
 const h=React.createElement,views=new Map();
 function channel(id){if(!views.has(id))views.set(id,{text:'',send:null,listeners:new Set()});return views.get(id);}
 function publish(id,text,send=null){const view=channel(id);if(view.text===text&&view.send===send)return;view.text=text;view.send=send;for(const fn of view.listeners)fn();}
 function Candidate(props){const view=channel(props.sessionId);const text=React.useSyncExternalStore(fn=>{view.listeners.add(fn);return()=>view.listeners.delete(fn);},()=>view.text);return text?h('div',{'data-atelier-reply-candidate':'',className:'atelier-reply-candidate','aria-live':'polite'},h('span',null,text),h('small',null,' Tab ↹'),h('button',{type:'button',className:'atelier-send-suggestion','data-atelier-send-suggestion':'',onClick:()=>view.send?.(),'aria-label':'发送建议 / Send suggestion',title:'点击直接发送这条候选；Tab仅采纳到输入框'},'发送建议')):null;}
 function ReplyDraft(props){
  React.useSyncExternalStore(fn=>ctx.locale.subscribe(fn),()=>ctx.locale.getSnapshot());const zh=ctx.locale.getSnapshot().active.startsWith('zh'),t=(cn,en)=>zh?cn:en;
  const anchor=React.useRef(null),watch=React.useRef(null),live=React.useRef({}),epoch=React.useRef(0),mounted=React.useRef(false),flight=React.useRef(false),candidate=React.useRef(null),attempted=React.useRef(new Set());
  const[models,setModels]=React.useState([]),[recommended,setRecommended]=React.useState(null),[optionsError,setOptionsError]=React.useState(''),[settingsOpen,setSettingsOpen]=React.useState(false),[busy,setBusy]=React.useState(false),[options,setOptions]=React.useState(null),[form,setForm]=React.useState(null),[saving,setSaving]=React.useState(false),[message,setMessage]=React.useState(''),[tick,rerender]=React.useState(0);
  const selectInput=React.useCallback(input=>{live.current.input=input;return input;},[]),selectSession=React.useCallback(session=>{live.current.session=session;return session;},[]);
  const input=props.useInput(selectInput),session=props.useSession(selectSession),sourceMessageId=props.useProjection('atelierReplySource',s=>s?.messageId??null);
  live.current={...live.current,input,session,sourceMessageId,sessionId:props.sessionId,actions:props.inputActions};
  const read=()=>({...live.current,...(watch.current?.read()??{editable:false,composing:true}),epoch:epoch.current});
  const drop=()=>{candidate.current=null;publish(props.sessionId,'');};
  async function sendCandidate(){const chosen=candidate.current;if(!chosen)return;drop();try{const submitted=await sendReplyDraft(chosen,{read});if(!submitted&&mounted.current)setMessage(t('未提交；请检查输入后使用原生发送按钮。','Not submitted; review the composer and use Send.'));}catch(error){if(mounted.current)setMessage(t('发送失败：','Send failed: ')+String(error.message??error));}}
  React.useLayoutEffect(()=>{
   mounted.current=true;epoch.current++;flight.current=false;setBusy(false);drop();setMessage('');attempted.current=new Set();
   const editor=anchor.current?.closest('[data-composer-card]')?.querySelector('[data-composer-input]');
   watch.current=editor?observeReplyDraftEditor(editor,()=>{drop();if(mounted.current)rerender(n=>n+1);}):null;
   const keys=event=>{if(event.key==='Escape'){drop();return;}if(!replyDraftTab(event)||!candidate.current)return;const state=read();if(state.editor!==event.target||!replyDraftCanApply(candidate.current.before,state)){drop();return;}event.preventDefault();event.stopImmediatePropagation();const chosen=candidate.current;drop();acceptReplyDraft(chosen,state);};
   editor?.addEventListener('keydown',keys,true);
   const visibility=()=>{rerender(n=>n+1);};document.addEventListener('visibilitychange',visibility);rerender(n=>n+1);
   return()=>{mounted.current=false;epoch.current++;drop();watch.current?.dispose();watch.current=null;editor?.removeEventListener('keydown',keys,true);document.removeEventListener('visibilitychange',visibility);};
  },[props.sessionId,props.inputActions]);
  React.useEffect(()=>loadReplyOptions({call,success:value=>{setOptions(value);setForm({auto:value.auto,delaySeconds:value.delaySeconds,provider:value.provider??'',model:value.model??''});setOptionsError('');},failure:error=>setOptionsError(t('草稿设置读取失败：','Draft settings unavailable: ')+String(error.message??error))}),[props.sessionId,settingsOpen]);
  React.useEffect(()=>{if(!settingsOpen)return;let active=true;call('reply-models',{}).then(value=>{if(active){setModels(value.items);setRecommended(value.recommended);}}).catch(error=>active&&setMessage(String(error.message??error)));return()=>{active=false;};},[settingsOpen]);
  React.useEffect(()=>{if(candidate.current&&!replyDraftCanApply(candidate.current.before,read()))drop();},[input,session,sourceMessageId,tick]);
  async function generate(automatic=false){
   if(flight.current||!replyDraftReady(read())||(automatic&&document.visibilityState!=='visible'))return;
   flight.current=true;setBusy(true);drop();setMessage('');const token=epoch.current;
   try{const result=await generateReplyDraft({read,call,automatic});if(!mounted.current||token!==epoch.current)return;if(result){candidate.current=result;publish(props.sessionId,result.result.text,sendCandidate);}}
   catch(error){if(automatic&&String(error.message??error).includes('already-attempted'))return;if(mounted.current&&token===epoch.current)setMessage(t('生成失败：','Generation failed: ')+String(error.message??error));}
   finally{if(mounted.current){flight.current=false;setBusy(false);}}
  }
  const state=read(),ready=replyDraftReady(state)&&document.visibilityState==='visible';
  React.useEffect(()=>scheduleReplyDraft({ready:ready&&!busy&&!settingsOpen&&!candidate.current,auto:!optionsError&&options?.auto===true,delaySeconds:options?.delaySeconds,sourceMessageId,attempted:attempted.current,run:()=>generate(true)}),[ready,busy,settingsOpen,sourceMessageId,input,session,tick,options,optionsError]);
  async function save(event){event.preventDefault();if(!form||!Number.isInteger(form.delaySeconds)||form.delaySeconds<0||form.delaySeconds>60)return;epoch.current++;drop();setSaving(true);try{const value=await call('reply-options',{revision:options.revision,replyOptions:form});setOptions(value);setForm({auto:value.auto,delaySeconds:value.delaySeconds,provider:value.provider??'',model:value.model??''});drop();setMessage(t('已保存','Saved'));}catch(error){setMessage(String(error.message??error));}finally{setSaving(false);}}
     const help=t('独立low请求，默认推荐Luna，可能收费；Tab采纳，输入即丢弃，不自动发送。','Separate low request, preferring Luna; may incur charges. Tab accepts; typing discards; never sends.');
   const choice=form?JSON.stringify([form.provider,form.model]):'[]';
   return h('span',{ref:anchor,className:'atelier-reply-draft'},
    h('style',null,replySuggestionStyles()),
    h('button',{type:'button',onClick:()=>setSettingsOpen(!settingsOpen),title:help,'aria-label':t('回复建议设置','Reply suggestion settings'),'aria-expanded':settingsOpen,'data-atelier-reply-settings':''},h('svg',{width:15,height:15,viewBox:'0 0 20 20',fill:'none','aria-hidden':true},h('path',{d:'M4 4h12v8H9l-4 4v-4H4z',stroke:'currentColor',strokeWidth:1.4,strokeLinejoin:'round'})),busy?t('生成中','Drafting'):t('回复建议','Suggestions')),
    settingsOpen&&h('form',{className:'atelier-reply-settings',onSubmit:save,onKeyDown:event=>{if(event.key==='Escape'){event.stopPropagation();setSettingsOpen(false);}}},h('header',null,h('strong',null,t('回复建议','Reply suggestions')),h('button',{type:'button','aria-label':t('关闭回复建议设置','Close suggestion settings'),onClick:()=>setSettingsOpen(false)},'×')),
     form?h(React.Fragment,null,h('label',null,h('input',{type:'checkbox',checked:form.auto,disabled:saving,onChange:event=>setForm({...form,auto:event.target.checked})}),t('空闲时自动生成','Generate automatically when idle')),
     h('label',null,t('等待时间','Idle delay'),h('input',{type:'number',min:0,max:60,step:1,value:form.delaySeconds,disabled:saving,onChange:event=>setForm({...form,delaySeconds:event.target.value===''?'':Number(event.target.value)})}),t('秒','seconds')),
     h('label',{className:'atelier-reply-model-label'},t('建议专用模型','Suggestion model'),h('select',{value:choice,disabled:saving,onChange:event=>{const[provider,model]=JSON.parse(event.target.value);setForm({...form,provider,model});}},h('option',{value:JSON.stringify(['',''])},recommended?t('默认推荐：','Recommended: ')+recommended.model:t('默认推荐Luna（未配置）','Luna recommended (not configured)')),form.model&&!models.some(item=>item.provider===form.provider&&item.model===form.model)&&h('option',{value:choice},form.provider+' / '+form.model+' '+t('（当前不可用）','(unavailable)')),models.map(item=>h('option',{key:JSON.stringify([item.provider,item.model]),value:JSON.stringify([item.provider,item.model])},item.provider+' / '+item.name)))),
     h('small',null,t('独立low请求，可能收费；不会修改对话模型。候选按Tab采纳，0–60秒，每条回复自动一次。','Separate low request; may incur charges. Conversation model unchanged. Tab accepts; 0–60s; one auto attempt per reply.')),
     h('footer',null,h('button',{type:'button',disabled:busy||!replyDraftReady(state),onClick:()=>{setSettingsOpen(false);generate(false);},'data-atelier-reply-draft-button':''},t('立即生成','Generate now')),h('button',{type:'submit',disabled:saving||!Number.isInteger(form.delaySeconds)||form.delaySeconds<0||form.delaySeconds>60},saving?t('保存中…','Saving…'):t('保存','Save')))):h('small',null,optionsError||t('读取设置…','Loading settings…'))),
    h('span',{role:'status',className:'atelier-reply-error',title:optionsError||message},optionsError||message));
  }
  const cleanups=[ctx.slots.inject('conversation.input.left',()=>ctx.slots.register({name:'conversation.input.left',id:'atelier-reply-draft',order:40},ReplyDraft)),ctx.slots.inject('conversation.input.overlay',()=>ctx.slots.register({name:'conversation.input.overlay',id:'atelier-reply-candidate',order:40},Candidate))];return()=>{for(const dispose of cleanups)dispose();views.clear();};
}
