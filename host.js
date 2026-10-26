import Schema from '@deepseek-ai/schemastery';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { DEFAULT_SETTINGS, BUILTIN_PROMPTS, promptLibrary, selectedPrompt, validateSettings, redact, sanitizeStream, estimateTokens, priceUsage, readableRequest, initStats, foldStats } from './core.mjs';

export const name = 'dsh-atelier';
export const inject = ['sessionProjections', 'storageDomain', 'connection', 'webServer', 'agents', 'tools', 'commands', 'clientModules'];
export const Config = Schema.object({
  enabled: Schema.boolean().default(true).description('启用本地工作台；关闭不删除已保存的日志。'),
});
const KEY = 'atelierStats';
const NEUTRAL_CLIENT_HINTS = [
  {name:'harness:source',order:'HARNESS_SOURCE',text:'The host application implementation checkout and the current working directory are separate locations; never infer the working directory from an installation path. Use pwd to determine the current working directory. Inspect or extend the host application only when the user requests it.'},
  {name:'app:web-surface',order:'WEB_SURFACE',text:'When the user refers to "this page", "this GUI", or "this app" without naming another target, they mean the current application. The browser provides no implicit DOM, route, or screenshot context. Verify the actual running application after changes; starting another server does not update it. Do not promise automatic updates without checking the active build watcher. Client plugin changes require their bundles to rebuild; shell and shared-package changes require rebuilding affected web artifacts and refreshing the existing application. Do not start a replacement server unless the user asks; if needed, use a managed background job and verify its exact URL.'},
];
const MAX_RECORD = 32 * 1024 * 1024;
const jsonBytes = value => Buffer.byteLength(JSON.stringify(value));

