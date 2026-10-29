import test from 'node:test';
import assert from 'node:assert/strict';
import {capacityPlan,createModelManager} from './model-manager.mjs';
const entry={provider:'test',settingsNs:'llm-pi-ai',settingsPath:['providers','test']};
const models=[{id:'a',contextWindow:100,maxTokens:20},{id:'b',contextWindow:200,maxTokens:30}];
const route={apiKeyEnv:'SECRET_REF',headers:{Authorization:'PRIVATE'},models:[{id:'a',name:'A',contextWindow:100,maxTokens:20},{id:'b',contextWindow:200,maxTokens:30}]};
function descriptor(user={providers:{test:structuredClone(route)}}){return {ns:'llm-pi-ai',revision:7,value:{providers:{test:structuredClone(route)}},user,secrets:[]};}
test('capacity edits only selected model limits and route defaults, not credentials',()=>{
  const result=capacityPlan({entry,descriptor:descriptor(),models,changes:{contextWindow:300}});
  assert.equal(result.ops.length,3);assert.ok(result.ops.every(op=>['contextWindow','defaultContextWindow'].includes(op.path.at(-1))));assert.equal(JSON.stringify(result).includes('PRIVATE'),false);assert.equal(result.rows[0].after.maxTokens,20);
});
test('base models materialize explicitly, catalog uses overrides and keeps other fields',()=>{
  const result=capacityPlan({entry,descriptor:descriptor({}),models,changes:{maxTokens:40}});assert.equal(result.ops[0].path.at(-1),'models');assert.equal(result.ops[0].value[0].name,'A');assert.ok(result.warnings.some(text=>text.includes('快照')));assert.ok(!JSON.stringify(result.ops).includes('PRIVATE'));
  const catalog=descriptor();delete catalog.value.providers.test.models;delete catalog.user.providers.test.models;
  const plan=capacityPlan({entry,descriptor:catalog,models,changes:{maxTokens:40}});assert.equal(plan.ops[0].path.join('/'),'providers/test/modelOverrides/a/maxTokens');
});
test('invalid capacities, changed directories and hidden secrets reject before mutation',()=>{
  for(const changes of [{},{temperature:1},{maxTokens:NaN},{contextWindow:1.2},{maxTokens:301}])assert.throws(()=>capacityPlan({entry,descriptor:descriptor(),models,changes}));
  assert.throws(()=>capacityPlan({entry,descriptor:descriptor(),models:[models[0]],changes:{maxTokens:20}}));
  const masked=descriptor({});masked.secrets=[{path:['providers','test','models','0','secret'],set:true}];assert.throws(()=>capacityPlan({entry,descriptor:masked,models,changes:{maxTokens:40}}));
});
test('manager previews before mutation and applies once using exact revision',async()=>{
  const desc=descriptor();let mutations=0,revision;
  const llm={listConfigurableProviders:()=>[entry],listModels:async()=>models.map(row=>({id:row.id,name:row.id})),resolveModelInfo:async(_provider,id)=>{const index=models.findIndex(row=>row.id===id);const row=desc.value.providers.test.models[index];return {context:{contextWindow:row.contextWindow},defaultMaxTokens:row.maxTokens};}};
  const settings={describe:()=>[desc],mutate:async(_ns,ops,expected)=>{mutations++;revision=expected;for(const op of ops){let parent=desc.value;for(const key of op.path.slice(0,-1))parent=parent[key];parent[op.path.at(-1)]=op.value;}}};
  const manager=createModelManager({get:name=>({llm,settings}[name])},{makeId:()=> 'preview'});
  const read=await manager.operate({action:'models',provider:'test'});assert.equal(read.models.length,2);assert.ok(!JSON.stringify(read).includes('PRIVATE'));
  const preview=await manager.operate({action:'model-preview',provider:'test',changes:{contextWindow:300}});assert.equal(mutations,0);assert.equal(preview.rows.length,2);
  const result=await manager.operate({action:'model-apply',previewId:preview.previewId});assert.equal(result.verified,true);assert.equal(mutations,1);assert.equal(revision,7);await assert.rejects(manager.operate({action:'model-apply',previewId:preview.previewId}));
});

test('expired previews never mutate and conflicts require a fresh preview',async()=>{
  const desc=descriptor();let clock=0,calls=0;const llm={listConfigurableProviders:()=>[entry],listModels:async()=>models,resolveModelInfo:async(_provider,id)=>{const row=models.find(item=>item.id===id);return {context:{contextWindow:row.contextWindow},defaultMaxTokens:row.maxTokens};}};
  const settings={describe:()=>[desc],mutate:async(_ns,_ops,revision)=>{calls++;assert.equal(revision,7);throw new Error('settings/conflict');}};
  const manager=createModelManager({get:name=>({llm,settings}[name])},{now:()=>clock,makeId:()=>`preview-${clock}`});
  const expired=await manager.operate({action:'model-preview',provider:'test',changes:{contextWindow:300}});clock=300001;
  await assert.rejects(manager.operate({action:'model-apply',previewId:expired.previewId}),/过期/);assert.equal(calls,0);
  const stale=await manager.operate({action:'model-preview',provider:'test',changes:{maxTokens:40}});
  await assert.rejects(manager.operate({action:'model-apply',previewId:stale.previewId}),/conflict/);assert.equal(calls,1);
  await assert.rejects(manager.operate({action:'model-apply',previewId:stale.previewId}),/过期/);assert.equal(calls,1);assert.equal(desc.value.providers.test.models[0].maxTokens,20);
});
