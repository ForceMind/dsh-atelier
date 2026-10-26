import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILTIN_PROMPTS, promptLibrary, selectedPrompt, selectPrompt, DEFAULT_SETTINGS, validateSettings, redact, sanitizeStream, estimateTokens, priceUsage, readableRequest, initStats, foldStats } from './core.mjs';

const rule = (patch = {}) => ({ provider: 'deepseek', model: 'model', currency: 'USD', input: 2, output: 8, cacheRead: 0.2, cacheWrite: 3, ...patch });
const event = (type, data = {}, seq = 0, time = 1000) => ({ type, data, seq, time });
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

test('defaults and partial settings are complete, detached and configurable', () => {
  const settings = validateSettings();
  assert.deepEqual(settings, DEFAULT_SETTINGS);
  assert.notEqual(settings.phrases, DEFAULT_SETTINGS.phrases);
  assert.equal(settings.phrases.length, 20);
  assert.equal(new Set(settings.phrases).size, 20);
  const input = { identityText: '{{literal}}', phrases: ['一步一步'], prices: [rule()] };
  const output = validateSettings(input);
  assert.equal(output.identityText, '{{literal}}');
  assert.equal(output.captureEnabled, false);
  output.prices[0].input = 1;
  assert.equal(input.prices[0].input, 2);
  assert.equal(validateSettings({ rotationSeconds: 1.5 }).rotationSeconds, 1.5);
});

test('prompt library keeps original and generic presets and validates custom entries',()=>{
  const initial=validateSettings();
  assert.deepEqual(BUILTIN_PROMPTS.map(row=>row.id),['dsh-original','coding-assistant']);
  assert.equal(selectedPrompt(initial),'dsh-original');
  const original=selectPrompt(initial,'dsh-original');
  assert.equal(original.identityEnabled,false);assert.equal(original.hideClientIdentity,false);assert.equal(original.extraPrompt,'');
  assert.equal(selectedPrompt(original),'dsh-original');
  const generic=selectPrompt(original,'coding-assistant');assert.equal(generic.identityText,'You are a helpful AI coding assistant.');
  const entry={id:'user-example',name:'自定义',description:'测试',identityEnabled:true,identityText:'Custom assistant',extraPrompt:'{{literal}}',hideClientIdentity:true};
  const settings=validateSettings({...initial,promptLibrary:[entry]});
  assert.equal(promptLibrary(settings).length,3);assert.equal(promptLibrary(settings)[0].builtin,true);
  const custom=selectPrompt(settings,entry.id);assert.equal(custom.extraPrompt,'{{literal}}');assert.equal(selectedPrompt(custom),entry.id);
  for(const bad of [null,[{...entry,id:'dsh-original'}],[entry,entry],[{...entry,identityEnabled:'yes'}],[{...entry,unknown:true}]])assert.throws(()=>validateSettings({...initial,promptLibrary:bad}));
  assert.throws(()=>selectPrompt(initial,'missing'));assert.equal(validateSettings().chatDynamicLabels,false);
});

test('settings strictly reject unknown keys, accessors and invalid types/ranges', () => {
  for (const input of [null, [], 'x', { unknown: true }, { identityEnabled: 'true' }, { captureEnabled: 1 },
    { identityText: 1 }, { extraPrompt: null }, { retentionDays: 0 }, { retentionDays: 1.5 },
    { retentionDays: 366 }, { maxLogMB: Infinity }, { maxLogMB: 4097 }, { rotationSeconds: 0 },
    { rotationSeconds: 61 }, { phrases: [] }, { phrases: [''] }, { phrases: [4] },
    { phrases: Array(2) }, { prices: null }, { prices: [{ ...rule(), topP: 1 }] },
    { prices: [rule({ input: -1 })] }, { prices: [rule({ provider: 'deep*' })] },
    { prices: [rule({ currency: 'usd' })] }, { prices: [{ provider: 'a' }] },
    JSON.parse('{"__proto__":{"polluted":true}}')]) assert.throws(() => validateSettings(input), TypeError);
  let called = false;
  const accessor = Object.defineProperty({}, 'extraPrompt', { enumerable: true, get() { called = true; return ''; } });
  assert.throws(() => validateSettings(accessor), /data property/);
  assert.equal(called, false);
});

