import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, Config } from './host.js';
const copy = value => value === undefined ? undefined : structuredClone(value);
function effects(target = {}) {
  const pending = new Set();
  target.effect = factory => {
    const result = factory();
    assert.ok(!result?.then, 'effects initialize synchronously');
    const cleanups = result?.next ? [...result] : [result];
    let live = true;
    const dispose = () => {
      if (!live) return; live = false; pending.delete(dispose);
      const results = [...cleanups].reverse().map(cleanup => cleanup?.());
      if (results.some(value => value?.then)) return Promise.all(results);
    };
    pending.add(dispose); return dispose;
  };
  target.dispose = async () => { for (const dispose of [...pending].reverse()) await dispose(); };
  return target;
}
function harness({optIn=false}={}) {
  const ctx = effects(), events = new Map(), tools = new Map(), commands = new Map(), routes = [];
  const domains = new Map(), records = new Map(), writes = [], states = new Map();
  let global, projection, opens = 0, closes = 0;
  const table = {
    get: key => copy(records.get(key)),
    *entries() { for (const [key, value] of records) yield [key, copy(value)]; },
    async put(key, value) { const snapshot = copy(value); writes.push(snapshot); records.set(key, snapshot); },
    async delete(key) { return records.delete(key); },
  };
  ctx.storageDomain = {
    get: name => domains.get(name),
    async open(spec) {
      assert.equal(domains.has(spec.name), false); opens++; global = copy(spec.global.initial);
      if(optIn)global.settings={...global.settings,identityEnabled:true,hideClientIdentity:true,captureEnabled:true,chatDynamicLabels:true};
      let closed = false;
      const domain = { global: {get: () => copy(global), async set(value) { global = copy(spec.global.schema.parse(value)); }},
        table: () => table,
        async close() { if (!closed) { closed = true; closes++; domains.delete(spec.name); } } };
      domains.set(spec.name, domain); return domain;
    },
  };
  const base = new Map([['harness:identity', { name: 'harness:identity', order: 100, text: 'base identity' }]]);
  const agents = new Map(['alpha', 'beta'].map(id => {
    const sections = new Map(), contexts = new Map(), agentCtx = effects();
    const prompt = {
      sections, contexts, failure: null,
      getSectionOrder: () => 100,
      getContextOrder: () => 200,
      context(context) { contexts.set(context.name,context); return ()=>contexts.delete(context.name); },
      section(section) {
        if (this.failure === section.name) throw new Error(`conflict ${id}/${section.name}`);
        if (sections.has(section.name)) throw new Error(`duplicate ${id}/${section.name}`);
        sections.set(section.name, section); let live = true;
        return () => { if (live) { live = false; sections.delete(section.name); } };
      },
      async assemble(context) {
        assert.equal(context.scope, agent);
        return { sections: [...new Map([...base, ...sections]).values()].sort((a,b)=>a.order-b.order)
          .map(row => ({name:row.name,text:typeof row.text==='function'?row.text(context):row.text})), contexts:[...contexts.values()], tools: [] };
      },
    };
    const agent = {id, session:{id}, ctx:agentCtx, prompt};
    agentCtx.get = name => name === 'systemPrompt' ? prompt : undefined;
    return [id, agent];
  }));
  ctx.agents = {list:()=>[...agents.values()],get:id=>agents.get(id)};
  ctx.sessionProjections = {register(value){projection=value;},stateOf(session){return states.get(session.id)??projection.init();}};
  ctx.tools = {register(tool){tools.set(tool.name,tool);}};
  ctx.commands = {register(command){commands.set(command.name,command);}};
  ctx.connection = {fetch:{register(route){routes.push(route);}}};
  ctx.clientModules = {graph:()=>({entries:[]})}; ctx.webServer = {};
  ctx.provide=(key,value)=>{ctx[key]=value;};ctx.get=key=>ctx[key];
  ctx.on=(name,handler)=>{const list=events.get(name)??[];list.push(handler);events.set(name,list);return ctx.effect(()=>()=>list.splice(list.indexOf(handler),1));};
  return {ctx,agents,tools,commands,routes,writes,records,get opens(){return opens;},get closes(){return closes;},get global(){return copy(global);},
    operate:(input,caller)=>ctx.atelier.operate(input,caller),stream:(request,next)=>events.get('llm/stream')[0].call({},request,next),
    emit:(name,payload)=>Promise.all((events.get(name)??[]).map(fn=>fn(payload))),
    feed(id,event){states.set(id,projection.apply(states.get(id)??projection.init(),event));}};
}
async function setup(t){const h=harness({optIn:true});await apply(h.ctx,{enabled:true});t.after(()=>h.ctx.dispose());return h;}
const request=sessionId=>({sessionId,provider:'provider',model:'model',messages:[]});
async function collect(iterable){const rows=[];for await(const row of iterable)rows.push(row);return rows;}
const upstream=chunks=>async function*(){yield* chunks;};
const finish=()=>({type:'finish',reason:{kind:'stop'}});
async function save(h,patch){const {settings,revision}=await h.operate({action:'settings'});return h.operate({action:'save',revision,settings:{...settings,...patch}});}