export async function apply(ctx, config) {
  if (!config.enabled) return;
  const domain = await ctx.storageDomain.open({
    name: 'dsh_atelier_v1', version: 1, layout: 'per-record',
    global: { schema: z.object({settings: z.unknown(), revision: z.number()}), initial: {settings: DEFAULT_SETTINGS, revision: 0} },
    tables: { requests: {valueSchema: z.record(z.string(), z.unknown())} },
  });
  ctx.effect(() => () => domain.close());
  let settings = validateSettings(domain.global.get().settings);
  let revision = domain.global.get().revision;
  let storageError = null;
  let closing = false;
  const requests = domain.table('requests');
  const active = new Map();
  let clientRuntime = null;
  const owners = new Map();
  const promptWarnings = new Map();
  const promptState = new Map();
  ctx.effect(() => () => { for (const dispose of owners.values()) dispose(); owners.clear(); promptWarnings.clear(); promptState.clear(); });
  const pendingWrites = new Set();
  const safely = async operation => {
    try { return await operation(); }
    catch (error) { storageError = String(error?.message ?? error); return undefined; }
  };
  const track = promise => {
    pendingWrites.add(promise);
    promise.finally(() => pendingWrites.delete(promise));
    return promise;
  };
  const saveRecord = record => track(safely(async () => {
    const snapshot = redact({...record});
    await requests.put(record.id, snapshot);
    metadata.set(record.id, {summary:summarize(snapshot),bytes:jsonBytes(snapshot)});
  }));
  const metadata = new Map([...requests.entries()].map(([id,record]) => [id,{summary:summarize(record),bytes:jsonBytes(record)}]));
  let saveQueue = Promise.resolve();
  let maintenance = Promise.resolve();
  function prune() {
    maintenance = maintenance.catch(() => {}).then(async () => {
      const records = [...metadata.entries()].map(([id, value]) => ({id,value:value.summary,bytes:value.bytes})).sort((a,b) => b.value.startedAt - a.value.startedAt);
      const floor = Date.now() - settings.retentionDays * 86400000;
      let used = 0;
      for (const row of records) {
        used += row.bytes;
        if (!active.has(row.id) && (row.value.startedAt < floor || used > settings.maxLogMB * 1024 * 1024)) {
          await requests.delete(row.id); metadata.delete(row.id);
        }
      }
    });
    return safely(() => maintenance);
  }

  ctx.sessionProjections.register({key: KEY, stateVersion: 3, stateSchema: z.unknown(),
    init: () => initStats(), apply: foldStats, wire: {viewSchema: z.unknown(), view: state => state},
  });

  function bindAgent(agent) {
    if (owners.has(agent)) return;
    const dispose = agent.ctx.effect(function* () {
      const prompt = agent.ctx.get('systemPrompt');
      if (!prompt) { promptWarnings.set(agent.id, ['systemPrompt service unavailable']); return; }
      const warnings = [];
      const state = {identityRegistered:false,extraRegistered:false,clientHintsNeutralized:false};
      if (settings.hideClientIdentity) {
        try {
          for (const hint of NEUTRAL_CLIENT_HINTS) {
            yield prompt.section({name:hint.name,order:prompt.getSectionOrder(hint.order),text:hint.text,interpolate:false});
            yield prompt.context({name:hint.name,order:prompt.getContextOrder(hint.order),text:'',interpolate:false});
          }
          state.clientHintsNeutralized = true;
        } catch(error) { warnings.push(`客户端标识段：${error.message}`); }
      }
      try {
        if (settings.identityEnabled) {
          yield prompt.section({name:'harness:identity',order:prompt.getSectionOrder('HARNESS_IDENTITY'),text:()=>settings.identityText,interpolate:false});
          state.identityRegistered = true;
        }
      } catch(error) { warnings.push(`身份段：${error.message}`); }
      try {
        yield prompt.section({name:'atelier:instructions',order:10190,text:()=>settings.extraPrompt,interpolate:false});
        state.extraRegistered = true;
      } catch(error) { warnings.push(`附加段：${error.message}`); }
      promptWarnings.set(agent.id,warnings);
      promptState.set(agent.id,state);
      yield () => { promptWarnings.delete(agent.id); promptState.delete(agent.id); };
    });
    owners.set(agent, dispose);
  }
  function rebind() {
    for (const dispose of owners.values()) dispose();
    owners.clear();
    for (const agent of ctx.agents.list()) bindAgent(agent);
  }
  ctx.on('agent/created', ({agent}) => { bindAgent(agent); });
  ctx.on('agent/disposed', ({agent}) => { owners.get(agent)?.(); owners.delete(agent); });
  for (const agent of ctx.agents.list()) bindAgent(agent);

  ctx.on('llm/stream', async function* (options, next) {
    if (closing) { yield* next(); return; }
    const startedAt = Date.now();
    const id = randomUUID();
    const {signal, ...serializable} = options;
    const request = redact(serializable);
    const record = {
      version: 1, id, sessionId: options.sessionId ?? null,
      provider: options.provider, model: options.model, purpose: options.purpose ?? 'conversation',
      startedAt, endedAt: null, state: 'streaming',
      captureEnabled: settings.captureEnabled,
      request: settings.captureEnabled ? request : null,
      chunks: [], usage: null, finish: null, error: null,
      inputEstimate: estimateTokens(JSON.stringify(request)),
      outputEstimate: 0, reasoningStartedAt: null, reasoningEndedAt: null,
      firstChunkAt: null, firstTextAt: null, truncated: false,
      captureLayer: 'DSH normalized request before adapter / normalized response after adapter; not HTTP wire',
    };
    let bytes = settings.captureEnabled ? jsonBytes(record) : 0;
    if (bytes > MAX_RECORD) { record.request = null; record.truncated = true; bytes = 0; }
    let outputChars = 0;
    active.set(id, record);
    await saveRecord(record);
    try {
      for await (const chunk of next()) {
        const time = Date.now();
        record.firstChunkAt ??= time;
        if (chunk.type === 'reasoning-delta') {
          record.reasoningStartedAt ??= time;
          record.reasoningEndedAt = time;
        }
        if (chunk.type === 'text-delta' || chunk.type === 'tool-call-delta') {
          record.firstTextAt ??= time;
          if (record.reasoningStartedAt !== null && record.firstTextAt === time) record.reasoningEndedAt = time;
        }
        if (chunk.type.endsWith('-delta')) outputChars += (chunk.text ?? chunk.argumentsDelta ?? '').length;
        record.outputEstimate = Math.ceil(outputChars / 3);
        if (chunk.type === 'usage') record.usage = {...chunk.usage, inputIncludesCache: false};
        if (chunk.type === 'finish') {
          record.finish = redact(chunk.reason);
          record.state = chunk.reason.kind;
        }
        if (record.captureEnabled && !record.truncated) {
          const frame = {time, chunk};
          bytes += jsonBytes(frame);
          if (bytes <= MAX_RECORD) record.chunks.push(frame);
          else record.truncated = true;
        }
        yield chunk;
      }
      if (record.state === 'streaming') record.state = 'ended-without-finish';
    } catch (error) {
      record.state = signal?.aborted ? 'aborted' : 'exception';
      record.error = redact(String(error?.message ?? error));
      throw error;
    } finally {
      record.endedAt = Date.now();
      if (record.state === 'streaming') record.state = signal?.aborted ? 'aborted' : 'consumer-closed';
      active.delete(id);
      record.chunks = sanitizeStream(record.chunks);
      await saveRecord(record);
      await prune();
    }
  });

  function statsOf(sessionId) {
    const agent = ctx.agents.get(sessionId);
    return agent?.session ? ctx.sessionProjections.stateOf(agent.session, KEY) : null;
  }
  function costOf(stats) {
    const totals = {};
    let unknown = stats?.unknownUsageResponses??0;
    const sources=new Set();
    for (const row of stats?.byModel ?? []) {
      const bands=row.priceBands?.length?row.priceBands:[{usage:row.usage,responses:row.responses}];
      for(const band of bands){
        if(!band.responses)continue;
        const price = priceUsage({...band.usage,...(band.pricingContextTokens===undefined?{}:{pricingContextTokens:band.pricingContextTokens})}, row.provider, row.model, settings.prices);
        if (price.known) {totals[price.currency] = (totals[price.currency] ?? 0) + price.amount;sources.add(price.source);}
        else unknown += band.responses ?? 1;
      }
    }
    return {totals, unknown, sources:[...sources],basis:'official/configured API-equivalent; not reseller invoice',cacheWriteAssumption:'30m unless 12h usage explicitly supplied'};
  }
  function summarize(record) {
    return {id:record.id,sessionId:record.sessionId,provider:record.provider,model:record.model,purpose:record.purpose,
      startedAt:record.startedAt,endedAt:record.endedAt,state:record.state,usage:record.usage,
      inputEstimate:record.inputEstimate,outputEstimate:record.outputEstimate,
      reasoningStartedAt:record.reasoningStartedAt,reasoningEndedAt:record.reasoningEndedAt,
      firstTextAt:record.firstTextAt,firstChunkAt:record.firstChunkAt,
      truncated:record.truncated,captureEnabled:record.captureEnabled,
      price: priceUsage(record.usage ?? {inputTokens:record.inputEstimate,outputTokens:record.outputEstimate,inputIncludesCache:false},record.provider,record.model,settings.prices)};
  }
  const service = {
    async operate(input, callerSessionId) {
      if (!input || typeof input !== 'object') throw new Error('操作参数必须是对象');
      const action = input.action ?? 'status';
      const sessionId = callerSessionId ?? input.sessionId;
      if (action === 'client-report') {
        const value=input.runtime??{};
        const old=clientRuntime??{};
        const str=(item,limit=80)=>String(item??'').slice(0,limit);
        clientRuntime={...old,receivedAt:Date.now(),build:str(value.build),
          ...(value.mechanism?{enabled:value.enabled===true,activeLocale:str(value.activeLocale),running:value.running===true,label:str(value.label,500),mechanism:str(value.mechanism)}:{}),
          ...(value.footer&&typeof value.footer==='object'?{footer:{mode:str(value.footer.mode),iconCount:Math.max(0,Math.min(20,Number(value.footer.iconCount)||0)),family:str(value.footer.family),model:str(value.footer.model,200),input:str(value.footer.input),output:str(value.footer.output),cache:str(value.footer.cache),elapsed:str(value.footer.elapsed),cost:str(value.footer.cost,200),animation:str(value.footer.animation)}}:{}),
        };
        return {ok:true};
      }
      if (action === 'display') return {phrases:settings.phrases,rotationSeconds:settings.rotationSeconds,chatDynamicLabels:settings.chatDynamicLabels,revision};
      if (action === 'settings') return {settings,revision,scope:'profile',appliesTo:'all-current-and-future-agent-sessions',promptLibrary:promptLibrary(settings),selectedPrompt:selectedPrompt(settings),warning:promptWarnings.get(sessionId)??[]};
      if (action === 'diagnose') {
        const agent = ctx.agents.get(sessionId);
        if (!agent) throw new Error('会话未激活');
        const prompt = agent.ctx.get('systemPrompt');
        const assembly = await prompt.assemble({scope:agent,agent});
        const identity = assembly.sections.find(section=>section.name==='harness:identity');
        const extra = assembly.sections.find(section=>section.name==='atelier:instructions');
        const client = ctx.clientModules.graph().entries.find(entry=>entry.id==='dsh-atelier-plugin')??null;
        return {build:'atelier-1.4.1',sessionId,registration:promptState.get(sessionId)??null,
          sections:assembly.sections.map(section=>({name:section.name,chars:section.text.length})),
          identity:identity?.text??null,identityMatches:!settings.identityEnabled||identity?.text===settings.identityText,
          extraMatches:extra?.text===settings.extraPrompt,toolCount:assembly.tools.length,
          scope:'profile',clientIdentityReduced:settings.hideClientIdentity,
          remainingSystemLabels:assembly.sections.filter(section=>/deepseek\s+harness|\bDSH\b/i.test(section.text)).map(section=>section.name),
          remainingContextLabels:(assembly.contexts??[]).filter(context=>/deepseek\s+harness|\bDSH\b/i.test(context.text)).map(context=>context.name),
          warnings:promptWarnings.get(sessionId)??[],client,clientRuntime,selectedPrompt:selectedPrompt(settings)};
      }
      if (action === 'save') {
        const operation = saveQueue.catch(() => {}).then(async () => {
          if (input.revision !== revision) throw new Error('设置已被其他窗口修改，请重新载入后再保存');
          const next = validateSettings(input.settings);
          const nextRevision = revision + 1;
          await domain.global.set({settings:next,revision:nextRevision});
          settings = next; revision = nextRevision;
          rebind(); await prune();
          return {settings,revision,promptLibrary:promptLibrary(settings),selectedPrompt:selectedPrompt(settings),scope:'profile',message:'已保存，从下一次请求生效；旧请求和历史内容不追溯修改。'};
        });
        saveQueue = operation.then(() => {}, () => {});
        return operation;
      }
      if (action === 'status') {
        const stats = statsOf(sessionId);
        const live = [...active.values()].filter(r => r.sessionId === sessionId).map(summarize);
        const last = [...metadata.values()].map(row => row.summary).filter(r => r.sessionId === sessionId).sort((a,b)=>b.startedAt-a.startedAt)[0];
        const state = promptState.get(sessionId);
        const graphEntry = ctx.clientModules.graph().entries.find(entry=>entry.id==='dsh-atelier-plugin');
        return {build:'atelier-1.4.1',stats,cost:costOf(stats),live,last:last ? summarize(last) : null,storageError,revision,
          prompt:{...state,warnings:promptWarnings.get(sessionId)??[]},
          client:graphEntry??null,
          display:{phrases:settings.phrases,rotationSeconds:settings.rotationSeconds,captureEnabled:settings.captureEnabled,chatDynamicLabels:settings.chatDynamicLabels}};
      }
      if (action === 'logs') {
        const offset = Math.max(0,Math.floor(input.offset ?? 0));
        const limit = Math.min(100,Math.max(1,Math.floor(input.limit ?? 30)));
        const rows = [...metadata.values()].map(row=>row.summary).filter(r => r.sessionId === sessionId).sort((a,b)=>b.startedAt-a.startedAt);
        return {items:rows.slice(offset,offset+limit).map(summarize),total:rows.length,offset,limit};
      }
      if (action === 'get') {
        const record = requests.get(input.id);
        if (!record || record.sessionId !== sessionId) throw new Error('此会话没有该请求');
        const view = input.view ?? 'json';
        let text;
        if (view === 'text') text = record.request ? readableRequest(record.request) : '此请求未记录正文，或请求超过 32 MiB 限制。';
        else if (view === 'response') text = record.chunks.filter(f => /^(text|reasoning)-delta$/.test(f.chunk.type)).map(f => f.chunk.type==='reasoning-delta' ? f.chunk.text : f.chunk.text).join('');
        else if (view === 'chunks') text = record.chunks.map(f=>JSON.stringify(f)).join('\n');
        else text = JSON.stringify(record,null,2);
        const offset = Math.max(0,Math.floor(input.offset ?? 0));
        const limit = Math.min(262144,Math.max(1024,Math.floor(input.limit ?? 65536)));
        return {id:record.id,view,text:text.slice(offset,offset+limit),offset,nextOffset:offset+limit<text.length?offset+limit:null,totalChars:text.length,truncated:record.truncated,captureLayer:record.captureLayer};
      }
      throw new Error('未知工作台操作');
    },
  };
  ctx.provide('atelier',service);
  ctx.connection.fetch.register({
    path:'/api/atelier',methods:['POST'],requestBody:'buffered',
    fetch: async request => {
      let envelope;
      try {
        envelope = await request.json();
        if(envelope.type!=='client-request'||envelope.method!=='atelier'||typeof envelope.rpcId!=='string') throw new Error('无效工作台请求');
        const value=await service.operate(envelope.payload);
        return Response.json({type:'server-response',rpcId:envelope.rpcId,result:{ok:true,value}});
      } catch(error) {
        return Response.json({type:'server-response',rpcId:envelope?.rpcId??'invalid-request',result:{ok:false,error:{code:'ATELIER_ERROR',message:String(error?.message??error),details:{}}}});
      }
    },
  });
  ctx.tools.register({
    name:'atelier', description:'查看本地工作台状态、模型用量与估算费用，读取本会话请求日志，或管理动态提示、价格和身份设置。日志正文可能含敏感代码；按需分页读取。',
    parameters:{type:'object',properties:{action:{type:'string',enum:['status','settings','save','logs','get','diagnose','display']},sessionId:{type:'string'},id:{type:'string'},view:{type:'string',enum:['json','text','chunks','response']},offset:{type:'integer'},limit:{type:'integer'},revision:{type:'integer'},settings:{type:'object',description:'save 时传完整设置；先用 settings 读取版本。'}},required:['action']},
    output:{schema:{},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},
    async execute(args,exec) {return service.operate(args,exec.agent?.id);},
    isConcurrencySafe: args=>args.action!=='save',
  });
  ctx.commands.register({name:'atelier',description:'显示此会话工作台状态（设置、日志和价格位于工作台视图）',handler:async invocation=>({kind:'success',text:JSON.stringify(await service.operate({action:'status'},invocation.agent.id),null,2)})});
  await prune();
  ctx.effect(() => async () => {
    closing = true;
    for (const dispose of owners.values()) dispose();
    owners.clear();
    await Promise.allSettled([...pendingWrites]);
    await maintenance.catch(()=>{});
    await domain.close();
  });
}
