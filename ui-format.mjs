// Shared compact labels; full values remain in accessible titles in the UI.
export function compactNumber(value) {
  const number=Number(value);
  if(!Number.isFinite(number)||number<0)return '—';
  if(number<1000)return String(Math.floor(number));
  let scale=number>=1e9?1e9:number>=1e6?1e6:1e3;
  let suffix=scale===1e9?'B':scale===1e6?'M':'K';
  let rounded=Number((number/scale).toFixed(1));
  if(rounded>=1000&&scale<1e9){scale*=1000;suffix=scale===1e6?'M':'B';rounded=Number((number/scale).toFixed(1));}
  return `${rounded}${suffix}`;
}
export function compactDuration(value) {
  const number=Number(value);
  if(value===null||value===undefined||!Number.isFinite(number)||number<0)return '—';
  if(number<1000)return `${Math.round(number)}ms`;
  const seconds=Math.floor(number/1000);
  if(seconds<60)return `${(number/1000).toFixed(number<10000?1:0)}s`;
  const minutes=Math.floor(seconds/60),rest=seconds%60;
  if(minutes<60)return `${minutes}m${String(rest).padStart(2,'0')}s`;
  return `${Math.floor(minutes/60)}h${String(minutes%60).padStart(2,'0')}m`;
}
export function compactMoney(value,currency='USD') {
  const number=Number(value);
  if(value===null||value===undefined||!Number.isFinite(number)||number<0)return '—';
  const prefix=currency==='USD'?'$':currency==='CNY'?'¥':`${currency} `;
  const digits=number===0?0:number<0.01?5:number<1?4:2;
  return `${prefix}${number.toFixed(digits)}`;
}
export function outputThroughput(record) {
  const missing={tokensPerSecond:null,outputTokens:null,generationMs:null,label:'—',basis:'API output tokens / observed generation interval'};
  if(!record||record.endedAt==null||!['stop','tool-calls','max-tokens'].includes(record.state))return missing;
  const tokens=record.usage?.outputTokens;
  const start=record.firstOutputAt??record.reasoningStartedAt??record.firstTextAt;
  const end=record.generationEndedAt??record.endedAt;
  if(typeof tokens!=='number'||!Number.isFinite(tokens)||tokens<0||typeof start!=='number'||!Number.isFinite(start)||typeof end!=='number'||!Number.isFinite(end)||end<=start)return missing;
  const generationMs=end-start;const tokensPerSecond=tokens*1000/generationMs;
  if(!Number.isFinite(tokensPerSecond))return missing;
  return {tokensPerSecond,outputTokens:tokens,generationMs,label:`${tokensPerSecond.toFixed(1)} tok/s`,basis:missing.basis};
}

export function liveOutputThroughput(record,now=Date.now()) {
  if(!record||record.state!=='streaming'||record.endedAt!=null||record.usage!=null)return null;
  const start=record.firstOutputAt??record.reasoningStartedAt??record.firstTextAt;
  const tokens=record.outputEstimate;
  if(typeof start!=='number'||!Number.isFinite(start)||typeof now!=='number'||!Number.isFinite(now)||now-start<250||typeof tokens!=='number'||!Number.isFinite(tokens)||tokens<=0)return null;
  const generationMs=now-start,tokensPerSecond=tokens*1000/generationMs;
  return {tokensPerSecond,outputTokens:tokens,generationMs,label:`≈${tokensPerSecond.toFixed(1)} tok/s`,estimated:true,scope:'live-conversation-average',basis:'Observed streamed characters / 3 / seconds since first output; rough estimate, not API token usage'};
}

export function modelFamily(value) {
  const model=String(value??'').toLowerCase();
  if(/(?:^|[/\s_-])(?:gpt(?:[-_\d.]|$)|o[134](?:[-_\s]|$))/.test(model))return 'gpt';
  if(model.includes('deepseek'))return 'deepseek';
  if(model.includes('claude'))return 'claude';
  if(model.includes('gemini'))return 'gemini';
  return 'generic';
}
