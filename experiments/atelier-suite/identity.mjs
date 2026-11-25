// One canonical identity declaration. Never import runtime/profile state here.
export const SUITE_PACKAGE='@forcemind/dsh-atelier-suite';
export const SUITE_ROW_ID='atelier-suite';
export const SUITE_MODULES=Object.freeze([
 Object.freeze({key:'workbench',rowId:'dsh-atelier',moduleName:'dsh-atelier-plugin',aliases:Object.freeze(['@local/dsh-atelier'])}),
 Object.freeze({key:'reasoning',rowId:'dsh-better-reasoning-effort',moduleName:'dsh-better-reasoning-effort',aliases:Object.freeze([])}),
 Object.freeze({key:'context',rowId:'dsh-context',moduleName:'dsh-context',aliases:Object.freeze([])}),
]);
export const CONTEXT_ROW_ID=SUITE_MODULES.find(row=>row.key==='context').rowId;
export const CONTEXT_CONFIG_KEY=SUITE_PACKAGE+'#'+CONTEXT_ROW_ID;
export function canonicalRows(){return[{id:SUITE_ROW_ID,name:SUITE_PACKAGE},...SUITE_MODULES.map(row=>({id:row.rowId,name:row.moduleName,disabled:true,...row.key==='workbench'?{config:{}}:{}}))];}
export function renderCanonicalPatch(){return '# Canonical candidate only: exclusive stopped-Host handoff required.\n# NEVER select this layer with original standalone bundle layers, even disabled.\n- insert:\n'+canonicalRows().map(row=>'    - '+JSON.stringify(row)).join('\n')+'\n';}
export function assertCanonicalRows(rows){
 const fail=()=>{throw Error('Candidate rows must exactly match canonical ID/module/disabled declaration');};
 const expected=canonicalRows();
 if(!Array.isArray(rows)||Object.getPrototypeOf(rows)!==Array.prototype||rows.length!==expected.length||Reflect.ownKeys(rows).some(k=>k!=='length'&&!['0','1','2','3'].includes(k)))fail();
 for(let i=0;i<expected.length;i++){
  const descriptor=Object.getOwnPropertyDescriptor(rows,String(i));if(!descriptor||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))fail();
  const row=descriptor.value,target=expected[i];if(!row||Object.getPrototypeOf(row)!==Object.prototype)fail();
  const keys=Reflect.ownKeys(row);if(keys.length!==Object.keys(target).length||keys.some(k=>!Object.hasOwn(target,k)))fail();
  for(const key of keys){const d=Object.getOwnPropertyDescriptor(row,key);if(!d.enumerable||!Object.hasOwn(d,'value'))fail();if(key==='config'){if(!d.value||Object.getPrototypeOf(d.value)!==Object.prototype||Reflect.ownKeys(d.value).length)fail();}else if(d.value!==target[key])fail();}
 }
 return true;
}
