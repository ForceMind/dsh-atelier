import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {DEFAULT_SETTINGS} from './core.mjs';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
test('public package identity matches every runtime entry',async()=>{
  const pkg=JSON.parse(await read('./package.json'));
  assert.equal(pkg.name,'dsh-atelier-plugin');assert.equal(pkg.private,undefined);assert.equal(pkg.license,'MIT');
  assert.ok(pkg.engines.dsh.includes('0.2.1-rc.3'));
  assert.match(pkg.repository.url,/github\.com\/ForceMind\/dsh-atelier\.git$/);
  assert.match(await read('./cordis.patch.yml'),/name: 'dsh-atelier-plugin'/);
  assert.match(await read('./client-source.js'),/id: 'dsh-atelier-plugin'/);
  assert.match(await read('./client.js'),/id: 'dsh-atelier-plugin'/);
  for(const file of ['host.js','client-source.js','client.js'])assert.doesNotMatch(await read(`./${file}`),/@local\/dsh-atelier|\/Users\//);
});
test('browser bundle is byte-identical to the committed source build',async()=>{
  const source=await read('./client-source.js'),activity=await read('./activity.mjs'),formatting=await read('./ui-format.mjs');
  const imports="import { installChatActivity } from './activity.mjs';\nimport { compactNumber, compactDuration, compactMoney, modelFamily } from './ui-format.mjs';\n";
  const marker='  factory(require) {\n';
  const bundled=activity.replace('export function installChatActivity','function installChatActivity')+'\n'+formatting.replaceAll('export function ','function ');
  const expected=source.slice(imports.length).replace(marker,()=>marker+bundled.split('\n').map(line=>line?'    '+line:'').join('\n')+'\n');
  assert.ok(source.startsWith(imports));assert.equal(await read('./client.js'),expected);
});
test('public defaults do not capture bodies or change identity/language',()=>{
  for(const key of ['captureEnabled','identityEnabled','hideClientIdentity','chatDynamicLabels'])assert.equal(DEFAULT_SETTINGS[key],false);
});
test('display resources and exported local files exist',async()=>{
  const pkg=JSON.parse(await read('./package.json'));
  for(const path of Object.values(pkg.exports).filter(path=>!path.includes('*')))await access(new URL(path,import.meta.url));
  for(const locale of ['en','zh']){const value=JSON.parse(await read(`./locale/${locale}.json`));assert.ok(value.meta.title);assert.ok(value.meta.description);}
  const svg=await read('./icon.svg');assert.match(svg,/<svg\b/);assert.ok(Buffer.byteLength(svg)<256*1024);
  assert.ok(pkg.files.includes('core.mjs'));assert.ok(!pkg.files.includes('node_modules'));
});
