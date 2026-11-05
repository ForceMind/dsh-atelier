// Build-time adapter ONLY for reviewed dsh-context0.73.3 bytes. Never edits installed packages.
import{createHash}from'node:crypto';
export const UPSTREAM_CLIENT_SHA256='a3c02b20d80a2d8dd220bb1500cc2df9b6a77e9867a5606e5c92e4699e3a5f2b';
export const SUITE_PACKAGE='@forcemind/dsh-atelier-suite';
function once(source,before,after){if(source.split(before).length!==2)throw Error('Navigation adapter anchor mismatch');return source.replace(before,()=>after);}
export function adaptContextNavigation(source){
 if(createHash('sha256').update(source).digest('hex')!==UPSTREAM_CLIENT_SHA256)throw Error('Unreviewed upstream Client; refusing navigation adaptation');
 const start=source.indexOf('function jo('),end=source.indexOf('let Mo=',start);if(start<0||end<0)throw Error('Missing navigation helper');
 // Remove the original DOM click/poll helper. No global document/window hooks are added.
 source=source.slice(0,start)+`let atelierSuiteNavigation;function jo(){if(!atelierSuiteNavigation)throw Error('Suite plugin navigation unavailable');atelierSuiteNavigation.openBundle('${SUITE_PACKAGE}')} `+source.slice(end);
 source=once(source,'function Nu(e){if(Ve(e,ju,Mu))return;',"function Nu(e){if(Ve(e,ju,Mu))return;const suiteNavigation=e.pluginNavigation;atelierSuiteNavigation=suiteNavigation;e.effect(()=>()=>{if(atelierSuiteNavigation===suiteNavigation)atelierSuiteNavigation=void 0});");
 source=once(source,'{name:`plugins.bundle.config`,key:Au,locale:Au,inject:d}',`{name:\`plugins.bundle.config\`,key:'${SUITE_PACKAGE}',locale:Au,inject:d}`);
 source=once(source,'inject:[`slots`,`locale`],apply:Nu','inject:[`slots`,`locale`,`pluginNavigation`],apply:Nu');
 source=source.replace(/\n\/\/# sourceMappingURL=client\.js\.map\s*$/,'\n');
 return '// Modified for Atelier Suite navigation. Upstream dsh-context0.73.3 (bowenliang123), Apache-2.0. See ATELIER-NAVIGATION-NOTICE.md.\n'+source;
}
