"""Offline verification of the one approved local Suite candidate; never installs or uploads."""
import base64
import gzip
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import tarfile

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / '.artifacts/public-candidate-0.1.0'
ARCHIVE = 'forcemind-dsh-atelier-suite-0.1.0.tgz'

def need(condition, message):
    if not condition:
        raise ValueError(message)

def sha(data):
    return hashlib.sha256(data).hexdigest()

def encode(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()

def load(path):
    need(path.is_file() and path.resolve()==path, f'Not a plain in-scope file: {path.name}')
    return path.read_bytes()

def audit():
    need(DEST.resolve()==DEST, 'Linked output directory')
    need({p.name for p in DEST.iterdir()}=={ARCHIVE,'plan.json','pack-result.json'}, 'Unexpected or previously audited output')
    plan=json.loads(load(DEST/'plan.json')); receipt=json.loads(load(DEST/'pack-result.json')); raw=load(DEST/ARCHIVE)
    need(len(raw) == receipt['archiveBytes'] < 8_000_000, 'Unexpected archive size')
    need(receipt['archive']==ARCHIVE and receipt['version']=='0.1.0' and receipt['independentEncodes']==2 and receipt['publishInvocations']==0 and receipt['status']=='local-candidate-not-published', 'Invalid build receipt')
    integrity='sha512-'+base64.b64encode(hashlib.sha512(raw).digest()).decode()
    need(sha(raw)==receipt['archiveSha256'] and integrity==receipt['integrity'],'Archive identity differs')
    need(plan['status']=='not-authorized-for-upload' and sha(encode(plan['releaseInputs']))==plan['inputId']==receipt['inputId'],'Input identity differs')
    for p,h in plan['sourceHashes'].items():
        src=ROOT.parent/p
        need(src.resolve().is_relative_to(ROOT.parent) and sha(load(src))==h,f'Source input drift: {p}')
    need(sha(load(ROOT/'recipe/pack-public-candidate.mjs'))==plan['releaseInputs']['packerSha256'],'Packer drift')
    by_path={r['path']:r for r in plan['entries']}
    need(len(by_path)==len(plan['entries'])==1812 and sha(encode(plan['entries']))==plan['treeSha256']==receipt['treeSha256'],'Invalid tree identity')
    need(list(by_path)==sorted(by_path) and sum(e['type']=='file' for e in by_path.values())==1724,'Unexpected member inventory')
    expected={'package':{'type':'directory','mode':0o755}}
    expected.update({'package/'+p:e for p,e in by_path.items()})
    with gzip.GzipFile(fileobj=io.BytesIO(raw)) as gz:
        uncompressed=gz.read(25_000_001)
    need(len(uncompressed)<=25_000_000,'Expansion bound exceeded')
    contents={}; seen=[]
    with tarfile.open(fileobj=io.BytesIO(uncompressed),mode='r:') as t:
        for member in t:
            p=member.name
            need(p in expected and p not in seen, f'Unexpected member: {p}')
            e=expected[p]; kind=tarfile.DIRTYPE if e['type']=='directory' else tarfile.REGTYPE
            need(member.type==kind and member.mode==e['mode'] and member.mtime==member.uid==member.gid==0 and not member.linkname and not member.pax_headers and member.size==e.get('bytes',0),f'Invalid metadata: {p}')
            seen.append(p)
            if member.isfile():
                content=t.extractfile(member).read()
                need(sha(content)==e['sha256'],f'Member hash differs: {p}')
                contents[p[8:]]=content
        need(seen==list(expected),'Missing or reordered archive members')
        need(len(uncompressed)-t.offset==1024 and not any(uncompressed[t.offset:]), 'Unexpected archive trailer')
    manifest=json.loads(contents['package.json'])
    need(manifest==plan['manifest'] and manifest['name']=='@forcemind/dsh-atelier-suite' and manifest['version']=='0.1.0' and 'private' not in manifest,'Wrong root manifest')
    need(manifest['publishConfig']=={'access':'public','registry':'https://registry.npmjs.org/'} and manifest['engines']['dsh']=='0.2.2-rc.5','Unexpected release policy')
    need(set(manifest['files'])=={p for p in contents if not p.startswith('node_modules/') and p!='package.json'},'Top-level contents differ from manifest')
    for k in ('scripts','main'):
        need(k not in manifest,'Unexpected root entry: '+k)
    need(manifest['dsh']['bundle']['patch']=='./cordis.patch.yml' and manifest['exports']['./client']=='./client.js', 'Runtime surfaces drift')
    rows=[json.loads(l.strip()[2:]) for l in contents['cordis.patch.yml'].decode().splitlines() if l.startswith('    - ')]
    need([r['id'] for r in rows]==['atelier-suite','dsh-atelier','dsh-better-reasoning-effort','dsh-context'] and all(r.get('disabled') is True for r in rows[1:]),'Default composition drift')
    for p,b in contents.items():
        parts=PurePosixPath(p).parts
        need(not any(x in ('.git','.inputs','.artifacts','.scratch','.npmrc','.env') for x in parts),f'Private data path: {p}')
        need(not any(x in ('react','react-dom','cordis','browser-skill-dsh-plugin','dsh-gameforge') and i>0 and parts[i-1] in ('node_modules','@deepseek-ai','@forcemind','@wxg-prc-cpg') for i,x in enumerate(parts)),f'Excluded package: {p}')
        if p.endswith('/package.json'):
            m=json.loads(b); need(not m.get('scripts'), f'Unexpected packaged script: {p}')
    lock=json.loads(load(ROOT/'inputs/lock.json')); provenance=json.loads(contents['THIRD-PARTY-BUNDLED.json'])
    records=provenance['dependencies']
    need(provenance['hostPeersExternal'] is True and len(records)==len(lock['packages'])==8,'Wrong provenance count')
    need({r['location'] for r in records}=={'node_modules/'+p+'/' for p in manifest['bundledDependencies']}|{'node_modules/dsh-context/node_modules/zod/'},'Wrong bundled dependencies')
    for r in records:
        q,=[x for x in lock['packages'] if x['name']==r['name'] and x['version']==r['upstreamVersion']]
        need((r['integrity'],r['url'],r['sourceArchiveSha256'])==(q['integrity'],q['url'],q['archiveSha256']),'Upstream provenance drift')
        need(r['license'] and all(sha(contents[r['location']+x])==q['files'][x]['sha256'] for x in r['license']),'License drift')
    for p,version in [('node_modules/zod/','4.6.7'),('node_modules/dsh-context/node_modules/zod/','4.4.3')]:
        need(json.loads(contents[p+'package.json'])['version']==version,'Zod version drift')
    context='node_modules/dsh-context/'
    cm=json.loads(contents[context+'package.json'])
    need(cm['license']=='Apache-2.0' and cm['atelierSuiteModification'].startswith('Modified by Atelier Suite'),'Context manifest notice missing')
    for p in ('lib/index.js','lib/client.js'):
        need(contents[context+p].startswith(b'// Modified by Atelier Suite from dsh-context '),'Context JS notice missing')
    need(context+'ATELIER-SUITE-NOTICE.md' in contents,'Context attribution missing')
    for lang,template,p in [('en','README.release.en.md','README.md'),('zh','README.release.zh-CN.md','README.zh-CN.md')]:
        text=contents[p].decode(); need(contents[p]==load(ROOT/'recipe'/template) and sha(contents[p])==plan['releaseInputs']['documents'][p],'Installed documentation drift')
        need(json.loads(contents['locale/'+lang+'.json'])['meta']['title']=='Atelier Suite','Locale missing')
        need('standard-schema-spec' in text and '0.2.2-rc.5' in text and '0.1.0' in text,'Support policy missing')
        for link in re.findall(r'\[[^]]+\]\(([^)]+)\)',text):
            need(link in contents,'Broken distributed link: '+link)
    need(contents['icon.svg'].lstrip().startswith(b'<svg') and len(contents['icon.svg'])<=262144,'Invalid packaged icon')
    out={'status':'passed','scope':'local-only archive verification; not authorized for upload','archive':ARCHIVE,'archiveSha256':sha(raw),'integrity':integrity,'treeSha256':plan['treeSha256'],'inputId':plan['inputId'],'files':1724,'internalDirectories':88,'upstreamLicenseCopies':8,'installed':False,'published':False}
    with (DEST/'audit-result.json').open('xb') as f:
        f.write(encode(out))
    print(json.dumps(out,ensure_ascii=False))

if __name__=='__main__':
    audit()
