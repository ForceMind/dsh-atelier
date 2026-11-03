// Build a fresh private fixture package pair; never publishes or changes profiles.
import{readFile,writeFile,mkdir,mkdtemp}from'node:fs/promises';
import{resolve,dirname,isAbsolute,relative}from'node:path';
import{fileURLToPath}from'node:url';
import{execFileSync}from'node:child_process';
import{createHash}from'node:crypto';
const root=fileURLToPath(new URL('../../',import.meta.url));
const version='1.7.0-suite.0';
const run=(command,args,cwd=root)=>execFileSync(command,args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
run(process.execPath,['build-client.mjs']);run('npm',['run','check']);
const[pkgFiles]=JSON.parse(run('npm',['pack','--dry-run','--ignore-scripts','--json']));
await mkdir(resolve(root,'.release'),{recursive:true});
const out=await mkdtemp(resolve(root,'.release/ownership-'));
const baseline=resolve(out,'baseline');await mkdir(baseline);
for(const file of pkgFiles.files){
 const target=resolve(baseline,file.path),rel=relative(baseline,target);
 if(isAbsolute(rel)||rel.startsWith('..')||/(^|\/)(\.env|\.npmrc|logs|data|node_modules|experiments)(\/|$)|\.(jsonl|log|db|sqlite)$/.test(file.path))throw Error('Unsafe release path '+file.path);
 let bytes=await readFile(resolve(root,file.path));
 if(file.path==='package.json'){const p=JSON.parse(bytes);p.version=version;bytes=Buffer.from(JSON.stringify(p,null,2)+'\n');}
 if(['host.js','client-source.js','client.js'].includes(file.path))bytes=Buffer.from(bytes.toString().replaceAll('atelier-1.6.0','atelier-'+version));
 await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);
}
const[packed]=JSON.parse(run('npm',['pack',baseline,'--ignore-scripts','--pack-destination',out,'--json']));
const candidate=resolve(out,'suite');await mkdir(candidate);
const src=fileURLToPath(new URL('./',import.meta.url));
for(const path of['index.js','cordis.patch.yml','icon.svg','README.md','THIRD-PARTY.md','locale/en.json','locale/zh.json']){const target=resolve(candidate,path);await mkdir(dirname(target),{recursive:true});await writeFile(target,await readFile(resolve(src,path)));}
const manifest=JSON.parse(await readFile(resolve(src,'package.json'),'utf8'));
manifest.version='0.1.0-ownership.0';manifest.dependencies['dsh-atelier-plugin']='file:'+resolve(out,packed.filename);
await writeFile(resolve(candidate,'package.json'),JSON.stringify(manifest,null,2)+'\n');
const[suite]=JSON.parse(run('npm',['pack',candidate,'--ignore-scripts','--pack-destination',out,'--json']));
const artifacts=[];
for(const p of[packed,suite]){const bytes=await readFile(resolve(out,p.filename));const integrity='sha512-'+createHash('sha512').update(bytes).digest('base64');if(integrity!==p.integrity)throw Error('Pack integrity mismatch');artifacts.push({name:p.name,version:p.version,filename:p.filename,integrity,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});}
const result={fixtureOnly:true,published:false,sourceCommit:run('git',['rev-parse','HEAD']).trim(),artifacts,limitations:['Suite contains a local file tarball dependency; not portable or publishable.','Daily profile is untouched. Installation, activation and feature parity are separate checks.']};
await writeFile(resolve(out,'manifest.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({output:out,...result},null,2));