test('enabled/disabled lifecycle and one operation for tool/service',async t=>{
  assert.ok(Config);const off=harness();await apply(off.ctx,{enabled:false});assert.equal(off.opens,0);
  const h=await setup(t);assert.equal(h.opens,1);assert.ok(h.tools.has('atelier'));assert.equal(h.routes[0].path,'/api/atelier');
  const tool=h.tools.get('atelier');for(const action of ['status','settings','save','logs','get','diagnose'])assert.ok(tool.parameters.properties.action.enum.includes(action));
  assert.deepEqual(await tool.execute({action:'settings'},{agent:h.agents.get('alpha')}),await h.operate({action:'settings'}));
  await save(h,{extraPrompt:'literal {{value}}'});assert.equal(h.global.settings.extraPrompt,'literal {{value}}');
});
test('concurrent revision CAS accepts exactly one save',async t=>{
  const h=await setup(t),initial=await h.operate({action:'settings'});
  const outcomes=await Promise.allSettled(['first','second'].map(extraPrompt=>h.operate({action:'save',revision:initial.revision,settings:{...initial.settings,extraPrompt}})));
  assert.equal(outcomes.filter(row=>row.status==='fulfilled').length,1);assert.equal(h.global.revision,1);
});
test('session-bound logs/get reject forged other-session selector',async t=>{
  const h=await setup(t);for(const id of ['alpha','beta'])await collect(h.stream(request(id),upstream([finish()])));
  const alpha=await h.operate({action:'logs'},'alpha'),beta=await h.operate({action:'logs'},'beta');
  const tool=h.tools.get('atelier'),exec={agent:h.agents.get('alpha')};
  assert.equal((await tool.execute({action:'logs',sessionId:'beta'},exec)).items[0].id,alpha.items[0].id);
  await assert.rejects(tool.execute({action:'get',sessionId:'beta',id:beta.items[0].id},exec));
});
test('passthrough chunk identity and every persisted snapshot sanitizes split credentials',async t=>{
  const h=await setup(t),chunks=[{type:'text-delta',index:0,text:'before Bear'},{type:'text-delta',index:0,text:'er split-credential after sk-'},{type:'text-delta',index:0,text:'proj-crosschunk123456 done'},finish()].map(Object.freeze);
  const output=await collect(h.stream(request('alpha'),upstream(chunks)));output.forEach((chunk,index)=>assert.equal(chunk,chunks[index]));
  for(const snapshot of h.writes)assert.doesNotMatch(JSON.stringify(snapshot),/split-credential|proj-crosschunk123456/);
  const stored=[...h.records.values()][0];assert.equal(stored.chunks.filter(row=>row.chunk.type==='text-delta').map(row=>row.chunk.text).join(''),'before Bearer [REDACTED] after [REDACTED] done');
});
test('upstream stream failures propagate without poisoning other sessions',async t=>{
  const h=await setup(t),failure=new Error('upstream failed');
  await assert.rejects(collect(h.stream(request('alpha'))),TypeError);
  await assert.rejects(collect(h.stream(request('alpha'),()=>undefined)),TypeError);
  await assert.rejects(collect(h.stream(request('alpha'),()=>{throw failure;})),e=>e===failure);
  await assert.rejects(collect(h.stream(request('alpha'),async function*(){yield {type:'text-delta',index:0,text:'partial'};throw failure;})),e=>e===failure);
  await collect(h.stream(request('beta'),upstream([finish()])));
  assert.equal([...h.records.values()].filter(row=>row.sessionId==='alpha'&&row.state==='exception').length,4);
  assert.equal((await h.operate({action:'status'},'beta')).storageError,null);
});
test('actual usage pricing avoids estimated and reasoning double billing',async t=>{
  const h=await setup(t);await save(h,{prices:[{provider:'provider',model:'model',currency:'USD',input:2,output:8,cacheRead:0.2,cacheWrite:3}]});
  const usage={inputTokens:1000,outputTokens:500,cacheReadTokens:200,cacheWriteTokens:100,reasoningTokens:300};
  await collect(h.stream(request('alpha'),upstream([{type:'usage',usage},finish()])));
  h.feed('alpha',{type:'assistant/message',seq:1,data:{message:{source:{provider:'provider',model:'model'},content:[]},usage}});
  assert.equal((await h.operate({action:'logs'},'alpha')).items[0].price.amount,0.00634);
  assert.equal((await h.operate({action:'status'},'alpha')).cost.totals.USD,0.00634);
});
test('official API equivalent totals sum short and long request buckets correctly',async t=>{
  const h=await setup(t);
  await save(h,{prices:[{provider:'provider',model:'model',currency:'USD',input:2,output:10,cacheRead:.1,cacheWrite:2.5,longContext:{threshold:272000,input:4,output:15,cacheRead:.2,cacheWrite:5},source:'https://developers.openai.com/api/docs/pricing',checkedAt:'2026-10-26'}]});
  const response=usage=>({message:{source:{provider:'provider',model:'model'},content:[]},usage});
  h.feed('alpha',{type:'assistant/message',seq:1,data:response({inputTokens:200000,cacheReadTokens:70000,outputTokens:1000})});
  h.feed('alpha',{type:'assistant/message',seq:2,data:response({inputTokens:200000,cacheReadTokens:73000,outputTokens:1000})});
  const status=await h.operate({action:'status'},'alpha');
  assert.ok(Math.abs(status.cost.totals.USD-1.2466)<1e-9);assert.equal(status.cost.unknown,0);
  assert.equal(status.stats.byModel[0].priceBands[1].responses,1);assert.equal(status.stats.byModel[0].priceBands[2].responses,1);
  assert.equal(status.cost.sources.length,2);
});

