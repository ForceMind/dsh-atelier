import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import {buildSuitePlan,checkedRelative,describeEntries,validateIndex} from './suite-plan.mjs';
import {canonicalRows,CONTEXT_CONFIG_KEY,SUITE_PACKAGE} from '../../experiments/atelier-suite/identity.mjs';

const readJSON=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
const digest=b=>createHash('sha256').update(b).digest('hex');
const bytes=(bundle,k)=>{const f=bundle.files.get(k);assert.ok(f,k);return f.bytes;};
const parsed=(b,k)=>JSON.parse(bytes(b,k).toString());
const ctx='node_modules/dsh-context/';
const nested=ctx+'node_modules/zod/';
const baseZod='node_modules/zod/';
const lock=readJSON('../inputs/lock.json');
const cache=readJSON('../.inputs/package-index.json');
const historic=readJSON('./reviewed-inputs.json');
const first=buildSuitePlan({includeBytes:true});

test('build repeats exactly and returned bytes cannot affect a later build',async()=>{
  const a=await first,b=await buildSuitePlan({includeBytes:true});
  assert.deepEqual(a.plan,b.plan);assert.deepEqual(a.files,b.files);
  assert.equal(a.plan.files,1723);assert.equal(a.plan.directories,88);
  assert.equal(a.plan.treeSha256,digest(JSON.stringify(a.plan.entries,null,2)+'\n'));
  assert.equal(a.plan.inputId,digest(JSON.stringify(a.plan.inputs,null,2)+'\n'));
  assert.equal(a.plan.manifest.version,'0.1.0-context083.'+a.plan.inputId);
  assert.deepEqual(a.plan.actionsAllowed,{stage:false,pack:false,install:false,host:false,publish:false});
  b.files.get('README.md').bytes.fill(0);b.files.clear();b.plan.manifest.private=false;
  assert.deepEqual(a.plan,await buildSuitePlan());assert.notEqual(bytes(a,'README.md')[0],0);
});

test('CLI resolves locked inputs from its own worktree when cwd is elsewhere',async()=>{
  const p=fileURLToPath(new URL('./suite-plan.mjs',import.meta.url));
  const r=spawnSync(process.execPath,[p],{cwd:os.tmpdir(),encoding:'utf8',timeout:30000});
  assert.ifError(r.error);assert.equal(r.status,0,r.stderr);assert.equal(r.stderr,'');
  const {entries,...expected}=(await first).plan;
  assert.deepEqual(JSON.parse(r.stdout),expected);
});