test('redaction masks nested credential keys, leaves token counters and text alone', () => {
  const input = freeze({ headers: { Authorization: 'Bearer abc123', 'x-api-key': 'sensitive', Cookie: 'session=abc', 'set-cookie': ['s=x'] },
    nested: [{ password: 'p', clientSecret: 's', refresh_token: 'r', 'secret-key': 'sk-value', token: 'opaque' }],
    inputTokens: 123, maxTokens: 20, output_tokens: 5, reasoningTokens: 2, tokenBudget: 18,
    message: '这是正常正文。Do not discard the actual response.' });
  const output = redact(input);
  assert.equal(output.headers.Authorization, '[REDACTED]');
  assert.equal(output.headers['x-api-key'], '[REDACTED]');
  assert.equal(output.headers.Cookie, '[REDACTED]');
  assert.equal(output.headers['set-cookie'], '[REDACTED]');
  for (const value of Object.values(output.nested[0])) assert.equal(value, '[REDACTED]');
  assert.equal(output.inputTokens, 123);
  assert.equal(output.maxTokens, 20);
  assert.equal(output.output_tokens, 5);
  assert.equal(output.reasoningTokens, 2);
  assert.equal(output.tokenBudget, 18);
  assert.equal(output.message, input.message);
  assert.equal(input.headers.Authorization, 'Bearer abc123');
});

test('redaction masks credential patterns in strings without deleting surrounding prose', () => {
  const input = 'before Bearer abc.def.123 after sk-proj-123456abcdef end; api_key="sample-secret"; password=hello&x=1\nCookie: session=abc\n正文';
  const output = redact(input);
  assert.match(output, /^before Bearer \[REDACTED\] after \[REDACTED\] end/);
  assert.match(output, /api_key="\[REDACTED\]"/);
  assert.match(output, /password=\[REDACTED\]&x=1/);
  assert.match(output, /Cookie: \[REDACTED\]\n正文$/);
  assert.equal(redact('https://user:password@example.com/path'), 'https://[REDACTED]@example.com/path');
  assert.equal(redact('token count: 123, maxTokens: 4096'), 'token count: 123, maxTokens: 4096');
  assert.equal(redact('password="two word secret" rest'), 'password="[REDACTED]" rest');
  assert.equal(redact('Authorization: custom-secret\n正文'), 'Authorization: [REDACTED]\n正文');
  assert.equal(redact('token=opaque-value; secret=private'), 'token=[REDACTED]; secret=[REDACTED]');
  assert.deepEqual(redact({ sessionToken: 'opaque', signingSecret: 'private', tokenCount: 4, inputTokens: 9 }),
    { sessionToken: '[REDACTED]', signingSecret: '[REDACTED]', tokenCount: 4, inputTokens: 9 });
});

test('redaction is safe for cycles, errors, exotic scalar values and accessors', () => {
  const input = { ok: 'hello', nan: NaN, big: 12n, error: new Error('Bearer private') };
  input.self = input;
  Object.defineProperty(input, 'getter', { enumerable: true, get() { throw new Error('must not run'); } });
  const output = redact(input);
  assert.equal(output.self, '[Circular]');
  assert.equal(output.nan, null);
  assert.equal(output.big, '12');
  assert.equal(output.getter, '[Accessor]');
  assert.equal(output.error.message, 'Bearer [REDACTED]');
  assert.doesNotThrow(() => JSON.stringify(output));
  const repeated = { text: 'x' };
  assert.deepEqual(redact([repeated, repeated]), [{ text: 'x' }, { text: 'x' }]);
});

