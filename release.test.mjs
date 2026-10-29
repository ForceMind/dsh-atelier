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
  const details=(await read('./metric-details.mjs')).replace("import {compactDuration,compactMoney} from './ui-format.mjs';\n",'');
  const recency=await read('./session-recency.mjs');
  const imports="import { installChatActivity } from './activity.mjs';\nimport { compactNumber, compactDuration, compactMoney, modelFamily, liveOutputThroughput } from './ui-format.mjs';\nimport { metricCopy, metricDetail, popoverPosition } from './metric-details.mjs';\nimport { recentSessionStyles, sessionRecency, observeRecentStops } from './session-recency.mjs';\nimport { installModelSettings } from './model-settings-ui.mjs';\nimport { parsePriceDraft, patchPriceRule, appendPriceRules } from './price-editor.mjs';\n";
  const extraModules=(await Promise.all(['model-settings-ui.mjs','price-editor.mjs'].map(name=>read('./'+name)))).join('\n');
  const marker='  factory(require) {\n';
  const bundled=activity.replace('export function installChatActivity','function installChatActivity')+'\n'+formatting.replaceAll('export function ','function ')+'\n'+details.replaceAll('export function ','function ').replaceAll('export const ','const ')+'\n'+recency.replaceAll('export function ','function ')+'\n'+extraModules.replaceAll('export function ','function ');
  const expected=source.slice(imports.length).replace(marker,()=>marker+bundled.split('\n').map(line=>line?'    '+line:'').join('\n')+'\n');
  assert.ok(source.startsWith(imports));assert.equal(await read('./client.js'),expected);
});
test('public defaults do not capture bodies or change identity/language',()=>{
  for(const key of ['captureEnabled','identityEnabled','hideClientIdentity','chatDynamicLabels'])assert.equal(DEFAULT_SETTINGS[key],false);
});
test('workbench uses stable full width, retained tabs and explicit left alignment',async()=>{
  const source=await read('./client-source.js');
  assert.match(source,/\.atelier-page\{width:100%;min-width:0;align-self:stretch/);
  assert.match(source,/scrollbar-gutter:stable/);
  assert.match(source,/max-width:none;margin:0;text-align:left/);
  assert.match(source,/const pageTabs=new Map\(\)/);
  assert.match(source,/hidden:tab!=='logs'/);assert.match(source,/hidden:tab!=='settings'/);
  assert.match(source,/\.atelier-page \.atelier-list>button\{[^}]*text-align:left/);
});
test('workbench disables only its conversation content width handles',async()=>{
  const source=await read('./client-source.js');
  assert.ok(source.includes('[data-conversation-content]:has([data-atelier-view="workbench"]) > [data-width-handle]{display:none!important;pointer-events:none!important}'));
  assert.ok(source.includes("'data-atelier-view':'workbench'"));
  const dock=source.slice(source.indexOf('function Dock('),source.indexOf('function View('));assert.ok(!dock.includes('data-width-handle'));
});
test('setup is opt-in and popover uses the lighter base surface',async()=>{
  const source=await read('./client-source.js');
  assert.match(source,/background:light-dark\(#F8F9FA,var\(--dsw-alias-bg-layer-1\)\)/);assert.match(source,/box-shadow:0 0 2px color-mix\(in srgb,var\(--dsw-alias-label-primary\) 4%,transparent\),0 4px 16px/);
  assert.match(source,/async function finishSetup/);assert.match(source,/onboardingCompleted:true/);
  assert.equal(DEFAULT_SETTINGS.onboardingCompleted,false);
});

test('display resources and exported local files exist',async()=>{
  const pkg=JSON.parse(await read('./package.json'));
  for(const path of Object.values(pkg.exports).filter(path=>!path.includes('*')))await access(new URL(path,import.meta.url));
  for(const locale of ['en','zh']){const value=JSON.parse(await read(`./locale/${locale}.json`));assert.ok(value.meta.title);assert.ok(value.meta.description);}
  const svg=await read('./icon.svg');assert.match(svg,/<svg\b/);assert.ok(Buffer.byteLength(svg)<256*1024);
  assert.ok(pkg.files.includes('core.mjs'));assert.ok(!pkg.files.includes('node_modules'));
});

test('all metrics share hover and keyboard focus tooltip bindings',async()=>{
  const source=await read('./client-source.js');assert.ok(source.includes("'data-metric-tip':`${label}: ${value}`"));assert.ok(source.includes("className:'atelier-cell model','data-metric-tip':"));assert.ok(source.includes(':is(:hover,:focus-visible)::after'));
});

test('footer measures native dock but occupies only its content width',async()=>{const source=await read('./client-source.js');assert.ok(source.includes("closest('[data-composer-dock]')"));for(const kind of ['model','input','cache','output','cost','thought'])assert.ok(source.includes('data-hide-'+kind));assert.ok(!source.includes('setHiddenMetrics'));assert.ok(source.includes('.atelier-footer-container{position:relative;width:max-content;'));assert.ok(source.includes('card.clientWidth-nativeWidth'));assert.ok(source.includes('cell.getBoundingClientRect().width'));assert.ok(!source.includes('width<=760'));assert.ok(!source.includes('style:{width:`${width}px`'));});
