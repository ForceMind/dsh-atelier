import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {portHost,portClient,portForm} from './port.mjs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const originalHost=read('../.inputs/packages/dsh-context/lib/index.js');
const originalClient=read('../.inputs/packages/dsh-context/lib/client.js');
const host=portHost(originalHost),client=portClient(originalClient);
const form=portForm(read('../../experiments/atelier-suite/context-config.mjs'));
const identity=new URL('../../experiments/atelier-suite/identity.mjs',import.meta.url).href;
const {contextChanges,saveContextForm,CONTEXT_FIELDS}=await import('data:text/javascript;base64,'+Buffer.from(form.replace("'./identity.mjs'",JSON.stringify(identity))).toString('base64'));
const sha=s=>createHash('sha256').update(s).digest('hex');
function between(source,first,next){const a=source.indexOf(first);const b=source.indexOf(next,a+1);assert.ok(a>=0&&b>a);return source.slice(a,b);}
test('portable transformations match reviewed candidate and reject changed sources',()=>{
 assert.equal(sha(host),'bc28239de6314af22a6c9df792a7b793ae51dcb0eb3fdbd29105937caaeb23a6');
 assert.equal(sha(client),'ad3a6e793035ef0dfdde0b38facd88dcf280e9aad0ac842a0fa36290beede67e');
 assert.equal(sha(form),'666baee1a995469d6152f9b574c80dbcb0a3d293cfb1de6b220dae7f3dac9c60');
 assert.throws(()=>portHost(originalHost+' '));assert.throws(()=>portClient(originalClient+' '));
});
for(const variant of ['missing','getter failure'])for(const [branch,body] of [['single',{sessionId:'s'}],['summary',{sessionId:'s',summary:true}],['batch',{batch:{ids:['s']}}]])test(`Fleet ${branch}: release on ${variant}`,async()=>{
 function fixture(source){
  let handler,disposed=0;const a={get events(){if(variant==='getter failure')throw Error('fixture getter');return null;},[Symbol.dispose](){disposed++;}};
  const ctx={get:()=>undefined,effect:()=>{}};
  const box={q(spec){handler=spec.handler(ctx);},Bo:()=>null,G:()=>async()=>a,K:e=>()=>e[Symbol.dispose](),H:v=>v,W:async body=>({ok:true,body}),A:v=>v??null,Vs:()=> 'preview',U:(code,message)=>({ok:false,code,message}),setTimeout:()=>({unref(){}}),clearTimeout(){}};
  vm.runInNewContext(between(source,'function dc(','function fc(')+between(source,'function hc(','function gc(')+';globalThis.start=hc;',box);
  box.start(ctx,{admit:fn=>fn()});return {request:()=>handler(body),count:()=>disposed};
 }
 const before=fixture(originalHost),after=fixture(host);
 const run=async f=>{try{return await f.request();}catch(e){assert.match(String(e),/fixture getter/);return {ok:false};}};
 const oldResult=await run(before),newResult=await run(after);
 assert.equal(before.count(),0);assert.equal(after.count(),1);assert.equal(newResult.ok,oldResult.ok);
 if(branch==='batch')assert.deepEqual([...newResult.value.missing],['s']);
 else if(variant==='missing')assert.equal(newResult.value,null);
});
function detailStore(source){
 const timers=new Map();let key=0;const box={mi:{detail:null,failed:false,pending:false},setTimeout(fn){const id=++key;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}};
 vm.runInNewContext(between(source,'var bi=class','function xi(')+';globalThis.Store=bi;',box);return {store:new box.Store(()=>{}),timers};
}
test('resubscribe restores canceled catch-up; retry fetches stale core',()=>{
 for(const [source,patched] of [[originalClient,false],[client,true]]){
  const {store,timers}=detailStore(source);const cancel=store.subscribe(()=>{});
  Object.assign(store,{detail:{rev:2},acceptedRev:2,wantedRev:2,lastHeadRev:5,catchUpTarget:5,catchUp:1});timers.set(1,()=>{});
  cancel();assert.equal(timers.size,0);const close=store.subscribe(()=>{});
  assert.equal(timers.size,patched?1:0);if(patched)assert.equal(store.wantedRev,5);
  let fired=0;store.fire=()=>{fired++;};store.retry();assert.equal(fired,patched?1:0);close();
 }
});
test('stale detail is loading or failed, matching detail stays ready',()=>{
 for(const [source,patched] of [[originalClient,false],[client,true]]){
  const code=between(source,'function Oi(','let ki=');let snap;
  const box={ut:()=>({detailRev:5}),We:null,Ci:()=>({subscribe(){},getSnapshot(){},request(){}}),Ti:null,Ei:null,Di:null,mi:null,ri(){},u:{useMemo:fn=>fn(),useSyncExternalStore:()=>snap,useEffect(){}}};
  vm.runInNewContext(code+';globalThis.view=Oi;',box);
  for(const [rev,failed,state] of [[2,false,'loading'],[2,true,'failed'],[5,false,'ready']]){
   snap={detail:{rev,requests:[],events:[],nodes:[],archive:[]},failed};assert.equal(box.view({sessionId:'s'}).detailState,patched?state:'ready');
  }
 }
});
test('navigation opens the Suite and does not register standalone card',()=>{
 const box={dt:'dsh-context',q:x=>x};vm.runInNewContext(between(client,'function Et(','function Dt(')+';globalThis.open=Et;',box);
 const targets=[];box.open({get:()=>({openBundle:x=>targets.push(x)})});assert.deepEqual(targets,['@forcemind/dsh-atelier-suite']);
 assert.ok(!client.includes('dsh-context: plugins-page card'));
});
test('Suite row form accepts all 13 preferences; CAS preserves untouched fields',async()=>{
 assert.equal(CONTEXT_FIELDS.length,13);
 const snapshot={status:'ready',writable:true,revision:7,value:{promptPrefix:'keep',maxCommands:42}};
 const edits={defaultFileSort:'lines',defaultPlacement:'hide',overviewAutoSteps:'200',defaultOverviewRange:'7d'};
 const ops=contextChanges(snapshot,edits);assert.deepEqual(ops,Object.entries(edits).map(([k,value])=>({op:'set',path:[k],value})));
 const calls=[];assert.equal(await saveContextForm({mutate:(...args)=>{calls.push(args);return true;}},snapshot,edits),true);assert.deepEqual(calls,[[ops,7]]);
 assert.throws(()=>contextChanges(snapshot,{defaultFileSort:'invalid'}));assert.throws(()=>contextChanges(snapshot,{maxCommands:'1'}));
});
