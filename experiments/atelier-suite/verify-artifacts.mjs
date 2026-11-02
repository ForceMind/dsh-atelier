import{readFile,writeFile}from'node:fs/promises';
const pkg=JSON.parse(await readFile(new URL('./package.json',import.meta.url),'utf8'));
const results=[];
for(const[name,wanted]of Object.entries(pkg.dependencies)){
  const base=new URL('./node_modules/'+name+'/',import.meta.url);
  const upstream=JSON.parse(await readFile(new URL('package.json',base),'utf8'));
  if(upstream.version!==wanted)throw Error(name+': version mismatch');
  const host=upstream.exports?.['.'];const hostPath=typeof host==='string'?host:host?.default??upstream.main;
  await readFile(new URL(hostPath,base));
  const client=upstream.exports?.['./client'];const clientPath=typeof client==='string'?client:client?.default;
  if(clientPath)await readFile(new URL(clientPath,base));
  const license=await readFile(new URL('LICENSE',base),'utf8');
  if(!license.trim())throw Error('Missing license '+name);
  results.push({name,version:upstream.version,host:hostPath,client:clientPath??null,license:upstream.license,requiredPeers:Object.keys(upstream.peerDependencies??{}).filter(key=>!upstream.peerDependenciesMeta?.[key]?.optional)});
}
console.log(JSON.stringify({scope:'artifact-presence-only; not runtime activation or complete peer compatibility',modules:results},null,2));
