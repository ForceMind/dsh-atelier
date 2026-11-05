// Suite-owned UI; upstream remains intact. The manager supplies the exact row form.
export const CONTEXT_FIELDS=[
 {key:'defaultPlacement',zh:'入口位置',en:'Placement',values:['all','tab','sidebar']},
 {key:'defaultGranularity',zh:'统计粒度',en:'Granularity',values:['step','turn']},
 {key:'defaultTrendMode',zh:'趋势模式',en:'Trend mode',values:['total','delta']},
 {key:'defaultDeltaBase',zh:'增量基准',en:'Delta base',values:['step','turn']},
 {key:'defaultToolSort',zh:'工具排序',en:'Tool sort',values:['size','count','name']},
 {key:'defaultFileSort',zh:'文件排序',en:'File sort',values:['count','latest','path','name']},
 {key:'insightsEntry',zh:'上下文洞察入口',en:'Insights entry',values:['show','hide']},
 {key:'defaultDurationCurve',zh:'耗时曲线',en:'Duration curve',values:['show','hide']},
 {key:'fleetTab',zh:'跨会话页',en:'Fleet tab',values:['show','hide']},
 {key:'promptPrefix',zh:'上下文前缀',en:'Context prefix'},
 {key:'promptSuffix',zh:'上下文后缀',en:'Context suffix'},
];
export function contextChanges(snapshot,edits){
 if(snapshot?.status!=='ready'||!snapshot.writable||!Number.isSafeInteger(snapshot.revision))throw Error('Configuration is not ready or writable');
 return Object.entries(edits).filter(([key,value])=>snapshot.value?.[key]!==value).map(([key,value])=>{
  const field=CONTEXT_FIELDS.find(row=>row.key===key);if(!field)throw Error('Unknown context field');
  if(typeof value!=='string'||(field.values&&!field.values.includes(value))||value.includes('\0'))throw Error('Invalid context field '+key);
  return {op:'set',path:[key],value};
 });
}
export async function saveContextForm(form,baseline,edits){
 const ops=contextChanges(baseline,edits);if(!ops.length)return true;
 return form.mutate(ops,baseline.revision);
}
export function installContextConfig(ctx,React){
 const h=React.createElement;
 function Page({view,form}){
  React.useSyncExternalStore(fn=>ctx.locale.subscribe(fn),()=>ctx.locale.getSnapshot());
  const zh=ctx.locale.getSnapshot().active.startsWith('zh'),t=(cn,en)=>zh?cn:en;
  const[edits,setEdits]=React.useState({}),[baseline,setBaseline]=React.useState(null),[busy,setBusy]=React.useState(false),[error,setError]=React.useState(''),[saved,setSaved]=React.useState(false);
  const mounted=React.useRef(true);
  React.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  if(view==='summary')return h('span',null,t('Suite上下文偏好，保存与取消由本页明确控制。','Suite context preferences with explicit Save and Cancel.'));
  const snapshot=form?.state,ready=snapshot?.status==='ready',dirty=Object.keys(edits).length>0,conflict=dirty&&baseline?.revision!==snapshot?.revision;
  function edit(key,value){if(!dirty)setBaseline(snapshot);setEdits(old=>({...old,[key]:value}));setSaved(false);}
  function cancel(){setEdits({});setBaseline(null);setError('');setSaved(false);}
  async function save(event){event.preventDefault();if(!ready||!snapshot.writable||busy||!dirty||conflict)return;setBusy(true);setError('');const owner=form;
   try{const accepted=await saveContextForm(owner,baseline,edits);if(!mounted.current)return;if(!accepted){setError(t('保存被拒绝，宿主已重新读取设置；请取消草稿并核对最新值。','Save refused; Host values were reloaded. Cancel the draft and review the current values.'));return;}setEdits({});setBaseline(null);setSaved(true);}
   catch(e){if(mounted.current)setError(String(e.message??e));}
   finally{if(mounted.current)setBusy(false);}
  }
  return h('form',{className:'suite-context-config',onSubmit:save,'data-suite-context-config':''},
   h('style',null,'.suite-context-config{display:grid;gap:14px;max-width:720px;font:inherit;color:var(--dsw-alias-label-primary)}.suite-context-config label{display:grid;grid-template-columns:minmax(120px,1fr) minmax(170px,2fr);gap:12px;align-items:center}.suite-context-config select,.suite-context-config textarea{box-sizing:border-box;width:100%;font:inherit;color:inherit;background:var(--dsw-specific-input-major);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:7px}.suite-context-config textarea{min-height:80px;resize:vertical}.suite-context-config footer{display:flex;gap:8px;align-items:center}.suite-context-config button{font:inherit;color:inherit;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-specific-input-major);padding:6px 12px;border-radius:7px;cursor:pointer}.suite-context-config button:disabled{opacity:.45;cursor:default}.suite-context-config small{color:var(--dsw-alias-label-tertiary);line-height:1.5}@media(max-width:540px){.suite-context-config label{grid-template-columns:1fr}}'),
   h('p',null,t('此表单由宿主绑定到当前Suite组件配置行，不修改其他插件或全局模型。','The Host binds this form to this Suite component row, not other plugins or global model settings.')),
   !ready&&h('p',{role:'status'},t('配置尚不可用；请确认组件已启用。','Configuration unavailable; make sure the component is enabled.')),
   CONTEXT_FIELDS.map(field=>{const current=Object.hasOwn(edits,field.key)?edits[field.key]:snapshot?.value?.[field.key];const unsupported=typeof current!=='string'||(field.values&&!field.values.includes(current));const disabled=busy||!ready||!snapshot.writable||conflict||unsupported;return h('label',{key:field.key},h('span',null,zh?field.zh:field.en),field.values?h('select',{value:typeof current==='string'?current:'',disabled,onChange:e=>edit(field.key,e.target.value)},unsupported&&h('option',{value:typeof current==='string'?current:''},t('当前值不可编辑','Current value cannot be edited')),field.values.map(value=>h('option',{key:value,value},value))):h('textarea',{value:typeof current==='string'?current:'',disabled,onChange:e=>edit(field.key,e.target.value)}));}),
   h('small',null,t('仅保存改动字段，保留未编辑项、表达式和继承值；前缀/后缀会影响上下文内容。','Only edited fields are written; untouched values, expressions and inheritance are preserved. Prefix/suffix affect context content.')),
   conflict&&h('p',{role:'alert'},t('设置已在其他窗口变化。草稿未覆盖；请取消后重新编辑。','Settings changed elsewhere. Your draft was not written; cancel and edit the latest values.')),
   error&&h('p',{role:'alert'},error),
   h('footer',null,h('button',{type:'submit',disabled:busy||!ready||!snapshot.writable||!dirty||conflict},busy?t('保存中…','Saving…'):t('保存','Save')),h('button',{type:'button',disabled:busy||!dirty,onClick:cancel},t('取消更改','Cancel changes')),saved&&h('span',{role:'status'},t('已保存','Saved'))));
 }
 return ctx.slots.inject('plugins.row.config',()=>{
  const disposers=['dsh-context','atelier-suite-context'].map(id=>ctx.slots.register({name:'plugins.row.config',key:'@forcemind/dsh-atelier-suite#'+id},Page));return()=>disposers.forEach(dispose=>dispose());
 });
}
