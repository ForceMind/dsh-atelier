import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
// Keep the existing manual contextPolicy for older callers and explicitly describe
// the new automatic policy in a separate field. Neither report includes dialogue.
export function adaptDraftDiagnostics(source){
  assert.equal(createHash('sha256').update(source).digest('hex'),'b45d5700b4cafc3e63abd46524492df7a6e46e601f10fe229d333dc6ef885d33');
  function replace(a,b){assert.equal(source.split(a).length,2,'Unexpected draft diagnostics ABI');source=source.replace(a,()=>b);}
  const original="import {REPLY_CONTEXT_POLICY} from './reply-draft-context.mjs';";
  replace(original,original+"\nimport {AUTO_CONTEXT_POLICY} from './reply-auto-policy.mjs';");
  replace('contextPolicy:REPLY_CONTEXT_POLICY}', 'contextPolicy:REPLY_CONTEXT_POLICY,automaticContextPolicy:AUTO_CONTEXT_POLICY}');
  return source;
}
