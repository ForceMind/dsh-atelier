import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { adaptAtelierRecovery } from '../../experiments/atelier-suite/atelier-recovery-adapter.mjs';
import { adaptAtelierRecoveryClient } from '../../experiments/atelier-suite/atelier-recovery-client-adapter.mjs';
import { adaptBreUaConflict } from '../../experiments/atelier-suite/bre-ua-conflict-adapter.mjs';
import { adaptBreInitialSelection } from '../../experiments/atelier-suite/bre-initial-selection-adapter.mjs';
import { SUITE_PACKAGE, renderCanonicalPatch, canonicalRows, assertCanonicalRows } from '../../experiments/atelier-suite/identity.mjs';
import { renderClient } from '../../experiments/atelier-suite/client-render.mjs';
import { adaptDraftDiagnostics } from '../draft/diagnostics.mjs';
import { adaptDraftHost, adaptDraftUI, adaptDraftClient, adaptDraftClientSource } from '../draft/adapt.mjs';
import { portHost, portClient, portForm } from '../context083/port.mjs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const historical = 'experiments/atelier-suite/';
const engineering = 'release-engineering/';
const recipe = engineering + 'recipe/suite-plan.mjs';
const lockPath = engineering + 'inputs/lock.json';
const reviewedPath = engineering + 'recipe/reviewed-inputs.json';
const localIndex = engineering + '.inputs/package-index.json';
const packageRoot = engineering + '.inputs/packages/';
const digest = data => createHash('sha256').update(data).digest('hex');
const hex = /^[a-f0-9]{64}$/;
const sri = /^sha512-[A-Za-z0-9+/]{86}==$/;
const byKey = (a,b) => a < b ? -1 : a > b ? 1 : 0;
const json = bytes => JSON.parse(bytes.toString('utf8'));
const encode = data => Buffer.from(JSON.stringify(data,null,2)+'\n');
const sort = arr => [...arr].sort(byKey);
const text = bytes => new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
const registry = 'https://registry.npmjs.org/';
const specs = [
  ['@deepseek-ai/cosmokit','1.8.6','02332c246aafba7f5f96246956e25e9693db91238a5105fde6d4e00c74036e78'],
  ['@deepseek-ai/schemastery','3.18.5','607d635582d0bdd87ff4b48a36fd0cc6de06786cd62ce69cda3f5604554f523e'],
  ['@standard-schema/spec','1.1.0','a7cb7268be280ab518d450f8c3b07c86f23417225c0ab53691ed59b3067cceaf'],
  ['dsh-atelier-plugin','1.7.0','6cc38d364a1fa764d229efc19c5543572ad505e2d2fc2e0d752f763ee103bba8'],
  ['dsh-better-reasoning-effort','0.5.4','1126e33bb6ff3b2ecbffb0efca2283710f65a3acec9a6fc99f368b55b9f1ea13'],
  ['dsh-context','0.83.0','fc9203b1a85081cf73808ca87e226219d111aebef7e2ce3dfc6a090649b421cc','sha512-A08NdB7OksVu1ywxkfok6OK9Eo1LmpBq/03LgX45Wr7Z9jDD8BE/NfFjEu2vViALwiWjXle8ZZIr7liH9MsVqA=='],
  ['zod','4.4.3','ee38f17f533fd500610685a483ae2f413c26f4eb33a51684314563c8d60f279c','sha512-ytENFjIJFl2UwYglde2jchW2Hwm4GJFLDiSXWdTrJQBIN9Fcyp7n4DhxJEiWNAJMV1/BqWfW/kkg71UDcHJyTQ=='],
  ['zod','4.6.7','84efd155bed93270286e793fc951be270b536cbd5b0eeb111f0fa3967201d698'],
];
const modules = {
  'dsh-atelier-plugin': {
    version:'1.7.0-suite-draft.1', notice:'ATELIER-RECOVERY-NOTICE.md',
    credit:'ForceMind, MIT. Recovery display labels unfinished requests without rewriting stored rows or settling partial usage as final. Automatic reply suggestions may abstain rather than repeat a completion report; manual drafting and native Send remain separate.',
    changes:{'host.js':s=>adaptDraftDiagnostics(adaptAtelierRecovery(s)),'client.js':s=>adaptDraftClient(adaptAtelierRecoveryClient(s)),'client-source.js':s=>adaptDraftClientSource(adaptAtelierRecoveryClient(s)),'reply-draft.mjs':adaptDraftHost,'reply-draft-ui.mjs':adaptDraftUI},
    expected:{'host.js':'8f5ac92d7f812f1840450cdd75aa3dcf4be3b5d70e52e8d3d28c2de008e7148f','client.js':'9bafd6c63b1d3fcb70fbc33d23b068f58a7a54c99ac13601fe0ab442f39ed753','client-source.js':'14da1698a0656b1322ff5df8ce4fb6be3e0c47ce3cc312120c3ddc1a9f7b0bb5','reply-draft.mjs':'26cff24e79a9710366faf057b31e903338bdc4e4179ba94b5b52972265f8ac42','reply-draft-ui.mjs':'c10db2316477abd2e31076b71c8452c379e3f9ef4791c7795d408c93f82eb4db'},
  },
  'dsh-better-reasoning-effort': {
    version:'0.5.4-suite-guards.1', notice:'ATELIER-CALLBACK-NOTICE.md',
    credit:'HaoyueQin, MIT. Preserves prepareCall callbacks and trailing arguments, suppresses ambiguous same-origin User-Agent overrides, and preserves first Client selection.',
    changes:{'lib/index.js':adaptBreUaConflict,'lib/client.js':adaptBreInitialSelection},
    expected:{'lib/index.js':'ae64311c1640cfa9aae2c3e4aa8326b87e710ef02e909a6a04e67c2aa3782d34','lib/client.js':'8053fe72a87b3ac90a48f41a55628288550586aa65deb4aecbfa6fc1658f62d5'},
  },
  'dsh-context': {
    version:'0.83.0-suite.dev.2',notice:'ATELIER-SUITE-NOTICE.md',
    credit:'bowenliang123, Apache-2.0. Routes settings navigation to the Suite package and uses its row form; releases Fleet observations on exceptional reads; repairs detail freshness and retry.',
    changes:{'lib/index.js':portHost,'lib/client.js':portClient},
    expected:{'lib/index.js':'bc28239de6314af22a6c9df792a7b793ae51dcb0eb3fdbd29105937caaeb23a6','lib/client.js':'ad3a6e793035ef0dfdde0b38facd88dcf280e9aad0ac842a0fa36290beede67e'},
  },
};
const carriedRoot = ['index.js','identity.mjs','icon.svg','locale/en.json','locale/zh.json'];
const sourcePaths = [recipe, ...['package.json','identity.mjs','cordis.patch.yml','index.js','context-config.mjs','client-render.mjs','icon.svg','locale/en.json','locale/zh.json','atelier-recovery-adapter.mjs','atelier-recovery-client-adapter.mjs','bre-ua-conflict-adapter.mjs','bre-callback-adapter.mjs','bre-initial-selection-adapter.mjs'].map(f=>historical+f),reviewedPath,engineering+'context083/port.mjs',engineering+'draft/adapt.mjs',engineering+'draft/diagnostics.mjs',engineering+'draft/policy.mjs',lockPath];
const life = ['preinstall','install','postinstall','prepublish','preprepare','prepare','postprepare'];