test('100K aggregate tier pricing agrees with direct per-request pricing',async t=>{
  const h=await setup(t);await save(h,{prices:[{provider:'provider',model:'model',currency:'USD',input:.1,output:.5,cacheRead:.01,longContext:{threshold:100000,input:.5,output:2.5,cacheRead:.05}}]});
  for(const[seq,inputTokens]of[[1,100000],[2,100001],[3,300000]])h.feed('alpha',{type:'assistant/message',seq,data:{message:{source:{provider:'provider',model:'model'},content:[]},usage:{inputTokens,outputTokens:0}}});
  const {cost,stats}=await h.operate({action:'status'},'alpha');assert.ok(Math.abs(cost.totals.USD-.2100005)<1e-12);assert.deepEqual(stats.byModel[0].priceBands.map(band=>band.responses),[1,1,1]);
});

test('prompt rebind and both agent/plugin teardown remove registrations',async t=>{
  const h=await setup(t),alpha=h.agents.get('alpha'),beta=h.agents.get('beta');
  assert.equal(alpha.prompt.sections.size,4);await save(h,{identityText:'replacement',extraPrompt:'{{literal}}'});
  assert.equal((await h.operate({action:'diagnose'},'alpha')).identityMatches,true);
  await save(h,{identityEnabled:false});assert.equal(alpha.prompt.sections.has('harness:identity'),false);
  await h.emit('agent/disposed',{agent:alpha});assert.equal(alpha.prompt.sections.size,0);assert.equal(beta.prompt.sections.size,3);
  await h.ctx.dispose();assert.equal(beta.prompt.sections.size,0);assert.equal(beta.prompt.contexts.size,0);assert.equal(h.closes,1);
});
test('global identity reduction applies across sessions and can be disabled',async t=>{
  const h=await setup(t);
  const settings=await h.operate({action:'settings'},'alpha');assert.equal(settings.scope,'profile');
  for(const id of ['alpha','beta']) {
    const result=await h.operate({action:'diagnose'},id);
    assert.equal(result.registration.clientHintsNeutralized,true);
    assert.deepEqual(result.remainingSystemLabels,[]);assert.deepEqual(result.remainingContextLabels,[]);
    assert.equal(h.agents.get(id).prompt.contexts.size,2);
  }
  await save(h,{identityText:'Universal assistant',hideClientIdentity:false});
  for(const id of ['alpha','beta']) {
    const result=await h.operate({action:'diagnose'},id);assert.equal(result.identity,'Universal assistant');
    assert.equal(result.registration.clientHintsNeutralized,false);assert.equal(h.agents.get(id).prompt.contexts.size,0);
  }
});

