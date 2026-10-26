import test from 'node:test';
import assert from 'node:assert/strict';
import {cacheUsage,cacheWindow,requestFingerprint,compareFingerprints,cacheDiagnosis} from './cache-diagnostics.mjs';
const request=messages=>({provider:'p',model:'m',messages,tools:[{name:'t',parameters:{type:'object'}}],reasoningEffort:'high'});
test('missing cache fields remain unknown while explicit zero is known',()=>{
  assert.equal(cacheUsage({inputTokens:1,cacheReadTokens:2,inputIncludesCache:true}).ratio,null);assert.equal(cacheUsage({inputTokens:0,cacheReadTokens:0}).ratio,null);
  assert.equal(cacheUsage({inputTokens:100}).ratio,null);assert.equal(cacheUsage({inputTokens:100,cacheReadTokens:0}).ratio,0);assert.equal(cacheUsage({inputTokens:100,cacheReadTokens:300}).ratio,.75);assert.equal(cacheUsage({inputTokens:400,cacheReadTokens:300,inputIncludesCache:true}).ratio,.75);
});
test('window is token-weighted and includes missing usage coverage',()=>{
  const rows=[{id:'a',endedAt:2,startedAt:1,usage:{inputTokens:10,cacheReadTokens:90}},{id:'b',endedAt:4,startedAt:3,usage:{inputTokens:900,cacheReadTokens:100}},{id:'c',endedAt:6,startedAt:5,usage:null}];const value=cacheWindow(rows);assert.equal(value.reported,2);assert.equal(value.missing,1);assert.equal(value.weightedRatio,190/1100);assert.equal(value.total,3);
});
test('observed share includes unreported valid input without inventing cache hits',()=>{const rows=[{endedAt:1,startedAt:0,usage:{inputTokens:10,cacheReadTokens:90}},{endedAt:2,startedAt:1,usage:{inputTokens:900}}];const result=cacheWindow(rows);assert.equal(result.weightedRatio,.9);assert.equal(result.observedRatio,.09);assert.equal(result.allKnownInput,1000);});

test('fingerprints classify system, schema, options and append-only changes without retaining prose',()=>{
  const original=request([{role:'system',content:'SECRET_PRIVATE'},{role:'user',content:'one'}]);const first=requestFingerprint(original);assert.ok(!JSON.stringify(first).includes('SECRET_PRIVATE'));
  const append=structuredClone(original);append.messages.push({role:'assistant',content:'two'});assert.equal(compareFingerprints(first,requestFingerprint(append)).appendOnly,true);
  const changed=structuredClone(original);changed.messages[0].content='new';const diff=compareFingerprints(first,requestFingerprint(changed));assert.equal(diff.systemStable,false);assert.equal(diff.commonPrefixMessages,0);
  changed.tools.push({name:'new'});changed.reasoningEffort='low';const tools=compareFingerprints(first,requestFingerprint(changed));assert.equal(tools.toolsStable,false);assert.equal(tools.optionsStable,false);
});
test('nonserializable requests degrade to unavailable without throwing',()=>{const value=request([]);value.self=value;assert.equal(requestFingerprint(value),null);assert.deepEqual(compareFingerprints(null,requestFingerprint(request([]))),{available:false});});

test('stable unreported samples are separate from measured low hits',()=>{const rows=Array.from({length:3},(_,index)=>({id:String(index),startedAt:index,endedAt:index+1,request:request([{role:'user',content:'same'}]),usage:{inputTokens:100}}));const result=cacheDiagnosis(rows);assert.equal(result.stablePrefixSamples,2);assert.equal(result.stableUnreported,2);assert.equal(result.stableButLow,0);});

test('analysis is bounded, handles disabled capture and never returns body or hash values',()=>{
  const rows=Array.from({length:15},(_,index)=>({id:String(index),startedAt:index,endedAt:index+1,request:request([{role:'user',content:'PRIVATE'}]),usage:{inputTokens:90,cacheReadTokens:10}}));const diagnosis=cacheDiagnosis(rows);assert.equal(diagnosis.compared,7);assert.equal(diagnosis.stableButLow,7);assert.ok(!JSON.stringify(diagnosis).includes('PRIVATE'));assert.equal(cacheDiagnosis(rows.map(row=>({...row,request:null}))).unavailable,7);
});
