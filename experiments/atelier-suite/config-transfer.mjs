// Pure row migration; callers keep plans private, never log or publish config.
// Requires a trusted RAW config snapshot, never settings.describe(redactSecrets).
import{isDeepStrictEqual}from'node:util';
function jsonCopy(value){
 const seen=new Set();
 function check(x){if(x===null||typeof x==='string'||typeof x==='boolean')return;if(typeof x==='number'&&Number.isFinite(x))return;if(typeof x!=='object'||seen.has(x))throw Error('Raw config must be finite lossless JSON');if(!Array.isArray(x)&&Object.getPrototypeOf(x)!==Object.prototype&&Object.getPrototypeOf(x)!==null)throw Error('Non-plain config object');seen.add(x);for(const k of Object.keys(x)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Unsafe config key');check(x[k]);}seen.delete(x);}
 check(value);return structuredClone(value);
}
export function prepareConfigTransfer({source,target,rawVerified=false,hasRedactions=true}){
 if(!rawVerified||hasRedactions)throw Error('Trusted raw unredacted row config required; no placeholder copying');
 if(!source||!target||typeof source.id!=='string'||!source.id||typeof target.id!=='string'||!target.id||source.id===target.id||source.name!==target.name)throw Error('Exact distinct rows of same module required');
 if(target.disabled!==true)throw Error('Target must be disabled');
 if(Object.hasOwn(target,'config')&&target.config!==undefined&&JSON.stringify(target.config)!=='{}')throw Error('Target already has config; review manually');
 const before=jsonCopy(target),after=jsonCopy(target);
 if(Object.hasOwn(source,'config'))after.config=jsonCopy(source.config);else delete after.config;
 after.disabled=true;
 return {before,after,sourceId:source.id,targetId:target.id,sourceName:source.name,sourceConfigPresent:Object.hasOwn(source,'config'),sourceConfig:Object.hasOwn(source,'config')?jsonCopy(source.config):null,privatePlan:true};
}
export function verifyTransferSource(plan,current){return current?.id===plan.sourceId&&current?.name===plan.sourceName&&Object.hasOwn(current,'config')===plan.sourceConfigPresent&&(!plan.sourceConfigPresent||isDeepStrictEqual(current.config,plan.sourceConfig));}
export function rollbackConfigTransfer(plan,current){if(!isDeepStrictEqual(current,plan.after))throw Error('Target changed since transfer; refusing rollback overwrite');return jsonCopy(plan.before);}
