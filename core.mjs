// Dependency-free domain logic. Capture callers redact before persistence;
// readableRequest intentionally preserves original prose and raw tool arguments.
const PHRASES = [
  '在想法的星图里找路', '给复杂问题轻轻拆线', '把线索排成有序的光', '正在和边界条件对答案',
  '让下一步更接近答案', '把零散灵感装进工具箱', '沿着证据慢慢推进', '正在为细节拧紧螺丝',
  '把可能性一一照亮', '给思路做一次温柔校准', '正在辨认问题的轮廓', '让代码与意图相互靠近',
  '把未知变成可验证的小步', '正在给答案搭稳地基', '从纷繁里提取一条清晰路径', '让每个假设都经得起追问',
  '正在连接刚刚发现的线索', '给结果留出复核的余地', '把思考折成可执行的步骤', '下一束灵感正在抵达',
  '给逻辑积木找个稳当的位置', '在细节的草丛里寻找线索', '给散落的想法排个队', '让思路先转过这个弯',
  '正在翻译问题的潜台词', '把复杂度一点点拆开', '给边界条件留一盏灯', '正在绕开想当然的小坑',
  '把问题摊开再看一遍', '让假设排队接受检查', '正在寻找更短的解释路径', '把分支收拢成清晰路线',
  '给这段逻辑梳个头', '正在和细节交换眼神', '让线索自己说话', '把模糊地带画得清楚一点',
  '给思路留一条回来的路', '正在寻找恰到好处的切入点', '把大问题切成小块', '让每一步都有落脚点',
  '在可能性之间架一座小桥', '给推理的齿轮添一点耐心', '正在分辨巧合与因果', '把线头从结里慢慢抽出来',
  '让问题从侧面露出轮廓', '正在给下一步找坐标', '把复杂放进更简单的框架', '给思路做一次轻量整理',
  '正在把疑问变成检查项', '让重要的细节浮上来', '在约束之间寻找平衡', '把每个条件放回合适的位置',
  '给思路换一个观察角度', '正在为下一步预留空间', '把直觉交给证据复核', '让答案少一点想当然',
  '正在整理脑海里的便利贴', '给问题的地图添一条路', '把零碎信息串成一条线', '正在寻找更稳妥的方案',
  '让复杂的部分先坐下来聊聊', '给思路拧紧最后一颗螺丝', '把拐弯的逻辑慢慢拉直', '正在给关键细节做标记',
  '让每条线索找到归宿', '在思路的岔路口看一看路牌', '给不确定性留一个位置', '把答案往清楚的方向推一点',
  '正在给问题换一副眼镜', '让下一步保持小而可验证', '把思考的拼图逐块靠近', '给复杂问题按下慢放键',
  '正在寻找遗漏的那一小块', '让逻辑和直觉再对一遍', '把待解的问题摆得更整齐', '下一条清晰的线索正在靠近',
];
export const BUILTIN_PROMPTS = Object.freeze([
  Object.freeze({id:'dsh-original',name:'DSH 原版（恢复内置）',description:'不覆盖内置身份、软件说明或运行时上下文；保留当前 DSH 及其他插件动态组装的原版内容。',identityEnabled:false,identityText:'You are an AI agent powered by DeepSeek Harness.',extraPrompt:'',hideClientIdentity:false}),
  Object.freeze({id:'coding-assistant',name:'通用 AI 编程助手',description:'使用通用助手身份，并将固定客户端自述改为中性措辞；保留工具和权限规则。',identityEnabled:true,identityText:'You are a helpful AI coding assistant.',extraPrompt:'',hideClientIdentity:true}),
]);
export const DEFAULT_SETTINGS = Object.freeze({
  identityEnabled: false, identityText: 'You are a helpful AI coding assistant.', extraPrompt: '',
  hideClientIdentity: false, chatDynamicLabels: false,
  onboardingCompleted:false,sidebarRecentMarks:true,sidebarRecentSnap:true,
  captureEnabled: false, retentionDays: 14, maxLogMB: 256, rotationSeconds: 4,
  priceCurrency:'USD',pricePeriod:'peak',
  phrases: Object.freeze(PHRASES), prices: Object.freeze([]), promptLibrary: Object.freeze([]),
});
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const plain = value => value !== null && typeof value === 'object'
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
function keys(value, allowed, path) {
  if (!plain(value)) throw new TypeError(`${path} must be a plain object`);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.has(key)) throw new TypeError(`${path}: unknown field ${String(key)}`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) throw new TypeError(`${path}.${key} must be an enumerable data property`);
  }
}
function text(value, path, maximum, nonblank = false) {
  if (typeof value !== 'string' || value.length > maximum || value.includes('\0') || (nonblank && !value.trim()))
    throw new TypeError(`${path} must be ${nonblank ? 'a nonblank' : 'a'} string of at most ${maximum} characters without NUL`);
  return value;
}
function number(value, path, min, max, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isSafeInteger(value)))
    throw new TypeError(`${path} must be ${integer ? 'an integer' : 'a number'} between ${min} and ${max}`);
  return value;
}
export const LONG_CONTEXT_THRESHOLD = 272000;
const PRICE_KEYS = new Set(['provider', 'model', 'currency', 'input', 'output', 'cacheRead', 'cacheWrite', 'cacheWrite12h', 'requireCacheRates', 'longContext', 'source', 'checkedAt', 'label']);
function validatePrice(value, index) {
  const path = `prices[${index}]`;
  keys(value, PRICE_KEYS, path);
  for (const key of ['provider', 'model', 'currency', 'input', 'output']) if (!own(value, key)) throw new TypeError(`${path}.${key} is required`);
  const result = {
    provider: text(value.provider, `${path}.provider`, 200, true),
    model: text(value.model, `${path}.model`, 300, true),
  };
  if (result.provider.trim() !== result.provider || result.model.trim() !== result.model) throw new TypeError(`${path}: selectors must not have surrounding whitespace`);
  if (result.provider.includes('*') && result.provider !== '*') throw new TypeError(`${path}.provider must be exact or *`);
  if (typeof value.currency !== 'string' || !/^[A-Z]{3}$/.test(value.currency)) throw new TypeError(`${path}.currency must be a three-letter uppercase currency code`);
  result.currency = value.currency;
  for (const key of ['input', 'output', 'cacheRead', 'cacheWrite', 'cacheWrite12h']) if (own(value, key)) result[key] = number(value[key], `${path}.${key}`, 0, 1_000_000);
  if(own(value,'requireCacheRates')){if(typeof value.requireCacheRates!=='boolean')throw new TypeError(`${path}.requireCacheRates must be boolean`);result.requireCacheRates=value.requireCacheRates;}
  if (own(value,'longContext')) {
    keys(value.longContext,new Set(['threshold','input','output','cacheRead','cacheWrite','cacheWrite12h']),`${path}.longContext`);
    if(![100000,LONG_CONTEXT_THRESHOLD].includes(value.longContext.threshold))throw new TypeError(`${path}.longContext.threshold must be 100000 or ${LONG_CONTEXT_THRESHOLD}`);
    result.longContext={threshold:value.longContext.threshold};
    for(const key of ['input','output'])if(!own(value.longContext,key))throw new TypeError(`${path}.longContext.${key} required`);
    for(const key of ['input','output','cacheRead','cacheWrite','cacheWrite12h'])if(own(value.longContext,key))result.longContext[key]=number(value.longContext[key],`${path}.longContext.${key}`,0,1000000);
  }
  for(const key of ['source','checkedAt','label'])if(own(value,key))result[key]=text(value[key],`${path}.${key}`,key==='source'?2048:300);
  return result;
}
/** Validate partial settings, rejecting unknown fields and returning a complete detached value. */
export function validateSettings(input = {}) {
  keys(input, new Set(Object.keys(DEFAULT_SETTINGS)), 'settings');
  const result = { ...DEFAULT_SETTINGS, ...input };
  for (const key of ['identityEnabled', 'captureEnabled', 'hideClientIdentity', 'chatDynamicLabels','onboardingCompleted','sidebarRecentMarks','sidebarRecentSnap']) if (typeof result[key] !== 'boolean') throw new TypeError(`${key} must be boolean`);
  if(!['USD','CNY'].includes(result.priceCurrency))throw new TypeError('priceCurrency must be USD or CNY');
  if(!['peak','offpeak'].includes(result.pricePeriod))throw new TypeError('pricePeriod must be peak or offpeak');
  result.identityText = text(result.identityText, 'identityText', 50_000);
  result.extraPrompt = text(result.extraPrompt, 'extraPrompt', 200_000);
  result.retentionDays = number(result.retentionDays, 'retentionDays', 1, 365, true);
  result.maxLogMB = number(result.maxLogMB, 'maxLogMB', 1, 4096, true);
  result.rotationSeconds = number(result.rotationSeconds, 'rotationSeconds', 1, 60);
  if (!Array.isArray(result.phrases) || result.phrases.length < 1 || result.phrases.length > 100) throw new TypeError('phrases must contain between 1 and 100 strings');
  result.phrases = Array.from(result.phrases, (value, index) => text(value, `phrases[${index}]`, 200, true));
  if (!Array.isArray(result.prices) || result.prices.length > 100) throw new TypeError('prices must contain at most 100 rules');
  result.prices = Array.from(result.prices, validatePrice);
  if (!Array.isArray(result.promptLibrary) || result.promptLibrary.length > 50) throw new TypeError('promptLibrary must contain at most 50 entries');
  const ids = new Set(BUILTIN_PROMPTS.map(row=>row.id));
  result.promptLibrary = result.promptLibrary.map((row,index)=>{
    const path=`promptLibrary[${index}]`;
    keys(row,new Set(['id','name','description','identityEnabled','identityText','extraPrompt','hideClientIdentity']),path);
    const id=text(row.id,`${path}.id`,100,true);
    if(!/^[a-zA-Z0-9_-]+$/.test(id)||ids.has(id))throw new TypeError(`${path}.id must be unique and cannot replace a builtin`);
    ids.add(id);
    for(const key of ['identityEnabled','hideClientIdentity'])if(typeof row[key]!=='boolean')throw new TypeError(`${path}.${key} must be boolean`);
    return {id,name:text(row.name,`${path}.name`,100,true),description:text(row.description??'',`${path}.description`,500),identityEnabled:row.identityEnabled,identityText:text(row.identityText,`${path}.identityText`,50000),extraPrompt:text(row.extraPrompt,`${path}.extraPrompt`,200000),hideClientIdentity:row.hideClientIdentity};
  });
  return result;
}
export const PROMPT_FIELDS = Object.freeze(['identityEnabled','identityText','extraPrompt','hideClientIdentity']);
export function promptLibrary(settings){return [...BUILTIN_PROMPTS.map(row=>({...row,builtin:true})),...settings.promptLibrary.map(row=>({...row,builtin:false}))];}
export function selectedPrompt(settings){
  return promptLibrary(settings).find(row=>PROMPT_FIELDS.every(key=>key==='identityText'&&!row.identityEnabled&&!settings.identityEnabled||row[key]===settings[key]))?.id??'custom';
}
export function selectPrompt(settings,id){
  const row=promptLibrary(settings).find(item=>item.id===id);
  if(!row)throw new Error('Prompt preset not found');
  return validateSettings({...settings,...Object.fromEntries(PROMPT_FIELDS.map(key=>[key,row[key]]))});
}
const MASK = '[REDACTED]';
function secretKey(key) {
  const name = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (['authorization', 'proxyauthorization', 'cookie', 'setcookie', 'token', 'secret', 'credentials', 'credential', 'privatekey'].includes(name)) return true;
  return /(?:apikey|password|passwd|passphrase|secretkey|secret|token|cookie|privatekey|authorization)$/.test(name);
}
function redactText(value) {
  return value
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '$1 [REDACTED]')
    .replace(/\bsk-[A-Za-z0-9_-]{6,}/g, MASK)
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16})\b/g, MASK)
    .replace(/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, MASK)
    .replace(/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z ]+ )?PRIVATE KEY-----/g, MASK)
    .replace(/(\b(?:api[_-]?key|password|passwd|secret|client[_-]?secret|token|access[_-]?token|refresh[_-]?token)\b["']?\s*[:=]\s*)(["'])([^"'\r\n]*)\2/gi, '$1$2[REDACTED]$2')
    .replace(/(\b(?:api[_-]?key|password|passwd|secret|client[_-]?secret|token|access[_-]?token|refresh[_-]?token)\b["']?\s*[:=]\s*)([^\s"'&,;<>]+)/gi, '$1[REDACTED]')
    .replace(/(\b(?:Authorization|Proxy-Authorization)\s*:\s*)(?:Bearer\s+|Basic\s+)?[^\r\n,;]+/gi, '$1[REDACTED]')
    .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi, '$1[REDACTED]@')
    .replace(/(\b(?:Cookie|Set-Cookie)\s*:\s*)[^\r\n]+/gi, '$1[REDACTED]');
}
/** Produce a detached JSON-safe copy; token counters are not credential keys. */
export function redact(value) {
  const ancestors = new WeakSet();
  function visit(current) {
    if (typeof current === 'string') return redactText(current);
    if (current === null || typeof current === 'boolean') return current;
    if (typeof current === 'number') return Number.isFinite(current) ? current : null;
    if (typeof current === 'bigint') return String(current);
    if (typeof current !== 'object') return null;
    if (ancestors.has(current)) return '[Circular]';
    ancestors.add(current);
    try {
      if (current instanceof Date) return Number.isFinite(current.getTime()) ? current.toISOString() : null;
      if (Array.isArray(current)) return Array.from(current, visit);
      const result = {};
      if (current instanceof Error) {
        result.name = redactText(current.name);
        result.message = redactText(current.message);
        if (own(current, 'cause')) result.cause = visit(current.cause);
      }
      for (const key of Object.keys(current)) {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        const item = !descriptor || !('value' in descriptor) ? '[Accessor]' : secretKey(key) ? MASK : visit(descriptor.value);
        Object.defineProperty(result, key, { value: item, enumerable: true, configurable: true, writable: true });
      }
      return result;
    } finally { ancestors.delete(current); }
  }
  return visit(value);
}
/**
 * Sanitize one completed attempt's chunk array before any Client publication or persistence.
 * Accept direct StreamChunks or timed {time, chunk} frames. Each index/type delta run is
 * reconstructed from ORIGINAL strings before redaction, then placed in its first frame;
 * later deltas become empty. Timing/order/types remain, but token boundaries no longer do.
 * rebuiltForRedaction marks every rebuilt frame (and its nested chunk, when wrapped).
 * Other fields, block-end blocks, and unknown frames are recursively redacted as well.
 * This is not an online sanitizer: do not expose the original buffered frames beforehand.
 */
export function sanitizeStream(frames) {
  if (!Array.isArray(frames)) throw new TypeError('frames must be an array');
  const sanitized = redact(frames);
  const groups = new Map();
  const deltaFields = new Map([
    ['text-delta', 'text'], ['reasoning-delta', 'text'], ['tool-call-delta', 'argumentsDelta'],
  ]);
  for (let position = 0; position < frames.length; position += 1) {
    const frame = frames[position];
    if (!frame || typeof frame !== 'object') continue;
    const wrapped = frame.chunk !== null && typeof frame.chunk === 'object';
    const chunk = wrapped ? frame.chunk : frame;
    const field = deltaFields.get(chunk.type);
    if (!field || typeof chunk[field] !== 'string') continue;
    // A caller supplies one completed attempt. index separates concurrently interleaved blocks;
    // type separates text from reasoning even for malformed/reused native block indices.
    const key = JSON.stringify([chunk.index ?? null, chunk.type]);
    let group = groups.get(key);
    if (!group) {
      group = { parts: [], members: [] };
      groups.set(key, group);
    }
    group.parts.push(chunk[field]);
    group.members.push({ position, wrapped, field });
  }
  for (const group of groups.values()) {
    const complete = redact(group.parts.join(''));
    for (let index = 0; index < group.members.length; index += 1) {
      const { position, wrapped, field } = group.members[index];
      const frame = sanitized[position];
      const chunk = wrapped ? frame.chunk : frame;
      chunk[field] = index === 0 ? complete : '';
      chunk.rebuiltForRedaction = true;
      if (wrapped) frame.rebuiltForRedaction = true;
    }
  }
  return sanitized;
}
/** Character-based approximation, not a provider tokenizer or authoritative usage. */
export function estimateTokens(value) {
  let ascii = 0;
  let other = 0;
  for (const char of String(value ?? '')) if (char.codePointAt(0) <= 0x7f) ascii += 1; else other += 1;
  return Math.ceil(ascii / 4 + other / 1.5);
}
const COUNTS = ['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'reasoningTokens'];
const validCount = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const validUsage=value=>plain(value)&&!COUNTS.some(key=>own(value,key)&&!validCount(value[key]))&&(value.inputIncludesCache!==true||validCount(value.inputTokens)&&(value.cacheReadTokens??0)+(value.cacheWriteTokens??0)<=value.inputTokens);
function emptyUsage() {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, totalTokens: 0, inputIncludesCache: false };
}
function normalizeUsage(usage) {
  const result = emptyUsage();
  for (const key of COUNTS) result[key] = validCount(usage?.[key]) ? usage[key] : 0;
  if (usage?.inputIncludesCache === true) result.inputTokens = Math.max(0, result.inputTokens - result.cacheReadTokens - result.cacheWriteTokens);
  result.totalTokens = validCount(usage?.totalTokens) ? usage.totalTokens : result.inputTokens + result.outputTokens + result.cacheReadTokens + result.cacheWriteTokens;
  if(validCount(usage?.cacheWrite12hTokens)&&usage.cacheWrite12hTokens>0)result.cacheWrite12hTokens=Math.min(result.cacheWriteTokens,usage.cacheWrite12hTokens);
  return result;
}
function addUsage(left, right) {
  const result = emptyUsage();
  for (const key of [...COUNTS, 'totalTokens']) result[key] = left[key] + right[key];
  if(left.cacheWrite12hTokens||right.cacheWrite12hTokens)result.cacheWrite12hTokens=(left.cacheWrite12hTokens??0)+(right.cacheWrite12hTokens??0);
  return result;
}
function matches(pattern, value) {
  const expression = pattern.split('*').map(piece => piece.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp(`^${expression}$`).test(value);
}
const unknownPrice = source => ({ amount: null, currency: null, known: false, source });
/**
 * Price rules: {provider,model,currency,input,output,cacheRead?,cacheWrite?}, per million tokens.
 * Exact provider takes precedence before exact model. Model * is a glob; provider * is fallback.
 * DSH buckets are disjoint by default. Explicit inputIncludesCache:true opts into inclusive input.
 * Cache read/write replace normal input charges, missing cache rates fall back to input rate.
 * reasoningTokens is already included in outputTokens and never charged a second time.
 */
export function priceUsage(usage, provider, model, prices = []) {
  if (!plain(usage) || !COUNTS.some(key => own(usage, key))) return unknownPrice('missing-usage');
  if (!validUsage(usage)) return unknownPrice('invalid-usage');
  if (typeof provider !== 'string' || typeof model !== 'string' || !Array.isArray(prices)) return unknownPrice('unknown');
  const candidates = [];
  for (let index = 0; index < prices.length; index += 1) {
    let rule;
    try { rule = validatePrice(prices[index], index); } catch { continue; }
    if (rule.provider !== '*' && rule.provider !== provider) continue;
    if (!matches(rule.model, model)) continue;
    candidates.push({ rule, index, providerRank: rule.provider === provider ? 1 : 0,
      modelRank: rule.model === model ? 2 : rule.model === '*' ? 0 : 1,
      specificity: rule.model.replace(/\*/g, '').length });
  }
  candidates.sort((a, b) => b.providerRank - a.providerRank || b.modelRank - a.modelRank || b.specificity - a.specificity || a.index - b.index);
  if (!candidates.length) return unknownPrice('unknown');
  const { rule } = candidates[0];
  const counts = normalizeUsage(usage);
  const contextTokens=validCount(usage.pricingContextTokens)?usage.pricingContextTokens:counts.inputTokens+counts.cacheReadTokens+counts.cacheWriteTokens;
  const rates=rule.longContext&&contextTokens>rule.longContext.threshold?rule.longContext:rule;
  if(rule.requireCacheRates&&((counts.cacheReadTokens>0&&rates.cacheRead===undefined)||(counts.cacheWriteTokens>0&&rates.cacheWrite===undefined)))return unknownPrice('missing-cache-rate');
  const write12h=Math.min(counts.cacheWriteTokens,validCount(usage.cacheWrite12hTokens)?usage.cacheWrite12hTokens:0);
  const components={
    input:counts.inputTokens*rates.input/1_000_000,
    output:counts.outputTokens*rates.output/1_000_000,
    cacheRead:counts.cacheReadTokens*(rates.cacheRead??rates.input)/1_000_000,
    cacheWrite:((counts.cacheWriteTokens-write12h)*(rates.cacheWrite??rates.input)+write12h*(rates.cacheWrite12h??rates.cacheWrite??rates.input))/1_000_000,
  };
  const amount=Object.values(components).reduce((sum,value)=>sum+value,0);
  if (!Number.isFinite(amount)) return unknownPrice('invalid-usage');
  return { components:Object.fromEntries(Object.entries(components).map(([key,value])=>[key,Number(value.toFixed(12))])), amount: Number(amount.toFixed(12)), currency: rule.currency, known: true, source: rule.source?`${rule.source} (${rule.checkedAt??'date unspecified'}; ${rates===rule?'standard-short':'standard-long'}; API equivalent)`:`configured:${rule.provider}/${rule.model}` };
}
function printable(value) {
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2) ?? ''; } catch { return '[Unserializable value]'; }
}
function readableBlock(block) {
  if (typeof block === 'string') return block;
  if (!block || typeof block !== 'object') return printable(block);
  switch (block.type) {
    case 'text': return String(block.text ?? '');
    case 'reasoning': return `[reasoning]\n${String(block.text ?? '')}`;
    case 'tool-call': return `[tool-call ${block.name ?? ''}${block.id ? ` id=${block.id}` : ''}]\n${printable(block.arguments ?? '')}`;
    case 'tool-addition': return `[tool-addition ${block.toolName ?? ''}]`;
    case 'tool-removal': return `[tool-removal ${block.toolName ?? ''}]`;
    case 'image': return `[image${block.offloaded ? ' offloaded' : ''}]\n${printable(block.attachment ?? block)}`;
    case 'file': return `[file]\n${printable(block.attachment ?? block)}`;
    default: return printable(block);
  }
}
/** Render all request roles, blocks, raw argument strings, and tool schemas without summarizing. */
export function readableRequest(request) {
  if (typeof request === 'string') return request;
  if (!request || typeof request !== 'object') return printable(request);
  const sections = [];
  if (typeof request.system === 'string' && request.system.length) sections.push(`[system]\n${request.system}`);
  for (const message of Array.isArray(request.messages) ? request.messages : []) {
    const role = message?.role ?? 'unknown';
    const call = message?.toolCallId ?? (role === 'tool' ? message?.source?.callId : undefined);
    const suffix = `${call ? ` call=${call}` : ''}${message?.isError ? ' error' : ''}`;
    const content = Array.isArray(message?.content) ? message.content.map(readableBlock).join('\n') : printable(message?.content);
    sections.push(`[${role}${suffix}]\n${content}`);
  }
  if (Array.isArray(request.tools) && request.tools.length) sections.push(`[tools]\n${printable(request.tools)}`);
  return sections.join('\n\n');
}
/** JSON-only projection. Prices are evaluated later so settings changes do not require replay. */
export function initStats() {
  return {
    provider: '', model: '', contextWindow: null, phase: 'idle', tool: null, pendingTools: [],
    turn: 0, step: 0, turnStartedAt: null, turnElapsedMs: 0, totalTurnElapsedMs: 0,
    turns: 0, endedTurns: 0, completedTurns: 0, requests: 0, attempts: 0, responses: 0, failedAttempts: 0,
    headers: 0, usage: emptyUsage(), cacheAccounting:{reported:0,missing:0,input:0,read:0}, lastUsage: null, byModel: [], unknownUsageResponses: 0,
    lastSeq: -1, lastTime: null, lastTurnReason: null,
  };
}
const STATS_EVENTS = new Set(['request/context', 'request/header', 'turn/start', 'turn/end',
  'step/start', 'assistant/message', 'assistant/attempt', 'tool/call', 'tool/result']);
