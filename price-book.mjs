import {PRICE_CATALOG,USER_PRICE_GROUPS} from './price-catalog.mjs';
const group=id=>USER_PRICE_GROUPS.find(row=>row.id===id)?.entries??[];
export function referencePriceBook(){
  const book={};
  for(const period of ['peak','offpeak']){
    const off=period==='offpeak'?'off':'peak';
    book[period]={USD:[...PRICE_CATALOG.entries,...group('user-usd'),...group(`user-deepseek-usd-${off}`)].map(row=>({...row})),CNY:[...group('user-cn'),...group(`user-deepseek-${off}`)].map(row=>({...row}))};
    for(const currency of ['USD','CNY']){
      const rows=book[period][currency];
      for(const [alias,canonical] of [['k3','kimi-k3'],['kimi-for-coding','kimi-k2.7-code']]){
        const base=rows.find(row=>row.model===canonical);
        if(base)rows.push({...base,provider:'kimi-coding',model:alias,label:`${base.label}; exact kimi-coding route reference; not subscription deduction`});
      }
      if(currency==='USD')rows.push({provider:'kimi-coding',model:'kimi-for-coding-highspeed',currency:'USD',input:1.9,output:8,cacheRead:.38,requireCacheRates:true,source:'pi-ai@1.1.0 bundled kimi-coding catalog snapshot; not live tariff verification',checkedAt:'2026-10-29',label:'Exact route reference; no verified cache-write rate; not subscription deduction'});
    }
  }
  return book;
}
export function activePriceRules(settings){const currency=settings.priceCurrency??'USD',period=settings.pricePeriod??'peak';return [...settings.prices.filter(row=>row.currency===currency),...referencePriceBook()[period][currency]];}
