// Mouse and keyboard Tab both accept only; native Send remains the sole submit path.
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
export function restoreReplyCandidate(candidate,state){
 if(!candidate||candidate.before.sessionId!==state.sessionId||candidate.before.sourceMessageId!==state.sourceMessageId||candidate.before.actions!==state.actions||candidate.before.editor!==state.editor||candidate.before.epoch!==state.epoch||!replyDraftReady(state))return null;
 const span=state.actions.captureInsertion();if(span.start!==0||span.end!==0||span.draftRev!==state.input.draftRev)return null;
 return {...candidate,before:state,span};
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
export function replySuggestionStyles(){return `.atelier-reply-draft{position:relative;display:inline-flex;align-items:center;gap:4px;font:inherit;color:var(--dsw-alias-label-secondary)}.atelier-reply-draft button{font:inherit;color:inherit;background:transparent;border:0;border-radius:8px;padding:5px 8px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}.atelier-reply-draft button:hover{background:var(--dsw-alias-interactive-bg-hover)}.atelier-reply-draft button:disabled{opacity:.45;cursor:default}.atelier-reply-settings{position:absolute;bottom:calc(100% + 10px);left:0;width:min(310px,75vw);box-sizing:border-box;padding:14px;z-index:25;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-specific-input-major);box-shadow:var(--dsw-elevation-soft);display:grid;gap:14px;font-size:13px}.atelier-reply-settings header,.atelier-reply-settings footer{display:flex;justify-content:space-between;align-items:center}.atelier-reply-settings label{display:flex;align-items:center;gap:8px}.atelier-reply-settings .atelier-reply-model-label{display:grid;gap:6px}.atelier-reply-settings input[type=number]{width:64px}.atelier-reply-settings select{width:100%;min-width:0;padding:7px;border-radius:6px;font:inherit;color:inherit;background:var(--dsw-specific-input-major);border:1px solid var(--dsw-alias-border-l2)}.atelier-reply-settings small{line-height:1.5;color:var(--dsw-alias-label-tertiary)}[data-composer-card]:has([data-atelier-reply-candidate]) [data-composer-placeholder]{visibility:hidden}.atelier-reply-candidate{position:absolute;top:12px;left:14px;right:8px;box-sizing:border-box;pointer-events:none;color:var(--dsw-alias-label-secondary);font:inherit;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;max-height:var(--dsh-composer-text-max-height,260px);overflow:auto;z-index:2}.atelier-reply-candidate-text{min-width:0;white-space:pre-wrap}.atelier-candidate-tab-space{display:inline-block;width:50px;height:1px}.atelier-reply-candidate>.atelier-accept-suggestion{position:absolute;right:8px;bottom:0}.atelier-accept-suggestion{pointer-events:auto;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);border-radius:5px;background:var(--dsw-specific-input-major);color:var(--dsw-alias-label-secondary);padding:0 5px;font:inherit;font-size:11px;line-height:22px}.atelier-accept-suggestion:hover{background:var(--dsw-alias-interactive-bg-hover)}.atelier-accept-suggestion:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.atelier-reply-error{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}`;}
export function installReplyDraft(ctx,React,call){
 const h=React.createElement,views=new Map();
 function channel(id){if(!views.has(id))views.set(id,{text:'',accept:null,listeners:new Set()});return views.get(id);}
 function publish(id,text,accept=null){const view=channel(id);if(view.text===text&&view.accept===accept)return;view.text=text;view.accept=accept;for(const fn of view.listeners)fn();}
 function Candidate(props){
  const view=channel(props.sessionId),root=React.useRef(null),token=React.useId().replace(/[^a-zA-Z0-9_-]/g,''),[geometry,setGeometry]=React.useState(null),[height,setHeight]=React.useState(0);
  const text=React.useSyncExternalStore(fn=>{view.listeners.add(fn);return()=>view.listeners.delete(fn);},()=>view.text);
  React.useLayoutEffect(()=>{
   if(!text||!root.current){setHeight(0);return;}
   const card=root.current.closest('[data-composer-card]'),editor=card?.querySelector('[data-composer-input]');if(!editor)return;
   const measure=()=>{const c=card.getBoundingClientRect(),e=editor.getBoundingClientRect(),style=getComputedStyle(editor);const next={left:e.left-c.left,top:e.top-c.top,width:e.width,font:style.font,lineHeight:style.lineHeight,letterSpacing:style.letterSpacing,padding:style.padding,wordBreak:style.wordBreak,overflowWrap:style.overflowWrap};setGeometry(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);};
   measure();const observer=new ResizeObserver(measure);observer.observe(editor);window.addEventListener('resize',measure);return()=>{observer.disconnect();window.removeEventListener('resize',measure);};
  },[text]);
  React.useLayoutEffect(()=>{if(!text||!root.current)return;const element=root.current;const measure=()=>setHeight(Math.ceil(element.getBoundingClientRect().height));measure();const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect();},[text,geometry]);
  return text?h('div',{ref:root,'data-atelier-reply-candidate':token,className:'atelier-reply-candidate','aria-live':'polite',style:geometry?{left:geometry.left,top:geometry.top,width:geometry.width,font:geometry.font,lineHeight:geometry.lineHeight,letterSpacing:geometry.letterSpacing,padding:geometry.padding,wordBreak:geometry.wordBreak,overflowWrap:geometry.overflowWrap}:undefined},
   h('style',null,`[data-composer-card]:has([data-atelier-reply-candidate="${token}"]) :is([data-input-scroll],[data-composer-input]){min-height:${height}px}`),
   h('div',{className:'atelier-reply-candidate-text'},text,h('span',{'aria-hidden':true,className:'atelier-candidate-tab-space'})),h('button',{type:'button',className:'atelier-accept-suggestion','data-atelier-accept-suggestion':'',onClick:()=>view.accept?.(),'aria-label':'采纳建议到输入框',title:'点击或按Tab采纳，不发送'},'Tab ↹')):null;
 }
 function ReplyDraft(props){
  React.useSyncExternalStore(fn=>ctx.locale.subscribe(fn),()=>ctx.locale.getSnapshot());const zh=ctx.locale.getSnapshot().active.startsWith('zh'),t=(cn,en)=>zh?cn:en;
  const anchor=React.useRef(null),watch=React.useRef(null),live=React.useRef({}),epoch=React.useRef(0),mounted=React.useRef(false),flight=React.useRef(false),candidate=React.useRef(null),cachedCandidate=React.useRef(null),attempted=React.useRef(new Set());
  const[models,setModels]=React.useState([]),[recommended,setRecommended]=React.useState(null),[optionsError,setOptionsError]=React.useState(''),[settingsOpen,setSettingsOpen]=React.useState(false),[busy,setBusy]=React.useState(false),[options,setOptions]=React.useState(null),[form,setForm]=React.useState(null),[saving,setSaving]=React.useState(false),[message,setMessage]=React.useState(''),[tick,rerender]=React.useState(0);
  const selectInput=React.useCallback(input=>{live.current.input=input;return input;},[]),selectSession=React.useCallback(session=>{live.current.session=session;return session;},[]);
  const input=props.useInput(selectInput),session=props.useSession(selectSession),sourceMessageId=props.useProjection('atelierReplySource',s=>s?.messageId??null);
  live.current={...live.current,input,session,sourceMessageId,sessionId:props.sessionId,actions:props.inputActions};
  const suggestionView=channel(props.sessionId),suggestionText=React.useSyncExternalStore(fn=>{suggestionView.listeners.add(fn);return()=>suggestionView.listeners.delete(fn);},()=>suggestionView.text);
  const read=()=>({...live.current,...(watch.current?.read()??{editable:false,composing:true}),epoch:epoch.current});
  const hide=()=>{candidate.current=null;publish(props.sessionId,'');};
  const drop=()=>{cachedCandidate.current=null;hide();};
  function acceptCandidate(){const chosen=candidate.current;if(!chosen)return false;const state=read();hide();return acceptReplyDraft(chosen,state);}
  React.useLayoutEffect(()=>{
   mounted.current=true;epoch.current++;flight.current=false;setBusy(false);drop();setMessage('');attempted.current=new Set();
   const editor=anchor.current?.closest('[data-composer-card]')?.querySelector('[data-composer-input]');
   watch.current=editor?observeReplyDraftEditor(editor,()=>{hide();if(mounted.current)rerender(n=>n+1);}):null;
   const keys=event=>{if(event.key==='Escape'){drop();return;}if(!replyDraftTab(event)||!candidate.current)return;const state=read();if(state.editor!==event.target||!replyDraftCanApply(candidate.current.before,state)){drop();return;}event.preventDefault();event.stopImmediatePropagation();acceptCandidate();};
   editor?.addEventListener('keydown',keys,true);
   const visibility=()=>{rerender(n=>n+1);};document.addEventListener('visibilitychange',visibility);rerender(n=>n+1);
   return()=>{mounted.current=false;epoch.current++;drop();watch.current?.dispose();watch.current=null;editor?.removeEventListener('keydown',keys,true);document.removeEventListener('visibilitychange',visibility);};
  },[props.sessionId,props.inputActions]);
  React.useEffect(()=>loadReplyOptions({call,success:value=>{setOptions(value);setForm({auto:value.auto,delaySeconds:value.delaySeconds,provider:value.provider??'',model:value.model??''});setOptionsError('');},failure:error=>setOptionsError(t('草稿设置读取失败：','Draft settings unavailable: ')+String(error.message??error))}),[props.sessionId,settingsOpen]);
  React.useEffect(()=>{if(!settingsOpen)return;let active=true;call('reply-models',{}).then(value=>{if(active){setModels(value.items);setRecommended(value.recommended);}}).catch(error=>active&&setMessage(String(error.message??error)));return()=>{active=false;};},[settingsOpen]);
  React.useEffect(()=>{const saved=cachedCandidate.current;if(!saved)return;const current=read();if(saved.before.sourceMessageId!==current.sourceMessageId||saved.before.sessionId!==current.sessionId||saved.before.epoch!==current.epoch||!replyDraftSessionReady(current.session)){drop();return;}const restored=restoreReplyCandidate(saved,current);if(restored){candidate.current=restored;publish(props.sessionId,restored.result.text,acceptCandidate);}else hide();},[input,session,sourceMessageId,tick]);
  async function generate(automatic=false){
   if(flight.current||!replyDraftReady(read())||(automatic&&document.visibilityState!=='visible'))return;
   flight.current=true;setBusy(true);drop();setMessage('');const token=epoch.current;
   try{const result=await generateReplyDraft({read,call,automatic});if(!mounted.current||token!==epoch.current)return;if(result){cachedCandidate.current=result;candidate.current=result;publish(props.sessionId,result.result.text,acceptCandidate);}}
   catch(error){if(automatic&&String(error.message??error).includes('already-attempted'))return;if(mounted.current&&token===epoch.current)setMessage(t('生成失败：','Generation failed: ')+String(error.message??error));}
   finally{if(mounted.current){flight.current=false;setBusy(false);}}
  }
  const state=read(),ready=replyDraftReady(state)&&document.visibilityState==='visible';
  React.useEffect(()=>scheduleReplyDraft({ready:ready&&!busy&&!settingsOpen&&!candidate.current,auto:!optionsError&&options?.auto===true,delaySeconds:options?.delaySeconds,sourceMessageId,attempted:attempted.current,run:()=>generate(true)}),[ready,busy,settingsOpen,sourceMessageId,input,session,tick,options,optionsError]);
  async function save(event){event.preventDefault();if(!form||!Number.isInteger(form.delaySeconds)||form.delaySeconds<0||form.delaySeconds>60)return;epoch.current++;drop();setSaving(true);try{const value=await call('reply-options',{revision:options.revision,replyOptions:form});setOptions(value);setForm({auto:value.auto,delaySeconds:value.delaySeconds,provider:value.provider??'',model:value.model??''});drop();setMessage(t('已保存','Saved'));}catch(error){setMessage(String(error.message??error));}finally{setSaving(false);}}
     const help=t('独立low请求，默认推荐Luna，可能收费；Tab采纳，输入时隐藏，删空恢复，不自动发送。','Separate low request, preferring Luna; may incur charges. Tab accepts; typing hides; clearing restores; never sends.');
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