/** Pure fold: unrelated or already-folded sequenced events retain state identity. */
export function foldStats(state, event) {
  const current = state ?? initStats();
  if (!event || !STATS_EVENTS.has(event.type)) return current;
  const seq = Number.isSafeInteger(event.seq) && event.seq >= 0 ? event.seq : null;
  if (seq !== null && seq <= current.lastSeq) return current;
  const time = typeof event.time === 'number' && Number.isFinite(event.time) ? event.time : current.lastTime;
  const data = event.data && typeof event.data === 'object' ? event.data : {};
  const result = { ...current, lastSeq: seq ?? current.lastSeq, lastTime: time };
  if (current.turnStartedAt !== null && time !== null) result.turnElapsedMs = Math.max(0, time - current.turnStartedAt);
  switch (event.type) {
    case 'request/context':
      if (typeof data.provider === 'string') result.provider = data.provider;
      if (typeof data.model === 'string') result.model = data.model;
      result.contextWindow = validCount(data.contextWindow) ? data.contextWindow : null;
      break;
    case 'request/header': {
      const config = data.header?.config ?? data.config ?? {};
      if (typeof config.provider === 'string') result.provider = config.provider;
      if (typeof config.model === 'string') result.model = config.model;
      result.headers += 1;
      result.phase = 'requesting';
      break;
    }
    case 'turn/start':
      result.turn = Number.isSafeInteger(data.turn) ? data.turn : current.turn + 1;
      result.step = 0;
      result.turns += 1;
      result.turnStartedAt = time;
      result.turnElapsedMs = 0;
      result.phase = 'thinking';
      result.tool = null;
      result.pendingTools = [];
      result.lastTurnReason = null;
      break;
    case 'turn/end':
      result.endedTurns += 1;
      result.lastTurnReason = typeof data.reason === 'string' ? data.reason : data.reason?.kind ?? 'unknown';
      if (result.lastTurnReason === 'completed') result.completedTurns += 1;
      result.totalTurnElapsedMs += result.turnElapsedMs;
      result.turnStartedAt = null;
      result.phase = result.lastTurnReason === 'error' ? 'error' : 'idle';
      result.tool = null;
      result.pendingTools = [];
      break;
    case 'step/start':
      if (Number.isSafeInteger(data.turn)) result.turn = data.turn;
      if (Number.isSafeInteger(data.step)) result.step = data.step;
      result.phase = 'thinking';
      break;
    case 'assistant/message': {
      result.requests += 1;
      result.attempts += 1;
      result.responses += 1;
      const message = data.message ?? {};
      const provider = typeof message.source?.provider === 'string' ? message.source.provider : current.provider;
      const model = typeof message.source?.model === 'string' ? message.source.model : current.model;
      result.phase = Array.isArray(message.content) && message.content.some(block => block?.type === 'tool-call') ? 'tool' : 'responding';
      if (validUsage(data.usage) && validCount(data.usage.inputTokens) && validCount(data.usage.outputTokens)) {
        const usage = normalizeUsage(data.usage);
        const cache={...(current.cacheAccounting??{reported:0,missing:0,input:0,read:0})};if(own(data.usage,'cacheReadTokens')){cache.reported++;cache.input+=usage.inputTokens+usage.cacheReadTokens+usage.cacheWriteTokens;cache.read+=usage.cacheReadTokens;}else cache.missing++;result.cacheAccounting=cache;
        result.lastUsage = { provider, model, ...usage };
        result.usage = addUsage(current.usage, usage);
        const index = current.byModel.findIndex(row => row.provider === provider && row.model === model);
        result.byModel = [...current.byModel];
        const previous=index<0?null:current.byModel[index];
        const contextTokens=usage.inputTokens+usage.cacheReadTokens+usage.cacheWriteTokens;
        const bandIndex=contextTokens<=100000?0:contextTokens<=LONG_CONTEXT_THRESHOLD?1:2;
        const bands=previous?.priceBands??[
          {pricingContextTokens:0,responses:0,usage:emptyUsage()},
          {pricingContextTokens:100001,responses:0,usage:emptyUsage()},
          {pricingContextTokens:LONG_CONTEXT_THRESHOLD+1,responses:0,usage:emptyUsage()},
        ];
        const cacheKind=`${usage.cacheReadTokens>0?'r':''}${usage.cacheWriteTokens>0?'w':''}${(usage.cacheWrite12hTokens??0)>0?'l':''}`||'none';
        const priceBands=bands.map((band,position)=>{if(position!==bandIndex)return band;const groups=[...(band.cacheGroups??[])];const groupIndex=groups.findIndex(group=>group.kind===cacheKind);const old=groups[groupIndex];const group={kind:cacheKind,responses:(old?.responses??0)+1,usage:addUsage(old?.usage??emptyUsage(),usage)};if(groupIndex<0)groups.push(group);else groups[groupIndex]=group;return {...band,responses:band.responses+1,usage:addUsage(band.usage,usage),cacheGroups:groups};});
        const row=previous?{...previous,responses:previous.responses+1,usage:addUsage(previous.usage,usage),priceBands}:{provider,model,responses:1,usage,priceBands};
        if(index<0)result.byModel.push(row);else result.byModel[index]=row;
      } else {result.unknownUsageResponses=(current.unknownUsageResponses??0)+1;result.cacheAccounting={...(current.cacheAccounting??{reported:0,missing:0,input:0,read:0}),missing:(current.cacheAccounting?.missing??0)+1};}
      break;
    }
    case 'assistant/attempt':
      result.requests += 1;
      result.attempts += 1;
      result.failedAttempts += 1;
      // Attempt stream usage is diagnostic; do not charge it again as a retained response.
      result.phase = 'thinking';
      break;
    case 'tool/call': {
      const tool = { name: String(data.name ?? ''), callId: String(data.callId ?? '') };
      result.pendingTools = [...current.pendingTools.filter(item => !tool.callId || item.callId !== tool.callId), tool];
      result.tool = tool;
      result.phase = 'tool';
      break;
    }
    case 'tool/result': {
      const callId = data.message?.toolCallId ?? data.message?.source?.callId ?? data.callId;
      result.pendingTools = current.pendingTools.filter(item => item.callId !== callId);
      result.tool = result.pendingTools.at(-1) ?? null;
      result.phase = result.pendingTools.length ? 'tool' : 'thinking';
      break;
    }
  }
  return result;
}
