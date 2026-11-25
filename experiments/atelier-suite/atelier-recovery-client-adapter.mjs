// Pure build-time Client display repair. Does not overwrite frozen source or built Client.
import{createHash}from'node:crypto';
const INPUTS=new Set(['81060bf59fe9bad1a18826acc4f29430f95ffe0add259ccf2cab0b50eae25157','8cf9c3d7df2e1b8b46ea1fad4f53b9a178ef54ab7e5ffee0f2e3bff2ba599567']);
export function adaptAtelierRecoveryClient(source){
 if(typeof source!=='string'||!INPUTS.has(createHash('sha256').update(source).digest('hex')))throw Error('Unreviewed Atelier Client; refusing recovery display adaptation');
 function replace(before,after){if(source.split(before).length!==2)throw Error('Atelier Client recovery anchor mismatch');source=source.replace(before,after);}
 replace('        function LogView(props) {',`        function incompleteRequest(row) { return row?.recovery?.kind==='no-active-request-on-recovery' && row.recovery.usageFinal===false; }
        function recoveryCopy(t) { return t('model')==='模型' ? {state:'不完整／已中断',duration:'时长未知',partial:'已记录部分用量；未最终结算',unknown:'用量未知；未最终结算',warning:'此请求恢复时已无活跃执行；记录可能不完整。保留已记录用量，不代表成功或最终结算。'} : {state:'Incomplete / interrupted',duration:'Duration unknown',partial:'Recorded partial usage; not final settlement',unknown:'Usage unknown; not final settlement',warning:'No active execution on recovery; this record may be incomplete. Recorded usage is retained, not proof of success or final settlement.'}; }
        function requestState(row,t) { return incompleteRequest(row)?recoveryCopy(t).state:row.state; }
        function requestTiming(row,t) { const copy=recoveryCopy(t);return incompleteRequest(row)?copy.duration+' · '+(row.usage?copy.partial:copy.unknown):seconds((row.endedAt??Date.now())-row.startedAt)+' · '+(row.usage?t('actual'):t('estimate')); }
        function recoveryMetricDetail(kind,context,t) {
          if(!incompleteRequest(context.last))return metricDetail(kind,context,t);
          const copy=recoveryCopy(t);const detail=metricDetail(kind,{...context,last:null},t);
          if(detail){detail.notes=[copy.warning,...detail.notes];detail.moreRows=[...detail.moreRows,{label:copy.state,value:context.last.usage?copy.partial:copy.unknown}];}
          return detail;
        }
        function LogView(props) {`);
 replace('${new Date(row.startedAt).toLocaleTimeString()} · ${row.state}', '${new Date(row.startedAt).toLocaleTimeString()} · ${requestState(row,t)}');
 replace('${seconds((row.endedAt??Date.now())-row.startedAt)} · ${row.usage?t(\'actual\'):t(\'estimate\')}', '${requestTiming(row,t)}');
 replace("                detail?.truncated&&h('p'", "                incompleteRequest(detail)&&h('p',{role:'status',className:'atelier-note','data-atelier-incomplete':true},recoveryCopy(t).warning),\n                detail?.truncated&&h('p'");
 replace("const thought=(last?.purpose==='conversation'&&last.reasoningStartedAt!=null?last:null)??value?.thought??null;", "const thoughtCandidate=(last?.purpose==='conversation'&&last.reasoningStartedAt!=null?last:null)??value?.thought??null;const thought=incompleteRequest(thoughtCandidate)?null:thoughtCandidate;");
 replace("const detail=opened?metricDetail(opened.kind,{stats,last:opened.kind==='thought'?thought:last,", "const detail=opened?recoveryMetricDetail(opened.kind,{stats,last:opened.kind==='thought'?(thought??(incompleteRequest(thoughtCandidate)?thoughtCandidate:null)):last,");
 replace("t('download')),h('small'", "incompleteRequest(detail)?(t('model')==='模型'?'下载原始记录（可能不完整）':'Download raw record (may be incomplete)'):t('download')),h('small'");
 return '// Atelier Suite incomplete recovery display adaptation. ForceMind, MIT.\n'+source;
}
