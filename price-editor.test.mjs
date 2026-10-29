import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePriceDraft,patchPriceRule,appendPriceRules} from './price-editor.mjs';
import {readFile} from 'node:fs/promises';
import {validateSettings} from './core.mjs';
const rule={provider:'channel',model:'model',currency:'USD',input:1,output:2,cacheRead:.1,cacheWrite:.2,cacheWrite12h:.3,requireCacheRates:true,longContext:{threshold:272000,input:2,output:4,cacheRead:.2,cacheWrite:.4,cacheWrite12h:.6},source:'https://example.com/price',checkedAt:'2026-10-27',label:'manual reference'};
test('price draft accepts exact core price schema including optional tier and provenance',()=>{
  const rows=parsePriceDraft(JSON.stringify([rule]));assert.deepEqual(rows,[rule]);assert.deepEqual(validateSettings({prices:rows}).prices,rows);
  for(const threshold of [100000,272000]){const row={...rule,longContext:{...rule.longContext,threshold}};assert.deepEqual(parsePriceDraft(JSON.stringify([row])),validateSettings({prices:[row]}).prices);}
});
test('invalid advanced JSON cannot produce a replacement and original rows stay intact',()=>{
  const before=structuredClone(rule);for(const text of ['{','{}','[null]',JSON.stringify([{...rule,input:''}]),JSON.stringify([{...rule,cacheRead:null}]),JSON.stringify([{...rule,provider:' prefix*'}]),JSON.stringify([{...rule,longContext:{threshold:1,input:1,output:2}}]),JSON.stringify([{...rule,unknown:1}])])assert.throws(()=>parsePriceDraft(text));assert.deepEqual(rule,before);
});
test('table edit preserves all unedited optional price fields and supports unset',()=>{
  const rows=[structuredClone(rule),{...rule,model:'other'}];const before=structuredClone(rows);const result=patchPriceRule(rows,0,'input',3);assert.equal(result[0].input,3);assert.deepEqual(result[0].longContext,rule.longContext);assert.equal(result[0].source,rule.source);assert.equal(result[0].requireCacheRates,true);assert.deepEqual(rows,before);assert.equal(result[1],rows[1]);assert.ok(!Object.hasOwn(patchPriceRule(rows,0,'cacheRead',undefined)[0],'cacheRead'));
});
test('settings groups retain panels, prefill both currencies, and keep custom rules behind advanced controls',async()=>{
  const source=await readFile(new URL('./client-source.js',import.meta.url),'utf8');const start=source.indexOf('        function Settings() {'),end=source.indexOf('        const pageTabs=',start);assert.ok(start>=0&&end>start);
  const settings=validateSettings({prices:[rule],onboardingCompleted:true});let cursor=0;const priceBook={peak:{USD:[{...rule,model:'usd-prefill'},{...rule,model:'deepseek-v4-pro'}],CNY:[{...rule,model:'cny-prefill',currency:'CNY'}]},offpeak:{USD:[{...rule,model:'usd-offpeak'},{...rule,model:'deepseek-v4-pro',input:.5}],CNY:[{...rule,model:'cny-offpeak',currency:'CNY'}]}};const values=[{settings,revision:1,promptLibrary:[],priceBook,priceCatalog:{entries:[],groups:[],pending:[]}},settings.phrases.join('\n'),JSON.stringify(settings.prices),'','',false,'custom','',null,'appearance',null,''];
  const h=(type,props,...children)=>({type,props:props??{},children:children.flat(Infinity)});const React={Fragment:'fragment',useState:initial=>[cursor<values.length?values[cursor++]:initial,()=>{}],useId:()=> 'test-id',useRef:value=>({current:value}),useEffect:()=>{}};
  const render=new Function('React','h','useT','call','parsePriceDraft','patchPriceRule','appendPriceRules',source.slice(start,end)+';return Settings();');
  const tree=render(React,h,()=>key=>key==='model'?'模型':key,async()=>{},parsePriceDraft,patchPriceRule,appendPriceRules);
  const nodes=[];const walk=node=>{if(!node||typeof node!=='object')return;nodes.push(node);node.children?.forEach(walk);};walk(tree);
  const panels=nodes.filter(node=>node.props.role==='tabpanel');assert.equal(panels.length,4);assert.equal(panels.filter(node=>node.props.hidden===false).length,1);
  const pricing=panels.find(node=>node.props.id.endsWith('-pricing-panel'));const pricingNodes=[];const gather=node=>{if(!node||typeof node!=='object')return;pricingNodes.push(node);node.children?.forEach(gather);};gather(pricing);
  for(const cls of ['atelier-price-scroll','atelier-price-book','atelier-price-custom','atelier-price-json'])assert.ok(pricingNodes.some(node=>String(node.props.className??'').split(' ').includes(cls)),cls);
  assert.ok(!source.slice(start,end).includes('importCatalog'));assert.ok(!pricingNodes.some(node=>node.type==='button'&&node.children.some(child=>typeof child==='string'&&/导入参考|catalogImport/.test(child))));
  assert.ok(pricingNodes.some(node=>node.props['data-price-currency']==='USD'));assert.ok(pricingNodes.some(node=>node.props['data-price-period']==='peak'));assert.ok(pricingNodes.some(node=>node.type==='td'&&node.children.includes('usd-prefill')));
  assert.equal(pricingNodes.filter(node=>node.type==='td'&&node.children.includes('deepseek-v4-pro')).length,2);
   const currencySelect=pricingNodes.find(node=>node.type==='select'&&node.props['aria-label']==='币种');assert.deepEqual(currencySelect.children.map(node=>node.props.value),['USD','CNY']);assert.ok(!pricingNodes.some(node=>node.type==='select'&&node.props['aria-label']==='DeepSeek 计价场景'));assert.ok(pricingNodes.some(node=>node.type==='details'&&node.props.className.includes('atelier-price-custom')&&!node.props.open));
  assert.equal(nodes.filter(node=>node.type==='textarea'&&node.props.id==='atelier-prices').length,1);assert.ok(nodes.some(node=>node.type==='button'&&node.props.type==='submit'));
});

test('reference import appends without overwrite and skips duplicate selectors',()=>{
  const rows=[rule];const source=[{...rule,input:99},{...rule,model:'new'},{...rule,model:'new',currency:'CNY'}];const result=appendPriceRules(rows,source);assert.equal(result.added,1);assert.equal(result.skipped,2);assert.equal(result.rows[0].input,1);assert.equal(result.rows[1].currency,'USD');source[1].input=999;assert.equal(result.rows[1].input,1);assert.throws(()=>appendPriceRules(Array.from({length:100},(_,i)=>({...rule,model:String(i)})),[{...rule,model:'new'}]));
});