test('sanitizeStream rebuilds direct deltas before redacting split Bearer and sk credentials', () => {
  const frames = freeze([
    { type: 'block-start', index: 0, blockType: 'text', time: 10 },
    { type: 'text-delta', index: 0, text: '正文 Bear', time: 11 },
    { type: 'text-delta', index: 0, text: 'er split-', time: 12 },
    { type: 'text-delta', index: 0, text: 'credential 保留 sk-', time: 13 },
    { type: 'text-delta', index: 0, text: 'proj-private123456 完毕', time: 14 },
    { type: 'block-end', index: 0, block: { type: 'text', text: '正文 Bearer split-credential 保留 sk-proj-private123456 完毕' }, time: 15 },
    { type: 'usage', usage: { inputTokens: 3, outputTokens: 10 }, time: 16 },
    { type: 'finish', reason: { kind: 'stop' }, time: 17 },
  ]);
  const output = sanitizeStream(frames);
  assert.equal(output.length, frames.length);
  assert.deepEqual(output.map(frame => [frame.type, frame.time]), frames.map(frame => [frame.type, frame.time]));
  assert.equal(output[1].text, '正文 Bearer [REDACTED] 保留 [REDACTED] 完毕');
  for (const index of [2, 3, 4]) assert.equal(output[index].text, '');
  for (const index of [1, 2, 3, 4]) assert.equal(output[index].rebuiltForRedaction, true);
  assert.equal(output[5].block.text, output[1].text);
  assert.equal(output[6].usage.outputTokens, 10);
  const serialized = JSON.stringify(output);
  assert.ok(!serialized.includes('split-credential'));
  assert.ok(!serialized.includes('proj-private123456'));
  assert.equal(frames[1].text, '正文 Bear');
  assert.deepEqual(sanitizeStream(output), output);
});

test('sanitizeStream groups interleaved wrapped frames by block index and delta type', () => {
  const frames = freeze([
    { type: 'chunk', time: 1, attemptId: 'attempt', index: 10, chunk: { type: 'text-delta', index: 0, text: '第一块 sk-' } },
    { type: 'chunk', time: 2, attemptId: 'attempt', index: 11, chunk: { type: 'text-delta', index: 1, text: '另一个块 ' } },
    { type: 'chunk', time: 3, attemptId: 'attempt', index: 12, chunk: { type: 'reasoning-delta', index: 0, text: 'password="two ' } },
    { type: 'chunk', time: 4, attemptId: 'attempt', index: 13, chunk: { type: 'text-delta', index: 0, text: 'proj-abcdef123456 保留' } },
    { type: 'chunk', time: 5, attemptId: 'attempt', index: 14, chunk: { type: 'reasoning-delta', index: 0, text: 'word secret" 理由' } },
    { type: 'chunk', time: 6, attemptId: 'attempt', index: 15, chunk: { type: 'text-delta', index: 1, text: '安全文本' } },
  ]);
  const output = sanitizeStream(frames);
  assert.equal(output[0].chunk.text, '第一块 [REDACTED] 保留');
  assert.equal(output[1].chunk.text, '另一个块 安全文本');
  assert.equal(output[2].chunk.text, 'password="[REDACTED]" 理由');
  for (const index of [3, 4, 5]) assert.equal(output[index].chunk.text, '');
  for (let index = 0; index < output.length; index += 1) {
    assert.equal(output[index].time, frames[index].time);
    assert.equal(output[index].index, frames[index].index);
    assert.equal(output[index].chunk.index, frames[index].chunk.index);
    assert.equal(output[index].type, 'chunk');
    assert.equal(output[index].rebuiltForRedaction, true);
    assert.equal(output[index].chunk.rebuiltForRedaction, true);
  }
  assert.ok(!JSON.stringify(output).includes('word secret'));
});

test('sanitizeStream reconstructs raw arguments including a secret field name split across chunks', () => {
  const frames = freeze([
    { time: 10, chunk: { type: 'tool-call-delta', index: 2, id: 'call', argumentsDelta: '{"pa' } },
    { time: 11, chunk: { type: 'tool-call-delta', index: 2, id: 'call', argumentsDelta: 'ssword":"opa' } },
    { time: 12, chunk: { type: 'tool-call-delta', index: 2, id: 'call', argumentsDelta: 'que-value", "inputTokens":25}' } },
    { time: 13, chunk: { type: 'block-end', index: 2, block: { type: 'tool-call', name: 'example', id: 'call', arguments: '{"password":"opaque-value", "inputTokens":25}' } } },
    { time: 14, chunk: { type: 'finish', reason: { kind: 'error', failure: { message: 'Bearer final-secret', code: 'ERROR' } }, replayState: { response: { token: 'native-secret' } } } },
  ]);
  const output = sanitizeStream(frames);
  assert.equal(output[0].chunk.argumentsDelta, '{"password":"[REDACTED]", "inputTokens":25}');
  assert.equal(output[1].chunk.argumentsDelta, '');
  assert.equal(output[2].chunk.argumentsDelta, '');
  assert.equal(output[3].chunk.block.arguments, output[0].chunk.argumentsDelta);
  assert.equal(output[4].chunk.reason.failure.message, 'Bearer [REDACTED]');
  assert.equal(output[4].chunk.replayState.response.token, '[REDACTED]');
  assert.ok(!JSON.stringify(output).includes('opaque-value'));
  assert.ok(!JSON.stringify(output).includes('final-secret'));
});

