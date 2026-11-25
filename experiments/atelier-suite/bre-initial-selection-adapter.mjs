// Build-time repair only: preserve first selection from an unchanged empty directory.
import{createHash}from'node:crypto';
export function adaptBreInitialSelection(source){
 if(typeof source!=='string'||createHash('sha256').update(source).digest('hex')!=='0f2cfcb3aad3932560122b0f64a2dfb35ef5e568c8e6ec4b13b780397e130e87')throw Error('Unreviewed BRE Client; refusing initial-selection adaptation');
 const before='((m,T)=>m===null||T===null||m.provider!==T.provider||m.model!==T.model||m.reasoningEffort!==T.reasoningEffort)(k.current,b.current)';
 const after='((m,T)=>m===null||T===null?m!==T:m.provider!==T.provider||m.model!==T.model||m.reasoningEffort!==T.reasoningEffort)(k.current,b.current)';
 if(source.split(before).length!==2)throw Error('BRE initial-selection anchor mismatch');
 return '// Suite initial-selection repair: null/null is unchanged; stale-selection protection retained. HaoyueQin / ForceMind, MIT.\n'+source.replace(before,after).replace(/\n\/\/# sourceMappingURL=client\.js\.map\s*$/,'\n');
}
