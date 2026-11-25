// Suite-only build-time repair. Never rewrites an installed package or original source cache.
import{createHash}from'node:crypto';
export const BRE_HOST_SHA256='2f386e02e7764e3d7a758858be3e91678af0b960acafff726728ab44b5543ac5';
export const BRE_CALLBACK_NOTICE='Modified for Atelier Suite: preserve prepareCall configure and trailing arguments. Upstream dsh-better-reasoning-effort0.5.4, HaoyueQin, MIT. See ATELIER-CALLBACK-NOTICE.md.';
export function adaptBreCallback(source){
 if(typeof source!=='string'||createHash('sha256').update(source).digest('hex')!==BRE_HOST_SHA256)throw Error('Unreviewed BRE Host; refusing callback adaptation');
 const before='llm.prepareCall = (callConfig, signal) => origPrepare.call(llm, guardCallConfig(callConfig, piSection(), guardReport), signal);';
 const after='llm.prepareCall = (callConfig, signal, ...rest) => origPrepare.call(llm, guardCallConfig(callConfig, piSection(), guardReport), signal, ...rest);';
 if(source.split(before).length!==2)throw Error('BRE callback anchor mismatch');
 return '// '+BRE_CALLBACK_NOTICE+'\n'+source.replace(before,after).replace(/\n\/\/# sourceMappingURL=index\.js\.map\s*$/,'\n');
}