test('sanitizeStream keeps unknown frames only as recursively redacted detached data', () => {
  const frames = freeze([
    { time: 1, type: 'unknown', payload: { apiKey: 'value', text: 'Bearer unknown-secret' } },
    { time: 2, chunk: { type: 'future-frame', nested: [{ password: 'value' }], text: 'ordinary body' } },
    { type: 'text-delta', index: 7, text: 12 },
    { type: 'text-delta', index: 8, text: '' },
    null,
  ]);
  const output = sanitizeStream(frames);
  assert.deepEqual(output[0], { time: 1, type: 'unknown', payload: { apiKey: '[REDACTED]', text: 'Bearer [REDACTED]' } });
  assert.equal(output[1].chunk.nested[0].password, '[REDACTED]');
  assert.equal(output[1].chunk.text, 'ordinary body');
  assert.deepEqual(output[2], frames[2]);
  assert.equal(output[3].text, '');
  assert.equal(output[3].rebuiltForRedaction, true);
  assert.equal(output[4], null);
  assert.notEqual(output[0].payload, frames[0].payload);
  assert.deepEqual(sanitizeStream([]), []);
  for (const invalid of [undefined, null, {}, 'frames']) assert.throws(() => sanitizeStream(invalid), /array/);
});

test('token estimate is approximate, deterministic and Unicode-safe', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens(null), 0);
  assert.equal(estimateTokens('abcdefgh'), 2);
  assert.equal(estimateTokens('你好世界'), 3);
  assert.equal(estimateTokens('😀'), 1);
  assert.ok(estimateTokens('hello 世界') > 0);
});

test('pricing charges DSH disjoint buckets once and reasoning is part of output', () => {
  const usage = { inputTokens: 1_000_000, outputTokens: 500_000, cacheReadTokens: 250_000, cacheWriteTokens: 100_000, reasoningTokens: 300_000 };
  const result = priceUsage(usage, 'deepseek', 'model', [rule()]);
  assert.deepEqual(result, { amount: 6.35, currency: 'USD', known: true, source: 'configured:deepseek/model' });
  assert.equal(priceUsage({ ...usage, totalTokens: 1, inputIncludesCache: false }, 'deepseek', 'model', [rule()]).amount, 6.35);
  assert.equal(priceUsage({ ...usage, reasoningTokens: 0 }, 'deepseek', 'model', [rule()]).amount, 6.35);
});

test('explicit inclusive input deducts cache before applying cache prices', () => {
  const usage = { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 400_000, cacheWriteTokens: 100_000, inputIncludesCache: true };
  assert.equal(priceUsage(usage, 'deepseek', 'model', [rule()]).amount, 1.38);
  assert.equal(priceUsage({ ...usage, inputIncludesCache: false }, 'deepseek', 'model', [rule()]).amount, 2.38);
  assert.equal(priceUsage({ inputTokens: 0, outputTokens: 0 }, 'deepseek', 'model', [rule()]).amount, 0);
});

test('pricing precedence is provider first, exact model second and glob-specificity third', () => {
  const usage = { inputTokens: 1_000_000, outputTokens: 0 };
  const rules = [rule({ provider: '*', model: 'model', input: 99 }), rule({ model: '*', input: 3 }),
    rule({ model: 'mo*', input: 4 }), rule({ model: 'model', input: 5 })];
  assert.equal(priceUsage(usage, 'deepseek', 'model', rules).amount, 5);
  assert.equal(priceUsage(usage, 'deepseek', 'model', rules.slice(0, 2)).amount, 3);
  assert.equal(priceUsage(usage, 'deepseek', 'model', rules.slice(0, 3)).amount, 4);
  assert.equal(priceUsage(usage, 'other', 'model', rules).amount, 99);
  assert.equal(priceUsage(usage, 'deepseek', 'model.v1', [rule({ model: 'model.*', input: 7 })]).amount, 7);
  assert.equal(priceUsage(usage, 'deepseek', 'modelXv1', [rule({ model: 'model.*' })]).known, false);
});

