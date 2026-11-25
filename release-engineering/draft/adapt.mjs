// Pure build-time transformations of the pinned Atelier package; no disk writes on import.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=text=>createHash('sha256').update(text,'utf8').digest('hex');
function pinned(raw,expected,label){assert.equal(typeof raw,'string');assert.equal(hash(raw),expected,`Unreviewed ${label} input`);}
function once(raw,before,after){assert.equal(raw.split(before).length,2,'Draft adapter anchor count: '+before.slice(0,80));return raw.replace(before,()=>after);}
const recoveryBanner='// Atelier Suite incomplete recovery display adaptation. ForceMind, MIT.\n';

export function adaptDraftHost(raw){
  pinned(raw,'a5e6895c9b2243ff9ed766b8a2e0e49b1cdca847fa5a9b7637c55fbfeaea76ff','reply-draft.mjs');
  let out=once(raw,"import {REPLY_DRAFT_PROMPT,replyContext} from './reply-draft-context.mjs';", "import {REPLY_DRAFT_PROMPT,replyContext} from './reply-draft-context.mjs';\nimport {automaticContext,shouldSkipAuto,AUTO_PROMPT,decodeAuto} from './reply-auto-policy.mjs';");
  out=once(out,'const messages=agent.session.deriveMessages(),source=replySource(messages),context=replyContext(messages),contextJson=JSON.stringify(context);',
    'const automatic=input.automatic===true,selectContext=automatic?automaticContext:replyContext;\n   const messages=agent.session.deriveMessages(),source=replySource(messages),context=selectContext(messages),contextJson=JSON.stringify(context);');
  out=once(out,'JSON.stringify(replyContext(agent.session.deriveMessages()))!==contextJson','JSON.stringify(selectContext(agent.session.deriveMessages()))!==contextJson');
  out=once(out,'const llm=getLlm();',"if(automatic&&shouldSkipAuto(context)){assertCurrent();return {kind:'none',sourceMessageId:source.id,sent:false};}\n    const llm=getLlm();");
  out=once(out,'system:REPLY_DRAFT_PROMPT','system:automatic?AUTO_PROMPT:REPLY_DRAFT_PROMPT');
  out=once(out,"text:'Recent dialogue for drafting the next USER message (JSON data):\\n'+contextJson", "text:(automatic?'Task evidence for an optional USER draft (JSON data):\\n':'Recent dialogue for drafting the next USER message (JSON data):\\n')+contextJson");
  out=once(out,"if(chunk.type==='tool-call-delta')", "if(chunk.type==='tool-call-delta'||(automatic&&(chunk.type==='block-start'&&chunk.blockType==='tool-call'||chunk.type==='block-end'&&chunk.block?.type==='tool-call')))" );
  out=once(out,"return {text:text.trim(),sourceMessageId:source.id,provider:route.provider,model:route.model,reasoningEffort:'low',sent:false};",
    "const provenance={sourceMessageId:source.id,provider:route.provider,model:route.model,reasoningEffort:'low',sent:false};\n    if(automatic){const decision=decodeAuto(text,context);if(decision?.kind==='none')return {kind:'none',...provenance};if(decision?.kind!=='draft'||typeof decision.text!=='string'||!decision.text.trim())throw Error('无效的自动草稿决策');return {kind:'draft',text:decision.text.trim(),...provenance};}\n    return {text:text.trim(),...provenance};");
  return out;
}
const originalValidation="if(!result||typeof result.text!=='string'||!result.text.trim()||result.reasoningEffort!=='low'||result.sourceMessageId!==before.sourceMessageId)throw Error('Invalid reply draft response');";
// The existing generate() clears both cached candidate and overlay before requesting. A null
// helper result is not cached, drawn, or accepted by Tab. Only a confirmed typed 'none'
// from the same source may use this normal no-display path; empty/malformed payloads fail.
function uiLines(){return [
  "if(automatic&&result?.kind==='none'){",
  "  if(result.sourceMessageId!==before.sourceMessageId||result.sent!==false||Object.hasOwn(result,'text'))throw Error('Invalid reply abstention');",
  "  return null;",
  " }",
  " if(automatic&&(result?.kind!=='draft'||result.sent!==false))throw Error('Invalid automatic reply draft response');",
  ' '+originalValidation,
];}
function adaptValidation(raw,indent){return once(raw,'\n'+indent+originalValidation,'\n'+uiLines().map(line=>indent+line).join('\n'));}
export function adaptDraftUI(raw){
  pinned(raw,'f4567a50c4ae680740c2ae9a9c33949cb9266cea465a2e0b2ba261715f085db1','reply-draft-ui.mjs');
  return adaptValidation(raw,' ');
}
export function adaptDraftClient(raw){
  pinned(raw,'1afe66747ab523dce425bd03128099daf2caf6ebcd1419afd49f9237462da4e7','recovery-adapted client.js');
  // The source bundler injects the UI into factory(require), indenting every line by 4.
  // Preserve internal indentation byte-for-byte as in build-client.mjs, including blank lines.
  return once(raw,'\n     '+originalValidation,'\n'+uiLines().map(line=>'     '+line).join('\n'));
}
export function adaptDraftClientSource(raw){
  pinned(raw,'3290dad6b0e04312e86ddc34f6bd1510e6b22e20458d26262058a58fba8aa68b','recovery-adapted client-source.js');
  // The recovery transform prepended a banner. Upstream's build requires the exact
  // imports first. Put it immediately after them so the regenerated bundle retains it.
  assert.ok(raw.startsWith(recoveryBanner));
  return once(raw.slice(recoveryBanner.length), "import { installReplyDraft } from './reply-draft-ui.mjs';\nwindow.__ModuleLoader__.load(","import { installReplyDraft } from './reply-draft-ui.mjs';\n"+recoveryBanner+'window.__ModuleLoader__.load(');
}