test('prompt library original restores built-in registry and generic can be reapplied globally',async t=>{
  const h=await setup(t);const initial=await h.operate({action:'settings'});
  assert.deepEqual(initial.promptLibrary.map(row=>row.id),['dsh-original','coding-assistant']);
  const original=initial.promptLibrary.find(row=>row.id==='dsh-original');
  const keys=['identityEnabled','identityText','extraPrompt','hideClientIdentity'];
  await save(h,Object.fromEntries(keys.map(key=>[key,original[key]])));
  for(const id of ['alpha','beta']) {
    assert.equal((await h.operate({action:'diagnose'},id)).identity,'base identity');
    assert.equal(h.agents.get(id).prompt.contexts.size,0);
    assert.equal((await h.operate({action:'settings'},id)).selectedPrompt,'dsh-original');
  }
  const generic=initial.promptLibrary.find(row=>row.id==='coding-assistant');
  await save(h,Object.fromEntries(keys.map(key=>[key,generic[key]])));
  for(const id of ['alpha','beta'])assert.equal((await h.operate({action:'diagnose'},id)).identity,generic.identityText);
  const custom={id:'user-test',name:'我的提示词',description:'',identityEnabled:true,identityText:'Mine',extraPrompt:'Detail',hideClientIdentity:false};
  await save(h,{promptLibrary:[custom],...Object.fromEntries(keys.map(key=>[key,custom[key]]))});
  assert.equal((await h.operate({action:'settings'},'beta')).selectedPrompt,'user-test');
});