export function checkedRelative(value) {
  assert.ok(typeof value === 'string' && value.split('/').every(p=>p && p!=='.' && p!=='..' && !/[<>:"\\|?*\x00-\x1f]|[ .]$|^(?:CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³])(?:\.|$)/i.test(p)),`Unsafe relative path: ${value}`);
  return value;
}
function localPath(relative) {
  let target=repo;
  for(const segment of checkedRelative(relative).split('/')){
    target=path.join(target,segment);
    const st=fs.lstatSync(target,{throwIfNoEntry:false});
    assert.ok(st,`Missing recipe input: ${relative}; populate verified release inputs first`);
    assert.ok(!st.isSymbolicLink(),`Linked recipe input: ${relative}`);
  }
  return target;
}
function read(relative) {
  const p=localPath(relative);assert.ok(fs.lstatSync(p).isFile(),`Expected regular file: ${relative}`);
  return fs.readFileSync(p);
}
function enumerate(dir,rel='') {
  const result=[];
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const key=checkedRelative(rel+ent.name);
    if(ent.isDirectory())result.push(...enumerate(path.join(dir,ent.name),key+'/'));
    else {assert.ok(ent.isFile(),`Special or linked input: ${key}`);result.push(key);}
  }
  return result;
}
function pickFiles(record) {
  assert.ok(record.files && !Array.isArray(record.files) && typeof record.files==='object',`${record.name}: files index missing`);
  const result={};
  for(const file of sort(Object.keys(record.files))){
    checkedRelative(file);assert.ok(!['__proto__','constructor','prototype'].includes(file),`Unsafe index key: ${file}`);
    const e=record.files[file];
    assert.ok(e && hex.test(e.sha256) && Number.isSafeInteger(e.bytes) && e.bytes>=0 && [0o644,0o755].includes(e.mode),`Invalid lock member: ${file}`);
    const mode=e.mode;
    result[file]={bytes:e.bytes,mode,sha256:e.sha256};
  }
  return result;
}
function projection(pkg){return {name:pkg.name,version:pkg.version,location:pkg.location,archiveSha256:pkg.archiveSha256,files:pickFiles(pkg)};}
function noInstallScripts(m){for(const key of life)assert.ok(!Object.hasOwn(m.scripts??{},key),`${m.name}: prohibited lifecycle script ${key}`);}
function put(map,name,bytes,mode=0o644) {
  checkedRelative(name);assert.ok(!map.has(name),`Duplicate output: ${name}`);
  map.set(name,{bytes,mode});
}
export function describeEntries(files) {
  const rows=new Map(), aliases=new Map();
  function define(key,row){
    checkedRelative(key);
    const folded=key.toLowerCase();assert.ok(!aliases.has(folded)||aliases.get(folded)===key,`Windows path collision: ${key}`);aliases.set(folded,key);
    assert.ok(!rows.has(key)||rows.get(key).type===row.type,`File/directory collision: ${key}`);rows.set(key,row);
  }
  for(const [key,{bytes,mode}] of files){
    assert.ok(Buffer.isBuffer(bytes)&&[0o644,0o755].includes(mode),`Invalid file entry: ${key}`);
    define(key,{path:key,type:'file',mode,bytes:bytes.length,sha256:digest(bytes)});
    for(let i=key.indexOf('/');i>=0;i=key.indexOf('/',i+1)){
      const k=key.slice(0,i);define(k,{path:k,type:'directory',mode:0o755});
    }
  }
  return sort(rows.keys()).map(k=>rows.get(k));
}
export function validateIndex(lock,cache,historicLock) {
  assert.equal(lock.schemaVersion,1);assert.equal(cache.schemaVersion,1);assert.equal(historicLock.schemaVersion,1);
  const reviewed = specs.filter(([name, version]) => name !== 'dsh-context' && !(name==='zod'&&version==='4.4.3'));
  assert.deepEqual(sort(historicLock.packages.map(p=>p.name+'@'+p.version)),sort(reviewed.map(([n,v])=>n+'@'+v)), 'Incomplete or unexpected secondary package pins');
  for(const input of [lock,cache])assert.ok(Array.isArray(input.packages)&&input.packages.length===specs.length, 'Expected exactly eight reviewed input packages');
  const get=(list,name,version)=>{
    const matches=list.packages.filter(p=>p.name===name&&p.version===version);
    assert.equal(matches.length,1,`Expected one input for ${name}@${version}`);return matches[0];
  };
  return specs.map(([name,version,archivePin,sriPin])=>{
    const pkg=get(lock,name,version), stored=get(cache,name,version);
    const location=name==='zod'?'zod-'+version:name;
    assert.equal(pkg.location,location);
    assert.ok(hex.test(pkg.archiveSha256)&&sri.test(pkg.integrity),`${name}: invalid archive integrity`);
    if(archivePin)assert.equal(pkg.archiveSha256,archivePin,`${name}: archive SHA-256 drift`);
    if(sriPin)assert.equal(pkg.integrity,sriPin,`${name}: SRI drift`);
    assert.equal(pkg.url,registry+name+'/-/'+name.split('/').at(-1)+'-'+version+'.tgz',`${name}: unreviewed source URL`);
    assert.ok(Number.isSafeInteger(pkg.archiveBytes)&&pkg.archiveBytes>0,`${name}: invalid archive size`);
    const result=projection(pkg);assert.deepEqual(projection(stored),result,`${name}: local index differs from reviewed lock`);
    const historicalRecord=historicLock.packages.find(p=>p.name===name&&p.version===version);
    if(historicalRecord){
      assert.equal(pkg.integrity,historicalRecord.integrity,`${name}: historic SRI drift`);
      assert.equal(digest(JSON.stringify(result.files)),historicalRecord.filesSha256,`${name}: reviewed file fingerprint drift`);
    }
    return {...result,url:pkg.url,integrity:pkg.integrity};
  });
}
function packageFiles(record){
  const directory=packageRoot+record.location;
  assert.deepEqual(sort(enumerate(localPath(directory))),Object.keys(record.files),`${record.location}: unpacked member list drift`);
  const source=new Map();
  for(const [filename,info] of Object.entries(record.files)){
    const bytes=read(directory+'/'+filename);
    assert.equal(bytes.length,info.bytes,filename);
    assert.equal(digest(bytes),info.sha256,`${record.location}/${filename}`);
    put(source,filename,bytes,info.mode);
  }
  describeEntries(source); // fail on Windows aliases before applying transformations
  return source;
}
const get = (files,k)=>{const entry=files.get(k);assert.ok(entry,`Missing required file: ${k}`);return entry.bytes;};
function extensionManifest(name,m,mod){
  if(mod){
    assert.ok(Array.isArray(m.files));
    m.version=mod.version; m.files=[...new Set([...m.files,mod.notice])];
  }
  delete m.scripts; noInstallScripts(m);
  for(const key of ['dependencies','peerDependencies','optionalDependencies']){
    for(const v of Object.values(m[key]??{}))assert.ok(typeof v==='string'&&!/^(?:file:|link:|workspace:|[./\\]|[A-Z]:)/i.test(v),`${name}: nonportable ${key}`);
  }
  return m;
}

// This API only reads reviewed sources. The returned bytes and plan are detached views;
// no package manager, output writer, artifact materialization, or Host is invoked.
export async function buildSuitePlan({includeBytes=false,version}={}) {
  if (version !== undefined) assert.match(version,/^0\.1\.0-[a-z][a-z0-9-]*(?:\.(?:[a-z0-9-]*[a-z-][a-z0-9-]*|0|[1-9][0-9]*))*$/,'Use a 0.1.0 development prerelease, never a public stable version');
  const sources=Object.fromEntries(sourcePaths.map(f=>[f,read(f)]));
  const historicLock=json(sources[reviewedPath]);
  for(const f of ['package.json','identity.mjs','cordis.patch.yml','context-config.mjs','client-render.mjs',...carriedRoot]){
    assert.equal(digest(sources[historical+f]),historicLock.sourceFiles[f],`Unreviewed historical Suite input: ${f}`);
  }
  const records=validateIndex(json(sources[lockPath]),json(read(localIndex)),historicLock);
  const files=new Map(), dependencies={}, provenance=[];
  for(const rec of records){
    const {name,version: upstreamVersion}=rec;
    const packed=packageFiles(rec);
    const original=json(get(packed,'package.json'));
    assert.equal(original.name,name);assert.equal(original.version,upstreamVersion);
    const nested=name==='zod'&&upstreamVersion==='4.4.3';
    const prefix=nested?'node_modules/dsh-context/node_modules/zod/':'node_modules/'+name+'/';
    const mod=Object.hasOwn(modules,name)?modules[name]:null;
    const manifest=extensionManifest(name,original,mod);
    if(name==='dsh-atelier-plugin'){
      put(packed,'reply-auto-policy.mjs',sources[engineering+'draft/policy.mjs']);
      manifest.files=[...new Set([...manifest.files,'reply-auto-policy.mjs'])];
    }
    if(name==='dsh-context'){
      assert.deepEqual(manifest.dependencies,{zod:'4.4.3'});
      assert.equal(manifest.license,'Apache-2.0');
      assert.ok(!Object.hasOwn(manifest,'atelierSuiteModification'));
      manifest.atelierSuiteModification='Modified by Atelier Suite from dsh-context '+upstreamVersion+': internal variant metadata, notice inclusion and removal of package scripts. Upstream Apache-2.0 license and attribution are retained.';
    }
    packed.set('package.json',{bytes:encode(manifest),mode:packed.get('package.json').mode});
    if(mod){
      for(const [target,transform] of Object.entries(mod.changes)){
        const result=Buffer.from(transform(text(get(packed,target))));
        assert.equal(digest(result),mod.expected[target],`Unexpected transformed bytes: ${name}/${target}`);
        const output = name==='dsh-context' ? Buffer.concat([Buffer.from('// Modified by Atelier Suite from dsh-context '+upstreamVersion+'. See ATELIER-SUITE-NOTICE.md and LICENSE (Apache-2.0).\n'),result]) : result;
        packed.set(target,{bytes:output,mode:packed.get(target).mode});
      }
      put(packed,mod.notice,Buffer.from(`# Atelier Suite modification notice\n\nUpstream ${name} ${upstreamVersion}. ${mod.credit}\n\nOriginal license and applicable notices are retained. This is an internal Suite variant, not a separate upstream release.\n`));
    }
    const license=[...packed.keys()].filter(k=>/^licen[cs]e(?:[-.]|$)/i.test(k));
    assert.ok(license.length>0&&license.every(f=>get(packed,f).length),`${name}: missing upstream license`);
    for(const [filename,{bytes,mode}] of packed)put(files,prefix+filename,bytes,mode);
    if(!nested)dependencies[name]=manifest.version;
    provenance.push({name,upstreamVersion,bundledVersion:manifest.version,location:prefix,sourceArchiveSha256:rec.archiveSha256,integrity:rec.integrity,url:rec.url,license});
  }
  assert.equal(dependencies.zod,'4.6.7');assert.equal(Object.keys(dependencies).length,7);
  const rootManifest=json(sources[historical+'package.json']);assert.equal(rootManifest.name,SUITE_PACKAGE);assert.equal(rootManifest.private,true);
  for(const f of carriedRoot)put(files,f,sources[historical+f]);
  const patch=renderCanonicalPatch();assertCanonicalRows(canonicalRows());assert.equal(patch,text(sources[historical+'cordis.patch.yml']));put(files,'cordis.patch.yml',Buffer.from(patch));
  const form=portForm(text(sources[historical+'context-config.mjs']));
  put(files,'context-config.mjs',Buffer.from(form));put(files,'client.js',Buffer.from(renderClient(form)));
  put(files,'LICENSE',get(files,'node_modules/dsh-atelier-plugin/LICENSE'));
  put(files,'THIRD-PARTY-BUNDLED.json',encode({hostPeersExternal:true,dependencies:provenance}));
  put(files,'THIRD-PARTY.md',Buffer.from('# Bundled components\n\nSuite-owned code is MIT. Bundled components retain their own licenses; dsh-context is Apache-2.0 and is not relicensed by the Suite. License texts and notices are retained under the package paths listed below. React, Cordis and DSH services are supplied by the host. BrowserSkill and GameForge are not bundled.\n\n'+provenance.map(p=>`- ${p.name} ${p.upstreamVersion}: ${p.location} (${p.license.join(', ')})`).join('\n')+'\n\nSee THIRD-PARTY-BUNDLED.json for registry provenance and integrity.\n'));
  put(files,'README.md',Buffer.from('# Atelier Suite development candidate\n\nThree bundled modules, disabled by default: Atelier 1.7.0, BRE 0.5.4 and Context 0.83.0. Never select the standalone plugin layers together with the Suite, even when disabled. BrowserSkill stays independent.\n\nContext’s Insights settings entry opens the Suite package page; choose Context’s configure row there. Both navigation paths use the same reviewed Save/Cancel form. This is a private development composition; this recipe does not pack, install, launch or publish it.\n'));
  delete rootManifest.scripts;delete rootManifest.version;
  rootManifest.description='Private Atelier Suite 0.83.0 development candidate';
  rootManifest.dependencies=Object.fromEntries(sort(Object.keys(dependencies)).map(k=>[k,dependencies[k]]));
  rootManifest.bundledDependencies=Object.keys(rootManifest.dependencies);
  rootManifest.files=sort(files.keys()).filter(k=>!k.startsWith('node_modules/'));
  noInstallScripts(rootManifest);
  const inputs={sourceHashes:Object.fromEntries(sourcePaths.map(f=>[f,digest(sources[f])])),requestedVersion:version??null};
  const inputId=digest(encode(inputs));
  const manifest={...rootManifest,version:version??'0.1.0-context083.'+inputId};
  put(files,'package.json',encode(manifest));
  const entries=describeEntries(files);
  const plan={schemaVersion:1,kind:'suite-context083-in-memory-plan',manifest,inputs,inputId,treeSha256:digest(encode(entries)),entries,files:files.size,directories:entries.length-files.size,actionsAllowed:{stage:false,pack:false,install:false,host:false,publish:false}};
  return includeBytes?{plan,files}:plan;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.ok(process.argv.slice(2).every(v=>v==='--full'),'Usage: node suite-plan.mjs [--full]');
  const plan=await buildSuitePlan();const {entries,...summary}=plan;
  console.log(JSON.stringify(process.argv.includes('--full')?plan:summary,null,2));
}
