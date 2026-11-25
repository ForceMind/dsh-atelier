// Offline executable contracts. No Host, browser, model, package manager, or build writer.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {adaptAtelierRecoveryClient} from '../../experiments/atelier-suite/atelier-recovery-client-adapter.mjs';
import {adaptDraftHost,adaptDraftUI,adaptDraftClient,adaptDraftClientSource} from './adapt.mjs';
import {automaticContext,AUTO_PROMPT} from './policy.mjs';
const upstream=new URL('../.inputs/packages/dsh-atelier-plugin/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,upstream),'utf8');
const sha=s=>createHash('sha256').update(s).digest('hex');
const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const manual=await import(new URL('reply-draft-context.mjs',upstream));
const hostText=adaptDraftHost(read('reply-draft.mjs'));
const host=await import(data(hostText.replace("'./reply-draft-context.mjs'",JSON.stringify(new URL('reply-draft-context.mjs',upstream).href)).replace("'./reply-auto-policy.mjs'",JSON.stringify(new URL('policy.mjs',import.meta.url).href))));
const uiText=adaptDraftUI(read('reply-draft-ui.mjs')), ui=await import(data(uiText));
const assistant='已将更新推送至演示分支 demo/color-check；12 项合成测试通过。没有合并主分支，也没有部署。';
const args={sessionId:'isolated',sourceMessageId:'answer',automatic:true};
const messages=(continuation=false)=>[
 {role:'user',id:'ask',source:{kind:'user'},content:[{type:'text',text:continuation?'更新到分支后，再给我本地试玩步骤。':'这个可以了，更新到分支。'}]},
 {role:'assistant',id:'answer',source:{kind:'model',provider:'normal-p',model:'normal-high'},content:[{type:'text',text:assistant}]},
];
const draftText='给我本地试玩步骤。';
const noneWire=JSON.stringify({kind:'none'});
const nextWire=JSON.stringify({kind:'draft',sourceRef:'u0',quote:'给我本地试玩步骤',text:draftText});
function setup({rows=messages(),response=noneWire,reason='stop',onReadout,streamBefore=[],efforts=['low','high']}={}){
 const counts={prepare:0,configure:0,streams:0};const calls=[];
 const agent={status:'idle',session:{deriveMessages:()=>rows}};
 const mock={async prepareCall(config,signal,configure){
   counts.prepare++;assert.deepEqual(config,{provider:'draft-p',model:'draft-only',reasoningEffort:'low',maxTokens:1024});
   const result=configure(config,{reasoning:{efforts:efforts.map(id=>({id}))},defaultMaxTokens:64}); counts.configure++;
   return {config:result,stream:async function*(o){counts.streams++;calls.push(o);assert.equal(o.signal,signal);assert.equal(o.maxTokens,64);yield {type:'reasoning-delta',index:0,text:'NEVER EXPOSE'};yield*streamBefore;yield {type:'text-delta',index:1,text:typeof response==='function'?response(o):response};if(onReadout)await onReadout(rows);if(reason)yield {type:'finish',reason:{kind:reason}};}};
 }};
 const service=host.createReplyDraftService({getAgent:id=>id==='isolated'?agent:undefined,getLlm:()=>mock,resolveDraftRoute:()=>({provider:'draft-p',model:'draft-only'})});
 return {service,counts,calls,rows,run:(input=args)=>service.generate('isolated',input)};
}
function setupUi(){let inserts=0;const input={draft:'',phase:'plain',claim:null,attachmentIds:[],occurrences:[],draftRev:7};const actions={captureInsertion:()=>({draftRev:7,start:0,end:0}),insertText(text){inserts++;assert.equal(text,draftText);return true;},submit(){assert.fail('No UI send permitted');}};const state={sessionId:'isolated',sourceMessageId:'answer',input,session:{openState:'open',running:false,removed:false,pendingSubmissions:[]},actions,editor:{},editable:true,composing:false,touch:0,epoch:3};return {read:()=>state,inserts:()=>inserts,state};}

test('identical receipt without next deliverable: explicit bound none, no UI candidate; duplicate auto claimed',async()=>{
 const h=setup(), u=setupUi();try{
  assert.deepEqual(u.read().sourceMessageId,'answer');const res=await h.run();assert.deepEqual(res,{kind:'none',sourceMessageId:'answer',provider:'draft-p',model:'draft-only',reasoningEffort:'low',sent:false});
  assert.equal(h.calls[0].system,AUTO_PROMPT);assert.deepEqual(JSON.parse(h.calls[0].messages[0].content[0].text.split('\n').slice(1).join('\n')),automaticContext(h.rows));
  const candidate=await ui.generateReplyDraft({read:u.read,automatic:true,call:async(method,p)=>{assert.equal(method,'reply-draft');assert.deepEqual(p,args);return res;}});
  assert.equal(candidate,null);assert.equal(ui.acceptReplyDraft(candidate,u.read()),false);assert.equal(u.inserts(),0);
  await assert.rejects(h.run(),/already-attempted/);assert.deepEqual(h.counts,{prepare:1,configure:1,streams:1});
 }finally{h.service.dispose();}
});
test('same receipt with explicitly pending play instructions: only a reviewed insertion, no send',async()=>{
 const h=setup({rows:messages(true),response:nextWire}),u=setupUi();try{
  const c=await ui.generateReplyDraft({read:u.read,call:(_,p)=>h.run(p),automatic:true});assert.equal(c.result.kind,'draft');assert.equal(c.result.sent,false);assert.equal(c.result.text,draftText);assert.equal(c.result.sourceMessageId,'answer');assert.equal(u.inserts(),0);
  assert.equal(ui.acceptReplyDraft(c,u.read()),true);assert.equal(u.inserts(),1);assert.equal(h.calls[0].system,AUTO_PROMPT);
 }finally{h.service.dispose();}
});
test('missing actual human provenance skips LLM and returns source-bound none, once',async()=>{
 const rows=messages();rows[0].source={kind:'runtime-context'};const h=setup({rows});try{const res=await h.run();assert.deepEqual(res,{kind:'none',sourceMessageId:'answer',sent:false});await assert.rejects(h.run(),/already-attempted/);assert.deepEqual(h.counts,{prepare:0,configure:0,streams:0});}finally{h.service.dispose();}
});
test('new events or changed citable user evidence invalidate an in-flight none or draft',async()=>{
 for(const [response,f] of [[noneWire,rows=>rows.at(-1).id='new-source'],[nextWire,rows=>rows[0].content[0].text='不用给我试玩步骤了。']]){
  const h=setup({rows:messages(true),response,onReadout:f});try{await assert.rejects(h.run(),/会话内容已变化/);assert.equal(h.counts.streams,1);}finally{h.service.dispose();}
 }
});
test('automatic context retains an explicit next deliverable outside the legacy six-turn window',async()=>{
 const rows=messages(true);const source=rows.pop();for(let i=0;i<8;i++)rows.push({id:`u${i+1}`,role:'user',source:{kind:'user'},content:[{type:'text',text:`第 ${i+1} 次检查，保持同一任务。`}]},{...source,id:`a${i+1}`,content:[{type:'text',text:'正在检查本轮结果。'}]});rows.push(source);
 const h=setup({rows,response:nextWire});try{
  const result=await h.run();assert.equal(result.kind,'draft');assert.equal(result.text,draftText);
  const context=JSON.parse(h.calls[0].messages[0].content[0].text.split('\n').slice(1).join('\n'));assert.ok(context.dialogue.some(r=>r.ref==='u0'&&r.citable&&r.text.includes('试玩步骤')));
  assert.ok(!manual.replyContext(rows).dialogue.some(r=>r.text.includes('试玩步骤')));
 }finally{h.service.dispose();}
});
test('retracting the obligation removes authorization to draft its previous next-step suggestion',async()=>{
 const rows=messages(true);rows.splice(-1,0,{role:'user',id:'retract',source:{kind:'user'},content:[{type:'text',text:'不用给我试玩步骤了，只更新分支。'}]});
 const h=setup({rows,response:nextWire});try{assert.equal((await h.run()).kind,'none');assert.equal(h.counts.streams,1);}finally{h.service.dispose();}
});
test('malformed/empty reply, missing stop, length finish and tool calls are errors, not silence',async()=>{
 for(const opts of [{response:''},{response:'not valid JSON'},{response:'null'},{reason:null},{reason:'max-tokens'},{streamBefore:[{type:'block-start',blockType:'tool-call',index:0}]},{efforts:['high']}]){
  const h=setup(opts);try{await assert.rejects(h.run());await assert.rejects(h.run(),/already-attempted/);}finally{h.service.dispose();}
 }
});
test('manual preserves upstream text contract, old prompt/context and low route after auto abstains',async()=>{
 const rows=messages(true);let h=setup({rows,response:opts=>opts.system===AUTO_PROMPT?noneWire:draftText});try{
  assert.equal((await h.run()).kind,'none');const msg=await h.run({automatic:false,sourceMessageId:'answer'});assert.deepEqual(msg,{text:draftText,sourceMessageId:'answer',provider:'draft-p',model:'draft-only',reasoningEffort:'low',sent:false});assert.equal(h.calls[1].system,manual.REPLY_DRAFT_PROMPT);assert.deepEqual(JSON.parse(h.calls[1].messages[0].content[0].text.split('\n').slice(1).join('\n')),manual.replyContext(rows));
 }finally{h.service.dispose();}
});
test('UI rejects malformed/stale responses and drops typed/ineligible state while awaiting candidate',async()=>{
 const u=setupUi();
 for(const res of [null,{}, {kind:'none',sent:false,sourceMessageId:'wrong'}, {kind:'none',sourceMessageId:'answer',sent:true},{kind:'none',sourceMessageId:'answer',sent:false,text:'bogus'},{kind:'draft',sourceMessageId:'answer',sent:false,reasoningEffort:'low',text:''}]){
  await assert.rejects(ui.generateReplyDraft({automatic:true,read:u.read,call:async()=>res}));
 }
 const h=setup({rows:messages(true),response:nextWire});try{
  assert.equal(await ui.generateReplyDraft({automatic:true,read:u.read,call:async(_,p)=>{const r=await h.run(p);u.state.input.draft='edited';return r;}}),null);assert.equal(u.inserts(),0);
 }finally{h.service.dispose();}
 // No cache or Tab handler for an absent candidate in the actual installed UI call path.
 assert.ok(uiText.includes("flight.current=true;setBusy(true);drop();setMessage('');"));
 assert.ok(uiText.includes('if(result){cachedCandidate.current=result;candidate.current=result;publish('));
 assert.ok(uiText.includes('if(!replyDraftTab(event)||!candidate.current)return;'));
});
test('real upstream build-client generator, with only I/O redirected to memory, emits the exact adapted client.js',async()=>{
 const builder=read('build-client.mjs');assert.equal(sha(builder),'427635b38c0d2b7edbd0c8e4afd461027fa5e3c5e2a7b35e236f36482e7711c7');
 const head="import {readFile,writeFile} from 'node:fs/promises';\n";assert.ok(builder.startsWith(head));
 const transformed={
   'client-source.js':adaptDraftClientSource(adaptAtelierRecoveryClient(read('client-source.js'))),
   'reply-draft-ui.mjs':uiText,
 };
 let emitted;const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 const program=new AsyncFunction('readFile','writeFile','base','console',builder.slice(head.length).replaceAll('import.meta.url','base'));
 await program(async(url,encoding)=>{assert.equal(encoding,'utf8');assert.equal(new URL('.',url).href,upstream.href);const name=url.pathname.split('/').at(-1);return transformed[name]??read(name);},async(url,text)=>{assert.equal(url.href,new URL('client.js',upstream).href);assert.equal(emitted,undefined);emitted=text;},new URL('build-client.mjs',upstream).href,{log(){}});
 assert.equal(emitted,adaptDraftClient(adaptAtelierRecoveryClient(read('client.js'))));
 assert.ok(emitted.includes('Invalid reply abstention'));assert.ok(emitted.includes('data-atelier-incomplete'));
});
test('all transformations refuse unreviewed bytes and wrong composition order',()=>{
 for(const [fn,raw] of [[adaptDraftHost,read('reply-draft.mjs')],[adaptDraftUI,read('reply-draft-ui.mjs')],[adaptDraftClient,adaptAtelierRecoveryClient(read('client.js'))],[adaptDraftClientSource,adaptAtelierRecoveryClient(read('client-source.js'))]])assert.throws(()=>fn(raw+'\n'),/Unreviewed/);
 assert.throws(()=>adaptDraftClient(read('client.js')),/Unreviewed/);assert.throws(()=>adaptDraftClientSource(read('client-source.js')),/Unreviewed/);
});
