// Curated official-document snapshots, not a live price feed.
// Never use a display-name glob as proof of a reseller's upstream model.
const claudeSource='https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/claude-api/shared/model-migration.md';
const userSource='user-provided:2026-10-26; third-party reference https://api.foo/docs/china-llm-api-pricing/';
const userRate=(model,input,cacheRead,output,period='mainland reference',currency='CNY')=>Object.freeze({provider:'*',model,currency,input,cacheRead,output,requireCacheRates:true,source:currency==='USD'?'user-provided:2026-10-26; third-party reference https://api.foo/docs/en/kimi-api/':userSource,checkedAt:'2026-10-26',label:`User-supplied, independently unverified; ${period}; ${currency}/M tokens; verify exact API ID; no verified cache-write rate or automatic schedule`});
export const USER_PRICE_GROUPS=Object.freeze([
  Object.freeze({id:'user-usd',title:'用户提供 · Kimi / GLM 美元参考价',basis:'user-supplied-unverified',warning:'未独立核验；美元/百万 tokens，不是人民币换算价。模型ID须与渠道核对；已有同型号规则跳过，不会切换已有币种；缓存写入未提供。',entries:Object.freeze([
    userRate('kimi-k3',3,.3,15,'international reference','USD'),userRate('kimi-k2.7-code',.95,.19,4,'international reference','USD'),userRate('kimi-k2.6',.95,.16,4,'international reference','USD'),
    userRate('glm-5.3',1.4,.26,4.4,'international reference','USD'),userRate('glm-5.3-flashx',.37,.075,1.25,'international reference','USD'),userRate('glm-5.3-flash',.15,.03,.5,'international reference','USD'),
  ])}),
  Object.freeze({id:'user-deepseek-usd-peak',title:'用户提供 · DeepSeek 美元高峰（手动）',basis:'user-supplied-unverified',warning:'未核验分时、假期或币种地区；不会自动按时间切价。导入后按此固定费率重估会话，不是历史分时账单；不要与空闲/人民币规则混用。',entries:Object.freeze([userRate('deepseek-v4-pro',1.32,.044,3.96,'manual peak','USD'),userRate('deepseek-flash',.30,.006,1.2,'manual peak; V4.1 Flash alias','USD')])}),
  Object.freeze({id:'user-deepseek-usd-off',title:'用户提供 · DeepSeek 美元空闲（手动）',basis:'user-supplied-unverified',warning:'未核验分时、假期或币种地区；不会自动按时间切价。导入后按此固定费率重估会话，不是历史分时账单；不要与高峰/人民币规则混用。',entries:Object.freeze([userRate('deepseek-v4-pro',.66,.022,1.98,'manual off-peak','USD'),userRate('deepseek-flash',.15,.003,.60,'manual off-peak; V4.1 Flash alias','USD')])}),
  Object.freeze({id:'user-cn',title:'用户提供 · Kimi / GLM 人民币参考价',basis:'user-supplied-unverified',warning:'未独立核验；中国大陆人民币/百万 tokens。模型 ID 按名称映射，须与实际路由核对；免费条目仅为用户提供的价格声明，不保证可用性或额度。缓存写入未提供。',entries:Object.freeze([
    userRate('kimi-k3',20,2,100),userRate('kimi-k2.7-code',6.5,1.3,27),userRate('kimi-k2.6',6.5,1.1,27),
    userRate('glm-5.3',8,2,28),userRate('glm-5.3-flashx',2,.57,7),userRate('glm-5.3-flash',.8,.23,2.8),userRate('glm-4.7-flash',0,0,0),
  ])}),
  Object.freeze({id:'user-deepseek-peak',title:'用户提供 · DeepSeek 高峰参考价（手动）',basis:'user-supplied-unverified',warning:'未核验分时规则、节假日与地区，不自动切价。导入后按此固定价重估整个会话，不是历史分时账单；不要与空闲规则同时导入。',entries:Object.freeze([userRate('deepseek-v4-pro',9,.30,27,'manual peak'),userRate('deepseek-flash',2,.04,8,'manual peak; V4.1 Flash alias')])}),
  Object.freeze({id:'user-deepseek-off',title:'用户提供 · DeepSeek 空闲参考价（手动）',basis:'user-supplied-unverified',warning:'未核验分时规则、节假日与地区，不自动切价。导入后按此固定价重估整个会话，不是历史分时账单；不要与高峰规则同时导入。',entries:Object.freeze([userRate('deepseek-v4-pro',4.5,.15,13.5,'manual off-peak'),userRate('deepseek-flash',1,.02,4,'manual off-peak; V4.1 Flash alias')])}),
]);
export const PRICE_CATALOG=Object.freeze({
  reviewedAt:'2026-10-26',
  basis:'official-github-snapshot; not live website verification',
  entries:Object.freeze([
    Object.freeze({provider:'*',model:'mimo-v2.5-pro',currency:'USD',input:1,output:3,cacheRead:.2,requireCacheRates:true,source:'https://github.com/XiaomiMiMo/awesome-mimo-agent/blob/9b84a73ac88ca2bbe5fc560d073a7767abb87dc8/docs/pi_mono.md',checkedAt:'2026-10-26',label:'Official integration-example snapshot; Pi cost units USD/M tokens; not live rate verification; cache-write zero in example not treated as verified free; not Token Plan invoice'}),
    Object.freeze({provider:'*',model:'MiniMax-M2.5',currency:'USD',input:.15,output:1.2,requireCacheRates:true,source:'https://github.com/MiniMax-AI/MiniMax-M2.5/blob/415f5fa67d4f21150b305dd0830e336df1a150cc/README.md#L129-L133',checkedAt:'2026-10-26',label:'Official GitHub snapshot; Standard M2.5 = half Lightning .30/2.40; cache rates unknown so cached usage remains unpriced; not reseller invoice'}),
    Object.freeze({provider:'*',model:'claude-haiku-5-5',currency:'USD',input:.1,output:.5,cacheRead:.01,cacheWrite:.125,longContext:{threshold:100000,input:.5,output:2.5,cacheRead:.05,cacheWrite:.625},source:claudeSource+'#L2230-L2236',checkedAt:'2026-10-26',label:'Official GitHub snapshot; Standard API equivalent; >100K prompt tier; cache write assumes 5m, not 1h; not reseller invoice'}),
    Object.freeze({provider:'*',model:'claude-opus-5-5',currency:'USD',input:4,output:20,cacheRead:.2,cacheWrite:5,source:claudeSource+'#L2030-L2036',checkedAt:'2026-10-26',label:'Official GitHub snapshot; Standard API equivalent; default cache write assumes 5m, not 1h; not reseller invoice'}),
    Object.freeze({provider:'*',model:'claude-sonnet-5-5',currency:'USD',input:2,output:10,cacheRead:.2,cacheWrite:2.5,source:claudeSource+'#L2077-L2083',checkedAt:'2026-10-26',label:'Official GitHub snapshot; Standard API equivalent; default cache write assumes 5m, not 1h; not reseller invoice'}),
  ]),
  groups:USER_PRICE_GROUPS,
  pending:Object.freeze([
    Object.freeze({vendor:'Kimi',models:'kimi-k3 / Kimi K2.5 / Kimi K2',reason:'Official repositories confirm models but no token rate table was obtained.',source:'https://platform.moonshot.cn/docs/pricing/chat'}),
    Object.freeze({vendor:'GLM',models:'GLM-5.3 / GLM-5.3-Flash / GLM-4.7',reason:'Global and mainland-China rate cards differ; current official token rates were not obtained.',source:'https://docs.z.ai/guides/overview/pricing'}),
    Object.freeze({vendor:'MiniMax',models:'M2.5 cache / M2.5-Lightning',reason:'Standard M2.5 input/output and API ID documented; cache rates remain unknown. Lightning API ID still needs confirmation.',source:'https://github.com/MiniMax-AI/MiniMax-M2.5/blob/415f5fa67d4f21150b305dd0830e336df1a150cc/README.md#L129-L133'}),
    Object.freeze({vendor:'MiMo',models:'MiMo V2.6 / V2.5 / V2-Flash; V2.5-Pro cache write',reason:'V2.5-Pro has an official integration-example preset; live rate card and other models remain unverified.',source:'https://platform.xiaomimimo.com/#/docs'}),
    Object.freeze({vendor:'DeepSeek',models:'DeepSeek',reason:'Model repositories found; current API identifiers and rate card need live confirmation.',source:'https://api-docs.deepseek.com/quick_start/pricing'}),
  ]),
});
export function mergeCatalogPrices(existing,entries=PRICE_CATALOG.entries){
  const output=existing.map(row=>structuredClone(row));
  for(const entry of entries)if(!output.some(row=>row.provider===entry.provider&&row.model===entry.model))output.push(structuredClone(entry));
  return output;
}
