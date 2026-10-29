import test from 'node:test';
import assert from 'node:assert/strict';
import {sessionRecency,recentSessionStyles,crossedRecentRow,observeRecentStops} from './session-recency.mjs';
const now=1793073600000;
test('recency uses exact rolling hour/day boundaries and never marks blank or future sessions',()=>{
  assert.deepEqual(sessionRecency({updatedAt:now},now),{recent:true,hot:true});
  assert.deepEqual(sessionRecency({updatedAt:now-3600000},now),{recent:true,hot:false});
  assert.deepEqual(sessionRecency({updatedAt:now-86400000},now),{recent:false,hot:false});
  for(const row of [null,{updatedAt:NaN},{updatedAt:now+1},{updatedAt:0},{blank:true,updatedAt:now},{subagent:{},updatedAt:now}])assert.deepEqual(sessionRecency(row,now),{recent:false,hot:false});
});
test('markers precede title without replacing native status and only hot rows are snap points',()=>{
  const result=recentSessionStyles([{id:'new',updatedAt:now},{id:'day',updatedAt:now-7200000},{id:'old',updatedAt:now-90000000}],now);
  assert.equal(result.recent,2);assert.equal(result.hot,1);assert.ok(!result.css.includes('session:old'));
  assert.ok(result.css.includes('.atelier-recent-dot'));assert.ok(!result.css.includes('.JoiKIa_title::before'));assert.ok(result.css.includes('.JoiKIa_slot:has(svg)'));assert.ok(!result.css.includes('scroll-snap-type'));
  const armed=recentSessionStyles([{id:'new',updatedAt:now}],now,{marks:true,snap:true},{id:'new',holding:true,flash:true,serial:2});assert.ok(armed.css.includes('scroll-padding-block-start:0'));assert.ok(armed.css.includes('scroll-snap-stop:always'));assert.ok(armed.css.includes('atelier-recent-stop-2'));assert.ok(!armed.css.includes('[data-row-key]{scroll-snap'));
  const released=recentSessionStyles([{id:'new',updatedAt:now}],now,{marks:true,snap:true},{id:'new',holding:false,flash:true,serial:2});assert.ok(!released.css.includes('scroll-snap-type'));
  assert.ok(!result.css.includes('position:sticky'));assert.ok(!result.css.includes('overflow:hidden'));
});
test('both directions stop the first recent row crossing the top, not the viewport bottom',()=>{
  const positions=[{id:'a',top:100},{id:'b',top:200},{id:'c',top:300}];
  assert.equal(crossedRecentRow(50,250,positions).id,'a');assert.equal(crossedRecentRow(250,50,positions).id,'b');
  assert.equal(crossedRecentRow(50,80,positions),null);assert.equal(crossedRecentRow(100,110,positions),null);
  assert.equal(crossedRecentRow(95,105,positions,'a'),null);assert.equal(crossedRecentRow(NaN,105,positions),null);
});

test('stop listener re-arms after cooldown even without leaving 36px, and cleans up',()=>{
  let clock=0,sequence=0;const tasks=new Map(),listeners=new Map(),reports=[];
  const schedule=(fn,delay)=>{const id=++sequence;tasks.set(id,{fn,at:clock+delay});return id;};
  const tick=ms=>{const until=clock+ms;while(true){const next=[...tasks].filter(([,task])=>task.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;clock=next[1].at;tasks.delete(next[0]);next[1].fn();}clock=until;};
  const list={scrollTop:90,clientTop:0,isConnected:true,matches:()=>true,closest:()=>list,getBoundingClientRect:()=>({top:20}),querySelectorAll:()=>[element]};
  const element={isConnected:true,getAttribute:()=> 'session:a',getBoundingClientRect:()=>({top:20+100-list.scrollTop})};
  const doc={defaultView:{matchMedia:()=>({matches:false})},addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
  const dispose=observeRecentStops(doc,()=>new Set(['a']),value=>reports.push(value),{now:()=>clock,schedule,cancel:id=>tasks.delete(id)});
  const move=top=>{listeners.get('wheel')({type:'wheel',target:list,deltaY:top-list.scrollTop,deltaX:0});list.scrollTop=top;listeners.get('scroll')({target:list});};
  move(110);assert.equal(reports.at(-1).holding,true);list.scrollTop=100;listeners.get('scroll')({target:list});assert.equal(reports.at(-1).flash,true);tick(250);assert.equal(reports.at(-1).holding,false);
  move(90);assert.equal(reports.at(-1).serial,1);tick(400);move(110);assert.equal(reports.at(-1).serial,2);assert.equal(reports.at(-1).holding,true);
  tick(300);dispose();assert.equal(listeners.size,0);assert.equal(tasks.size,0);
});

test('style switches are independent, selectors escape IDs and empty data has no host effects',()=>{
  assert.equal(recentSessionStyles([],now).css,'');
  const rows=[{id:'a"b\\c\n',updatedAt:now},{id:'a"b\\c\n',updatedAt:now}];
  assert.equal(recentSessionStyles(rows,now).recent,1);assert.ok(recentSessionStyles(rows,now,{marks:true,snap:true},{id:rows[0].id,holding:true}).css.includes('a\\"b\\\\c\\a '));
  assert.ok(!recentSessionStyles(rows,now,{marks:false,snap:true}).css.includes('::before'));
  assert.ok(!recentSessionStyles(rows,now,{marks:true,snap:false}).css.includes('scroll-snap'));
  assert.equal(recentSessionStyles(rows,now,{marks:false,snap:false}).css,'');
});