test('public defaults preserve identity, language preference and opt out of body capture',async t=>{
  const h=harness();await apply(h.ctx,{enabled:true});t.after(()=>h.ctx.dispose());
  const {settings,selectedPrompt}=await h.operate({action:'settings'});
  assert.equal(settings.captureEnabled,false);assert.equal(settings.chatDynamicLabels,false);assert.equal(settings.identityEnabled,false);assert.equal(settings.hideClientIdentity,false);assert.equal(selectedPrompt,'dsh-original');
  await collect(h.stream(request('alpha'),upstream([{type:'text-delta',index:0,text:'do not retain'},finish()])));
  const stored=[...h.records.values()][0];assert.equal(stored.request,null);assert.deepEqual(stored.chunks,[]);
});
test('missing or invalid usage remains explicitly unknown in aggregate cost',async t=>{
  const h=await setup(t);await save(h,{prices:[{provider:'provider',model:'model',currency:'USD',input:2,output:8,cacheWrite:3,cacheWrite12h:6}]});
  const event=(seq,usage)=>({type:'assistant/message',seq,data:{message:{source:{provider:'provider',model:'model'},content:[]},usage}});
  h.feed('alpha',event(1,{inputTokens:0,outputTokens:0,cacheWriteTokens:1000,cacheWrite12hTokens:1000}));
  h.feed('alpha',event(2,undefined));h.feed('alpha',event(3,{}));h.feed('alpha',event(4,{inputTokens:-1,outputTokens:0}));
  const status=await h.operate({action:'status'},'alpha');assert.equal(status.stats.responses,4);assert.equal(status.cost.unknown,3);assert.equal(status.cost.totals.USD,.006);
});

test('settings exposes documented price presets without silently replacing user pricing',async t=>{
  const h=await setup(t);const result=await h.operate({action:'settings'});
  assert.deepEqual(result.settings.prices,[]);assert.equal(result.priceCatalog.groups.length,6);assert.ok(result.priceCatalog.groups.every(group=>group.basis==='user-supplied-unverified'));assert.equal(result.priceCatalog.entries.length,5);assert.ok(result.priceCatalog.entries.every(row=>row.source.includes('/blob/')&&!row.model.includes('*')));assert.ok(result.priceCatalog.pending.some(row=>row.vendor==='Kimi'));
});

test('strict cache unknowns do not erase known costs in the same context tier',async t=>{
  const h=await setup(t);await save(h,{prices:[{provider:'provider',model:'model',currency:'USD',input:2,output:8,requireCacheRates:true}]});
  for(const[seq,usage]of[[1,{inputTokens:1000,outputTokens:0}],[2,{inputTokens:1000,outputTokens:0,cacheReadTokens:100}],[3,{inputTokens:10,outputTokens:0,inputIncludesCache:true,cacheReadTokens:20}]])h.feed('alpha',{type:'assistant/message',seq,data:{message:{source:{provider:'provider',model:'model'},content:[]},usage}});
  const {cost,stats}=await h.operate({action:'status'},'alpha');assert.equal(cost.totals.USD,.002);assert.equal(cost.unknown,2);assert.equal(stats.unknownUsageResponses,1);assert.equal(stats.cacheAccounting.reported,1);assert.equal(stats.cacheAccounting.missing,2);
});

test('onboarding completion persists without implicitly enabling capture or identity',async t=>{
  const h=harness();await apply(h.ctx,{enabled:true});t.after(()=>h.ctx.dispose());
  const before=await h.operate({action:'settings'});assert.equal(before.settings.onboardingCompleted,false);
  await h.operate({action:'save',revision:before.revision,settings:{...before.settings,onboardingCompleted:true}});
  const after=await h.operate({action:'settings'});assert.equal(after.settings.onboardingCompleted,true);assert.equal(after.settings.captureEnabled,false);assert.equal(after.settings.identityEnabled,false);
});
test('aggregate breakdown sums to totals independently for each currency',async t=>{
  const h=await setup(t);await save(h,{prices:[{provider:'provider',model:'usd',currency:'USD',input:2,output:8,cacheRead:.2,cacheWrite:3},{provider:'provider',model:'cny',currency:'CNY',input:4,output:16,cacheRead:.4,cacheWrite:6}]});
  for(const [seq,model] of [[1,'usd'],[2,'cny']])h.feed('alpha',{type:'assistant/message',seq,data:{message:{source:{provider:'provider',model},content:[]},usage:{inputTokens:1000,outputTokens:500,cacheReadTokens:200,cacheWriteTokens:100}}});
  for(const currency of ['USD','CNY']){await save(h,{priceCurrency:currency});const {cost}=await h.operate({action:'status'},'alpha');assert.ok(Math.abs(Object.values(cost.components[currency]).reduce((a,b)=>a+b,0)-cost.totals[currency])<1e-10);assert.equal(Object.keys(cost.totals).length,1);assert.equal(cost.unknown,1);}
});

