import test from'node:test';import assert from'node:assert/strict';import{createReplyDraftService,replySource,initReplySource,foldReplySource}from'./reply-draft.mjs';
const message={id:'m1',role:'assistant',source:{provider:'p',model:'m'},content:[{type:'reasoning',text:'SECRET_REASONING'},{type:'text',text:'请选择下一步？'}]};
function fixture({low=true,chunks=[{type:'text-delta',text:'请说明两个选项的区别。'},{type:'finish',reason:{kind:'stop'}}],change=false}={}){let calls=0,options,config;const agent={status:'idle',session:{deriveMessages:()=>[message]}};const llm={prepareCall:async(c,_signal,configure)=>{calls++;config=configure(c,{defaultMaxTokens:512,reasoning:{efforts:low?[{id:'low'}]:[{id:'high'}]}});return{config,stream:async function*(o){options=o;for(const item of chunks)yield item;if(change)agent.session.deriveMessages=()=>[{...message,id:'m2'}];}};}};return{service:createReplyDraftService({getAgent:()=>agent,getLlm:()=>llm}),agent,calls:()=>calls,options:()=>options,config:()=>config};}
test('draft only requests low with bounded plain assistant text and no tools or session selection',async()=>{const f=fixture();const result=await f.service.generate('s');assert.equal(result.sent,false);assert.equal(result.reasoningEffort,'low');assert.equal(f.config().reasoningEffort,'low');assert.equal(f.options().maxTokens,512);assert.equal(f.options().tools,undefined);assert.equal(f.options().sessionId,undefined);assert.ok(!JSON.stringify(f.options().messages).includes('SECRET_REASONING'));assert.equal(f.agent.status,'idle');});
test('unsupported low, tool calls and incomplete output fail closed',async()=>{await assert.rejects(fixture({low:false}).service.generate('s'),/low/);for(const chunks of[[{type:'tool-call-delta'}],[{type:'text-delta',text:'partial'}],[{type:'finish',reason:{kind:'max-tokens'}}]])await assert.rejects(fixture({chunks}).service.generate('s'));});
test('busy or changed conversation cannot supply a draft',async()=>{const f=fixture();f.agent.status='running';await assert.rejects(f.service.generate('s'),/空闲/);assert.equal(f.calls(),0);await assert.rejects(fixture({change:true}).service.generate('s'),/变化/);assert.throws(()=>replySource([{role:'user'}]));});
test('only one independent request per session is admitted',async()=>{let release;const f=fixture();const original=f.agent.session.deriveMessages;const llm={prepareCall:async c=>{await new Promise(resolve=>{release=resolve;});return{config:c,stream:async function*(){yield{type:'text-delta',text:'draft'};yield{type:'finish',reason:{kind:'stop'}};}};}};const service=createReplyDraftService({getAgent:()=>f.agent,getLlm:()=>llm});const first=service.generate('s');await assert.rejects(service.generate('s'),/正在/);release();await first;assert.equal(f.agent.session.deriveMessages,original);});