test('missing pricing stays explicitly unknown, while configured zero is known', () => {
  const usage = { inputTokens: 100, outputTokens: 100 };
  assert.deepEqual(priceUsage(usage, 'a', 'b', []), { amount: null, currency: null, known: false, source: 'unknown' });
  assert.equal(priceUsage({}, 'a', 'b', []).known, false);
  assert.equal(priceUsage({ inputTokens: -1 }, 'deepseek', 'model', [rule()]).known, false);
  assert.equal(priceUsage(usage, 'deepseek', 'model', [rule({ input: NaN })]).known, false);
  assert.equal(priceUsage(usage, 'deepseek', 'model', [rule({ input: 0, output: 0 })]).amount, 0);
  assert.equal(priceUsage({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 1_000_000 }, 'deepseek', 'model', [
    { provider: 'deepseek', model: 'model', currency: 'USD', input: 2, output: 8 },
  ]).amount, 2);
});

test('official long-context rates use each request context including cached input',()=>{
  const rule={provider:'*',model:'gpt-6.1-sol',currency:'USD',input:2,output:10,cacheRead:.1,cacheWrite:2.5,cacheWrite12h:5,longContext:{threshold:272000,input:4,output:15,cacheRead:.2,cacheWrite:5,cacheWrite12h:10},source:'https://developers.openai.com/api/docs/pricing',checkedAt:'2026-10-26'};
  assert.equal(priceUsage({inputTokens:200000,cacheReadTokens:70000,outputTokens:1000},'myapi','gpt-6.1-sol',[rule]).amount,.417);
  assert.equal(priceUsage({inputTokens:200000,cacheReadTokens:73000,outputTokens:1000},'myapi','gpt-6.1-sol',[rule]).amount,.8296);
  assert.equal(priceUsage({inputTokens:272000,outputTokens:0},'myapi','gpt-6.1-sol',[rule]).amount,.544);
  assert.equal(priceUsage({inputTokens:272001,outputTokens:0},'myapi','gpt-6.1-sol',[rule]).amount,1.088004);
  assert.equal(priceUsage({inputTokens:0,cacheWriteTokens:1000,cacheWrite12hTokens:1000,outputTokens:0},'myapi','gpt-6.1-sol',[rule]).amount,.005);
  assert.equal(priceUsage({inputTokens:400000,outputTokens:0,pricingContextTokens:100000},'myapi','gpt-6.1-sol',[rule]).amount,.8);
  assert.throws(()=>validateSettings({prices:[{...rule,longContext:{...rule.longContext,threshold:1}}]}));
});

test('readable request preserves text, raw tool JSON and non-text identities', () => {
  const args = '{  "path" : "a.txt", "multiline": "a\\nb" }';
  const rendered = readableRequest({ system: 'outer system', messages: [
    { role: 'system', content: [{ type: 'text', text: 'prompt {{literal}}' }] },
    { role: 'user', content: [{ type: 'text', text: '完整原文\n第二行' }, { type: 'image', attachment: { attachmentId: 'image-1' } }] },
    { role: 'assistant', content: [{ type: 'reasoning', text: 'reason' }, { type: 'tool-call', name: 'read', id: 'call-1', arguments: args }] },
    { role: 'tool', toolCallId: 'call-1', isError: true, content: [{ type: 'text', text: 'raw result' }] },
  ], tools: [{ name: 'read', description: '完整工具描述', parameters: { type: 'object' } }] });
  for (const expected of ['[system]\nouter system', 'prompt {{literal}}', '完整原文\n第二行', 'image-1', '[reasoning]\nreason', args, '[tool call=call-1 error]', 'raw result', '完整工具描述']) assert.ok(rendered.includes(expected), expected);
  assert.equal(readableRequest({ messages: [] }), '');
});