test('request summary reports API output speed excluding initial metadata and waiting',async t=>{
  const h=await setup(t);let time=1000;t.mock.method(Date,'now',()=>time);
  await collect(h.stream(request('alpha'),async function*(){time=1200;yield {type:'metadata'};time=5000;yield {type:'text-delta',index:0,text:'hello'};time=15000;yield {type:'usage',usage:{inputTokens:1,outputTokens:1000}};time=15500;yield finish();}));
  const row=(await h.operate({action:'logs'},'alpha')).items[0];assert.equal(row.throughput.tokensPerSecond,100);assert.equal(row.throughput.generationMs,10000);assert.equal(row.firstOutputAt,5000);assert.equal(row.generationEndedAt,15000);
  const status=await h.operate({action:'status'},'alpha');assert.equal(status.speed.label,'100.0 tok/s');
  time=20000;await collect(h.stream({...request('alpha'),purpose:'compaction'},async function*(){time=21000;yield {type:'finish',reason:{kind:'error'}};}));
  assert.equal((await h.operate({action:'status'},'alpha')).speed.label,'100.0 tok/s');
  time=22000;let started,release;const ready=new Promise(resolve=>started=resolve);const gate=new Promise(resolve=>release=resolve);
  const pending=collect(h.stream(request('alpha'),async function*(){time=23000;yield {type:'text-delta',index:0,text:'live'};started();await gate;time=24000;yield {type:'usage',usage:{inputTokens:1,outputTokens:20}};yield finish();}));
  await ready;const active=await h.operate({action:'status'},'alpha');assert.equal(active.live.length,1);assert.equal(active.speed.label,'100.0 tok/s');const sample=await h.operate({action:'live-speed'},'alpha');assert.equal(sample.live.length,1);assert.equal(sample.live[0].outputEstimate,2);assert.equal(JSON.stringify(sample).includes('messages'),false);assert.equal((await h.operate({action:'live-speed'},'beta')).live.length,0);release();await pending;
  assert.equal((await h.operate({action:'status'},'alpha')).speed.label,'20.0 tok/s');
});

test('non-prompt saves preserve registrations and cache diagnostics are session-bound',async t=>{
  const h=await setup(t);const section=h.agents.get('alpha').prompt.sections.get('harness:identity');await save(h,{rotationSeconds:6});assert.equal(h.agents.get('alpha').prompt.sections.get('harness:identity'),section);
  for(const id of ['alpha','beta'])await collect(h.stream({...request(id),messages:[{role:'system',content:'private system'},{role:'user',content:id}]},upstream([{type:'usage',usage:{inputTokens:20,cacheReadTokens:80,outputTokens:1}},finish()])));
  const tool=h.tools.get('atelier');const data=await tool.execute({action:'cache',sessionId:'beta'},{agent:h.agents.get('alpha')});assert.equal(data.recent.total,1);assert.equal(data.recent.weightedRatio,.8);assert.ok(!JSON.stringify(data).includes('private system'));
});

test('prompt warning is session-scoped rather than globally sticky',async t=>{
  const h=harness({optIn:true});h.agents.get('alpha').prompt.failure='harness:identity';await apply(h.ctx,{enabled:true});t.after(()=>h.ctx.dispose());
  assert.match((await h.operate({action:'diagnose'},'alpha')).warnings.join(' '),/conflict alpha/);
  const good=await h.operate({action:'diagnose'},'beta');assert.deepEqual(good.warnings,[]);assert.equal(good.identityMatches,true);
  assert.deepEqual((await h.operate({action:'settings'},'beta')).warning,[]);
  assert.deepEqual((await h.operate({action:'status'},'beta')).prompt.warnings,[]);
});
