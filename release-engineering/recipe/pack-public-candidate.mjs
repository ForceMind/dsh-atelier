import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {buildSuitePlan,describeEntries} from './suite-plan.mjs';

const baseTree='367845c03c44556b190b2e6db270f773394ccd3d3f61102e1ba508e21f953580';
const baseInput='cf3b26eaf1cd4edc64b214fa7e4967852219db19d3d8cfe2341731a8d01e7a34';
const name='@forcemind/dsh-atelier-suite', version='0.1.0', registry='https://registry.npmjs.org/';
const releasePath='forcemind-dsh-atelier-suite-0.1.0.tgz';
const digest=(data,algorithm='sha256',encoding='hex')=>createHash(algorithm).update(data).digest(encoding);
const encode=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const readHere=file=>fs.readFileSync(new URL(file,import.meta.url));
const locale={en:{title:'Atelier Suite',description:'Atelier workbench, reasoning effort controls, and context insights for DeepSeek Harness.'},zh:{title:'Atelier Suite',description:'集成 Atelier 工作台、思考档位控制和 Context 上下文洞察。'}};

// Deliberately separate from the private planner. This function never writes.
export async function releasePlan(){
 const {plan:base,files}=await buildSuitePlan({includeBytes:true});
 assert.equal(base.treeSha256,baseTree);assert.equal(base.inputId,baseInput);
 assert.equal(base.manifest.name,name);assert.equal(base.manifest.private,true);
 const deliver=(p,bytes)=>files.set(p,{bytes,mode:files.get(p)?.mode??0o644});
 const docs={'README.md':readHere('README.release.en.md'),'README.zh-CN.md':readHere('README.release.zh-CN.md')};
 for(const [p,bytes] of Object.entries(docs))deliver(p,bytes);
 for(const [lang,meta] of Object.entries(locale))deliver(`locale/${lang}.json`,encode({meta}));
 const manifest={...base.manifest,version,description:'Atelier workbench, Better Reasoning Effort and Context for DeepSeek Harness',engines:{...base.manifest.engines,dsh:'0.2.2-rc.5'},publishConfig:{access:'public',registry},repository:{type:'git',url:'git+https://github.com/ForceMind/dsh-atelier.git'}};
 delete manifest.private;
 assert.ok(!manifest.scripts);
 manifest.files=[...new Set([...base.manifest.files,'README.zh-CN.md'])].sort();
 deliver('package.json',encode(manifest));
 const entries=describeEntries(files);
 const releaseInputs={baseInputId:base.inputId,baseTreeSha256:base.treeSha256,packerSha256:digest(readHere('pack-public-candidate.mjs')),documents:Object.fromEntries(Object.entries(docs).map(([p,b])=>[p,digest(b)]))};
 return {files,plan:{kind:'local-public-candidate',status:'not-authorized-for-upload',manifest,releaseInputs,sourceHashes:base.inputs.sourceHashes,inputId:digest(encode(releaseInputs)),treeSha256:digest(encode(entries)),entries}};
}
function field(header,value,offset,width){const b=Buffer.from(value);assert.ok(b.length<=width&&!b.includes(0));b.copy(header,offset);}
function oct(header,value,offset,width){assert.ok(Number.isSafeInteger(value)&&value>=0);const text=value.toString(8);assert.ok(text.length<width);field(header,text.padStart(width-1,'0'),offset,width-1);}
function tarHeader(item,mode,size,isDirectory){
 const header=Buffer.alloc(512);let prefix='';
 if(Buffer.byteLength(item)>100){const slash=item.lastIndexOf('/',item.length-2);assert.ok(slash>0);prefix=item.slice(0,slash);item=item.slice(slash+1);}
 field(header,item,0,100);oct(header,mode,100,8);oct(header,0,108,8);oct(header,0,116,8);oct(header,size,124,12);oct(header,0,136,12);
 header.fill(32,148,156);header[156]=isDirectory?53:48;field(header,'ustar',257,5);field(header,'00',263,2);field(header,prefix,345,155);
 field(header,header.reduce((a,b)=>a+b,0).toString(8).padStart(6,'0'),148,6);header[155]=32;return header;
}
function archive({files,plan}){
 assert.deepEqual(describeEntries(files),plan.entries);
 const chunks=[tarHeader('package/',0o755,0,true)];
 for(const entry of plan.entries){const dir=entry.type==='directory';chunks.push(tarHeader('package/'+entry.path+(dir?'/':''),entry.mode,entry.bytes??0,dir));if(!dir){const bytes=files.get(entry.path).bytes;chunks.push(bytes,Buffer.alloc((512-bytes.length%512)%512));}}
 chunks.push(Buffer.alloc(1024));return gzipSync(Buffer.concat(chunks),{level:9});
}
async function main(){
 assert.deepEqual(process.argv.slice(2),['--approved-local-candidate']);
 const parent=path.resolve(fileURLToPath(new URL('../',import.meta.url))), artifacts=path.join(parent,'.artifacts'),dest=path.join(artifacts,'public-candidate-0.1.0');
 assert.equal(fs.realpathSync(parent),parent);
 assert.equal(fs.lstatSync(dest,{throwIfNoEntry:false}),undefined,'Candidate output already exists');
 const left=await releasePlan(),right=await releasePlan();assert.deepEqual(left.plan,right.plan);
 const bytes=archive(left);assert.deepEqual(bytes,archive(right));
 fs.mkdirSync(artifacts,{recursive:true});assert.equal(fs.realpathSync(artifacts),artifacts);fs.mkdirSync(dest);
 const receipt={approval:'suite_release_candidate_local_pack',status:'local-candidate-not-published',version,archive:releasePath,archiveBytes:bytes.length,archiveSha256:digest(bytes),integrity:'sha512-'+digest(bytes,'sha512','base64'),treeSha256:left.plan.treeSha256,inputId:left.plan.inputId,independentEncodes:2,node:process.version,zlib:process.versions.zlib,publishInvocations:0};
 for(const [p,data] of [[releasePath,bytes],['plan.json',encode(left.plan)],['pack-result.json',encode(receipt)]])fs.writeFileSync(path.join(dest,p),data,{flag:'wx'});
 console.log(JSON.stringify(receipt));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