test('stats pure fold tracks model routing, elapsed turns and cumulative model usage', () => {
  const initial = freeze(initStats());
  assert.equal(foldStats(initial, event('unrelated')), initial);
  let state = foldStats(initial, event('turn/start', { turn: 1 }, 0, 1000));
  state = foldStats(freeze(state), event('request/header', { header: { config: { provider: 'p', model: 'one' } } }, 1, 1100));
  state = foldStats(freeze(state), event('request/context', { provider: 'p', model: 'one', contextWindow: 128000 }, 2, 1200));
  state = foldStats(freeze(state), event('step/start', { turn: 1, step: 1 }, 3, 1250));
  const usage = { inputTokens: 10, outputTokens: 20, cacheReadTokens: 5, cacheWriteTokens: 2, reasoningTokens: 4 };
  state = foldStats(freeze(state), event('assistant/message', { message: { source: { provider: 'p', model: 'one' }, content: [] }, usage }, 4, 1300));
  assert.equal(state.provider, 'p');
  assert.equal(state.model, 'one');
  assert.equal(state.contextWindow, 128000);
  assert.equal(state.usage.totalTokens, 37);
  assert.equal(state.usage.inputIncludesCache, false);
  assert.equal(state.byModel[0].usage.outputTokens, 20);
  assert.equal(state.lastUsage.provider, 'p');
  assert.equal(state.turnElapsedMs, 300);
  const settled = state;
  state = foldStats(freeze(state), event('assistant/attempt', { usage, stream: [{ type: 'chunk', chunk: { type: 'usage', usage } }] }, 5, 1350));
  assert.equal(state.usage, settled.usage);
  assert.equal(state.byModel, settled.byModel);
  assert.equal(state.responses, 1);
  assert.equal(state.failedAttempts, 1);
  assert.equal(state.requests, 2);
  state = foldStats(freeze(state), event('assistant/message', { message: { source: { provider: 'q', model: 'two' }, content: [] }, usage: { inputTokens: 5, outputTokens: 6 } }, 6, 1400));
  assert.equal(state.byModel.length, 2);
  assert.equal(state.usage.inputTokens, 15);
  state = foldStats(freeze(state), event('turn/end', { turn: 1, reason: { kind: 'completed' } }, 7, 2000));
  assert.equal(state.phase, 'idle');
  assert.equal(state.turnElapsedMs, 1000);
  assert.equal(state.totalTurnElapsedMs, 1000);
  assert.equal(state.completedTurns, 1);
  assert.equal(state.turnStartedAt, null);
  assert.equal(foldStats(state, event('assistant/message', { usage }, 4, 1300)), state);
  assert.equal(initial.responses, 0);
  assert.equal(initial.usage.inputTokens, 0);
});

test('stats aggregates same models, supports parallel tool phases and normalizes inclusive usage explicitly', () => {
  let state = initStats();
  const fold = (type, data, seq) => { state = foldStats(freeze(state), event(type, data, seq, seq * 10)); };
  fold('request/context', { provider: 'p', model: 'm' }, 0);
  fold('assistant/message', { usage: { inputTokens: 100, outputTokens: 20, cacheReadTokens: 50, inputIncludesCache: true } }, 1);
  fold('assistant/message', { usage: { inputTokens: 10, outputTokens: 5 } }, 2);
  assert.equal(state.byModel.length, 1);
  assert.equal(state.byModel[0].responses, 2);
  assert.equal(state.usage.inputTokens, 60);
  assert.equal(state.usage.totalTokens, 135);
  fold('tool/call', { callId: 'a', name: 'read' }, 3);
  fold('tool/call', { callId: 'b', name: 'write' }, 4);
  assert.equal(state.phase, 'tool');
  assert.equal(state.tool.name, 'write');
  fold('tool/result', { message: { toolCallId: 'b' } }, 5);
  assert.equal(state.phase, 'tool');
  assert.equal(state.tool.name, 'read');
  fold('tool/result', { message: { source: { callId: 'a' } } }, 6);
  assert.equal(state.phase, 'thinking');
  assert.equal(state.tool, null);
  fold('turn/end', { reason: { kind: 'error' } }, 7);
  assert.equal(state.phase, 'error');
  assert.equal(state.lastTurnReason, 'error');
});