test('canonical layer and truthful private manifest expose no standalone dependencies',async()=>{
  const build=await first;
  const manifest=parsed(build,'package.json');assert.deepEqual(build.plan.manifest,manifest);
  assert.equal(manifest.private,true);assert.equal(manifest.name,SUITE_PACKAGE);assert.ok(!manifest.scripts&&!manifest.publishConfig);
  assert.deepEqual(manifest.bundledDependencies,Object.keys(manifest.dependencies));assert.equal(manifest.bundledDependencies.length,7);
  assert.deepEqual(manifest.dsh.client.inject,['@deepseek-ai/dsh-client-ui-plugin-manager','dsh-context']);
  assert.deepEqual(manifest.dsh.bundle,{patch:'./cordis.patch.yml'});
  assert.ok(!JSON.stringify(manifest).includes('file:'));
  const rows=bytes(build,'cordis.patch.yml').toString().split('\n').filter(l=>l.startsWith('    - ')).map(l=>JSON.parse(l.slice(6)));
  assert.deepEqual(rows,canonicalRows());assert.ok(rows.slice(1).every(r=>r.disabled));
  assert.ok(![...build.files.keys()].some(p=>/(?:^|\/)(?:browser-skill-dsh-plugin|dsh-gameforge|react-dom|react|cordis)\//i.test(p)));
  await assert.rejects(buildSuitePlan({version:'0.1.0'}),/development prerelease/);
});

test('exact dual-Zod layouts and provenance preserve all upstream files except declared modifications',async()=>{
  const build=await first;
  const explicit={
    'dsh-atelier-plugin':['package.json','host.js','client.js','client-source.js','reply-draft.mjs','reply-draft-ui.mjs'],
    'dsh-better-reasoning-effort':['package.json','lib/index.js','lib/client.js'],
    'dsh-context':['package.json','lib/index.js','lib/client.js'],
  };
  const notes={
    'dsh-atelier-plugin':'ATELIER-RECOVERY-NOTICE.md',
    'dsh-better-reasoning-effort':'ATELIER-CALLBACK-NOTICE.md',
    'dsh-context':'ATELIER-SUITE-NOTICE.md',
  };
  for(const p of lock.packages){
    const prefix=p.name==='zod'&&p.version==='4.4.3'?nested:'node_modules/'+p.name+'/';
    const actual=[...build.files.keys()].filter(k=>k.startsWith(prefix)&&!(prefix===ctx&&k.startsWith(nested))).map(k=>k.slice(prefix.length)).sort();
    const added=p.name==='dsh-atelier-plugin'?['reply-auto-policy.mjs']:[];
    assert.deepEqual(actual,[...Object.keys(p.files),...added,...(notes[p.name]?[notes[p.name]]:[])].sort(),prefix);
    if(added.length){
      assert.deepEqual(bytes(build,prefix+added[0]),fs.readFileSync(new URL('../draft/policy.mjs',import.meta.url)));
      assert.ok(parsed(build,prefix+'package.json').files.includes(added[0]));
      assert.equal(parsed(build,prefix+'package.json').version,'1.7.0-suite-draft.1');
    }
    for (const [k,info] of Object.entries(p.files)) {
      if((explicit[p.name]??['package.json']).includes(k))continue;
      assert.equal(digest(bytes(build,prefix+k)),info.sha256,`${prefix}${k}`);
      assert.equal(build.files.get(prefix+k).mode,info.mode);
    }
    assert.equal(parsed(build,prefix+'package.json').scripts,undefined);
  }
  assert.equal(parsed(build,baseZod+'package.json').version,'4.6.7');
  assert.equal(parsed(build,nested+'package.json').version,'4.4.3');
  const context=parsed(build,ctx+'package.json');assert.deepEqual(context.dependencies,{zod:'4.4.3'});
  const baseline=readJSON('../.inputs/packages/dsh-context/package.json');assert.deepEqual(context.dsh,baseline.dsh);
  assert.equal(context.version,'0.83.0-suite.dev.2');
  assert.equal(context.license,'Apache-2.0');
  assert.match(context.atelierSuiteModification,/^Modified by Atelier Suite from dsh-context 0\.83\.0:/);
  const prefix='// Modified by Atelier Suite from dsh-context 0.83.0. See ATELIER-SUITE-NOTICE.md and LICENSE (Apache-2.0).\n';
  for(const [f,hash] of [['lib/index.js','bc28239de6314af22a6c9df792a7b793ae51dcb0eb3fdbd29105937caaeb23a6'],['lib/client.js','ad3a6e793035ef0dfdde0b38facd88dcf280e9aad0ac842a0fa36290beede67e']]){
    const output=bytes(build,ctx+f);
    assert.equal(output.subarray(0,Buffer.byteLength(prefix)).toString(),prefix);
    assert.equal(digest(output.subarray(Buffer.byteLength(prefix))),hash);
  }
  assert.match(bytes(build,'THIRD-PARTY.md').toString(),/Suite-owned code is MIT.*dsh-context is Apache-2.0/);
  const info=parsed(build,'THIRD-PARTY-BUNDLED.json');assert.equal(info.hostPeersExternal,true);assert.equal(info.dependencies.length,8);
  for(const p of info.dependencies){
    const upstream=lock.packages.find(x=>x.name===p.name&&x.version===p.upstreamVersion);
    assert.equal(p.sourceArchiveSha256,upstream.archiveSha256);assert.equal(p.integrity,upstream.integrity);
    for(const license of p.license)assert.equal(digest(bytes(build,p.location+license)),upstream.files[license].sha256);
  }
});

test('regenerated Suite Client factory points at the one canonical row form',async()=>{
  const build=await first;
  let registration;
  const spec=bytes(build,'client.js').toString();
  vm.runInNewContext(spec,{window:{__ModuleLoader__:{load(entry){assert.equal(registration,undefined);registration=entry;}}}});
  assert.equal(registration.id,SUITE_PACKAGE);assert.equal(typeof registration.factory,'function');
  assert.ok(spec.includes(JSON.stringify(CONTEXT_CONFIG_KEY)));assert.ok(spec.includes("{key:'overviewAutoSteps'"));assert.ok(spec.includes("{key:'defaultOverviewRange'"));
});

test('cache index mismatch and unreviewed supply-chain selectors fail closed',()=>{
  assert.equal(validateIndex(lock,cache,historic).length,8);
  const incomplete=structuredClone(historic);incomplete.packages.pop();
  assert.throws(()=>validateIndex(lock,cache,incomplete),/secondary package pins/);
  const fingerprint=structuredClone(historic);fingerprint.packages[0].filesSha256='0'.repeat(64);
  assert.throws(()=>validateIndex(lock,cache,fingerprint),/reviewed file fingerprint drift/);
  const edited=structuredClone(cache);const entry=edited.packages.find(p=>p.name==='dsh-context');entry.files['lib/index.js'].sha256='0'.repeat(64);
  assert.throws(()=>validateIndex(lock,edited,historic),/local index differs/);
  const pathEscape=structuredClone(lock);pathEscape.packages.find(p=>p.name==='dsh-context').location='../../elsewhere';
  assert.throws(()=>validateIndex(pathEscape,cache,historic));
  const badSource=structuredClone(lock);badSource.packages.find(p=>p.name==='dsh-context').url='https://other.invalid/package.tgz';
  assert.throws(()=>validateIndex(badSource,cache,historic),/unreviewed source URL/);
  const badIdentity=structuredClone(lock);badIdentity.packages.find(p=>p.name==='dsh-context').archiveSha256='0'.repeat(64);
  assert.throws(()=>validateIndex(badIdentity,cache,historic),/SHA-256 drift/);
});

test('member paths fail closed on Windows aliases and traversal',()=>{
  for(const p of ['', '/root', '../escape','staged/..','a/./b','a\\b','space ','trailing.','NUL.txt','COM¹.log','x:y'])assert.throws(()=>checkedRelative(p));
  const file={bytes:Buffer.from('fixture'),mode:0o644};
  assert.throws(()=>describeEntries(new Map([['a/a',file],['A/b',file]])),/Windows path collision/);
  assert.throws(()=>describeEntries(new Map([['a',file],['a/b',file]])),/File\/directory collision/);
});
