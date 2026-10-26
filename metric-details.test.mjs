import test from 'node:test';
import assert from 'node:assert/strict';
import {metricCopy,metricDetail,popoverPosition} from './metric-details.mjs';
const t=key=>metricCopy.zh[key]??key;
const sample={stats:{model:'gpt-example',provider:'provider',contextWindow:1000000,responses:10,attempts:12,turnStartedAt:1000,turnElapsedMs:5000,usage:{inputTokens:100716794,outputTokens:173110,cacheReadTokens:73211008,cacheWriteTokens:100,reasoningTokens:30}},last:{startedAt:1000,endedAt:5000,firstChunkAt:2200,reasoningStartedAt:2200,reasoningEndedAt:3300,usage:{inputTokens:400,outputTokens:50,reasoningTokens:10},price:{known:true,amount:.002,currency:'USD'}},cost:{totals:{USD:123.456},unknown:2,sources:['https://example.com/pricing (2026-10-26)']},running:false,now:9000};
test('all seven footer cells have substantive read-only detail data',()=>{
  for(const kind of ['model','clock','thought','input','output','cache','cost']){const result=metricDetail(kind,sample,t);assert.equal(result.kind,kind);assert.ok(result.summary.length>10);assert.ok(result.rows.length>=2);}
  assert.equal(metricDetail('input',sample,t).value,'100,716,794 tokens');
  assert.match(metricDetail('input',sample,t).summary,/重复/);
  assert.match(metricDetail('model',sample,t).summary,/不证明/);
  assert.equal(metricDetail('invalid',sample,t),null);
});
test('cost details show known subtotal, unknown count and bounded provenance',()=>{
  const result=metricDetail('cost',sample,t);assert.equal(result.value,'$123.46');assert.ok(result.rows.some(row=>row.label===t('detailUnknown')&&row.value==='2'));assert.ok(result.rows.some(row=>row.value.includes('https://example.com')));assert.match(result.summary,/不是余额/);
  const huge=metricDetail('cost',{...sample,cost:{totals:{USD:1},unknown:1,sources:Array(20).fill('x'.repeat(3000))}},t);assert.equal(huge.rows.filter(row=>row.label===t('detailSource')).length,12);assert.ok(huge.rows.every(row=>row.value.length<=2048));
});
test('missing reasoning and cost remain unknown instead of fabricated zero',()=>{
  assert.equal(metricDetail('thought',{stats:null,last:null},t).value,'—');
  assert.equal(metricDetail('cost',{cost:null},t).value,t('detailSourcesNone'));
  const model=metricDetail('model',{stats:null},t);assert.equal(model.value,t('detailMissing'));
  assert.equal(metricDetail('clock',{stats:{turnStartedAt:1000},running:true,now:7000},t).value,'6.0s');
});
test('cache ratio uses input buckets, not output or context window',()=>{
  const detail=metricDetail('cache',{stats:{contextWindow:1e6,usage:{inputTokens:100,cacheReadTokens:300,cacheWriteTokens:0,outputTokens:10000}}},t);assert.ok(detail.rows.some(row=>row.label===t('detailCacheRatio')&&row.value==='75.0%'));
});
test('popover sits above footer and remains inside narrow viewport',()=>{
  assert.deepEqual(popoverPosition({left:500,top:700,bottom:720},{width:360,height:250},{width:1000,height:800}),{left:500,top:442,maxWidth:976,maxHeight:776});
  const narrow=popoverPosition({left:300,top:500,bottom:520},{width:360,height:400},{width:320,height:568});assert.equal(narrow.left,12);assert.ok(narrow.top>=12);assert.equal(narrow.maxWidth,296);assert.equal(narrow.maxHeight,544);
  const below=popoverPosition({left:40,top:20,bottom:40},{width:200,height:100},{width:500,height:500});assert.equal(below.top,48);
});
test('compact popover keeps first screen short and moves provenance to more details',()=>{
  for(const kind of ['model','clock','thought','input','output','cache','cost']){const detail=metricDetail(kind,sample,t);assert.ok(detail.displayRows.length<=4);assert.ok(detail.brief.length<40);assert.ok(!detail.displayRows.some(row=>row.label===t('detailScope')||row.label===t('detailSource')));}
  const cost=metricDetail('cost',sample,t);assert.ok(cost.moreRows.some(row=>row.label===t('detailSource')));assert.equal(cost.displayRows.filter(row=>row.value==='$123.46').length,1);
  const cache=metricDetail('cache',sample,t);assert.equal(cache.displayRows.filter(row=>row.value==='73,211,008 tokens').length,1);
});

test('cost breakdown exposes separate currency buckets and keeps unknown visible',()=>{
  const detail=metricDetail('cost',{...sample,cost:{totals:{USD:10,CNY:20},unknown:3,components:{USD:{input:2,output:6,cacheRead:1,cacheWrite:1},CNY:{input:4,output:12,cacheRead:2,cacheWrite:2}},sources:[]}},t);
  assert.equal(detail.displayRows.length,6);assert.ok(detail.displayRows.some(row=>row.label===t('costInput')&&row.value==='$2.00 + ¥4.00'));assert.ok(detail.displayRows.some(row=>row.label===t('detailUnknown')&&row.value==='3'));
});

test('cache detail distinguishes missing latest fields and reported-only recent samples',()=>{
  const detail=metricDetail('cache',{...sample,stats:{...sample.stats,cacheAccounting:{input:100,read:80}},last:{cache:{ratio:null}},cache:{weightedRatio:.75,missing:4,total:20}},t);
  assert.equal(detail.displayRows[0].value,'—');assert.equal(detail.displayRows[1].value,'75.0%');assert.equal(detail.displayRows[2].value,'80.0%');assert.equal(detail.displayRows[3].value,'4 / 20');
});

test('detail builder never consumes request bodies or mutates input',()=>{
  const input=structuredClone(sample);input.last.request={messages:[{text:'PRIVATE_BODY_FIXTURE'}]};const before=structuredClone(input);const result=JSON.stringify(['model','clock','thought','input','output','cache','cost'].map(kind=>metricDetail(kind,input,t)));assert.ok(!result.includes('PRIVATE_BODY_FIXTURE'));assert.deepEqual(input,before);
});
