const own=(o,k)=>Object.prototype.hasOwnProperty.call(o??{},k);
const containsExpression=value=>value&&typeof value==='object'&&(own(value,'__jsExpr')||Object.values(value).some(containsExpression));
const at=(o,path)=>path.reduce((value,key)=>value?.[key],o);
export function capacityChanges(changes){
  if(!changes||typeof changes!=='object'||Array.isArray(changes))throw new Error('请选择上下文或输出上限');
  const result={};for(const[key,value]of Object.entries(changes)){if(!['contextWindow','maxTokens'].includes(key))throw new Error('只允许修改上下文和最大输出');if(!Number.isSafeInteger(value)||value<1||value>10000000)throw new Error('容量必须是1至10000000的整数');result[key]=value;}
  if(!Object.keys(result).length)throw new Error('至少选择一项覆盖');return result;
}
export function capacityPlan({entry,descriptor,models,changes}){
  const patch=capacityChanges(changes);const path=entry.settingsPath;
  if(!Array.isArray(path)||path.length!==2||path[0]!=='providers'||path[1]!==entry.provider||descriptor.ns!==entry.settingsNs)throw new Error('不支持此渠道配置地址');
  const route=at(descriptor.value,path),user=at(descriptor.user,path);
  if(!route||typeof route!=='object'||own(route,'__jsExpr'))throw new Error('渠道尚未配置或使用动态表达式');
  if(!models.length||models.length>500)throw new Error('请选择包含1至500个模型的渠道');
  const unsafe=new Set(['__proto__','prototype','constructor']);if(path.some(key=>unsafe.has(key))||models.some(row=>typeof row.id!=='string'||!row.id||unsafe.has(row.id))||new Set(models.map(row=>row.id)).size!==models.length)throw new Error('模型或渠道ID不可用于安全批量编辑');
  const rows=models.map(model=>{const after={contextWindow:patch.contextWindow??model.contextWindow,maxTokens:patch.maxTokens??model.maxTokens};if(after.contextWindow&&after.maxTokens&&after.maxTokens>after.contextWindow)throw new Error(`${model.id}: 最大输出不能超过上下文`);return {id:model.id,before:{contextWindow:model.contextWindow??null,maxTokens:model.maxTokens??null},after};});
  const ops=[],warnings=[];const explicit=Array.isArray(route.models)&&route.models.length>0;
  if(explicit){
    if(containsExpression(route.models))throw new Error('动态模型定义不支持批量覆盖');
    const ids=new Set(route.models.map(row=>row.id));if(ids.size!==route.models.length||models.length!==ids.size||models.some(row=>!ids.has(row.id)))throw new Error('模型目录已变化，请重新读取');
    const indexSafe=Array.isArray(user?.models)&&user.models.length===route.models.length&&user.models.every((row,index)=>row?.id===route.models[index].id);
    if(indexSafe){for(let index=0;index<route.models.length;index++)for(const[key,value]of Object.entries(patch))ops.push({op:'set',path:[...path,'models',String(index),key],value});}
    else{
      if(descriptor.secrets?.some(secret=>[...path,'models'].every((key,index)=>secret.path[index]===key)))throw new Error('模型定义包含脱敏字段，不能复制覆盖');
      warnings.push('当前模型定义来自继承配置；保存会将完整模型列表固定为用户层快照。');
      ops.push({op:'set',path:[...path,'models'],value:route.models.map(row=>({...row,...patch}))});
    }
  }else{
    warnings.push('将通过 modelOverrides 覆盖当前目录模型；未来新增目录模型不自动获得逐模型覆盖。');
    for(const model of models)for(const[key,value]of Object.entries(patch))ops.push({op:'set',path:[...path,'modelOverrides',model.id,key],value});
  }
  for(const[key,value]of Object.entries(patch))ops.push({op:'set',path:[...path,key==='contextWindow'?'defaultContextWindow':'defaultMaxTokens'],value});
  warnings.push('同时更新渠道默认值；显式模型配置或目录值仍优先于默认值。请求显式输出上限仍可能覆盖默认值。');
  return {ops,rows,warnings,revision:descriptor.revision};
}
export function createModelManager(ctx,{now=()=>Date.now(),makeId}={}){
  const pending=new Map();
  function services(){const llm=ctx.get('llm'),settings=ctx.get('settings');if(!llm||!settings)throw new Error('模型或设置服务不可用');return {llm,settings};}
  async function snapshot(provider){
    const {llm,settings}=services();const entry=llm.listConfigurableProviders().find(row=>row.provider===provider&&row.settingsNs==='llm-pi-ai');if(!entry)throw new Error('仅支持 pi-ai 渠道');
    const descriptor=settings.describe({redactSecrets:true}).find(row=>row.ns===entry.settingsNs);if(!descriptor)throw new Error('渠道设置未挂载');
    const listed=await llm.listModels(provider);if(listed.length>500)throw new Error('模型过多，请使用原生编辑器');
    const models=[];for(const row of listed){const info=await llm.resolveModelInfo(provider,row.id);models.push({id:row.id,name:row.name,contextWindow:info.context?.contextWindow??null,maxTokens:info.defaultMaxTokens??null,efforts:info.reasoning?.efforts?.map(item=>item.id)??[]});}
    return {entry,descriptor,models};
  }
  return {async operate(input){
    const {llm,settings}=services();
    if(input.action==='models'){
      const configured=settings.describe({redactSecrets:true});const providers=llm.listConfigurableProviders().filter(row=>row.settingsNs==='llm-pi-ai'&&at(configured.find(item=>item.ns===row.settingsNs)?.value,row.settingsPath)).map(row=>({id:row.provider,name:row.displayName}));
      if(!input.provider)return {providers,models:[]};const value=await snapshot(input.provider);return {providers,provider:input.provider,models:value.models,revision:value.descriptor.revision};
    }
    if(input.action==='model-preview'){
      const value=await snapshot(input.provider);const plan=capacityPlan({...value,changes:input.changes});for(const[id,item]of pending)if(item.expires<now())pending.delete(id);if(pending.size>=10)pending.delete(pending.keys().next().value);
      const id=makeId();pending.set(id,{...plan,ns:value.entry.settingsNs,provider:input.provider,expires:now()+300000});return {previewId:id,provider:input.provider,rows:plan.rows,warnings:plan.warnings,revision:plan.revision,expiresInSeconds:300};
    }
    if(input.action==='model-apply'){
      const plan=pending.get(input.previewId);if(!plan||plan.expires<now())throw new Error('预览已过期，请重新预览');
      pending.delete(input.previewId);await settings.mutate(plan.ns,plan.ops,plan.revision);
      const value=await snapshot(plan.provider);const verified=plan.rows.every(row=>{const actual=value.models.find(item=>item.id===row.id);return actual&&Object.entries(row.after).every(([key,expected])=>expected==null||actual[key]===expected);});
      if(!verified)throw new Error('配置已保存，但生效核验不同，请刷新原生模型设置检查');return {saved:true,verified:true,provider:plan.provider,models:value.models};
    }
    throw new Error('未知模型操作');
  }};
}