test('automatic attempts deduplicate successes but manual retries remain allowed',async()=>{
 const f=fixture();await f.service.generate('s',{automatic:true,sourceMessageId:'m1'});
 await assert.rejects(f.service.generate('s',{automatic:true,sourceMessageId:'m1'}),/already-attempted/);assert.equal(f.calls(),1);
 await f.service.generate('s',{sourceMessageId:'m1'});await f.service.generate('s',{automatic:false,sourceMessageId:'m1'});assert.equal(f.calls(),3);
 await f.service.generate('another-session',{automatic:true,sourceMessageId:'m1'});assert.equal(f.calls(),4);
 f.agent.session.deriveMessages=()=>[{...message,id:'m2'}];await f.service.generate('s',{automatic:true,sourceMessageId:'m2'});assert.equal(f.calls(),5);
});
test('failed automatic attempts are retained even when failure precedes paid generation',async()=>{
 for(const f of [fixture({low:false}),fixture({chunks:[{type:'text-delta',text:'partial'}]})]){
  await assert.rejects(f.service.generate('s',{automatic:true,sourceMessageId:'m1'}));
  await assert.rejects(f.service.generate('s',{automatic:true,sourceMessageId:'m1'}),/already-attempted/);assert.equal(f.calls(),1);
  await assert.rejects(f.service.generate('s',{sourceMessageId:'m1'}));assert.equal(f.calls(),2);
 }
 const f=fixture();let available=false,calls=0;
 const service=createReplyDraftService({getAgent:()=>f.agent,getLlm:()=>{calls++;return available?{}:null;}});
 await assert.rejects(service.generate('s',{automatic:true}),/模型服务/);available=true;
 await assert.rejects(service.generate('s',{automatic:true}),/already-attempted/);assert.equal(calls,1);
});
test('automatic duplicate in flight is rejected before a second model call',async()=>{
 const f=fixture();let release,calls=0;
 const service=createReplyDraftService({getAgent:()=>f.agent,getLlm:()=>({prepareCall:async c=>{calls++;await new Promise(resolve=>{release=resolve;});return{config:c,stream:async function*(){yield{type:'text-delta',text:'draft'};yield{type:'finish',reason:{kind:'stop'}};}};}})});
 const first=service.generate('s',{automatic:true,sourceMessageId:'m1'});
 await assert.rejects(service.generate('s',{automatic:true,sourceMessageId:'m1'}),/already-attempted/);assert.equal(calls,1);release();await first;
});
test('stale source guard rejects before prepare, and changes during prepare prevent stream dispatch',async()=>{
 const f=fixture();await assert.rejects(f.service.generate('s',{automatic:true,sourceMessageId:'old'}),/变化/);assert.equal(f.calls(),0);
 await f.service.generate('s',{automatic:true,sourceMessageId:'m1'});assert.equal(f.calls(),1);
 let streams=0;
 const service=createReplyDraftService({getAgent:()=>f.agent,getLlm:()=>({prepareCall:async c=>{f.agent.session.deriveMessages=()=>[{...message,id:'m2'}];return{config:c,stream:async function*(){streams++;}};}})});
 await assert.rejects(service.generate('s',{sourceMessageId:'m1'}),/变化/);assert.equal(streams,0);
});
test('automatic attempt history is bounded to the latest 500 distinct session and source pairs',async()=>{
 const f=fixture();for(let index=0;index<=500;index++)await f.service.generate('s'+index,{automatic:true});
 await assert.rejects(f.service.generate('s1',{automatic:true}),/already-attempted/);
 await f.service.generate('s0',{automatic:true});assert.equal(f.calls(),502);
});
test('source IDs and request control types fail closed before any LLM calls',async()=>{
 const f=fixture();for(const input of [null,[],{automatic:'true'},{sourceMessageId:''},{sourceMessageId:1}])await assert.rejects(f.service.generate('s',input));assert.equal(f.calls(),0);
 for(const id of [undefined,null,'',1,' '])assert.throws(()=>replySource([{...message,id}]));
 assert.throws(()=>replySource([{...message,content:[{type:'text',text:'before tool'},{type:'tool-call'}]}]));
 assert.throws(()=>replySource([message,{role:'tool'}]));
});
test('reply source reducer publishes only final text IDs and clears on new work',()=>{
 const initial=Object.freeze(initReplySource()),event={type:'assistant/message',data:{message}};
 const ready=foldReplySource(initial,event);assert.deepEqual(ready,{messageId:'m1'});assert.deepEqual(initial,{messageId:null});
 assert.equal(foldReplySource(ready,{type:'turn/end'}),ready);
 for(const type of ['user/message','turn/start','tool/call','tool/result'])assert.deepEqual(foldReplySource(ready,{type}),{messageId:null});
 for(const data of [
  {message:{...message,id:1}},
  {message:{...message,content:[{type:'reasoning',text:'private'}]}},
  {message:{...message,content:[{type:'text',text:' '}]}},
  {message:{...message,content:[...message.content,{type:'tool-call'}]}},
  {message,interrupted:true},
 ])assert.deepEqual(foldReplySource(ready,{type:'assistant/message',data}),{messageId:null});
 assert.equal(foldReplySource(initial,{type:'turn/start'}),initial);
});

test('low reasoning chunks are omitted, not mistaken for draft or an off failure',async()=>{const f=fixture({chunks:[{type:'reasoning-delta',text:'PRIVATE_THOUGHT'},{type:'block-end',block:{type:'reasoning',text:'PRIVATE_THOUGHT'}},{type:'text-delta',text:'请先说明方案。'},{type:'finish',reason:{kind:'stop'}}]});const result=await f.service.generate('s');assert.equal(result.text,'请先说明方案。');assert.equal(result.reasoningEffort,'low');assert.ok(!JSON.stringify(result).includes('PRIVATE_THOUGHT'));});
