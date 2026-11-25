import{SUITE_PACKAGE,CONTEXT_CONFIG_KEY}from'./identity.mjs';
// Pure renderer: no file writes on import. Build/check callers choose their operation.
export function renderClient(source){
 const anchor="import{CONTEXT_CONFIG_KEY}from'./identity.mjs';\n";
 if(source.split(anchor).length!==2)throw Error('Expected exact identity import');
 const inline=source.replace(anchor,'').replaceAll('export async function ','async function ').replaceAll('export function ','function ').replaceAll('export const ','const ');
 if(inline.includes('export ')||inline.includes('import '))throw Error('Unexpected Suite client module syntax');
 return `window.__ModuleLoader__.load({id:${JSON.stringify(SUITE_PACKAGE)},factory(require){\nconst React=require('react');\nconst CONTEXT_CONFIG_KEY=${JSON.stringify(CONTEXT_CONFIG_KEY)};\n${inline}\nreturn {inject:['slots','locale'],apply(ctx){ctx.effect(()=>installContextConfig(ctx,React));}};\n}});\n`;
}
