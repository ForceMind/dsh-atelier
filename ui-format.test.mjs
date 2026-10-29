import test from 'node:test';
import assert from 'node:assert/strict';
import {liveOutputThroughput,outputThroughput,compactNumber,compactDuration,compactMoney,modelFamily} from './ui-format.mjs';
test('live average updates with arriving tokens and pauses, clearly labeled estimated',()=>{
  const record={state:'streaming',endedAt:null,firstOutputAt:1000,outputEstimate:100};
  assert.equal(liveOutputThroughput(record,2000).label,'≈100.0 tok/s');
  assert.equal(liveOutputThroughput(record,3000).label,'≈50.0 tok/s');
  assert.equal(liveOutputThroughput({...record,outputEstimate:300},3000).label,'≈150.0 tok/s');
  assert.equal(liveOutputThroughput(record,1100),null);assert.equal(liveOutputThroughput({...record,endedAt:3000},3000),null);assert.equal(liveOutputThroughput({...record,usage:{outputTokens:300}},3000),null);
});
test('output speed uses actual API tokens after first output and rejects missing or failed timing',()=>{
  const record={state:'stop',startedAt:0,firstChunkAt:1000,firstOutputAt:5000,generationEndedAt:15000,endedAt:16000,usage:{outputTokens:1234}};
  const rate=outputThroughput(record);assert.equal(rate.label,'123.4 tok/s');assert.equal(rate.generationMs,10000);assert.equal(rate.outputTokens,1234);
  for(const patch of [{state:'streaming',endedAt:null},{state:'exception'},{usage:null},{generationEndedAt:5000},{usage:{outputTokens:NaN}},{firstOutputAt:null,firstTextAt:null}])assert.equal(outputThroughput({...record,...patch}).label,'—');
  assert.equal(outputThroughput({...record,usage:{outputTokens:0}}).label,'0.0 tok/s');
});

test('screenshot token values compress to K/M and retain sensible boundary rounding',()=>{
  assert.equal(compactNumber(100716794),'100.7M');assert.equal(compactNumber(173110),'173.1K');assert.equal(compactNumber(73211008),'73.2M');
  for(const [input,expected] of [[0,'0'],[999,'999'],[1000,'1K'],[999950,'1M'],[1e9,'1B'],[-1,'—'],[NaN,'—']])assert.equal(compactNumber(input),expected);
});
test('turn durations do not spill raw thousands of seconds',()=>{
  assert.equal(compactDuration(3454700),'57m34s');assert.equal(compactDuration(3600000),'1h00m');assert.equal(compactDuration(65000),'1m05s');assert.equal(compactDuration(5200),'5.2s');assert.equal(compactDuration(900),'900ms');assert.equal(compactDuration(null),'—');
});
test('API equivalent amount includes correct currency and small fractions',()=>{
  assert.equal(compactMoney(12.3456,'USD'),'$12.35');assert.equal(compactMoney(.00012,'USD'),'$0.00012');assert.equal(compactMoney(2,'CNY'),'¥2.00');assert.equal(compactMoney(null),'—');
});
test('GPT family aliases choose the orbit mark without claiming official model identity',()=>{
  assert.equal(modelFamily('gpt-6.1-sol'),'gpt');assert.equal(modelFamily('openai/gpt-5.2'),'gpt');assert.equal(modelFamily('o3-mini'),'gpt');assert.equal(modelFamily('deepseek-chat'),'deepseek');assert.equal(modelFamily('claude-sonnet-4'),'claude');assert.equal(modelFamily('myapi'),'generic');
});
