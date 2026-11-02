// Pure migration admission. Never applies settings or toggles plugins.
export const SUITE_MODULES=Object.freeze([
 {key:'reasoning',moduleName:'dsh-better-reasoning-effort',target:'atelier-suite-reasoning'},
 {key:'context',moduleName:'dsh-context',target:'atelier-suite-context'},
 {key:'browser',moduleName:'@wxg-prc-cpg/browser-skill-dsh-plugin',target:'atelier-suite-browser'},
 {key:'workbench',moduleName:'dsh-atelier-plugin',aliases:['@local/dsh-atelier'],target:'atelier-suite-workbench'},
]);
const transitional=new Set(['pending','loading','unloading']);
function exactId(row){return row.entryId??row.id;}
export function planHandoff({key,inventory,confirmedInactive=[],browserSessions=0,configReviewed=false}){
 const spec=SUITE_MODULES.find(item=>item.key===key);if(!spec)throw Error('Unknown suite module');
 if(!Array.isArray(inventory))throw Error('Inventory required');
 const matches=inventory.filter(row=>[spec.moduleName,...spec.aliases??[]].includes(row.moduleName));
 const targets=matches.filter(row=>row.patchId===spec.target||exactId(row)===spec.target||exactId(row)==='include:'+spec.target);
 if(targets.length!==1)throw Error('Expected exactly one suite target');const target=targets[0];
 const old=matches.filter(row=>row!==target);
 const unstable=matches.filter(row=>transitional.has(row.fiberPhase));
 if(unstable.length)throw Error('Module lifecycle unsettled');
 const live=matches.filter(row=>row.fiberPhase==='active');
 if(live.length>1)throw Error('Duplicate active implementations');
 if(target.enabled||target.fiberPhase==='active')throw Error('Target must remain disabled before migration');
 if(!configReviewed)throw Error('Review complete original row configuration before handoff');
 if(key==='browser'&&browserSessions!==0)throw Error('Browser-owned sessions must be returned/stopped first');
 const pending=old.filter(row=>row.enabled||row.fiberPhase==='active'||!confirmedInactive.includes(exactId(row)));
 if(pending.length)return {stage:'disable-and-confirm',module:spec.moduleName,target:exactId(target),steps:pending.map(row=>({action:'disable-old-and-await-host-client-disposal',entryId:exactId(row)})),canEnable:false,removalAllowed:false};
 return {stage:'ready-for-isolated-enable',module:spec.moduleName,target:exactId(target),steps:[{action:'enable-candidate',entryId:exactId(target)},{action:'verify-one-host-and-client-instance'},{action:'verify-config-and-feature-parity'},{action:'request-user-confirmation-before-removal'}],canEnable:true,removalAllowed:false};
}
