import {createHash} from 'node:crypto';
const count=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value??{},key);
const digest=value=>createHash('sha256').update(JSON.stringify(value)??'null').digest('hex');
/** Ephemeral, bounded fingerprints only; never add these to persisted request logs. */
export function requestFingerprint(request){
  if(!request||typeof request!=='object')return null;
  const messages=Array.isArray(request.messages)?request.messages:[];
  const limit=4096;
  try{return {provider:request.provider??'',model:request.model??'',purpose:request.purpose??'conversation',system:digest([request.system??null,messages.filter(row=>row?.role==='system'||row?.role==='developer')]),tools:digest(request.tools??[]),toolEntries:(request.tools??[]).slice(0,256).map(tool=>({name:String(tool.name??tool.function?.name??'unknown').slice(0,100),hash:digest(tool)})),options:digest(Object.fromEntries(Object.entries(request).filter(([key])=>!['messages','tools','system','signal','sessionId'].includes(key)))),messages:messages.slice(0,limit).map(digest),messageCount:messages.length,truncated:messages.length>limit};}catch{return null;}
}
export function compareFingerprints(previous,current){
  if(!previous||!current)return {available:false};
  let shared=0;while(shared<Math.min(previous.messages.length,current.messages.length)&&previous.messages[shared]===current.messages[shared])shared++;
  const oldTools=new Map((previous.toolEntries??[]).map(tool=>[tool.name,tool.hash]));const newTools=new Map((current.toolEntries??[]).map(tool=>[tool.name,tool.hash]));const changedTools=[...new Set([...oldTools.keys(),...newTools.keys()])].filter(name=>oldTools.get(name)!==newTools.get(name)).slice(0,8);
  return {available:true,changedTools,sameRoute:previous.provider===current.provider&&previous.model===current.model&&previous.purpose===current.purpose,systemStable:previous.system===current.system,toolsStable:previous.tools===current.tools,optionsStable:previous.options===current.options,previousMessages:previous.messageCount,currentMessages:current.messageCount,commonPrefixMessages:shared,appendOnly:!previous.truncated&&!current.truncated&&shared===previous.messageCount&&current.messageCount>=previous.messageCount,comparisonLimited:previous.truncated||current.truncated};
}
export function cacheUsage(usage){
  if(!usage||!count(usage.inputTokens))return {inputKnown:false,cacheReported:false,ratio:null,input:null,read:null,write:null};
  const reported=own(usage,'cacheReadTokens')&&count(usage.cacheReadTokens);
  const read=reported?usage.cacheReadTokens:0,write=count(usage.cacheWriteTokens)?usage.cacheWriteTokens:0;
  const input=usage.inputIncludesCache===true?usage.inputTokens:usage.inputTokens+read+write;
  const validInput=count(input)&&(!reported||read<=input)&&(usage.inputIncludesCache!==true||read+write<=input);
  return {inputKnown:validInput,cacheReported:reported&&validInput,ratio:reported&&validInput&&input>0?read/input:null,input:validInput?input:null,read:reported&&validInput?read:null,write:count(usage.cacheWriteTokens)?write:null};
}
export function cacheWindow(records,limit=20){
  const rows=[...records].filter(row=>row.endedAt!=null).sort((a,b)=>b.startedAt-a.startedAt).slice(0,limit);
  let reportedInput=0,read=0,missing=0;const samples=rows.map(row=>{const usage=cacheUsage(row.usage);if(usage.cacheReported){reportedInput+=usage.input;read+=usage.read;}else missing++;return {id:row.id,startedAt:row.startedAt,provider:row.provider,model:row.model,...usage,stability:row.cacheStability??null};});
  const inputKnownSamples=samples.filter(row=>row.inputKnown);const allKnownInput=inputKnownSamples.reduce((sum,row)=>sum+row.input,0);
  return {scope:'recent-completed-attempts',limit,samples,reported:rows.length-missing,missing,total:rows.length,weightedRatio:reportedInput>0?read/reportedInput:null,observedRatio:allKnownInput>0?read/allKnownInput:null,allKnownInput,inputKnownSamples:inputKnownSamples.length,reportedInput,read,coverage:'bounded retained records; not complete session history',layer:'normalized pre-adapter comparison; not provider cache-key evidence'};
}
export function cacheDiagnosis(records){
  const rows=[...records].filter(row=>row.endedAt!=null).sort((a,b)=>a.startedAt-b.startedAt).slice(-8);
  const comparisons=[];let previous;
  for(const row of rows){const fingerprint=requestFingerprint(row.request);if(previous)comparisons.push({id:row.id,intervalMs:count(row.startedAt)&&count(previous.startedAt)?Math.max(0,row.startedAt-previous.startedAt):null,...(row.cacheStability?.available?row.cacheStability:compareFingerprints(previous.fingerprint,fingerprint)),comparisonBasis:row.cacheStability?.available?'ephemeral-original-request':'retained-sanitized-request',usage:cacheUsage(row.usage)});previous={fingerprint,startedAt:row.startedAt};}
  const observed=comparisons.filter(row=>row.available);const stable=observed.filter(row=>row.sameRoute&&row.systemStable&&row.toolsStable&&row.optionsStable&&row.appendOnly);
  return {compared:observed.length,unavailable:comparisons.length-observed.length,systemChanges:observed.filter(row=>!row.systemStable).length,toolChanges:observed.filter(row=>!row.toolsStable).length,optionChanges:observed.filter(row=>!row.optionsStable).length,routeChanges:observed.filter(row=>!row.sameRoute).length,historyRewrites:observed.filter(row=>!row.appendOnly).length,stablePrefixSamples:stable.length,stableUnreported:stable.filter(row=>!row.usage.cacheReported).length,stableButLow:stable.filter(row=>row.usage.ratio!==null&&row.usage.ratio<.5).length,comparisons,scope:'latest 8 retained completed attempts',limitations:['Message equality is not a token-prefix length.','Sanitized normalized requests may differ from actual provider serialization.','No route/TTL/cache-key behavior can be proven from these comparisons.']};
}
