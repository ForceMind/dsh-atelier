const priceEditorOwn=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const priceEditorPlain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
const priceEditorNumericKeys=['input','output','cacheRead','cacheWrite','cacheWrite12h'];
const priceEditorTopKeys=new Set(['provider','model','currency',...priceEditorNumericKeys,'requireCacheRates','longContext','source','checkedAt','label']);
const priceEditorLongKeys=new Set(['threshold',...priceEditorNumericKeys]);
function priceEditorRates(row,path){for(const key of ['input','output'])if(!priceEditorOwn(row,key))throw new Error(`${path}.${key} is required`);for(const key of priceEditorNumericKeys)if(priceEditorOwn(row,key)&&(typeof row[key]!=='number'||!Number.isFinite(row[key])||row[key]<0||row[key]>1000000))throw new Error(`${path}.${key}: use a number from 0 to 1000000`);}
/** Parse and validate only prices, preserving valid optional fields and ordering. */
export function parsePriceDraft(text){
  const rows=JSON.parse(text);if(!Array.isArray(rows)||rows.length>100)throw new Error('Prices must be an array with at most 100 rules');
  rows.forEach((row,index)=>{const path=`prices[${index}]`;if(!priceEditorPlain(row))throw new Error(`${path}: expected an object`);for(const key of Object.keys(row))if(!priceEditorTopKeys.has(key))throw new Error(`${path}.${key}: unknown field`);
    for(const[key,max]of[['provider',200],['model',300]])if(typeof row[key]!=='string'||!row[key].trim()||row[key]!==row[key].trim()||row[key].length>max||row[key].includes('\0'))throw new Error(`${path}.${key}: enter a nonblank selector without surrounding spaces`);
    if(row.provider.includes('*')&&row.provider!=='*')throw new Error(`${path}.provider: use an exact provider or *`);
    if(typeof row.currency!=='string'||! /^[A-Z]{3}$/.test(row.currency))throw new Error(`${path}.currency: use a three-letter uppercase currency`);priceEditorRates(row,path);
    if(priceEditorOwn(row,'requireCacheRates')&&typeof row.requireCacheRates!=='boolean')throw new Error(`${path}.requireCacheRates: expected a boolean`);
    if(priceEditorOwn(row,'longContext')){const long=row.longContext;if(!priceEditorPlain(long))throw new Error(`${path}.longContext: expected an object`);for(const key of Object.keys(long))if(!priceEditorLongKeys.has(key))throw new Error(`${path}.longContext.${key}: unknown field`);if(![100000,272000].includes(long.threshold))throw new Error(`${path}.longContext.threshold: choose 100000 or 272000`);priceEditorRates(long,`${path}.longContext`);}
    for(const key of ['source','checkedAt','label'])if(priceEditorOwn(row,key)&&(typeof row[key]!=='string'||row[key].includes('\0')||row[key].length>(key==='source'?2048:300)))throw new Error(`${path}.${key}: invalid text`);
  });return rows;
}
/** Table edits preserve every unrelated property, including provenance and tiers. */
export function patchPriceRule(rows,index,key,value){if(!Array.isArray(rows)||!rows[index])throw new Error('Price row not found');return rows.map((row,at)=>{if(at!==index)return row;const next={...row};if(value===undefined)delete next[key];else next[key]=value;return next;});}
export function appendPriceRules(rows,entries){const additions=[];for(const entry of entries)if(!rows.some(row=>row.provider===entry.provider&&row.model===entry.model)&&!additions.some(row=>row.provider===entry.provider&&row.model===entry.model))additions.push(structuredClone(entry));if(rows.length+additions.length>100)throw new Error('Prices must contain at most 100 rules');return {rows:[...rows,...additions],added:additions.length,skipped:entries.length-additions.length};}
