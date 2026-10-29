import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
test('Saturn registers only the dedicated icon slot and disposes on unload',async()=>{
  const source=await readFile(new URL('./client.js',import.meta.url),'utf8');let factory,registered,disposed=false;
  vm.runInNewContext(source,{window:{__ModuleLoader__:{load:entry=>{factory=entry.factory;}}}});
  const React={createElement:(type,props,...children)=>({type,props,children})};const plugin=factory(name=>{assert.equal(name,'react');return React;});
  const ctx={slots:{inject:(key,fn)=>{assert.equal(key,'conversation.chat.running.icon');return fn();},register:(options,Component)=>{registered={options,tree:Component()};return()=>{disposed=true;};}}};
  let cleanup;ctx.slots.inject=(key,fn)=>{assert.equal(key,'conversation.chat.running.icon');cleanup=fn();return cleanup;};plugin.apply(ctx);
  assert.equal(registered.options.priority,-10);assert.equal(registered.tree.props['aria-hidden'],'true');const svg=registered.tree.children.find(child=>child.type==='svg');assert.equal(svg.props.width,14);assert.equal(svg.props.height,14);assert.ok(source.includes('prefers-reduced-motion:reduce'));assert.ok(source.includes('3s ease-in-out'));cleanup();assert.equal(disposed,true);assert.ok(!source.includes('conversation.chat.flow'));assert.ok(!source.includes('role:\'status\''));assert.ok(!source.includes('aria-live'));assert.ok(!source.includes('setInterval'));
});
