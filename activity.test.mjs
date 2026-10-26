import test from 'node:test';
import assert from 'node:assert/strict';
import {installChatActivity} from './activity.mjs';
function runtime(initial='zh') {
  let active=initial;let time=0;let count=0;const timers=new Map(),writes=[],dicts=new Map();
  const languages=new Map([['zh',{id:'zh',fallback:'en'}],['en',{id:'en'}],['fr',{id:'fr',fallback:'en'}]]);
  dicts.set('chat:zh',{'chat.deepDiving':'深度求索中','chat.deepDivingFor':'深度求索中，用时 {duration} ···','unrelated':'原中文'});
  dicts.set('chat:en',{'chat.deepDiving':'Deep diving','chat.deepDivingFor':'Deep diving for {duration} ···','unrelated':'original English'});
  const locale={
    getSnapshot:()=>({active}),
    addLanguage(row){assert.ok(languages.has(row.fallback));assert.ok(!languages.has(row.id));languages.set(row.id,row);return()=>languages.delete(row.id);},
    register(ns,id,dict){const key=`${ns}:${id}`;assert.ok(!dicts.has(key));dicts.set(key,dict);return()=>{if(dicts.get(key)===dict)dicts.delete(key);};},
    setLocale(id){assert.ok(languages.has(id));active=id;writes.push(id);},
    bind(ns){return(key,params)=>{let id=active;let value;while(id){value=dicts.get(`${ns}:${id}`)?.[key];if(value!==undefined)break;id=languages.get(id)?.fallback;}return String(value??key).replace(/\{(\w+)\}/g,(match,key)=>params&&key in params?params[key]:match);};},
  };
  const adapter=installChatActivity(locale,{now:()=>time,schedule:fn=>{timers.set(++count,fn);return count;},cancel:id=>timers.delete(id)});
  return {locale,adapter,languages,dicts,writes,timers,tick(ms){time=ms;for(const fn of [...timers.values()])fn();}};
}
test('native Chat labels rotate with preserved duration and stable screen-reader text',()=>{
  const h=runtime();h.adapter.configure({chatDynamicLabels:true,phrases:['正在烹饪灵感','正在整理线索'],rotationSeconds:4});
  assert.equal(h.locale.getSnapshot().active,'zh-x-atelier');
  const t=h.locale.bind('chat');assert.equal(t('unrelated'),'原中文');assert.equal(t('chat.deepDiving'),'正在工作');
  assert.match(t('chat.deepDivingFor',{duration:'2秒'}),/正在烹饪灵感.*2秒/);
  assert.equal(h.timers.size,0);h.adapter.setRunning('session',true);assert.equal(h.timers.size,1);
  h.tick(4000);assert.match(t('chat.deepDivingFor',{duration:'4秒'}),/正在整理线索.*4秒/);assert.equal(t('chat.deepDiving'),'正在工作');
  assert.equal(h.writes.length,1);h.adapter.setRunning('session',false);assert.equal(h.timers.size,0);
  h.adapter.dispose();assert.equal(h.locale.getSnapshot().active,'zh');assert.equal(t('chat.deepDiving'),'深度求索中');
  assert.equal(h.languages.has('zh-x-atelier'),false);
});
test('disabled mode restores native label without deleting built-in dictionaries',()=>{
  const h=runtime('en');const original=h.dicts.get('chat:en');
  h.adapter.configure({chatDynamicLabels:true,phrases:['Working'],rotationSeconds:4});h.adapter.setRunning('x',true);
  h.adapter.configure({chatDynamicLabels:false});assert.equal(h.locale.getSnapshot().active,'en');assert.equal(h.timers.size,0);
  assert.equal(h.dicts.get('chat:en'),original);assert.equal(h.locale.bind('chat')('chat.deepDiving'),'Deep diving');h.adapter.dispose();
});
test('manual language choice is not overwritten during cleanup or repeated configuration',()=>{
  const h=runtime();h.adapter.configure({chatDynamicLabels:true,phrases:['A'],rotationSeconds:4});
  h.locale.setLocale('fr');h.adapter.configure({chatDynamicLabels:true,phrases:['A'],rotationSeconds:4});h.adapter.dispose();
  assert.equal(h.locale.getSnapshot().active,'fr');
});
test('multiple session states and repeated cleanup keep timers bounded',()=>{
  const h=runtime();h.adapter.configure({chatDynamicLabels:true,phrases:['A{duration}B'],rotationSeconds:4});
  h.adapter.setRunning('a',true);h.adapter.setRunning('b',true);assert.equal(h.timers.size,1);
  h.adapter.setRunning('a',undefined);assert.equal(h.timers.size,1);h.adapter.setRunning('b',undefined);assert.equal(h.timers.size,0);
  assert.match(h.locale.bind('chat')('chat.deepDivingFor',{duration:'5秒'}),/5秒/);
  h.adapter.dispose();h.adapter.dispose();assert.equal(h.timers.size,0);
});
