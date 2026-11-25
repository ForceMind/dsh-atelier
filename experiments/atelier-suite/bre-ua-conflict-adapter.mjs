// Suite-only build-time repair, composed after the separately pinned callback repair.
import{createHash}from'node:crypto';
import{adaptBreCallback}from'./bre-callback-adapter.mjs';
export function adaptBreUaConflict(source){
 const fixed=adaptBreCallback(source);
 if(createHash('sha256').update(fixed).digest('hex')!=='5e5fda91aa7f44878ba7d25950cc7e0628efccd84032d8bf84f06d93f2fe7016')throw Error('Unreviewed BRE callback repair output');
 let output=fixed;
 function replace(before,after){if(output.split(before).length!==2)throw Error('BRE UA conflict anchor mismatch');output=output.replace(before,after);}
 const anchor='  return index.byOrigin.get(origin)?.userAgent;';
 replace(anchor,'  if (index.conflicts.some(conflict => conflict.origin === origin)) return void 0;\n'+anchor);
 replace('overrides: [...index.byOrigin.values()].map((entry) => ({','overrides: [...index.byOrigin.values()].filter(entry => !index.conflicts.some(conflict => conflict.origin === entry.origin)).map((entry) => ({');
 replace('cannot tell their requests apart, so the first declaration is\n               * the one sent.','cannot tell their requests apart; this Suite copy therefore\n               * suppresses the override for the entire conflicting origin.');
 return '// Atelier Suite UA conflict repair: do not override ambiguous origins; original conflict report retained. HaoyueQin / ForceMind, MIT.\n'+output;
}
