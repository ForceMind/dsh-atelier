window.__ModuleLoader__.load({
  id: 'dsh-atelier-plugin',
  factory(require) {
    // Locale-pack adapter: preserve native Chat layout, elapsed time and accessibility.
    // Only public locale APIs are used; built-in dictionaries remain untouched.
    function installChatActivity(locale, {now=()=>Date.now(),schedule=setInterval,cancel=clearInterval,onDiagnostic=()=>{}}={}) {
      const variants={zh:'zh-x-atelier',en:'en-x-atelier'};
      const disposers=[];const dictionaries=new Map();const sessions=new Map();
      let settings={chatDynamicLabels:false,phrases:['正在整理思路'],rotationSeconds:4};
      let enabled=false;let timer;let disposed=false;let previousKey='';
      const variantBase=id=>Object.keys(variants).find(base=>variants[base]===id);
      for(const [base,id] of Object.entries(variants)) {
        disposers.push(locale.addLanguage({id,label:base==='zh'?'中文 · 动态工作提示':'English · Dynamic activity',fallback:base}));
      }
      function report(){const activeLocale=locale.getSnapshot().active;onDiagnostic({enabled,activeLocale,mechanism:'locale-pack',running:[...sessions.values()].some(Boolean),label:locale.bind('chat')('chat.deepDivingFor',{duration:'…'}),labels:['chat.deepDiving','chat.deepDivingFor']});}
      function publish(force=false){
        const active=locale.getSnapshot().active;const base=variantBase(active);
        const phrases=settings.phrases?.length?settings.phrases:['正在整理思路'];
        const phrase=String(phrases[Math.floor(now()/(Math.max(1,settings.rotationSeconds)*1000))%phrases.length]).replace(/[{}]/g,'');
        const key=`${base}:${phrase}`;
        if(!force&&key===previousKey)return;
        previousKey=key;
        const targets=force?['zh','en']:(base?[base]:[]);
        for(const language of targets) {
          const text=language==='zh'?phrase:`Working · ${phrase}`;
          dictionaries.get(language)?.();
          dictionaries.set(language,locale.register('chat',variants[language],{
            'chat.deepDiving':language==='zh'?'正在工作':'Working',
            'chat.deepDivingFor':language==='zh'?`${text}，用时 {duration} ···`:`${text} for {duration} ···`,
          }));
        }
        report();
      }
      function updateTimer(){
        if(timer!==undefined){cancel(timer);timer=undefined;}
        if(enabled&&[...sessions.values()].some(Boolean))timer=schedule(()=>publish(),1000);
      }
      function configure(next){
        if(disposed)return;
        const wasEnabled=enabled;const oldSettings=JSON.stringify(settings);
        settings={...settings,...next};enabled=settings.chatDynamicLabels===true;
        const active=locale.getSnapshot().active;
        if(enabled){
          if(!wasEnabled||JSON.stringify(settings)!==oldSettings)publish(true);
          if(!wasEnabled&&(active==='zh'||active==='en'))locale.setLocale(variants[active]);
        }else{
          const base=variantBase(active);if(base)locale.setLocale(base);
          for(const dispose of dictionaries.values())dispose();dictionaries.clear();previousKey='';
        }
        updateTimer();report();
      }
      return {
        configure,
        setRunning(id,value){if(disposed)return;const before=[...sessions.values()].some(Boolean);if(value===undefined)sessions.delete(id);else sessions.set(id,!!value);const after=[...sessions.values()].some(Boolean);if(before!==after)updateTimer();if(enabled&&after)publish();},
        diagnostic(){return {enabled,activeLocale:locale.getSnapshot().active,running:[...sessions.values()].some(Boolean)};},
        dispose(){
          if(disposed)return;disposed=true;if(timer!==undefined)cancel(timer);
          const base=variantBase(locale.getSnapshot().active);if(base)locale.setLocale(base);
          for(const dispose of dictionaries.values())dispose();dictionaries.clear();
          for(const dispose of disposers.reverse())dispose();sessions.clear();
        },
      };
    }

    // Shared compact labels; full values remain in accessible titles in the UI.
    function compactNumber(value) {
      const number=Number(value);
      if(!Number.isFinite(number)||number<0)return '—';
      if(number<1000)return String(Math.floor(number));
      let scale=number>=1e9?1e9:number>=1e6?1e6:1e3;
      let suffix=scale===1e9?'B':scale===1e6?'M':'K';
      let rounded=Number((number/scale).toFixed(1));
      if(rounded>=1000&&scale<1e9){scale*=1000;suffix=scale===1e6?'M':'B';rounded=Number((number/scale).toFixed(1));}
      return `${rounded}${suffix}`;
    }
    function compactDuration(value) {
      const number=Number(value);
      if(value===null||value===undefined||!Number.isFinite(number)||number<0)return '—';
      if(number<1000)return `${Math.round(number)}ms`;
      const seconds=Math.floor(number/1000);
      if(seconds<60)return `${(number/1000).toFixed(number<10000?1:0)}s`;
      const minutes=Math.floor(seconds/60),rest=seconds%60;
      if(minutes<60)return `${minutes}m${String(rest).padStart(2,'0')}s`;
      return `${Math.floor(minutes/60)}h${String(minutes%60).padStart(2,'0')}m`;
    }
    function compactMoney(value,currency='USD') {
      const number=Number(value);
      if(value===null||value===undefined||!Number.isFinite(number)||number<0)return '—';
      const prefix=currency==='USD'?'$':currency==='CNY'?'¥':`${currency} `;
      const digits=number===0?0:number<0.01?5:number<1?4:2;
      return `${prefix}${number.toFixed(digits)}`;
    }
    function outputThroughput(record) {
      const missing={tokensPerSecond:null,outputTokens:null,generationMs:null,label:'—',basis:'API output tokens / observed generation interval'};
      if(!record||record.endedAt==null||!['stop','tool-calls','max-tokens'].includes(record.state))return missing;
      const tokens=record.usage?.outputTokens;
      const start=record.firstOutputAt??record.reasoningStartedAt??record.firstTextAt;
      const end=record.generationEndedAt??record.endedAt;
      if(typeof tokens!=='number'||!Number.isFinite(tokens)||tokens<0||typeof start!=='number'||!Number.isFinite(start)||typeof end!=='number'||!Number.isFinite(end)||end<=start)return missing;
      const generationMs=end-start;const tokensPerSecond=tokens*1000/generationMs;
      if(!Number.isFinite(tokensPerSecond))return missing;
      return {tokensPerSecond,outputTokens:tokens,generationMs,label:`${tokensPerSecond.toFixed(1)} tok/s`,basis:missing.basis};
    }

    function liveOutputThroughput(record,now=Date.now()) {
      if(!record||record.state!=='streaming'||record.endedAt!=null||record.usage!=null)return null;
      const start=record.firstOutputAt??record.reasoningStartedAt??record.firstTextAt;
      const tokens=record.outputEstimate;
      if(typeof start!=='number'||!Number.isFinite(start)||typeof now!=='number'||!Number.isFinite(now)||now-start<250||typeof tokens!=='number'||!Number.isFinite(tokens)||tokens<=0)return null;
      const generationMs=now-start,tokensPerSecond=tokens*1000/generationMs;
      return {tokensPerSecond,outputTokens:tokens,generationMs,label:`≈${tokensPerSecond.toFixed(1)} tok/s`,estimated:true,scope:'live-conversation-average',basis:'Observed streamed characters / 3 / seconds since first output; rough estimate, not API token usage'};
    }

    function modelFamily(value) {
      const model=String(value??'').toLowerCase();
      if(/(?:^|[/\s_-])(?:gpt(?:[-_\d.]|$)|o[134](?:[-_\s]|$))/.test(model))return 'gpt';
      if(model.includes('deepseek'))return 'deepseek';
      if(model.includes('claude'))return 'claude';
      if(model.includes('gemini'))return 'gemini';
      return 'generic';
    }


    const metricCopy={
      zh:{reasoningUnreported:'API 未单独返回',reasoningUsageHelp:'思考流时长来自已收到的流片段；思考 tokens 只能使用 API 独立上报值。未上报不等于 0，不从总输出或时长推算。',speedLive:'生成中 · 实时估算均速',speedLiveTokens:'估算输出 tokens',detailLiveSpeed:'按已收到的思考、文字和工具参数字符数 ÷ 3 近似 tokens，再除以首个输出至今秒数；约每 0.5 秒刷新。不是准确分词或瞬时解码速度，停流时均速会下降。',speed:'输出速度',detailSpeed:'最近一次已完成请求的 API 输出 tokens ÷ 首个输出片段到用量返回的秒数；含可计费思考与工具参数，不含首段等待或工具执行。不是供应商内部解码速度。',briefSpeed:'最近完成请求 · API 输出 tokens/s',speedTokens:'API 输出 tokens',speedInterval:'生成区间',speedMissing:'生成中显示带 ≈ 的字符近似估算均速，结束后采用 API 用量均速；无输出时保留上次有效值。估算不等于准确 token 数。',cacheObserved:'近期观测比例（保守）',cacheCoverage:'累计字段覆盖',cacheObservedHelp:'保守观测比例把已报告读取量除以全部有效输入量，未报告样本不补猜缓存；它不是渠道真实命中率保证。',cacheLast:'本次命中',cacheRecent:'近期命中（已报告）',cacheMissing:'未报告缓存字段',cacheLifetime:'累计命中（已报告）',cacheDenominator:'读取缓存 ÷（未缓存输入＋读取＋写入），只对明确返回缓存字段的响应统计；缺字段不等于0命中。',costInput:'未缓存输入',costOutput:'输出',costRead:'缓存读取',costWrite:'缓存写入',moreDetails:'更多说明',briefModel:'当前会话模型',briefClock:'本轮耗时 · 含工具和等待',briefThought:'最近请求 · 可观测思考流',briefInput:'会话累计 · 未缓存输入',briefOutput:'会话累计 · 含思考 tokens',briefCache:'会话累计 · API 返回用量',briefCost:'会话累计估算 · 非实际账单',details:'指标说明',closeDetails:'关闭说明',detailsHint:'点击查看完整数值与统计口径',detailScope:'统计范围',detailSession:'当前会话已提交响应累计；不等于单次请求或当前上下文大小。',detailModel:'当前会话路由报告的模型与提供方；名称不证明渠道实际的上游映射。',detailClock:'本轮从开始到当前或结束的墙钟时间，包含模型生成、工具执行与等待。',detailThought:'最近一次请求中可观察的 reasoning 流区间，不是供应商内部的真实思考时间。',detailInput:'未缓存输入 tokens 的累计值；重复发送的历史在每次请求中都会重新计入。',detailOutput:'模型输出 tokens 累计，可能已包含 reasoning tokens；费用不重复叠加 reasoning。',detailCache:'API 返回的缓存读取与写入用量。命中比例按输入各桶计算，不代表上下文占用率。',detailCost:'已知请求费用的小计，按配置单价折算。不是余额、实际扣费或渠道账单。',detailProvider:'提供方',detailContext:'模型上下文容量',detailResponses:'已提交响应',detailAttempts:'请求尝试',detailLastRequest:'最近一次请求',detailRequestTime:'请求总用时',detailFirstChunk:'首段延迟',detailReasoningTokens:'思考 tokens（含于输出）',detailCacheRead:'缓存读取',detailCacheWrite:'缓存写入',detailCacheRatio:'累计缓存命中率',detailKnown:'已知费用小计',detailUnknown:'未知费用响应数',detailSource:'价格来源',detailUnknownNote:'缺失 usage 或价格会保留为未知；有小计不代表所有请求都已计价。',detailCostNote:'按单次输入量选择长短上下文档位；不含失败重试收费、工具附加费、渠道倍率、税费或特殊速度档。',detailCacheNote:'当前宿主不报告缓存写入 TTL；按匹配规则的默认写入单价估算，实际 TTL 可能不同。',detailModelNote:'提示词与价格在“设置 → 工作台”中按 profile 全局管理；本面板仅查看，不改配置。',detailMissing:'未返回数据',detailLastUsage:'最近一次 API 返回用量',detailRequestActual:'API 返回 usage',detailRequestEstimated:'字符近似估算（非供应商计费量）',detailSourcesNone:'尚无匹配的计价规则',detailOutputNote:'没有 reasoning 流时，思考区间显示 —，不推断或伪造为 0。'},
      en:{reasoningUnreported:'Not separately reported by API',reasoningUsageHelp:'Reasoning duration measures observed stream segments. Reasoning tokens require a separate API counter; missing is not zero and is not inferred from output or duration.',speedLive:'Generating · live estimated average',speedLiveTokens:'Estimated output tokens',detailLiveSpeed:'Observed reasoning, text and tool-argument characters / 3 approximates tokens, divided by seconds since first output; refreshed about every 0.5 seconds. Not exact tokenization or instantaneous decoding. Pauses lower the average.',speed:'Output speed',detailSpeed:'Latest completed API output tokens / seconds from first output delta to usage arrival. Includes billable reasoning and tool arguments; excludes first-output waiting and tool execution. Not the provider’s internal decode rate.',briefSpeed:'Latest completed request · API output tokens/s',speedTokens:'API output tokens',speedInterval:'Generation interval',speedMissing:'Shows an explicitly approximate live average while generating, then API-usage average on completion. Keeps the previous valid value until output starts; estimated characters are not exact tokens.',cacheObserved:'Recent observed share',cacheCoverage:'Lifetime field coverage',cacheObservedHelp:'Observed share divides reported cache-read tokens by all valid input tokens; missing cache values are not inferred. It is not a guarantee of the actual upstream hit ratio.',cacheLast:'Latest hit ratio',cacheRecent:'Recent (reported)',cacheMissing:'Missing cache fields',cacheLifetime:'Lifetime (reported)',cacheDenominator:'Cache read / (uncached input + cache read + cache write), only for responses explicitly reporting cache fields. Missing is not zero.',costInput:'Uncached input',costOutput:'Output',costRead:'Cache read',costWrite:'Cache write',moreDetails:'More details',briefModel:'Current session model',briefClock:'This turn · includes tools and waiting',briefThought:'Latest request · observed reasoning stream',briefInput:'Session total · uncached input',briefOutput:'Session total · includes reasoning',briefCache:'Session total · API-reported usage',briefCost:'Session estimate · not an invoice',details:'Metric details',closeDetails:'Close details',detailsHint:'Click for full values and accounting scope',detailScope:'Scope',detailSession:'Cumulative committed responses in this session, not one request or current context size.',detailModel:'Model and provider reported by the session route. Names do not prove a reseller’s upstream mapping.',detailClock:'Wall-clock time from this turn’s start to now or completion, including generation, tools and waiting.',detailThought:'Observable reasoning-stream interval in the latest request, not the supplier’s internal thinking time.',detailInput:'Cumulative uncached input tokens. Repeated history is counted again each time it is sent.',detailOutput:'Cumulative output tokens may already include reasoning tokens. Reasoning is not billed twice.',detailCache:'Cache-read and cache-write usage returned by the API. The ratio uses input buckets, not context occupancy.',detailCost:'Known-cost subtotal at configured rates. Not a balance, actual charge or reseller invoice.',detailProvider:'Provider',detailContext:'Model context capacity',detailResponses:'Committed responses',detailAttempts:'Request attempts',detailLastRequest:'Latest request',detailRequestTime:'Request duration',detailFirstChunk:'First-chunk latency',detailReasoningTokens:'Reasoning tokens (in output)',detailCacheRead:'Cache read',detailCacheWrite:'Cache write',detailCacheRatio:'Cumulative cache-hit ratio',detailKnown:'Known-cost subtotal',detailUnknown:'Responses with unknown cost',detailSource:'Price source',detailUnknownNote:'Missing usage or pricing stays unknown. A subtotal does not mean every request has been priced.',detailCostNote:'Context tiers are selected per request. Failed-attempt charges, tool fees, reseller multipliers, taxes and special speed tiers are excluded.',detailCacheNote:'The host does not report cache-write TTL. The matched rule’s default write rate is assumed; actual TTL may differ.',detailModelNote:'Prompt and pricing settings are profile-global under Settings → Atelier. This panel is read-only.',detailMissing:'Not reported',detailLastUsage:'Latest API usage',detailRequestActual:'API-reported usage',detailRequestEstimated:'Character approximation (not billable API usage)',detailSourcesNone:'No matching price rule yet',detailOutputNote:'No reasoning stream means —, not an inferred or invented zero.'},
    };
    const numeric=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
    const count=value=>numeric(value)?value.toLocaleString('en-US'):'—';
    const moneyList=totals=>Object.entries(totals??{}).filter(([,amount])=>numeric(amount)).map(([currency,amount])=>compactMoney(amount,currency)).join(' + ');
    function metricDetail(kind,{stats={},last=null,speed=null,cost=null,cache=null,running=false,now=Date.now()}={},t=key=>key){
      stats=stats??{};
      const usage=stats.usage??{};const rows=[];const notes=[];
      const row=(key,value)=>rows.push({label:t(key),value:String(value??'—')});
      const elapsed=stats.turnStartedAt&&running?now-stats.turnStartedAt:stats.turnElapsedMs;
      const reasoning=last?.reasoningStartedAt!=null?(last.reasoningEndedAt??(running?now:last.endedAt??now))-last.reasoningStartedAt:null;
      const titles={speed:'speed',model:'model',clock:'elapsed',thought:'reasoning',input:'input',output:'output',cache:'cache',cost:'cost'};
      const summaries={speed:'detailSpeed',model:'detailModel',clock:'detailClock',thought:'detailThought',input:'detailInput',output:'detailOutput',cache:'detailCache',cost:'detailCost'};
      let value='—';
      if(kind==='speed'){
        const measured=speed??last?.throughput;value=measured?.label??'—';row(measured?.estimated?'speedLiveTokens':'speedTokens',count(measured?.outputTokens));row('speedInterval',compactDuration(measured?.generationMs));row('detailScope',t('briefSpeed'));if(speed?.model)row('model',speed.model);notes.push(t('speedMissing'));
      }else if(kind==='model'){
        value=stats.model||last?.model||t('detailMissing');row('detailProvider',stats.provider||last?.provider||'—');row('detailContext',numeric(stats.contextWindow)?`${count(stats.contextWindow)} tokens`:'—');row('detailResponses',count(stats.responses));row('detailAttempts',count(stats.attempts));notes.push(t('detailModelNote'));
      }else if(kind==='clock'){
        value=compactDuration(elapsed);row('detailScope',t('elapsed'));row('detailRequestTime',last?.endedAt!=null?compactDuration(last.endedAt-last.startedAt):'—');row('detailFirstChunk',last?.firstChunkAt!=null?compactDuration(last.firstChunkAt-last.startedAt):'—');
      }else if(kind==='thought'){
        value=compactDuration(reasoning);row('detailScope',t('detailLastRequest'));row('detailReasoningTokens',numeric(last?.usage?.reasoningTokens)?count(last.usage.reasoningTokens):t('reasoningUnreported'));notes.push(t('detailOutputNote'),t('reasoningUsageHelp'));
      }else if(kind==='input'||kind==='output'){
        const field=kind==='input'?'inputTokens':'outputTokens';value=`${count(usage[field])} tokens`;row('detailLastUsage',numeric(last?.usage?.[field])?`${count(last.usage[field])} tokens`:'—');row('detailScope',t('detailSession'));if(kind==='output')row('detailReasoningTokens',count(usage.reasoningTokens));
      }else if(kind==='cache'){
        value=`${count(usage.cacheReadTokens)} tokens`;const total=(usage.inputTokens??0)+(usage.cacheReadTokens??0)+(usage.cacheWriteTokens??0);row('detailCacheRead',`${count(usage.cacheReadTokens)} tokens`);row('detailCacheWrite',`${count(usage.cacheWriteTokens)} tokens`);row('detailCacheRatio',total>0?`${((usage.cacheReadTokens??0)/total*100).toFixed(1)}%`:'—');row('detailScope',t('detailSession'));notes.push(t('detailCacheNote'));
      }else if(kind==='cost'){
        value=moneyList(cost?.totals)||t('detailSourcesNone');row('detailKnown',value);row('detailUnknown',count(cost?.unknown));row('detailScope',t('detailSession'));if(last?.price?.known)row('detailLastRequest',`${compactMoney(last.price.amount,last.price.currency)} · ${t(last.usage?'detailRequestActual':'detailRequestEstimated')}`);for(const source of (cost?.sources??[]).slice(0,12))row('detailSource',String(source).slice(0,2048));notes.push(t('detailUnknownNote'),t('detailCostNote'),t('detailCacheNote'));
      }else return null;
      const hiddenLabels=new Set([t('detailScope'),...(kind==='cache'?[t('detailCacheRead')]:[]),...(kind==='cost'?[t('detailKnown')]:[])]);
      const displayRows=[{label:t(titles[kind]),value},...rows.filter(row=>!hiddenLabels.has(row.label)&&row.label!==t('detailSource'))].slice(0,4);
      const moreRows=rows.filter(row=>row.label===t('detailSource')||(!hiddenLabels.has(row.label)&&!displayRows.some(display=>display.label===row.label&&display.value===row.value)));
      if(kind==='cost'&&cost?.components){const breakdown=Object.entries({input:'costInput',output:'costOutput',cacheRead:'costRead',cacheWrite:'costWrite'}).map(([key,label])=>({label:t(label),value:moneyList(Object.fromEntries(Object.entries(cost.components).map(([currency,items])=>[currency,items[key]])))||'—'}));displayRows.splice(0,displayRows.length,{label:t('cost'),value},...breakdown);if(cost.unknown)displayRows.push({label:t('detailUnknown'),value:count(cost.unknown)});}
      if(kind==='cache'&&cache){const percent=ratio=>numeric(ratio)?`${(ratio*100).toFixed(1)}%`:'—';const accounting=stats.cacheAccounting;displayRows.splice(0,displayRows.length,{label:t('cacheLast'),value:percent(last?.cache?.ratio)},{label:t('cacheRecent'),value:percent(cache.weightedRatio)},{label:t('cacheLifetime'),value:percent(accounting?.input>0?accounting.read/accounting.input:null)},{label:t('cacheMissing'),value:`${cache.missing??0} / ${cache.total??0}`});notes.push(t('cacheDenominator'),t('cacheObservedHelp'));moreRows.push({label:t('cacheObserved'),value:percent(cache.observedRatio)},{label:t('cacheCoverage'),value:accounting?`${accounting.reported} / ${accounting.reported+accounting.missing}`:'—'});}
      const briefKey={speed:'briefSpeed',model:'briefModel',clock:'briefClock',thought:'briefThought',input:'briefInput',output:'briefOutput',cache:'briefCache',cost:'briefCost'}[kind];
      return {kind,title:t(titles[kind]),value,summary:t(kind==='speed'&&speed?.estimated?'detailLiveSpeed':summaries[kind]),rows,notes,displayRows,moreRows,brief:t(kind==='speed'&&speed?.estimated?'speedLive':briefKey)};
    }

    function popoverPosition(anchor,panel,viewport,{gap=8,padding=12}={}){
      const width=Math.min(Math.max(panel.width||320,0),Math.max(0,viewport.width-padding*2));
      const height=Math.min(Math.max(panel.height||240,0),Math.max(0,viewport.height-padding*2));
      const left=Math.min(Math.max(padding,anchor.left),Math.max(padding,viewport.width-width-padding));
      const above=anchor.top-height-gap;const below=anchor.bottom+gap;
      const top=above>=padding?above:below+height<=viewport.height-padding?below:Math.max(padding,Math.min(above,viewport.height-height-padding));
      return {left:Math.round(left),top:Math.round(top),maxWidth:Math.max(0,viewport.width-padding*2),maxHeight:Math.max(0,viewport.height-padding*2)};
    }

    function sessionRecency(row,now=Date.now()){
      const at=row?.updatedAt;
      if(!row||row.blank===true||row.subagent!=null||typeof at!=='number'||!Number.isFinite(at)||at<=0||at>now)return {recent:false,hot:false};
      const age=now-at;
      return {recent:age<86400000,hot:age<3600000};
    }
    function sidebarAttribute(value){return String(value).replaceAll('\\','\\\\').replaceAll('"','\\"').replace(/[\n\r\f]/g,char=>`\\${char.charCodeAt(0).toString(16)} `);}
    function recentRowSelector(id){return `.JoiKIa_sessionRow[data-row-key="session:${sidebarAttribute(id)}"][role="treeitem"]:not(.JoiKIa_archived)`;}
    /** Select the first recent row crossed at the SAME top line in either direction. Pure geometry. */
    function crossedRecentRow(previousTop,currentTop,positions,skipId=null){
      if(!Number.isFinite(previousTop)||!Number.isFinite(currentTop)||Math.abs(currentTop-previousTop)<.5)return null;
      const down=currentTop>previousTop;
      const crossed=positions.filter(row=>row.id!==skipId&&Number.isFinite(row.top)&&(down?row.top>previousTop+.5&&row.top<=currentTop+.5:row.top<previousTop-.5&&row.top>=currentTop-.5));
      crossed.sort((a,b)=>down?a.top-b.top:b.top-a.top);
      return crossed[0]??null;
    }
    function recentSessionStyles(rows,now,{marks=true,snap=true}={},stop=null){
      const recent=[],hot=[];const seen=new Set();
      for(const row of rows){if(!row?.id||seen.has(row.id))continue;seen.add(row.id);const flags=sessionRecency(row,now);const selector=recentRowSelector(row.id);if(flags.recent)recent.push(selector);if(flags.hot)hot.push(selector);}
      const css=[];
      if(marks&&recent.length)css.push('.atelier-recent-dot{display:inline-block;width:6px;height:6px;flex:none;border-radius:50%;background:var(--dsw-alias-brand-primary);opacity:.65;pointer-events:none}.JoiKIa_slot:has(svg) .atelier-recent-dot{display:none}');
      if(snap&&stop&&hot.includes(recentRowSelector(stop.id))){
        const row=recentRowSelector(stop.id);const list=`.Kjh-qa_list[role="tree"]:has(${row})`;
        // Only arm one row for one crossing, then release. No persistent mandatory list or old-row snaps.
        if(stop.holding)css.push(`${list}{scroll-snap-type:y mandatory;scroll-padding-block-start:0;scroll-behavior:auto}${row}{scroll-snap-align:start;scroll-margin-block-start:0;scroll-snap-stop:always}`);
        if(stop.flash){const key=`atelier-recent-stop-${Math.max(0,Math.floor(stop.serial??0))}`;css.push(`${row}{animation:${key} 650ms ease-out 1}@keyframes ${key}{0%,30%{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,var(--dsw-specific-sidebar-fill));box-shadow:inset 2px 0 var(--dsw-alias-brand-primary)}100%{background:transparent;box-shadow:inset 2px 0 transparent}}`);}
      }
      return {css:css.join('\n'),recent:recent.length,hot:hot.length,mode:'bidirectional-top-crossing',scope:'dsh-0.2.1-rc.3 workspace row markup; native one-shot snap; no wheel cancellation'};
    }
    /** Read host geometry, render changes through the plugin's own style component only. */
    function observeRecentStops(doc,getHotIds,onStop,{now=()=>Date.now(),schedule=setTimeout,cancel=clearTimeout}={}){
      const listSelector='.Kjh-qa_list[role="tree"]';const positions=new WeakMap();let activeList=null;let lastInput=0;let lock=null;let serial=0;let releaseTimer,flashTimer,settleTimer;let disposed=false;
      const listOf=target=>target?.closest?.(listSelector)??null;
      const stopMotion=()=>doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
      const input=event=>{
        if(event.type==='wheel'&&(event.ctrlKey||event.metaKey||event.shiftKey||event.deltaY===0))return;
        const list=listOf(event.target);if(!list||stopMotion())return;
        if(event.type==='keydown'&&!['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))return;
        const fresh=list!==activeList||now()-lastInput>900;activeList=list;lastInput=now();if(fresh||!positions.has(list))positions.set(list,list.scrollTop);
      };
      const publish=(holding,flash)=>{if(!disposed&&lock)onStop({id:lock.id,serial:lock.serial,holding,flash});};
      const aligned=()=>{if(!lock||lock.element.isConnected===false||lock.list.isConnected===false)return false;const rect=lock.element.getBoundingClientRect();const top=lock.list.getBoundingClientRect().top+lock.list.clientTop;return Math.abs(rect.top-top)<=2;};
      const reveal=()=>{if(!lock||lock.shown||!aligned())return;lock.shown=true;publish(lock.holding,true);cancel(flashTimer);flashTimer=schedule(()=>{if(lock)publish(false,false);},700);};
      const scroll=event=>{
        const list=event.target;if(!list?.matches?.(listSelector))return;
        const previous=positions.get(list);const current=list.scrollTop;positions.set(list,current);
        if(lock?.holding){reveal();return;}
        if(list!==activeList||now()-lastInput>900||stopMotion()||!getHotIds().size)return;
        const hot=getHotIds();const top=list.getBoundingClientRect().top+list.clientTop;const candidates=[];
        // Only visible list rows. No session histories opened; no mutation of host elements.
        for(const element of list.querySelectorAll('.JoiKIa_sessionRow[data-row-key^="session:"][role="treeitem"]:not(.JoiKIa_archived)')){const id=element.getAttribute('data-row-key').slice(8);if(hot.has(id))candidates.push({id,top:current+element.getBoundingClientRect().top-top,element});}
        if(lock?.list===list&&Math.abs(current-lock.top)>=36)lock.rearmed=true;
        const skip=lock?.list===list&&!lock.rearmed&&now()<lock.cooldownUntil?lock.id:null;
        const target=crossedRecentRow(previous,current,candidates,skip);if(!target)return;
        cancel(releaseTimer);cancel(flashTimer);cancel(settleTimer);
        lock={...target,list,serial:++serial,holding:true,shown:false,cooldownUntil:now()+600,rearmed:false};publish(true,false);
        // Native re-snap happens after the plugin style commits; pulse only once the row is at the top.
        settleTimer=schedule(reveal,60);
        releaseTimer=schedule(()=>{if(!lock)return;reveal();lock.holding=false;publish(false,lock.shown);},240);
      };
      const snapChange=()=>reveal();
      doc.addEventListener('wheel',input,{capture:true,passive:true});doc.addEventListener('pointerdown',input,true);doc.addEventListener('keydown',input,true);doc.addEventListener('scroll',scroll,true);doc.addEventListener('scrollsnapchange',snapChange,true);
      return()=>{disposed=true;cancel(releaseTimer);cancel(flashTimer);cancel(settleTimer);doc.removeEventListener('wheel',input,true);doc.removeEventListener('pointerdown',input,true);doc.removeEventListener('keydown',input,true);doc.removeEventListener('scroll',scroll,true);doc.removeEventListener('scrollsnapchange',snapChange,true);lock=null;activeList=null;};
    }

    function installModelSettings(ctx,React,call){
      const h=React.createElement;
      function Manager({fixedProvider}){
        React.useSyncExternalStore(listener=>ctx.locale.subscribe(listener),()=>ctx.locale.getSnapshot());const zh=ctx.locale.getSnapshot().active.startsWith('zh');const text=(cn,en)=>zh?cn:en;
        const[providers,setProviders]=React.useState([]),[provider,setProvider]=React.useState(fixedProvider??''),[models,setModels]=React.useState([]),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false),[preview,setPreview]=React.useState(null),[saved,setSaved]=React.useState(false);
        const[context,setContext]=React.useState(''),[output,setOutput]=React.useState('');const request=React.useRef(0);const identity=React.useRef(provider);identity.current=provider;
        React.useEffect(()=>{if(fixedProvider){load(fixedProvider);return()=>{request.current++;};}let cancelled=false;call('models').then(result=>{if(!cancelled)setProviders(result.providers);}).catch(err=>{if(!cancelled)setError(err.message);});return()=>{cancelled=true;};},[fixedProvider]);
        async function load(id){const sequence=++request.current;setBusy(true);setError('');setPreview(null);setSaved(false);setModels([]);try{const result=await call('models',{provider:id});if(sequence===request.current)setModels(result.models);}catch(err){if(sequence===request.current)setError(err.message);}finally{if(sequence===request.current)setBusy(false);}}
        function changeProvider(id){setProvider(id);setContext('');setOutput('');if(id)load(id);else{request.current++;setModels([]);setPreview(null);setBusy(false);}}
        const change=set=>event=>{set(event.target.value);setPreview(null);setSaved(false);};
        async function prepare(){const id=provider;setBusy(true);setError('');setSaved(false);try{const changes={};if(context.trim())changes.contextWindow=Number(context);if(output.trim())changes.maxTokens=Number(output);const result=await call('model-preview',{provider:id,changes});if(identity.current===id)setPreview(result);}catch(err){if(identity.current===id)setError(err.message);}finally{if(identity.current===id)setBusy(false);}}
        async function apply(){if(!preview)return;const id=provider;setBusy(true);setError('');try{const result=await call('model-apply',{previewId:preview.previewId});if(identity.current===id){setModels(result.models);setPreview(null);setSaved(true);}}catch(err){if(identity.current===id){setError(err.message);setPreview(null);}}finally{if(identity.current===id)setBusy(false);}}
        const number=value=>typeof value==='number'?value.toLocaleString():'—';
        return h('section',{className:'atelier atelier-model-manager','aria-label':text('渠道模型容量','Provider model capacities')},h('style',null,`
    .atelier-model-manager{margin-top:24px;padding-top:20px;border-top:1px solid var(--dsw-alias-border-l1);font-size:13px}.atelier-model-manager h3{margin:0 0 8px;font-size:15px}.atelier-model-manager p{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6}.atelier-model-manager select,.atelier-model-manager input{font:inherit;min-width:0;width:100%;padding:7px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}.atelier-model-manager label{display:block;font-size:12px;margin-bottom:5px}.atelier-model-manager button{font:inherit;padding:7px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);cursor:pointer}.atelier-model-manager button:disabled{opacity:.45;cursor:default}.atelier-model-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:16px 0}.atelier-model-scroll{max-width:100%;overflow:auto;margin:14px 0}.atelier-model-manager table{border-collapse:collapse;width:100%;font-size:12px;text-align:left}.atelier-model-manager th,.atelier-model-manager td{border-bottom:1px solid var(--dsw-alias-border-l1);padding:8px 10px;vertical-align:top;overflow-wrap:anywhere}.atelier-model-manager code{font-size:11px}.atelier-model-warning{padding:10px 12px;background:var(--dsw-alias-bg-layer-1);border-radius:6px}.atelier-model-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.atelier-model-manager [role=alert]{color:var(--dsw-alias-state-error-primary)}.atelier-model-manager input:focus-visible,.atelier-model-manager button:focus-visible,.atelier-model-manager select:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
    `),h('h3',null,text('渠道模型列表与批量容量设置','Provider models and bulk capacity settings')),h('p',null,text('常驻显示所选渠道的模型，不展开“自定义设置”也能查看。这里仅管理 pi-ai 的上下文和输出上限，不修改密钥、请求头、模型ID或思考能力。','View the selected provider’s models without expanding Custom settings. Only pi-ai context/output limits are changed; credentials, headers, model IDs and reasoning capabilities remain untouched.')),
          !fixedProvider&&h('label',null,text('渠道','Provider'),h('select',{value:provider,disabled:busy,onChange:event=>changeProvider(event.target.value)},h('option',{value:''},text('选择一个渠道','Choose provider')),providers.map(row=>h('option',{key:row.id,value:row.id},`${row.name} · ${row.id}`)))),
          error&&h('p',{role:'alert'},error),saved&&h('p',{role:'status'},text('已保存并核验当前模型容量。','Saved and verified current model capacities.')),
          provider&&h(React.Fragment,null,h('div',{className:'atelier-model-actions'},h('strong',null,`${text('模型','Models')} · ${models.length}`),h('button',{type:'button',disabled:busy,onClick:()=>load(provider)},text('刷新列表','Refresh'))),
            h('div',{className:'atelier-model-scroll'},h('table',null,h('thead',null,h('tr',null,[text('模型 ID','Model ID'),text('上下文','Context'),text('最大输出','Max output'),text('思考档位（只读）','Reasoning levels (read-only)')].map(label=>h('th',{key:label,scope:'col'},label)))),h('tbody',null,models.map(row=>h('tr',{key:row.id},h('td',null,h('code',null,row.id)),h('td',null,number(row.contextWindow)),h('td',null,number(row.maxTokens)),h('td',null,row.efforts.join(' / ')||'—')))))),
            h('div',{className:'atelier-model-fields'},h('label',null,text('统一上下文 tokens（留空不改）','Context tokens (blank keeps existing)'),h('input',{type:'number',min:1,max:10000000,value:context,disabled:busy,onChange:change(setContext)})),h('label',null,text('统一最大输出 tokens（留空不改）','Max output tokens (blank keeps existing)'),h('input',{type:'number',min:1,max:10000000,value:output,disabled:busy,onChange:change(setOutput)}))),
            h('p',null,text('仅填写渠道真实支持的容量；改大数字不会提高模型能力。预览覆盖当前全部模型，并同时修改渠道默认值。新增模型如有自己的容量仍会优先使用自己的值。','Use capacities actually supported upstream. Larger numbers do not expand a model. Preview targets every current model plus provider defaults; future models with explicit limits still take precedence.')),
            h('button',{type:'button',disabled:busy||!models.length||(!context.trim()&&!output.trim()),onClick:prepare},text(busy?'读取中…':'预览覆盖全部模型',busy?'Loading…':'Preview all-model override')),
            preview&&h('div',{className:'atelier-model-warning'},h('h4',null,`${text('待确认','Review')} · ${preview.rows.length} ${text('个模型','models')}`),preview.warnings.map(warning=>h('p',{key:warning},warning)),h('div',{className:'atelier-model-scroll'},h('table',null,h('thead',null,h('tr',null,h('th',null,'Model'),h('th',null,text('上下文 旧 → 新','Context old → new')),h('th',null,text('输出 旧 → 新','Output old → new')))),h('tbody',null,preview.rows.map(row=>h('tr',{key:row.id},h('td',null,row.id),h('td',null,`${number(row.before.contextWindow)} → ${number(row.after.contextWindow)}`),h('td',null,`${number(row.before.maxTokens)} → ${number(row.after.maxTokens)}`)))))),h('div',{className:'atelier-model-actions'},h('button',{type:'button',disabled:busy,onClick:apply},text('确认保存覆盖','Confirm and save override')),h('button',{type:'button',disabled:busy,onClick:()=>setPreview(null)},text('取消','Cancel')))))
        );
      }
      return ctx.slots.inject('settings.models.provider-card',()=>{
        const previous=ctx.slots.entries('settings.models.provider-card').filter(entry=>entry.options.key==='llm-pi-ai').sort((a,b)=>(b.options.priority??0)-(a.options.priority??0))[0];
        function ProviderManager(props){return h(React.Fragment,null,props.renderSlot('atelier.models.previous-extra',props),props.configured?h(Manager,{key:props.provider.provider,fixedProvider:props.provider.provider}):null);}
        const disposers=[ctx.slots.register({name:'settings.models.provider-card',key:'llm-pi-ai',priority:-10,children:{'atelier.models.previous-extra':{kind:'list',scope:'root'}}},ProviderManager)];
        if(previous)disposers.push(ctx.slots.register({name:'atelier.models.previous-extra',id:'preserved-adapter-extra',...(previous.inject?{inject:previous.inject}:{}),...(previous.locale?{locale:previous.locale}:{}),...(previous.store?{store:previous.store}:{})},previous.component));
        return ()=>{for(const dispose of disposers.reverse())dispose();};
      });
    }

    const priceEditorOwn=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
    const priceEditorPlain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
    const priceEditorNumericKeys=['input','output','cacheRead','cacheWrite','cacheWrite12h'];
    const priceEditorTopKeys=new Set(['provider','model','currency',...priceEditorNumericKeys,'requireCacheRates','longContext','source','checkedAt','label']);
    const priceEditorLongKeys=new Set(['threshold',...priceEditorNumericKeys]);
    function priceEditorRates(row,path){for(const key of ['input','output'])if(!priceEditorOwn(row,key))throw new Error(`${path}.${key} is required`);for(const key of priceEditorNumericKeys)if(priceEditorOwn(row,key)&&(typeof row[key]!=='number'||!Number.isFinite(row[key])||row[key]<0||row[key]>1000000))throw new Error(`${path}.${key}: use a number from 0 to 1000000`);}
    /** Parse and validate only prices, preserving valid optional fields and ordering. */
    function parsePriceDraft(text){
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
    function patchPriceRule(rows,index,key,value){if(!Array.isArray(rows)||!rows[index])throw new Error('Price row not found');return rows.map((row,at)=>{if(at!==index)return row;const next={...row};if(value===undefined)delete next[key];else next[key]=value;return next;});}
    function appendPriceRules(rows,entries){const additions=[];for(const entry of entries)if(!rows.some(row=>row.provider===entry.provider&&row.model===entry.model)&&!additions.some(row=>row.provider===entry.provider&&row.model===entry.model))additions.push(structuredClone(entry));if(rows.length+additions.length>100)throw new Error('Prices must contain at most 100 rules');return {rows:[...rows,...additions],added:additions.length,skipped:entries.length-additions.length};}

    const React = require('react');
    const h = React.createElement;
    const NS = 'atelier-v13';
    const dicts = {
      zh: {title:'工作台',logs:'请求日志',settings:'全局设置',chatDynamic:'对话中使用动态等待提示',chatDynamicHelp:'替换对话底部“深度求索中”，保留鲸鱼动画和原生计时。通过“中文 · 动态工作提示”语言包生效，其余翻译回退原中文；关闭后恢复原文案。',library:'提示词库',libraryHelp:'选择后点击保存设置，全局生效。DSH 原版会撤销本插件的身份/软件说明覆盖，恢复当前版本动态组装的内置内容（含工具规则），并非固定文本快照。',customPrompt:'自定义（未匹配库条目）',presetName:'新条目名称',storePreset:'将当前提示词存入库',deletePreset:'删除选中的自定义条目',presetStored:'已加入待保存的提示词库；请保存设置。',presetDeleted:'已从待保存库移除；请保存设置。',nameRequired:'请填写条目名称',scopeHelp:'此页设置保存在当前 DSH profile，影响所有现有和新建会话；不是当前会话专属。保存后从各会话下一次请求生效，历史消息不改写。',reduceIdentity:'减少发送的客户端标识（全局）',reduceHelp:'将内置客户端自述改为中性措辞，并停止附带安装路径和界面 URL 的两项标识上下文。保留工具用法、权限和工作目录约束；历史对话、工具定义与请求头仍可能包含名称，不保证匿名。',idle:'已就绪',running:'正在工作',thinking:'思考流',generating:'生成中',tool:'工具运行中',waiting:'等待确认',model:'模型',elapsed:'本轮',reasoning:'思考',input:'输入',output:'输出',cache:'缓存命中',cost:'API 估算',unknown:'未配置价格',estimate:'估算',actual:'API 返回用量',empty:'安装后新的模型请求会出现在这里；过去的请求不追溯补录。',privacy:'日志仅保存在本地，含对话、工具参数和代码。凭据模式会脱敏，但不是 DLP；请勿直接公开。',layer:'这里保存 DSH 转换前的归一化请求、转换后的响应流，不是渠道商最终收到的 HTTP JSON / 原始 SSE。',refresh:'刷新',more:'更多请求',readMore:'继续读取',json:'完整记录 JSON',text:'请求原文（按角色展开）',chunks:'响应流 JSONL（DSH）',response:'响应文本',download:'下载当前视图',save:'保存设置',saving:'保存中…',saved:'设置已保存；新请求生效，旧历史不改写。',identity:'自定义身份段',identityHelp:'仅替换 harness:identity，不删除工具规则或系统安全约束；不能保证渠道无法识别 DSH。',identityText:'身份提示词（留空即移除此身份句）',extra:'追加系统指令',capture:'记录完整请求与响应正文',retention:'日志保留天数',quota:'日志容量上限（MiB）',rotation:'趣味提示轮换秒数',phrases:'趣味状态词（每行一句）',prices:'API 计价表（JSON）',priceHelp:'价格单位为每百万 tokens；provider/model 为实际标识，支持 *。缓存是独立计费桶；reasoning 已包含在输出里，不重复加价。未匹配显示未知，不当成免费。',example:'填入计价示例（需改为你的渠道单价）',conflict:'读取或保存失败',request:'请求',duration:'请求耗时',ttft:'首段延迟',noReasoning:'未观测到思考流',partial:'正文被截断或未启用记录，请检查记录标记',configure:'在工作台视图配置价格与提示词',local:'本地',noPrice:'示例不是官方现价，请按供应商账单填写。',recorded:'已记录请求',pageLimit:'为保护性能，正文按页显示；继续读取或下载当前已加载视图。',currency:'币种',unavailable:'暂未获得数据'},
      en: {title:'Atelier',logs:'Request logs',settings:'Global settings',chatDynamic:'Dynamic waiting text in Chat',chatDynamicHelp:'Replace Chat’s bottom Deep diving label while keeping native animation and elapsed time. Uses an English · Dynamic activity language pack; other translations fall back to English. Disable to restore native labels.',library:'Prompt library',libraryHelp:'Choose then Save settings to apply globally. DSH original removes plugin overrides and restores the current built-in assembly, including tool guidance; it is not a frozen prompt snapshot.',customPrompt:'Custom (not matching a library entry)',presetName:'New preset name',storePreset:'Add current prompt to library',deletePreset:'Delete selected custom preset',presetStored:'Added to draft library; save settings to persist.',presetDeleted:'Removed from draft library; save settings to persist.',nameRequired:'Enter a preset name',scopeHelp:'Settings belong to this profile and apply to all current and future sessions from their next request. Historical messages stay unchanged.',reduceIdentity:'Reduce outgoing client identification (global)',reduceHelp:'Use neutral built-in client guidance and omit the installation-path and GUI-URL contexts. Tool, permission and working-directory rules remain. History, tool definitions and headers may still reveal the client; this is not anonymity.',idle:'Ready',running:'Working',thinking:'Reasoning stream',generating:'Generating',tool:'Running tool',waiting:'Waiting for confirmation',model:'Model',elapsed:'Turn',reasoning:'Reasoning',input:'Input',output:'Output',cache:'Cache read',cost:'API estimate',unknown:'Price not configured',estimate:'Estimated',actual:'API usage',empty:'New model requests will appear after installation. Earlier requests are not backfilled.',privacy:'Local logs contain conversations, tool arguments and code. Credential patterns are masked; this is not DLP. Do not publish logs unreviewed.',layer:'These are DSH normalized requests before conversion and normalized response streams after conversion, not final HTTP JSON or raw SSE.',refresh:'Refresh',more:'More requests',readMore:'Read next page',json:'Full record JSON',text:'Readable request',chunks:'Response stream JSONL (DSH)',response:'Response text',download:'Download current view',save:'Save settings',saving:'Saving…',saved:'Saved for new requests. Existing history stays unchanged.',identity:'Customize identity section',identityHelp:'Replaces harness:identity only. Tool guidance and safeguards remain. This cannot guarantee an unidentifiable client.',identityText:'Identity prompt (empty removes the sentence)',extra:'Additional system instructions',capture:'Record complete request and response bodies',retention:'Log retention days',quota:'Log quota (MiB)',rotation:'Activity phrase rotation seconds',phrases:'Activity phrases (one per line)',prices:'API pricing rules (JSON)',priceHelp:'Prices per million tokens. Match actual provider/model IDs; * is allowed. Cache buckets are separate. Reasoning is already in output and is not charged twice. Unknown is not free.',example:'Insert pricing example (replace with your rates)',conflict:'Read or save failed',request:'Request',duration:'Request duration',ttft:'First chunk latency',noReasoning:'No reasoning stream observed',partial:'Body truncated or capture disabled; inspect capture markers.',configure:'Configure prices and prompt in Atelier',local:'Local',noPrice:'The example is not an official current rate. Use your supplier invoice.',recorded:'Recorded requests',pageLimit:'Body display is paginated. Load more or download the currently loaded view.',currency:'Currency',unavailable:'Data not available'},
    };
    const css = `
.atelier{color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.55;box-sizing:border-box}.atelier *{box-sizing:border-box}.atelier-dock{width:100%;display:flex;flex-wrap:wrap;gap:5px 15px;padding:6px 4px;color:var(--dsw-alias-label-secondary);font-size:11px}.atelier-state{display:inline-flex;gap:7px;align-items:center;color:var(--dsw-alias-label-primary)}.atelier-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-idle-primary)}.atelier-dot.busy{background:var(--dsw-alias-brand-primary);animation:atelier-pulse 1.4s ease-in-out infinite}@keyframes atelier-pulse{50%{opacity:.35}}@media(prefers-reduced-motion:reduce){.atelier-dot.busy{animation:none}}.atelier-page{width:100%;min-width:0;align-self:stretch;flex:1 1 auto;height:100%;overflow:auto;scrollbar-gutter:stable;padding:24px;max-width:none;margin:0;text-align:left}.atelier-page section,.atelier-page form,.atelier-page [role=tabpanel]{width:100%;min-width:0;text-align:left}.atelier-grid>*,.atelier-list,.atelier-record{min-width:0;text-align:left}.atelier-page pre{text-align:left}.atelier-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.atelier h2{font-size:20px;margin:0}.atelier h3{font-size:14px;margin:16px 0 8px}.atelier-muted{color:var(--dsw-alias-label-secondary)}.atelier-note{padding:12px 14px;border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);margin:12px 0}.atelier-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.atelier button{font:inherit;cursor:pointer;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:7px 12px;border-radius:8px}.atelier button:hover{background:var(--dsw-alias-bg-layer-2)}.atelier button:disabled{opacity:.5;cursor:default}.atelier button[aria-selected=true]{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}.atelier button:focus-visible,.atelier textarea:focus-visible,.atelier input:focus-visible,.atelier select:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.atelier-grid{display:grid;grid-template-columns:minmax(220px,300px) minmax(0,1fr);gap:16px}.atelier-list{display:flex;flex-direction:column;gap:6px}.atelier-list button{text-align:left}.atelier-list .selected{border-color:var(--dsw-alias-brand-primary)}.atelier-code{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:16px;font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;max-height:65vh;overflow:auto;margin:8px 0}.atelier-metrics{display:flex;flex-wrap:wrap;gap:12px 24px;margin:12px 0}.atelier-metric strong{display:block;font-size:17px;font-weight:600}.atelier-form{max-width:850px}.atelier-form label{display:block;margin:16px 0 6px;font-weight:500}.atelier-form textarea,.atelier-form input[type=text],.atelier-form input[type=number],.atelier select{width:100%;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:10px;font:inherit}.atelier-form textarea{resize:vertical;min-height:80px}.atelier-form .code{font-family:ui-monospace,monospace}.atelier-row{display:flex;gap:16px;align-items:center;flex-wrap:wrap}.atelier-switch{display:flex!important;align-items:center;gap:10px}.atelier-error{color:var(--dsw-alias-state-error-primary);white-space:pre-wrap}.atelier-success{color:var(--dsw-alias-state-success-primary)}@media(max-width:760px){.atelier-page{padding:16px}.atelier-grid{grid-template-columns:1fr}.atelier-list{max-height:230px;overflow:auto}.atelier-code{max-height:50vh}}

.atelier-dock{width:auto;min-width:0;flex:1 1 auto;align-items:center;justify-content:flex-start;gap:4px 12px;padding:3px 0;font-size:11px;line-height:20px;font-variant-numeric:tabular-nums;font-feature-settings:'tnum';font-weight:400}.atelier-cell{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;min-width:0;height:20px}.atelier-cell svg{width:14px;height:14px;flex:none;display:block;opacity:.72}.atelier-cell .atelier-value{color:var(--dsw-alias-label-secondary)}.atelier-cell.model{max-width:180px;gap:6px}.atelier-cell.model .atelier-value{overflow:hidden;text-overflow:ellipsis;color:var(--dsw-alias-label-primary)}.atelier-cell.model svg{width:17px;height:17px;color:var(--dsw-alias-brand-primary);opacity:1}.atelier-provider{font-size:10px;opacity:.65;overflow:hidden;text-overflow:ellipsis;max-width:68px}.atelier-cell.cost{margin-left:2px}.atelier-orbit-spin{transform-origin:12px 12px;animation:atelier-orbit 4s linear infinite}.atelier-orbit-reverse{transform-origin:12px 12px;animation:atelier-orbit 5.5s linear infinite reverse}.atelier-orbit-core{animation:atelier-breathe 2s ease-in-out infinite}.atelier-paused .atelier-orbit-spin,.atelier-paused .atelier-orbit-reverse,.atelier-paused .atelier-orbit-core{animation:none}.atelier-sr{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@keyframes atelier-orbit{to{transform:rotate(360deg)}}@keyframes atelier-breathe{50%{opacity:.4}}@media(prefers-reduced-motion:reduce){.atelier-orbit-spin,.atelier-orbit-reverse,.atelier-orbit-core{animation:none}}@media(max-width:700px){.atelier-dock{gap:3px 9px;font-size:10px}.atelier-cell.model{max-width:150px}.atelier-provider{display:none}}

.atelier button.atelier-cell{appearance:none;border:0;background:transparent;color:inherit;font:inherit;line-height:20px;padding:2px 4px;margin:-2px -4px;border-radius:5px;cursor:pointer;transition:background .12s ease}.atelier button.atelier-cell:hover,.atelier button.atelier-cell[aria-expanded=true]{background:var(--dsw-alias-bg-layer-2)}.atelier button.atelier-cell:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.atelier-metric-popover{position:fixed;inset:auto;margin:0;padding:0;width:360px;box-sizing:border-box;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;overflow:auto;font:13px/1.55 system-ui,sans-serif;pointer-events:auto;z-index:1000;box-shadow:0 6px 24px color-mix(in srgb,var(--dsw-alias-label-primary) 14%,transparent)}.atelier-metric-popover[popover]:not(:popover-open):not([data-fallback]){display:none}.atelier-popover-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px 8px}.atelier-popover-head h3{margin:0;font-size:14px;font-weight:600}.atelier .atelier-popover-close{display:grid;place-items:center;width:26px;height:26px;padding:0;margin:0;flex:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;cursor:pointer;font-size:20px}.atelier-popover-close:hover{background:var(--dsw-alias-bg-layer-2)}.atelier-popover-close:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.atelier-popover-body{padding:0 16px 16px}.atelier-popover-value{font-size:20px;font-weight:600;line-height:1.4;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.atelier-popover-summary{margin:7px 0 12px;color:var(--dsw-alias-label-secondary)}.atelier-popover-rows{margin:0;display:flex;flex-direction:column;gap:9px}.atelier-popover-row{display:grid;grid-template-columns:minmax(88px,.8fr) minmax(0,1.5fr);gap:14px;align-items:start}.atelier-popover-row dt{color:var(--dsw-alias-label-secondary)}.atelier-popover-row dd{margin:0;text-align:right;overflow-wrap:anywhere;font-variant-numeric:tabular-nums;white-space:pre-wrap}.atelier-popover-notes{margin:13px 0 0;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l1);font-size:11px;color:var(--dsw-alias-label-secondary)}.atelier-popover-notes p{margin:6px 0 0}

.atelier-metric-popover{width:300px;background:#F8F9FA;background:light-dark(#F8F9FA,var(--dsw-alias-bg-layer-1));border-radius:8px;border-color:color-mix(in srgb,var(--dsw-alias-border-l1) 40%,transparent);font-family:inherit;font-size:12px;line-height:1.5;box-shadow:0 0 2px color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent),0 4px 16px color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent)}.atelier-metric-popover::backdrop{background:transparent}.atelier-popover-head{padding:10px 12px 8px;gap:10px}.atelier-popover-head h3{font-size:12px;font-weight:500;color:var(--dsw-alias-label-secondary)}.atelier .atelier-popover-close{width:20px;height:20px;font-size:17px}.atelier-popover-body{padding:0 12px 10px}.atelier-popover-rows{gap:0}.atelier-popover-row{grid-template-columns:minmax(74px,.8fr) minmax(0,1.5fr);gap:12px;padding:4px 0;line-height:18px}.atelier-popover-row dd{font-weight:400}.atelier-popover-brief{font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);margin:8px 0 0;padding-top:8px;border-top:1px solid var(--dsw-alias-border-l1)}.atelier-popover-more{margin-top:8px;font-size:11px}.atelier-popover-more>summary{cursor:pointer;color:var(--dsw-alias-label-secondary);width:fit-content;border-radius:3px}.atelier-popover-more>summary:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.atelier-popover-more .atelier-popover-notes{margin:6px 0 0;padding:0;border:0;line-height:1.6}.atelier-popover-more .atelier-popover-notes p{overflow-wrap:anywhere}

.atelier-page [hidden]{display:none!important}.atelier-page .atelier-list>button{width:100%;min-width:0;text-align:left}.atelier-grid{width:100%;min-width:0;grid-template-columns:minmax(210px,300px) minmax(0,1fr)}.atelier-page .atelier-code{min-width:0;max-width:100%;text-align:left;overflow:auto}@media(max-width:700px){.atelier-page{padding:18px 16px}.atelier-grid{grid-template-columns:minmax(0,1fr)}}

.atelier-setup{padding:14px 16px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);margin:0 0 18px}.atelier .atelier-setup h3{margin:0}.atelier-setup p{margin:8px 0}.atelier-setup .atelier-row{margin-top:12px}

.atelier-settings-navigation{display:flex;gap:4px;flex-wrap:wrap;border-bottom:1px solid var(--dsw-alias-border-l1);padding-bottom:8px;margin-top:16px}.atelier-settings-panel{padding:4px 0 16px}.atelier-settings-panel>h3:first-child{margin-top:8px}.atelier-settings-details{border-top:1px solid var(--dsw-alias-border-l1);padding:12px 0;margin-top:14px}.atelier-settings-details>summary{cursor:pointer;color:var(--dsw-alias-label-secondary)}.atelier-price-scroll{width:100%;max-width:100%;overflow:auto}.atelier-price-table{width:100%;border-collapse:collapse;min-width:780px;font-size:12px}.atelier-price-table th{font-weight:500;text-align:left;color:var(--dsw-alias-label-secondary);padding:8px 6px}.atelier-price-table td{padding:6px;border-bottom:1px solid var(--dsw-alias-border-l1);vertical-align:top}.atelier .atelier-price-table input{width:100%;min-width:68px;padding:6px 7px}.atelier-price-table td:first-child,.atelier-price-table td:nth-child(2){min-width:145px}.atelier-price-table td:nth-child(3){width:65px}.atelier-price-extra>td{padding-top:0}.atelier-price-extra summary{cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:11px}.atelier-price-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;padding:12px 0}.atelier-price-options label{display:flex;flex-direction:column;gap:4px}.atelier-price-options label:has(input[type=checkbox]){flex-direction:row;align-items:center}.atelier .atelier-price-options input[type=checkbox]{width:auto;min-width:0}.atelier-price-tier{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px}
.atelier button.atelier-cell{position:relative}.atelier button.atelier-cell::after{content:attr(data-metric-tip);position:absolute;bottom:calc(100% + 8px);left:0;z-index:1100;display:none;width:max-content;max-width:min(280px,70vw);white-space:pre-line;overflow-wrap:anywhere;text-align:left;font:11px/1.5 system-ui,sans-serif;padding:7px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-overlay);box-shadow:0 2px 10px color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);pointer-events:none}.atelier button.atelier-cell.cost::after{left:auto;right:0}.atelier button.atelier-cell[data-metric-tip]:not([aria-expanded=true]):is(:hover,:focus-visible)::after{display:block}
.atelier-footer-container{position:relative;width:max-content;max-width:100%;min-width:0;flex:none}.atelier-footer-container .atelier-dock{display:flex!important;position:relative;width:max-content;min-width:0;flex-wrap:nowrap;gap:12px}.atelier-footer-container .atelier-dock>button.atelier-cell{position:relative!important;inset:auto!important;visibility:visible!important;display:inline-flex!important;width:auto!important;flex:0 0 auto!important}.atelier-footer-container .atelier-dock>button.atelier-cell::after{position:absolute}.atelier-footer-container[data-hide-model=true] .atelier-dock>button.model{position:absolute!important;visibility:hidden!important;pointer-events:none!important;top:0!important;left:0!important;width:max-content!important}.atelier-footer-container[data-hide-input=true] .atelier-dock>button.input{position:absolute!important;visibility:hidden!important;pointer-events:none!important;top:0!important;left:0!important;width:max-content!important}.atelier-footer-container[data-hide-cache=true] .atelier-dock>button.cache{position:absolute!important;visibility:hidden!important;pointer-events:none!important;top:0!important;left:0!important;width:max-content!important}.atelier-footer-container[data-hide-output=true] .atelier-dock>button.output{position:absolute!important;visibility:hidden!important;pointer-events:none!important;top:0!important;left:0!important;width:max-content!important}.atelier-footer-container[data-hide-cost=true] .atelier-dock>button.cost{position:absolute!important;visibility:hidden!important;pointer-events:none!important;top:0!important;left:0!important;width:max-content!important}.atelier-footer-container[data-hide-thought=true] .atelier-dock>button.thought{position:absolute!important;visibility:hidden!important;pointer-events:none!important;top:0!important;left:0!important;width:max-content!important}
.atelier-cache-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:14px 0}.atelier-cache-grid dt{font-size:11px;color:var(--dsw-alias-label-secondary)}.atelier-cache-grid dd{margin:2px 0 0;font-variant-numeric:tabular-nums}.atelier-cache-grid~.atelier-list{font-size:11px;gap:4px}
`;
    const number = value => compactNumber(value);
    const seconds = ms => compactDuration(ms);
    function costLabel(cost,t) {
      const parts = Object.entries(cost?.totals ?? {}).map(([currency,amount])=>compactMoney(amount,currency));
      if (cost?.unknown) parts.push(t('unknown'));
      return parts.join(' + ') || t('unknown');
    }
    const setupCopy={zh:{sidebarRecentLabel:'24 小时内聊过（非未读）',sidebarTitle:'左侧会话列表',sidebarMarks:'24 小时内聊过的会话加点',sidebarSnap:'最近 1 小时的会话滚动到顶部时停靠',sidebarHelp:'按原生“最近更新”时间判断；近期点不是未读点，不替换运行或审批状态。仅最近 1 小时会话经过列表顶部时短暂停靠，并轻亮一次提示对应行；上下方向一致，继续滚动可离开。不重排、不置顶，不取消滚轮输入。系统开启减少动态效果时不吸附。',cacheObserved:'近期观测比例（保守）',catalogSkipped:'已有同型号跳过',catalogImportUser:'追加此组参考价到草稿',catalogUnits:'（输入／缓存读取／输出，每百万 tokens）',cachePanel:'缓存诊断',cacheAnalyze:'分析最近请求',cacheSummary:'已报告样本命中率',cacheFieldCoverage:'缓存字段覆盖',cacheSystem:'系统段变化',cacheTools:'工具定义变化',cacheOptions:'请求选项变化',cacheHistory:'历史非追加变化',cacheStableUnknown:'前缀稳定但未报告',cacheStableLow:'前缀稳定但低命中',cacheAdvice:'建议：固定模型与思考档位；工具按需加载但避免反复切换；稳定前缀前不要插入动态内容；摘要/压缩后允许缓存重新预热；若前缀稳定却波动，向渠道核对路由、TTL与缓存字段。不要发额外付费请求“刷命中”。',cacheLimit:'仅分析归一化请求，不是上游缓存键；相同消息数不等于可缓存token数。缺缓存字段不等于0命中。',catalog:'官方文档价格预设',catalogHelp:'固定文档快照，不是实时官网报价。只追加有证据的精确型号，不覆盖已有同型号规则。',catalogImport:'追加文档快照条目',catalogPending:'待核实：',catalogAdded:'已加入草稿，请保存；未核实型号不参与计价。',setup:'首次使用',setupIntro:'三步确认；设置对当前 profile 的所有会话生效。',setupPrivacy:'正文记录',setupPrivacyHelp:'默认关闭。开启会保存对话、代码和工具参数；脱敏不等于可安全公开。',setupPrompt:'提示词方案',setupPrices:'API 价格',setupPricesHelp:'未匹配价格时显示未知；不会按免费处理。可在下方计价表编辑。',setupNext:'下一步',setupBack:'上一步',setupDone:'保存并完成',setupLater:'稍后设置',setupReopen:'使用引导',setupSummary:'仅在最后确认时保存，不自动修改沙箱或权限。'},en:{sidebarRecentLabel:'Active within 24 hours (not unread)',sidebarTitle:'Sidebar sessions',sidebarMarks:'Mark sessions active within 24 hours',sidebarSnap:'Snap sessions active within one hour to the top when scrolling',sidebarHelp:'Uses the native last-updated timestamp. Recency is not unread state and does not replace activity/approval indicators. Only recent-hour sessions crossing the top edge of the list briefly stop and pulse once, in either direction. Continue scrolling to leave; no reordering, pinning or cancelled wheel input. Disabled under reduced motion.',cacheObserved:'Recent observed share',catalogSkipped:'existing selectors skipped',catalogImportUser:'Append this reference group to draft',catalogUnits:'(input / cache read / output per million tokens)',cachePanel:'Cache diagnostics',cacheAnalyze:'Analyze recent requests',cacheSummary:'Hit ratio (reported samples)',cacheFieldCoverage:'Cache-field coverage',cacheSystem:'System changes',cacheTools:'Tool schema changes',cacheOptions:'Option changes',cacheHistory:'Non-append history changes',cacheStableUnknown:'Stable prefix, cache unreported',cacheStableLow:'Stable prefix, low hit ratio',cacheAdvice:'Keep model and reasoning settings stable; load tools on demand without repeatedly toggling them; avoid dynamic content ahead of stable prefixes; allow warm-up after compaction. If stable requests fluctuate, verify routing, TTL and reporting with the provider. Do not send extra paid requests just to warm caches.',cacheLimit:'Normalized requests, not upstream cache keys. Message counts are not cached token counts. Missing fields are not zero hits.',catalog:'Official-document price presets',catalogHelp:'Fixed-document snapshots, not live website prices. Append evidenced exact models without replacing existing rules.',catalogImport:'Append documented entries',catalogPending:'Pending verification: ',catalogAdded:'Added to draft; save to apply. Unverified models are not priced.',setup:'Getting started',setupIntro:'Three steps. Settings affect every session in this profile.',setupPrivacy:'Body capture',setupPrivacyHelp:'Off by default. Enabling stores conversation, code and tool arguments; redaction does not make exports safe to share.',setupPrompt:'Prompt preset',setupPrices:'API pricing',setupPricesHelp:'Unmatched prices remain unknown, not free. Edit the price table below.',setupNext:'Next',setupBack:'Back',setupDone:'Save and finish',setupLater:'Later',setupReopen:'Setup guide',setupSummary:'Only the final confirmation saves. Sandbox and tool permissions do not change.'}};
    return {
      inject:['slots','locale','connection'],
      apply(ctx) {
        for (const [id,dict] of Object.entries(dicts)) ctx.effect(()=>ctx.locale.register(NS,id,{...dict,...metricCopy[id],...setupCopy[id]}));
        const translate = ctx.locale.bind(NS);
        const call = async (action,args={}) => {
          const result = await ctx.connection.rpc.call('/api','atelier',{...args,action});
          if (!result.ok) throw new Error(result.error?.message ?? 'Atelier RPC failed');
          return result.value;
        };
        let activity;let sidebarTime=Date.now();let sidebarDisplay={marks:true,snap:true};const sidebarListeners=new Set();const sidebarSubscribe=listener=>{sidebarListeners.add(listener);return()=>sidebarListeners.delete(listener);};
        const updateSidebar=display=>{const next={marks:display.sidebarRecentMarks!==false,snap:display.sidebarRecentSnap!==false};if(next.marks===sidebarDisplay.marks&&next.snap===sidebarDisplay.snap)return;sidebarDisplay=next;for(const listener of sidebarListeners)listener();};
        ctx.effect(()=>{
          let stopped=false;let pollTimer;let lastReport=0;
          activity=installChatActivity(ctx.locale,{onDiagnostic:value=>{
            if(stopped||Date.now()-lastReport<5000)return;lastReport=Date.now();
            call('client-report',{runtime:{...value,build:'atelier-1.5.0'}}).catch(error=>console.error('[atelier] client diagnostic:',error));
          }});
          async function refreshDisplay(){
            try{const display=await call('display');if(!stopped){activity.configure(display);updateSidebar(display);}}catch(error){console.error('[atelier] display settings:',error);}
            if(!stopped)pollTimer=setTimeout(refreshDisplay,10000);
          }
          refreshDisplay();
          return()=>{stopped=true;clearTimeout(pollTimer);activity.dispose();};
        });
        function RecentSessionDot(props){
          const row=props.useSessions(snapshot=>snapshot.byId[props.sessionId]);const display=React.useSyncExternalStore(sidebarSubscribe,()=>sidebarDisplay);const time=React.useSyncExternalStore(sidebarSubscribe,()=>sidebarTime);
          if(!display.marks||!sessionRecency(row,time).recent)return null;
          return h('span',{className:'atelier-recent-dot',role:'img','aria-label':translate('sidebarRecentLabel'),title:translate('sidebarRecentLabel')});
        }
        function SidebarRecentMonitor(props){
          const summaries=props.useSessions(snapshot=>snapshot.byId);const options=React.useSyncExternalStore(sidebarSubscribe,()=>sidebarDisplay);const[now,setNow]=React.useState(Date.now);
          React.useEffect(()=>{const timer=setInterval(()=>{sidebarTime=Date.now();setNow(sidebarTime);for(const listener of sidebarListeners)listener();},30000);return()=>clearInterval(timer);},[]);
          const[stop,setStop]=React.useState(null);const hotRef=React.useRef(new Set());hotRef.current=new Set(options.snap?Object.values(summaries??{}).filter(row=>sessionRecency(row,now).hot).map(row=>row.id):[]);
          React.useEffect(()=>observeRecentStops(document,()=>hotRef.current,setStop),[]);
          const result=React.useMemo(()=>recentSessionStyles(Object.values(summaries??{}),now,options,stop),[summaries,now,options,stop]);
          React.useEffect(()=>{call('client-report',{runtime:{build:'atelier-1.5.0',sidebar:{recent:result.recent,hot:result.hot,marks:options.marks,snap:options.snap,mode:result.mode}}}).catch(error=>console.error('[atelier] sidebar diagnostic:',error));},[result.recent,result.hot,options]);
          return h('style',{'data-atelier-sidebar':'recent-v1'},result.css);
        }
        function ActivityMonitor(props){
          const status=props.useSessionStatus(snapshot=>snapshot);
          React.useEffect(()=>{const ids=[];for(const [id,row] of status){ids.push(id);activity?.setRunning(id,row.running);}return()=>{for(const id of ids)activity?.setRunning(id,undefined);};},[status]);
          return null;
        }
        function useT() {
          React.useSyncExternalStore(fn=>ctx.locale.subscribe(fn),()=>ctx.locale.getSnapshot());
          return translate;
        }
        function useStatus(props) {
          const projection = props.useProjection('atelierStats', state => state);
          const running = props.useSession(s=>s?.running??false);
          const [value,setValue]=React.useState(null);
          const [error,setError]=React.useState('');
          const [now,setNow]=React.useState(Date.now());const[liveSpeed,setLiveSpeed]=React.useState(null);
          React.useEffect(()=>{
            let cancelled=false,timer;setLiveSpeed(null);if(!running)return;
            async function refreshSpeed(){try{const data=await call('live-speed',{sessionId:props.sessionId});if(!cancelled){setLiveSpeed({...data,receivedAt:Date.now()});setNow(Date.now());}}catch{/* Full status retains its own error reporting. */}if(!cancelled)timer=setTimeout(refreshSpeed,500);}
            refreshSpeed();return()=>{cancelled=true;clearTimeout(timer);};
          },[props.sessionId,running]);
          React.useEffect(()=>{
            let cancelled=false; let timer;
            async function refresh() {
              try {const data=await call('status',{sessionId:props.sessionId});if(!cancelled){setValue(data);setError('');}}
              catch(e){if(!cancelled)setError(String(e.message));}
              if(!cancelled)timer=setTimeout(refresh,running?1500:10000);
            }
            refresh();return()=>{cancelled=true;clearTimeout(timer);};
          },[props.sessionId,running,projection?.lastSeq]);
          React.useEffect(()=>{
            if(!running)return;
            const id=setInterval(()=>setNow(Date.now()),500);return()=>clearInterval(id);
          },[running]);
          return {value,error,stats:projection??value?.stats,running,now,liveSpeed};
        }
        function Glyph({kind}) {
          const paths={speed:'M4 17a9 9 0 1 1 16 0M12 13l5-5M7 17h10',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2',thought:'M9 4a4 4 0 0 0-5 4 4 4 0 0 0-1 7 4 4 0 0 0 6 4m6-15a4 4 0 0 1 5 4 4 4 0 0 1 1 7 4 4 0 0 1-6 4M9 4v16m6-16v16M6 10h3m6 4h3',input:'M12 20V4m-5 5 5-5 5 5M5 20h14',output:'M12 4v16m-5-5 5 5 5-5M5 4h14',cache:'M19 8V5h-3M5 16v3h3M18 6a8 8 0 0 0-13 4m1 8a8 8 0 0 0 13-4',cost:'M20 7c0 2-4 3-8 3s-8-1-8-3 4-3 8-3 8 1 8 3Zm0 0v5c0 2-4 3-8 3s-8-1-8-3V7m16 5v5c0 2-4 3-8 3s-8-1-8-3v-5',model:'M8 3H5v5m14 0V3h-3M5 16v5h3m8 0h3v-5M8 8h8v8H8z'};
          return h('svg',{viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.6,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('path',{d:paths[kind]??paths.model}));
        }
        function ModelGlyph({model,running}) {
          if(modelFamily(model)!=='gpt')return h(Glyph,{kind:'model'});
          return h('svg',{viewBox:'0 0 24 24',className:running?'':'atelier-paused','aria-hidden':true,fill:'none'},
            h('circle',{cx:12,cy:12,r:2.3,fill:'currentColor',className:'atelier-orbit-core'}),
            h('ellipse',{cx:12,cy:12,rx:9,ry:4.5,stroke:'currentColor',strokeWidth:1,opacity:.45,transform:'rotate(-32 12 12)'}),
            h('ellipse',{cx:12,cy:12,rx:9,ry:4.5,stroke:'currentColor',strokeWidth:1,opacity:.45,transform:'rotate(44 12 12)'}),
            h('g',{className:'atelier-orbit-spin'},h('circle',{cx:19.7,cy:7.3,r:1.7,fill:'currentColor'})),
            h('g',{className:'atelier-orbit-reverse'},h('circle',{cx:5.5,cy:6.2,r:1.2,fill:'currentColor',opacity:.7})),
          );
        }
        function Metric({kind,label,value,full,onClick,expanded,controls,hidden}){return h('button',{type:'button',className:`atelier-cell ${kind}`,'data-metric-hidden':hidden?'true':undefined,'data-metric-tip':`${label}: ${value}`,'aria-label':`${label}: ${value}`,'aria-haspopup':'dialog','aria-expanded':!!expanded,'aria-controls':expanded?controls:undefined,onClick},h(Glyph,{kind}),h('span',{className:'atelier-value'},value));}
        function MetricPopover({detail,anchor,id,onClose,t}){
          const panel=React.useRef(null);const closeButton=React.useRef(null);const closeRef=React.useRef(onClose);closeRef.current=onClose;
          React.useLayoutEffect(()=>{
            const element=panel.current;if(!element||!anchor)return;
            let live=true;let native=false;let observer;
            const position=()=>{if(!live||!anchor.isConnected){if(live)closeRef.current(false);return;}const rect=anchor.getBoundingClientRect();const box=element.getBoundingClientRect();const place=popoverPosition(rect,box,{width:window.innerWidth,height:window.innerHeight});Object.assign(element.style,{left:`${place.left}px`,top:`${place.top}px`,maxWidth:`${place.maxWidth}px`,maxHeight:`${place.maxHeight}px`});};
            const outside=event=>{if(!element.contains(event.target)&&!anchor.contains(event.target))closeRef.current(false);};
            const escape=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeRef.current(true);}};
            const toggled=event=>{if(event.newState==='closed'&&live)closeRef.current(false);};
            const focusLeft=event=>{if(event.relatedTarget&&!element.contains(event.relatedTarget)&&!anchor.contains(event.relatedTarget))closeRef.current(false);};
            element.addEventListener('focusout',focusLeft);
            element.addEventListener('toggle',toggled);
            if(typeof element.showPopover==='function'){element.showPopover();native=true;}else{element.dataset.fallback='';element.style.display='block';}
            position();closeButton.current?.focus({preventScroll:true});
            window.addEventListener('resize',position);window.addEventListener('scroll',position,true);document.addEventListener('pointerdown',outside,true);element.addEventListener('keydown',escape);
            if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(position);observer.observe(element);}
            return()=>{live=false;observer?.disconnect();window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true);document.removeEventListener('pointerdown',outside,true);element.removeEventListener('keydown',escape);element.removeEventListener('focusout',focusLeft);element.removeEventListener('toggle',toggled);if(native&&element.matches(':popover-open'))element.hidePopover();};
          },[anchor,detail.kind]);
          return h('div',{ref:panel,id,popover:'auto',className:'atelier-metric-popover',role:'dialog','aria-modal':false,'aria-labelledby':`${id}-title`,'aria-describedby':`${id}-summary`,'data-atelier-metric-detail':detail.kind},
            h('div',{className:'atelier-popover-head'},h('h3',{id:`${id}-title`},detail.title),h('button',{ref:closeButton,type:'button',className:'atelier-popover-close','aria-label':t('closeDetails'),onClick:()=>onClose(true)},'×')),
            h('div',{className:'atelier-popover-body'},
              h('dl',{className:'atelier-popover-rows'},detail.displayRows.map((row,index)=>h('div',{key:`${row.label}-${index}`,className:'atelier-popover-row'},h('dt',null,row.label),h('dd',null,row.value)))),
              h('p',{id:`${id}-summary`,className:'atelier-popover-brief'},detail.brief),
              h('details',{className:'atelier-popover-more'},h('summary',null,t('moreDetails')),h('div',{className:'atelier-popover-notes'},h('p',null,detail.summary),detail.moreRows.map((row,index)=>h('p',{key:`row-${index}`},h('span',null,`${row.label} · `),row.value)),detail.notes.map((note,index)=>h('p',{key:index},note)))),
            ),
          );
        }
        function Status(props) {
          const t=useT();const {value,error,stats,running,now,liveSpeed}=useStatus(props);
          const last=value?.live?.[0]??value?.last;const liveRecord=running?(liveSpeed?.live??value?.live??[]).filter(row=>row.purpose==null||row.purpose==='conversation').sort((a,b)=>(b.startedAt??0)-(a.startedAt??0))[0]:null;const liveRate=liveOutputThroughput(liveRecord,liveSpeed?liveSpeed.sampledAt+Math.max(0,now-liveSpeed.receivedAt):now);const speed=liveRate?{...liveRate,model:liveRecord.model,provider:liveRecord.provider}:value?.speed??null;
          const model=stats?.model||last?.model||t('unavailable');const provider=stats?.provider||last?.provider||'—';
          const elapsed=stats?.turnStartedAt&&running ? now-stats.turnStartedAt : stats?.turnElapsedMs;
          const thought=(last?.purpose==='conversation'&&last.reasoningStartedAt!=null?last:null)??value?.thought??null;const reasoning=thought?.reasoningStartedAt!=null?(thought.reasoningEndedAt??now)-thought.reasoningStartedAt:null;
          const usage=stats?.usage??{};const full=n=>Number(n??0).toLocaleString();
          const costs=costLabel(value?.cost,t);
          const [opened,setOpened]=React.useState(null);const popoverId=React.useId();const openedRef=React.useRef(null);openedRef.current=opened;
          const closeDetails=React.useCallback((restoreFocus=false)=>{const current=openedRef.current;setOpened(null);if(restoreFocus&&current?.anchor?.isConnected)current.anchor.focus({preventScroll:true});},[]);
          const openDetails=kind=>event=>{const anchor=event.currentTarget;setOpened(current=>current?.kind===kind?null:{kind,anchor});};
          const detail=opened?metricDetail(opened.kind,{stats,last:opened.kind==='thought'?thought:last,speed,cost:value?.cost,cache:value?.cache,running,now},t):null;
          React.useEffect(()=>{setOpened(null);},[props.sessionId]);
          const clickable=kind=>({onClick:openDetails(kind),expanded:opened?.kind===kind,controls:popoverId});
          React.useEffect(()=>{
            call('client-report',{runtime:{build:'atelier-1.5.0',footer:{mode:'metrics-only',iconCount:8,speed:speed?.label??'—',family:modelFamily(model),model,input:compactNumber(usage.inputTokens),output:compactNumber(usage.outputTokens),cache:compactNumber(usage.cacheReadTokens),elapsed:compactDuration(elapsed),cost:costs,animation:modelFamily(model)==='gpt'?'orbital':'model-icon',clickable:true,popoverKind:opened?.kind??'',popoverNative:typeof HTMLElement!=='undefined'&&typeof HTMLElement.prototype.showPopover==='function'}}}).catch(error=>console.error('[atelier] footer diagnostic:',error));
          },[model,usage.inputTokens,usage.outputTokens,usage.cacheReadTokens,running,costs,speed?.label,opened?.kind]);
          return h('div',{className:'atelier atelier-dock','data-atelier-footer':'metrics-only','data-model-family':modelFamily(model)},
            h('button',{type:'button',className:'atelier-cell model','data-metric-tip':`${t('model')}: ${model}`,'aria-label':`${t('model')}: ${model}, ${provider}`,'aria-haspopup':'dialog','aria-expanded':opened?.kind==='model','aria-controls':opened?.kind==='model'?popoverId:undefined,onClick:openDetails('model')},h(ModelGlyph,{model,running}),h('span',{className:'atelier-value'},model),h('span',{className:'atelier-provider'},provider)),
            h(Metric,{kind:'clock',...clickable('clock'),label:t('elapsed'),value:seconds(elapsed),full:`${t('elapsed')}: ${seconds(elapsed)}`}),
            h(Metric,{kind:'thought',...clickable('thought'),label:t('reasoning'),value:reasoning===null?'—':seconds(reasoning),full:reasoning===null?t('noReasoning'):`${t('reasoning')}: ${seconds(reasoning)}`}),
            h(Metric,{kind:'input',...clickable('input'),label:t('input'),value:number(usage.inputTokens),full:`${t('input')}: ${full(usage.inputTokens)} tokens`}),
            h(Metric,{kind:'output',...clickable('output'),label:t('output'),value:number(usage.outputTokens),full:`${t('output')}: ${full(usage.outputTokens)} tokens`}),
            h(Metric,{kind:'speed',...clickable('speed'),label:t('speed'),value:speed?.label??'—',full:`${t('speed')}: ${speed?.label??'—'}\n${t(speed?.estimated?'detailLiveSpeed':'detailSpeed')}`}),
            h(Metric,{kind:'cache',...clickable('cache'),label:t('cache'),value:number(usage.cacheReadTokens),full:`${t('cache')}: ${full(usage.cacheReadTokens)} tokens`}),
            h(Metric,{kind:'cost',...clickable('cost'),label:t('cost'),value:`API ${costs}`,full:`${t('cost')}: ${costs}\n${value?.cost?.basis??''}\n${(value?.cost?.sources??[]).join('\n')}${value?.cost?.unknown?`\n${value.cost.unknown} requests have no verified price`:''}`}),
            error&&h('span',{className:'atelier-error',role:'status',title:error},'!'),
            detail&&h(MetricPopover,{key:detail.kind,detail,anchor:opened.anchor,id:popoverId,onClose:closeDetails,t}),
          );
        }
        function CachePanel(props){
          const t=useT();const[data,setData]=React.useState(null);const[busy,setBusy]=React.useState(false);const[error,setError]=React.useState('');const sessionRef=React.useRef(props.sessionId);sessionRef.current=props.sessionId;
          React.useEffect(()=>{setData(null);setError('');setBusy(false);},[props.sessionId]);
          async function analyze(){const sessionId=props.sessionId;setBusy(true);setError('');try{const value=await call('cache',{sessionId});if(sessionRef.current===sessionId)setData(value);}catch(error){if(sessionRef.current===sessionId)setError(error.message);}finally{if(sessionRef.current===sessionId)setBusy(false);}}
          const percentage=value=>typeof value==='number'?`${(value*100).toFixed(1)}%`:'—';
          return h('details',{className:'atelier-note'},h('summary',null,t('cachePanel')),h('p',null,t('cacheLimit')),h('button',{type:'button',disabled:busy,onClick:analyze},t('cacheAnalyze')),error&&h('p',{role:'alert',className:'atelier-error'},error),data&&h(React.Fragment,null,h('dl',{className:'atelier-cache-grid'},[[t('cacheSummary'),percentage(data.recent.weightedRatio)],[t('cacheObserved'),percentage(data.recent.observedRatio)],[t('cacheFieldCoverage'),`${data.recent.reported}/${data.recent.total}`],[t('cacheSystem'),data.prefix.compared?data.prefix.systemChanges:'—'],[t('cacheTools'),data.prefix.compared?data.prefix.toolChanges:'—'],[t('cacheOptions'),data.prefix.compared?data.prefix.optionChanges:'—'],[t('cacheHistory'),data.prefix.compared?data.prefix.historyRewrites:'—'],[t('cacheStableLow'),data.prefix.compared?data.prefix.stableButLow:'—'],[t('cacheStableUnknown'),data.prefix.compared?data.prefix.stableUnreported:'—']].map(([label,value])=>h('div',{key:label},h('dt',null,label),h('dd',null,value)))),h('div',{className:'atelier-list'},data.recent.samples.slice(0,8).map(row=>h('div',{key:row.id},`${new Date(row.startedAt).toLocaleTimeString()} · ${row.model} · ${row.cacheReported?percentage(row.ratio):t('cacheMissing')}`))),h('p',null,t('cacheAdvice'))));
        }
        function LogView(props) {
          const t=useT();const [rows,setRows]=React.useState([]);const [total,setTotal]=React.useState(0);
          const [selected,setSelected]=React.useState(null);const [view,setView]=React.useState('text');
          const [detail,setDetail]=React.useState(null);const [error,setError]=React.useState('');
          const [busy,setBusy]=React.useState(false);
          const pageBusy=React.useRef(false);const current=React.useRef({});
          current.current={sessionId:props.sessionId,selected,view};
          async function load(offset=0) {
            const sessionId=props.sessionId;setBusy(true);
            try{const data=await call('logs',{sessionId,offset,limit:30});if(current.current.sessionId!==sessionId)return;setRows(previous=>offset?[...previous,...data.items]:data.items);setTotal(data.total);setError('');}
            catch(e){if(current.current.sessionId===sessionId)setError(e.message);}finally{if(current.current.sessionId===sessionId)setBusy(false);}
          }
          React.useEffect(()=>{setRows([]);setSelected(null);setDetail(null);load();},[props.sessionId]);
          React.useEffect(()=>{
            if(!selected)return;let cancelled=false;setDetail(null);setBusy(true);
            call('get',{sessionId:props.sessionId,id:selected,view}).then(data=>{if(!cancelled){setDetail(data);setError('');}}).catch(e=>{if(!cancelled)setError(e.message);}).finally(()=>{if(!cancelled)setBusy(false);});
            return()=>{cancelled=true;};
          },[props.sessionId,selected,view]);
          async function readMore() {
            if(pageBusy.current||!detail||detail.nextOffset===null)return;
            const identity=current.current;const offset=detail.nextOffset;pageBusy.current=true;setBusy(true);
            try{const next=await call('get',{sessionId:identity.sessionId,id:identity.selected,view:identity.view,offset});
              if(current.current.sessionId===identity.sessionId&&current.current.selected===identity.selected&&current.current.view===identity.view)
                setDetail(old=>old&&old.id===identity.selected&&old.view===identity.view&&old.nextOffset===offset?({...next,text:old.text+next.text}):old);
            }catch(e){if(current.current===identity)setError(e.message);}finally{pageBusy.current=false;setBusy(false);}
          }
          function download() {
            if(!detail)return;
            const blob=new Blob([detail.text],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);
            const anchor=document.createElement('a');anchor.href=url;anchor.download=`atelier-${selected}-${view}${detail.nextOffset!==null?'-partial':''}.${view==='json'?'json':view==='chunks'?'jsonl':'txt'}`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
          }
          return h('section',null,h(CachePanel,props),
            h('div',{className:'atelier-head'},h('h3',null,`${t('recorded')} · ${total}`),h('button',{onClick:()=>load(),disabled:busy},t('refresh'))),
            h('div',{className:'atelier-note'},t('layer')),
            error&&h('p',{role:'alert',className:'atelier-error'},error),
            rows.length===0?h('p',{className:'atelier-muted'},t('empty')):
            h('div',{className:'atelier-grid'},
              h('div',{className:'atelier-list'},rows.map(row=>h('button',{key:row.id,className:selected===row.id?'selected':'',onClick:()=>setSelected(row.id)},
                h('strong',null,row.model),h('div',{className:'atelier-muted'},`${new Date(row.startedAt).toLocaleTimeString()} · ${row.state}`),h('div',{className:'atelier-muted'},`${row.provider} · ${row.purpose}`),h('div',null,`${seconds((row.endedAt??Date.now())-row.startedAt)} · ${row.usage?t('actual'):t('estimate')}`))),rows.length<total&&h('button',{onClick:()=>load(rows.length),disabled:busy},t('more'))),
              h('div',null,selected?h(React.Fragment,null,
                h('div',{className:'atelier-tabs',role:'tablist'},['text','json','chunks','response'].map(key=>h('button',{key,role:'tab','aria-selected':view===key,onClick:()=>setView(key)},t(key)))),
                detail?.truncated&&h('p',{className:'atelier-error'},t('partial')),
                h('pre',{className:'atelier-code',tabIndex:0},detail?.text??'…'),
                detail&&h('div',{className:'atelier-row'},detail.nextOffset!==null&&h('button',{onClick:readMore,disabled:busy},t('readMore')),h('button',{onClick:download},t('download')),h('small',{className:'atelier-muted'},`${detail.text.length.toLocaleString()} / ${detail.totalChars.toLocaleString()}`)),
                h('p',{className:'atelier-muted'},t('pageLimit')),
              ):h('p',{className:'atelier-muted'},t('request'))),
            ),
          );
        }
        function Settings() {
          const t=useT();const [state,setState]=React.useState(null);const [phrases,setPhrases]=React.useState('');const [prices,setPrices]=React.useState('[]');const [error,setError]=React.useState('');const [message,setMessage]=React.useState('');const [busy,setBusy]=React.useState(false);
          const [presetId,setPresetId]=React.useState('custom');const [presetName,setPresetName]=React.useState('');
          const [setupStep,setSetupStep]=React.useState(null);const setupChecked=React.useRef(false);
          const [category,setCategory]=React.useState('appearance');const categoryId=React.useId();const [jsonDraft,setJsonDraft]=React.useState(null);const [jsonError,setJsonError]=React.useState('');
          const copy=t('model')==='模型'?{appearance:'外观',prompts:'提示词',logs:'日志',pricing:'API 计价',draft:'分类切换保留草稿，修改后统一保存。',reference:'预填参考价格',referenceHelp:'已预填人民币与美元两套参考价，选择后随全部设置保存并影响统计和底栏。来自用户提供资料，尚未独立核验，不是实时官方报价；币种之间不自动换算。',custom:'自定义覆盖规则',customHelp:'仅需特殊价格时展开；这些规则覆盖同币种的预填参考价。原有规则不会被自动改写。',period:'DeepSeek 计价场景',peak:'高峰',offpeak:'非高峰',periodHelp:'手动场景，仅切换 DeepSeek 的峰谷价；不按当前时间或节假日自动切换。',bookMissing:'当前参考价表尚未加载，请刷新后重试。',advanced:'高级：JSON 导入／导出',jsonHelp:'JSON 与表格对应同一份规则。修改后须显式应用到草稿，校验失败不会覆盖表格。',apply:'应用 JSON 到草稿',discard:'放弃 JSON 修改',pending:'JSON 有未应用修改，请先应用或放弃再保存。',add:'添加规则',remove:'删除',provider:'渠道',model:'模型',currency:'币种',input:'输入',output:'输出',read:'缓存读取',write:'缓存写入',more:'更多规则选项',write12:'12h 缓存写入',strict:'缓存用量必须配置明确单价',label:'规则备注',source:'价格来源 URL',checked:'核验日期',tier:'长上下文档位',none:'未启用',empty:'尚无自定义覆盖规则，使用预填参考价即可。',units:'单价按每百万 tokens；缓存单价留空表示未配置，币种不自动换算。',applied:'JSON 已应用到表格草稿，尚未保存。'}:{appearance:'Appearance',prompts:'Prompts',logs:'Logs',pricing:'API pricing',draft:'Drafts stay when switching categories. Save all changes together.',reference:'Prefilled reference prices',referenceHelp:'CNY and USD reference tables are prefilled. Save the selected currency and scenario to update statistics and footer. User-supplied, not independently verified or live official tariffs; no exchange conversion.',custom:'Custom override rules',customHelp:'Expand only for special prices. These override prefilled references in the same currency. Existing rules are not silently rewritten.',period:'DeepSeek pricing scenario',peak:'Peak',offpeak:'Off-peak',periodHelp:'Manual DeepSeek peak/off-peak scenario only; no clock or holiday automation.',bookMissing:'Reference table has not loaded. Refresh and try again.',advanced:'Advanced: JSON import / export',jsonHelp:'JSON and the table use the same rule set. Apply edits explicitly; invalid JSON does not replace the table.',apply:'Apply JSON to draft',discard:'Discard JSON edits',pending:'JSON has unapplied edits. Apply or discard before saving.',add:'Add rule',remove:'Delete',provider:'Provider',model:'Model',currency:'Currency',input:'Input',output:'Output',read:'Cache read',write:'Cache write',more:'More rule options',write12:'12h cache write',strict:'Require explicit cache rates',label:'Rule label',source:'Price source URL',checked:'Checked date',tier:'Long-context tier',none:'Disabled',empty:'No custom overrides. Prefilled reference prices are used.',units:'Prices per million tokens. Blank cache rates are unconfigured; no currency conversion.',applied:'JSON applied to the table draft, not saved yet.'};
          const priceRows=JSON.parse(prices);const jsonPending=jsonDraft!==null;
          const selectedCurrency=state?.settings.priceCurrency??'USD';const selectedPeriod=state?.settings.pricePeriod??'peak';const peakRows=state?.priceBook?.peak?.[selectedCurrency];const referenceRows=peakRows?.flatMap(row=>{const off=state?.priceBook?.offpeak?.[selectedCurrency]?.find(other=>other.model===row.model);return off&&row.model.startsWith('deepseek')?[{...row,scenario:'peak'},{...off,scenario:'offpeak'}]:[row];});
          const showPrice=value=>typeof value==='number'&&Number.isFinite(value)?value.toLocaleString(undefined,{maximumFractionDigits:6}):'—';
          const referenceTable=()=>Array.isArray(referenceRows)?h('div',{className:'atelier-price-scroll atelier-price-book','data-price-currency':selectedCurrency,'data-price-period':selectedPeriod},h('table',{className:'atelier-price-table'},h('thead',null,h('tr',null,[copy.model,copy.currency,copy.input,copy.read,copy.output].map((label,index)=>h('th',{key:index,scope:'col'},label)))),h('tbody',null,referenceRows.map((row,index)=>h('tr',{key:`${row.model}-${index}`},h('td',null,row.model,row.scenario?` · ${copy[row.scenario]}${selectedPeriod===row.scenario?' ✓':''}`:''),h('td',null,row.currency??selectedCurrency),...['input','cacheRead','output'].map(key=>h('td',{key},showPrice(row[key])))))))):h('p',{role:'status',className:'atelier-muted'},copy.bookMissing);
          function editPrices(rows){setPrices(JSON.stringify(rows,null,2));setError('');}
          function applyJson(){try{editPrices(parsePriceDraft(jsonDraft??prices));setJsonDraft(null);setJsonError('');setMessage(copy.applied);}catch(error){setJsonError(error.message);}}
          const panel=(key,...children)=>h('section',{key,id:`${categoryId}-${key}-panel`,role:'tabpanel','aria-labelledby':`${categoryId}-${key}-tab`,hidden:category!==key,className:'atelier-settings-panel'},...children);
          const priceFieldNames={provider:'provider',model:'model',currency:'currency',input:'input',output:'output',cacheRead:'read',cacheWrite:'write',cacheWrite12h:'write12'};
          const patchPrice=(index,key,value)=>editPrices(patchPriceRule(priceRows,index,key,value));
          const rateField=(row,index,key,tier=false)=>h('input',{type:'number',min:0,max:1000000,step:'any',disabled:busy||jsonPending,value:(tier?row.longContext:row)?.[key]??'','aria-label':`${copy[priceFieldNames[key]]} · ${row.model||index+1}${tier?' · '+copy.tier:''}`,onChange:event=>{const raw=event.target.value;const value=raw===''?(['input','output'].includes(key)?'':undefined):Number(raw);if(tier){const next={...row.longContext};if(value===undefined)delete next[key];else next[key]=value;patchPrice(index,'longContext',next);}else patchPrice(index,key,value);}});
          const priceTable=()=>h(React.Fragment,null,priceRows.length?h('div',{className:'atelier-price-scroll'},h('table',{className:'atelier-price-table'},h('thead',null,h('tr',null,[copy.provider,copy.model,copy.currency,copy.input,copy.output,copy.read,copy.write,''].map((label,index)=>h('th',{key:index,scope:'col'},label)))),h('tbody',null,priceRows.map((row,index)=>h(React.Fragment,{key:index},h('tr',null,
            ...['provider','model','currency'].map(key=>h('td',{key},h('input',{type:'text',maxLength:key==='currency'?3:key==='provider'?200:300,disabled:busy||jsonPending,value:row[key]??'','aria-label':`${copy[key]} ${index+1}`,onChange:event=>patchPrice(index,key,key==='currency'?event.target.value.toUpperCase():event.target.value)}))),
            ...['input','output','cacheRead','cacheWrite'].map(key=>h('td',{key},rateField(row,index,key))),h('td',null,h('button',{type:'button',disabled:busy||jsonPending,'aria-label':`${copy.remove} ${row.model||index+1}`,onClick:()=>editPrices(priceRows.filter((_,at)=>at!==index))},copy.remove))),
            h('tr',{className:'atelier-price-extra'},h('td',{colSpan:8},h('details',null,h('summary',null,`${copy.more}${row.longContext?' · '+copy.tier:''}${row.label?' · '+row.label:''}`),h('div',{className:'atelier-price-options'},
              h('label',null,h('input',{type:'checkbox',disabled:busy||jsonPending,checked:row.requireCacheRates===true,onChange:event=>patchPrice(index,'requireCacheRates',event.target.checked)}),copy.strict),h('label',null,copy.write12,rateField(row,index,'cacheWrite12h')),
              ...[['label','label',300],['source','source',2048],['checkedAt','checked',300]].map(([key,label,maxLength])=>h('label',{key},copy[label],h('input',{type:'text',maxLength,disabled:busy||jsonPending,value:row[key]??'',onChange:event=>patchPrice(index,key,event.target.value||undefined)}))),
              h('label',null,copy.tier,h('select',{disabled:busy||jsonPending,value:row.longContext?.threshold??'',onChange:event=>patchPrice(index,'longContext',event.target.value?{...row.longContext,threshold:Number(event.target.value),input:row.longContext?.input??row.input??0,output:row.longContext?.output??row.output??0}:undefined)},h('option',{value:''},copy.none),[100000,272000].map(value=>h('option',{key:value,value},`> ${value.toLocaleString()} tokens`)))),
              row.longContext&&h('div',{className:'atelier-price-tier'},['input','output','cacheRead','cacheWrite','cacheWrite12h'].map(key=>h('label',{key},copy[priceFieldNames[key]],rateField(row,index,key,true))))
            ))))
          ))))):h('p',{className:'atelier-muted'},copy.empty),h('div',{className:'atelier-row'},h('button',{type:'button',disabled:busy||jsonPending||priceRows.length>=100,onClick:()=>editPrices([...priceRows,{provider:'',model:'',currency:state.settings.priceCurrency??'USD',input:0,output:0}])},copy.add),h('small',{className:'atelier-muted'},`${priceRows.length}/100 · ${copy.units}`)));
          const promptKeys=['identityEnabled','identityText','extraPrompt','hideClientIdentity'];
          const matchingPreset=(settings,library)=>(library??[]).find(row=>promptKeys.every(key=>key==='identityText'&&!row.identityEnabled&&!settings.identityEnabled||row[key]===settings[key]))?.id??'custom';
          async function load(){try{const value=await call('settings');setState(value);setPresetId(value.selectedPrompt??matchingPreset(value.settings,value.promptLibrary));setPhrases(value.settings.phrases.join('\n'));setPrices(JSON.stringify(value.settings.prices,null,2));setJsonDraft(null);setJsonError('');if(!setupChecked.current){setupChecked.current=true;if(!value.settings.onboardingCompleted)setSetupStep(0);}setError('');}catch(e){setError(e.message);}}
          React.useEffect(()=>{load();},[]);
          const patch=(key,value)=>{setState(old=>({...old,settings:{...old.settings,[key]:value}}));if(promptKeys.includes(key))setPresetId('custom');};
          function choosePreset(id){const row=state.promptLibrary?.find(item=>item.id===id);setPresetId(id);if(row)setState(old=>({...old,settings:{...old.settings,...Object.fromEntries(promptKeys.map(key=>[key,row[key]]))}}));}
          function storePreset(){
            if(!presetName.trim()){setError(t('nameRequired'));return;}
            const row={id:`user-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,name:presetName.trim(),description:'',...Object.fromEntries(promptKeys.map(key=>[key,state.settings[key]]))};
            setState(old=>({...old,settings:{...old.settings,promptLibrary:[...(old.settings.promptLibrary??[]),row]},promptLibrary:[...(old.promptLibrary??[]),{...row,builtin:false}]}));setPresetId(row.id);setPresetName('');setError('');setMessage(t('presetStored'));
          }
          function deletePreset(){if(!state.promptLibrary?.some(row=>row.id===presetId&&!row.builtin))return;setState(old=>({...old,settings:{...old.settings,promptLibrary:old.settings.promptLibrary.filter(row=>row.id!==presetId)},promptLibrary:old.promptLibrary.filter(row=>row.id!==presetId)}));setPresetId('custom');setMessage(t('presetDeleted'));}
          async function save(event){event.preventDefault();if(jsonPending){setCategory('pricing');setError(copy.pending);return;}setBusy(true);setMessage('');try{const value=await call('save',{revision:state.revision,settings:{...state.settings,phrases:phrases.split('\n').map(v=>v.trim()).filter(Boolean),prices:parsePriceDraft(prices)}});setState(previous=>({...previous,...value}));setPresetId(value.selectedPrompt??'custom');setMessage(t('saved'));setError('');}catch(e){setError(e.message);}finally{setBusy(false);}}

          async function finishSetup(){if(jsonPending){setCategory('pricing');setError(copy.pending);return;}setBusy(true);try{const value=await call('save',{revision:state.revision,settings:{...state.settings,onboardingCompleted:true,phrases:phrases.split('\n').map(value=>value.trim()).filter(Boolean),prices:parsePriceDraft(prices)}});setState(previous=>({...previous,...value}));setSetupStep(null);setMessage(t('saved'));setError('');}catch(error){setError(error.message);}finally{setBusy(false);}}
          const field=(key,label,rows=3)=>h('div',{key},h('label',{htmlFor:`atelier-${key}`},t(label)),h('textarea',{id:`atelier-${key}`,value:state.settings[key],rows,onChange:e=>patch(key,e.target.value)}));
          const toggle=(key,label)=>h('label',{key,className:'atelier-switch'},h('input',{type:'checkbox',checked:state.settings[key],onChange:e=>patch(key,e.target.checked)}),t(label));
          return h('form',{className:'atelier-form',onSubmit:save},error&&h('p',{role:'alert',className:'atelier-error'},error),message&&h('p',{role:'status',className:'atelier-success'},message),state&&h(React.Fragment,null,
            setupStep!==null?h('section',{className:'atelier-setup','aria-label':t('setup')},h('div',{className:'atelier-head'},h('h3',null,`${t('setup')} · ${setupStep+1}/3`),h('button',{type:'button',onClick:()=>setSetupStep(null)},t('setupLater'))),h('p',{className:'atelier-muted'},t('setupIntro')),
              setupStep===0?h(React.Fragment,null,h('strong',null,t('setupPrivacy')),toggle('captureEnabled','capture'),h('p',{className:'atelier-muted'},t('setupPrivacyHelp'))):setupStep===1?h(React.Fragment,null,h('label',null,t('setupPrompt')),h('select',{value:presetId,onChange:event=>choosePreset(event.target.value)},h('option',{value:'custom'},t('customPrompt')),(state.promptLibrary??[]).map(row=>h('option',{key:row.id,value:row.id},row.name)))):h(React.Fragment,null,h('strong',null,t('setupPrices')),h('p',{className:'atelier-muted'},`${priceRows.length} · ${t('setupPricesHelp')}`),h('p',{className:'atelier-muted'},t('setupSummary'))),
              h('div',{className:'atelier-row'},setupStep>0&&h('button',{type:'button',onClick:()=>setSetupStep(step=>step-1)},t('setupBack')),h('button',{type:'button',disabled:busy,onClick:()=>setupStep<2?setSetupStep(step=>step+1):finishSetup()},t(setupStep<2?'setupNext':'setupDone')))):
              h('button',{type:'button',onClick:()=>setSetupStep(0)},t('setupReopen')),
            h('p',{className:'atelier-muted atelier-settings-scope'},t('scopeHelp')),
            h('div',{className:'atelier-settings-navigation',role:'tablist','aria-label':t('settings')},['appearance','prompts','logs','pricing'].map(key=>h('button',{key,id:`${categoryId}-${key}-tab`,type:'button',role:'tab','aria-selected':category===key,'aria-controls':`${categoryId}-${key}-panel`,onClick:()=>setCategory(key)},copy[key]))),h('p',{className:'atelier-muted'},copy.draft),
            panel('prompts',h('h3',null,t('library')),h('p',{className:'atelier-muted'},t('libraryHelp')),
            h('label',{htmlFor:'atelier-prompt-library'},t('library')),h('select',{id:'atelier-prompt-library',value:presetId,onChange:e=>choosePreset(e.target.value)},h('option',{value:'custom'},t('customPrompt')),(state.promptLibrary??[]).map(row=>h('option',{key:row.id,value:row.id},row.name))),
            h('p',{className:'atelier-muted'},state.promptLibrary?.find(row=>row.id===presetId)?.description),
            h('label',{htmlFor:'atelier-preset-name'},t('presetName')),h('input',{id:'atelier-preset-name',type:'text',maxLength:100,value:presetName,onChange:e=>setPresetName(e.target.value)}),
            h('div',{className:'atelier-row'},h('button',{type:'button',onClick:storePreset},t('storePreset')),h('button',{type:'button',onClick:deletePreset,disabled:!state.promptLibrary?.some(row=>row.id===presetId&&!row.builtin)},t('deletePreset'))),
            toggle('hideClientIdentity','reduceIdentity'),h('p',{className:'atelier-muted'},t('reduceHelp')),
            toggle('identityEnabled','identity'),h('p',{className:'atelier-muted'},t('identityHelp')),field('identityText','identityText'),field('extraPrompt','extra',5)),
            panel('appearance',h('h3',null,t('sidebarTitle')),toggle('sidebarRecentMarks','sidebarMarks'),toggle('sidebarRecentSnap','sidebarSnap'),h('p',{className:'atelier-muted'},t('sidebarHelp')),
            toggle('chatDynamicLabels','chatDynamic'),h('p',{className:'atelier-muted'},t('chatDynamicHelp')),h('div',{className:'atelier-row'},h('label',null,t('rotation'),h('input',{type:'number',min:1,max:60,value:state.settings.rotationSeconds,onChange:event=>patch('rotationSeconds',Number(event.target.value))}))),h('details',{className:'atelier-settings-details'},h('summary',null,t('phrases')),h('label',{htmlFor:'atelier-phrases'},t('phrases')),h('textarea',{id:'atelier-phrases',value:phrases,rows:5,onChange:e=>setPhrases(e.target.value)}))),
            panel('logs',h('h3',null,t('logs')),toggle('captureEnabled','capture'),h('p',{className:'atelier-muted'},t('privacy')),
            h('div',{className:'atelier-row'},[['retentionDays','retention',1,365],['maxLogMB','quota',1,4096]].map(([key,label,min,max])=>h('div',{key},h('label',{htmlFor:`atelier-${key}`},t(label)),h('input',{id:`atelier-${key}`,type:'number',min,max,value:state.settings[key],onChange:e=>patch(key,Number(e.target.value))}))))),
            panel('pricing',h('h3',null,copy.pricing),h('div',{className:'atelier-row atelier-price-selection'},h('label',null,copy.currency,h('select',{'aria-label':copy.currency,value:selectedCurrency,disabled:busy,onChange:event=>patch('priceCurrency',event.target.value)},h('option',{value:'USD'},'USD · $'),h('option',{value:'CNY'},'CNY · ¥')))),h('p',{className:'atelier-muted'},copy.referenceHelp),h('p',{className:'atelier-muted'},`${t('model')==='模型'?'DeepSeek 高峰／非高峰同时列出；当前估算使用：':'Both DeepSeek rates are listed; estimate uses: '}${copy[selectedPeriod]}。`),h('h3',null,copy.reference),referenceTable(),h('p',{className:'atelier-muted'},copy.units),
              h('details',{className:'atelier-settings-details atelier-price-custom'},h('summary',null,`${copy.custom} · ${priceRows.length}`),h('p',{className:'atelier-muted'},copy.customHelp),h('p',{className:'atelier-muted'},t('priceHelp')),jsonPending&&h('p',{role:'status',className:'atelier-error'},copy.pending),priceTable(),h('details',{className:'atelier-settings-details atelier-price-json'},h('summary',null,copy.advanced),h('p',{className:'atelier-muted'},copy.jsonHelp),h('label',{htmlFor:'atelier-prices'},copy.advanced),h('textarea',{id:'atelier-prices',className:'code',value:jsonDraft??prices,rows:12,disabled:busy,onChange:event=>{setJsonDraft(event.target.value);setJsonError('');}}),jsonError&&h('p',{role:'alert',className:'atelier-error'},jsonError),h('div',{className:'atelier-row'},h('button',{type:'button',disabled:busy||!jsonPending,onClick:applyJson},copy.apply),h('button',{type:'button',disabled:busy||!jsonPending,onClick:()=>{setJsonDraft(null);setJsonError('');}},copy.discard))))),
            h('div',{className:'atelier-row'},h('button',{type:'submit',disabled:busy||jsonPending},t(busy?'saving':'save')),h('button',{type:'button',onClick:load,disabled:busy},t('refresh'))),
          ));
        }
        const pageTabs=new Map();
        function Page(props) {
          const t=useT();const tabKey=props.sessionId??'default';const tabsId=React.useId();const [tab,setTab]=React.useState(()=>pageTabs.get(tabKey)??'logs');
          const chooseTab=key=>{pageTabs.delete(tabKey);pageTabs.set(tabKey,key);if(pageTabs.size>100)pageTabs.delete(pageTabs.keys().next().value);setTab(key);};
          return h('div',{className:'atelier atelier-page'},h('div',{className:'atelier-head'},h('h2',null,t('title')),h('span',{className:'atelier-muted'},t('local'))),
            h('div',{className:'atelier-note'},t('privacy')),
            h('div',{className:'atelier-tabs',role:'tablist'},['logs','settings'].map(key=>h('button',{key,id:`${tabsId}-${key}-tab`,type:'button',role:'tab','aria-controls':`${tabsId}-${key}-panel`,'aria-selected':tab===key,onClick:()=>chooseTab(key)},t(key)))),
            h('div',{id:`${tabsId}-logs-panel`,'aria-labelledby':`${tabsId}-logs-tab`,hidden:tab!=='logs',role:'tabpanel'},h(LogView,props)),h('div',{id:`${tabsId}-settings-panel`,'aria-labelledby':`${tabsId}-settings-tab`,hidden:tab!=='settings',role:'tabpanel'},h(Settings)),
          );
        }
        function Dock(props){
          const ref=React.useRef(null);const[hidden,setHidden]=React.useState([]);
          React.useLayoutEffect(()=>{
            const node=ref.current;const dock=node?.closest('[data-composer-dock]');const card=dock?.parentElement?.querySelector('[data-composer-card]');if(!dock||!card)return;let frame,disposed=false;
            const update=()=>{if(disposed)return;const row=node.querySelector('.atelier-dock');if(!row)return;const priority=['clock','speed','thought','cost','output','cache','input','model'];const cells=Array.from(row.children).filter(cell=>cell.matches('button.atelier-cell'));
              let owner=node;while(owner.parentElement&&owner.parentElement!==dock)owner=owner.parentElement;
              const siblings=Array.from(dock.children).filter(child=>child!==owner);const nativeWidth=siblings.reduce((sum,child)=>sum+child.getBoundingClientRect().width,0);const outerGap=parseFloat(getComputedStyle(dock).columnGap)||12;const gap=parseFloat(getComputedStyle(row).columnGap)||12;const available=Math.max(0,card.clientWidth-nativeWidth-outerGap*siblings.length-16);let used=0;const next=[];
              for(const kind of priority){const cell=cells.find(cell=>cell.classList.contains(kind));if(!cell)continue;const style=getComputedStyle(cell);const needed=cell.getBoundingClientRect().width+(parseFloat(style.marginLeft)||0)+(parseFloat(style.marginRight)||0)+(used?gap:0);if(used+needed<=available||kind==='clock'||kind==='speed')used+=needed;else next.push(kind);}
              setHidden(old=>old.join(',')===next.join(',')?old:next);
            };
            const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update);};const resize=new ResizeObserver(schedule);resize.observe(card);resize.observe(dock);const mutation=new MutationObserver(schedule);mutation.observe(node,{childList:true,characterData:true,subtree:true});document.fonts?.ready.then(schedule);schedule();return()=>{disposed=true;resize.disconnect();mutation.disconnect();cancelAnimationFrame(frame);};
          },[]);
          return h('div',{ref,className:'atelier-footer-container',...Object.fromEntries(['model','input','cache','output','cost','thought'].map(kind=>['data-hide-'+kind,hidden.includes(kind)?'true':undefined]))},h('style',null,css),h(Status,props));
        }
        function View(props){return h(React.Fragment,null,h('style',null,css+'\n[data-conversation-content]:has([data-atelier-view="workbench"]) > [data-width-handle]{display:none!important;pointer-events:none!important}'),h('div',{'data-atelier-view':'workbench',style:{display:'contents'}},h(Page,props)));}
        ctx.slots.inject('sidebar.session.row.leading',()=>ctx.slots.register({name:'sidebar.session.row.leading',id:'atelier-recent-dot',order:20},RecentSessionDot));
        ctx.slots.inject('shell.overlay',()=>ctx.slots.register({name:'shell.overlay',id:'atelier-recent-session-monitor',order:91},SidebarRecentMonitor));
        ctx.slots.inject('shell.overlay',()=>ctx.slots.register({name:'shell.overlay',id:'atelier-activity-monitor',order:90},ActivityMonitor));
        ctx.slots.inject('conversation.composer.dock',()=>[
          ctx.slots.register({name:'conversation.composer.dock',id:'activity',order:0,priority:-10},Dock),
        ]);
        ctx.slots.inject('conversation.view',()=>ctx.slots.register({name:'conversation.view',id:'atelier',order:35,label:()=>translate('title')},View));
        function GlobalSettings(){return h('div',{className:'atelier atelier-page'},h('style',null,css),h('h2',null,translate('settings')),h(Settings));}
        installModelSettings(ctx,React,call);
        ctx.slots.inject('settings.section',()=>ctx.slots.register({name:'settings.section',id:'atelier-global',order:25,label:()=>translate('title')},GlobalSettings));
      },
    };
  },
});
