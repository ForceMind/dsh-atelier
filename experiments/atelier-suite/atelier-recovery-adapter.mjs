// Build-time, read-only-view adaptation. Original storage rows and source archive remain untouched.
import{createHash}from'node:crypto';
export const ATELIER_HOST_SHA256='5048ab214f631b3f153adff2870023e9924727ec04f24cc8fca13c01f6ea0d88';
export function adaptAtelierRecovery(source){
 if(typeof source!=='string'||createHash('sha256').update(source).digest('hex')!==ATELIER_HOST_SHA256)throw Error('Unreviewed Atelier Host; refusing recovery adaptation');
 function replace(before,after){if(source.split(before).length!==2)throw Error('Atelier recovery anchor mismatch');source=source.replace(before,after);}
 replace("cacheWindow,cacheDiagnosis}","cacheWindow as originalCacheWindow,cacheDiagnosis}");
 replace("  const active = new Map();",`  const active = new Map();
  // Only persisted rows present when this owner opens are recovery candidates.
  const recoveredIds = new Set([...requests.entries()].filter(([,row])=>row.state==='streaming').map(([id])=>id));
  const cacheWindow = rows => originalCacheWindow(rows.filter(row=>!recoveryOf(row)));
  function recoveryOf(record) {
    return recoveredIds.has(record.id) && !active.has(record.id) && ['streaming','incomplete-interrupted'].includes(record.state)
      ? {kind:'no-active-request-on-recovery',originalState:'streaming',label:'不完整／已中断',usageFinal:false} : null;
  }`);
 replace("rows.filter(row=>row.endedAt!=null)","rows.filter(row=>row.endedAt!=null&&!recoveryOf(row))");
 replace("  function summarize(record) {\n    return",`  function summarize(record) {
    const recovery=recoveryOf(record);
    const observedPrice=recovery ? (record.usage ? priceUsage(record.usage,record.provider,record.model,activePriceRules(settings)) : {amount:null,currency:null,known:false,source:'no persisted usage; incomplete recovered request'}) : null;
    return`);
 replace("startedAt:record.startedAt,endedAt:record.endedAt,state:record.state,usage:record.usage,", "startedAt:record.startedAt,endedAt:record.endedAt,state:recovery?'incomplete-interrupted':record.state,...(recovery?{recovery}:{}),usage:record.usage,");
 replace("price: priceUsage(record.usage ?? {inputTokens:record.inputEstimate,outputTokens:record.outputEstimate,inputIncludesCache:false},record.provider,record.model,activePriceRules(settings))", "price: recovery ? {...observedPrice,final:false,basis:'persisted partial usage only; not successful settlement'} : priceUsage(record.usage ?? {inputTokens:record.inputEstimate,outputTokens:record.outputEstimate,inputIncludesCache:false},record.provider,record.model,activePriceRules(settings))");
 replace("else text = JSON.stringify(record,null,2);", "else text = JSON.stringify(recoveryOf(record)?{...record,displayState:'incomplete-interrupted',recovery:recoveryOf(record)}:record,null,2);");
 replace("return {id:record.id,view,text:text.slice(offset,offset+limit)", "return {id:record.id,...(recoveryOf(record)?{displayState:'incomplete-interrupted',recovery:recoveryOf(record)}:{}),view,text:text.slice(offset,offset+limit)");
 return '// Atelier Suite recovery-view adaptation: incomplete recovered requests, no stored-row rewrite. ForceMind, MIT.\n'+source;
}
