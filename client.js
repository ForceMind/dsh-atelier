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
    function modelFamily(value) {
      const model=String(value??'').toLowerCase();
      if(/(?:^|[/\s_-])(?:gpt(?:[-_\d.]|$)|o[134](?:[-_\s]|$))/.test(model))return 'gpt';
      if(model.includes('deepseek'))return 'deepseek';
      if(model.includes('claude'))return 'claude';
      if(model.includes('gemini'))return 'gemini';
      return 'generic';
    }

    const React = require('react');
    const h = React.createElement;
    const NS = 'atelier-v13';
    const dicts = {
      zh: {title:'工作台',logs:'请求日志',settings:'全局设置',chatDynamic:'对话中使用动态等待提示',chatDynamicHelp:'替换对话底部“深度求索中”，保留鲸鱼动画和原生计时。通过“中文 · 动态工作提示”语言包生效，其余翻译回退原中文；关闭后恢复原文案。',library:'提示词库',libraryHelp:'选择后点击保存设置，全局生效。DSH 原版会撤销本插件的身份/软件说明覆盖，恢复当前版本动态组装的内置内容（含工具规则），并非固定文本快照。',customPrompt:'自定义（未匹配库条目）',presetName:'新条目名称',storePreset:'将当前提示词存入库',deletePreset:'删除选中的自定义条目',presetStored:'已加入待保存的提示词库；请保存设置。',presetDeleted:'已从待保存库移除；请保存设置。',nameRequired:'请填写条目名称',scopeHelp:'此页设置保存在当前 DSH profile，影响所有现有和新建会话；不是当前会话专属。保存后从各会话下一次请求生效，历史消息不改写。',reduceIdentity:'减少发送的客户端标识（全局）',reduceHelp:'将内置客户端自述改为中性措辞，并停止附带安装路径和界面 URL 的两项标识上下文。保留工具用法、权限和工作目录约束；历史对话、工具定义与请求头仍可能包含名称，不保证匿名。',idle:'已就绪',running:'正在工作',thinking:'思考流',generating:'生成中',tool:'工具运行中',waiting:'等待确认',model:'模型',elapsed:'本轮',reasoning:'思考',input:'输入',output:'输出',cache:'缓存命中',cost:'API 估算',unknown:'未配置价格',estimate:'估算',actual:'API 返回用量',empty:'安装后新的模型请求会出现在这里；过去的请求不追溯补录。',privacy:'日志仅保存在本地，含对话、工具参数和代码。凭据模式会脱敏，但不是 DLP；请勿直接公开。',layer:'这里保存 DSH 转换前的归一化请求、转换后的响应流，不是渠道商最终收到的 HTTP JSON / 原始 SSE。',refresh:'刷新',more:'更多请求',readMore:'继续读取',json:'完整记录 JSON',text:'请求原文（按角色展开）',chunks:'响应流 JSONL（DSH）',response:'响应文本',download:'下载当前视图',save:'保存设置',saving:'保存中…',saved:'设置已保存；新请求生效，旧历史不改写。',identity:'自定义身份段',identityHelp:'仅替换 harness:identity，不删除工具规则或系统安全约束；不能保证渠道无法识别 DSH。',identityText:'身份提示词（留空即移除此身份句）',extra:'追加系统指令',capture:'记录完整请求与响应正文',retention:'日志保留天数',quota:'日志容量上限（MiB）',rotation:'趣味提示轮换秒数',phrases:'趣味状态词（每行一句）',prices:'API 计价表（JSON）',priceHelp:'价格单位为每百万 tokens；provider/model 为实际标识，支持 *。缓存是独立计费桶；reasoning 已包含在输出里，不重复加价。未匹配显示未知，不当成免费。',example:'填入计价示例（需改为你的渠道单价）',conflict:'读取或保存失败',request:'请求',duration:'请求耗时',ttft:'首段延迟',noReasoning:'未观测到思考流',partial:'正文被截断或未启用记录，请检查记录标记',configure:'在工作台视图配置价格与提示词',local:'本地',noPrice:'示例不是官方现价，请按供应商账单填写。',recorded:'已记录请求',pageLimit:'为保护性能，正文按页显示；继续读取或下载当前已加载视图。',currency:'币种',unavailable:'暂未获得数据'},
      en: {title:'Atelier',logs:'Request logs',settings:'Global settings',chatDynamic:'Dynamic waiting text in Chat',chatDynamicHelp:'Replace Chat’s bottom Deep diving label while keeping native animation and elapsed time. Uses an English · Dynamic activity language pack; other translations fall back to English. Disable to restore native labels.',library:'Prompt library',libraryHelp:'Choose then Save settings to apply globally. DSH original removes plugin overrides and restores the current built-in assembly, including tool guidance; it is not a frozen prompt snapshot.',customPrompt:'Custom (not matching a library entry)',presetName:'New preset name',storePreset:'Add current prompt to library',deletePreset:'Delete selected custom preset',presetStored:'Added to draft library; save settings to persist.',presetDeleted:'Removed from draft library; save settings to persist.',nameRequired:'Enter a preset name',scopeHelp:'Settings belong to this profile and apply to all current and future sessions from their next request. Historical messages stay unchanged.',reduceIdentity:'Reduce outgoing client identification (global)',reduceHelp:'Use neutral built-in client guidance and omit the installation-path and GUI-URL contexts. Tool, permission and working-directory rules remain. History, tool definitions and headers may still reveal the client; this is not anonymity.',idle:'Ready',running:'Working',thinking:'Reasoning stream',generating:'Generating',tool:'Running tool',waiting:'Waiting for confirmation',model:'Model',elapsed:'Turn',reasoning:'Reasoning',input:'Input',output:'Output',cache:'Cache read',cost:'API estimate',unknown:'Price not configured',estimate:'Estimated',actual:'API usage',empty:'New model requests will appear after installation. Earlier requests are not backfilled.',privacy:'Local logs contain conversations, tool arguments and code. Credential patterns are masked; this is not DLP. Do not publish logs unreviewed.',layer:'These are DSH normalized requests before conversion and normalized response streams after conversion, not final HTTP JSON or raw SSE.',refresh:'Refresh',more:'More requests',readMore:'Read next page',json:'Full record JSON',text:'Readable request',chunks:'Response stream JSONL (DSH)',response:'Response text',download:'Download current view',save:'Save settings',saving:'Saving…',saved:'Saved for new requests. Existing history stays unchanged.',identity:'Customize identity section',identityHelp:'Replaces harness:identity only. Tool guidance and safeguards remain. This cannot guarantee an unidentifiable client.',identityText:'Identity prompt (empty removes the sentence)',extra:'Additional system instructions',capture:'Record complete request and response bodies',retention:'Log retention days',quota:'Log quota (MiB)',rotation:'Activity phrase rotation seconds',phrases:'Activity phrases (one per line)',prices:'API pricing rules (JSON)',priceHelp:'Prices per million tokens. Match actual provider/model IDs; * is allowed. Cache buckets are separate. Reasoning is already in output and is not charged twice. Unknown is not free.',example:'Insert pricing example (replace with your rates)',conflict:'Read or save failed',request:'Request',duration:'Request duration',ttft:'First chunk latency',noReasoning:'No reasoning stream observed',partial:'Body truncated or capture disabled; inspect capture markers.',configure:'Configure prices and prompt in Atelier',local:'Local',noPrice:'The example is not an official current rate. Use your supplier invoice.',recorded:'Recorded requests',pageLimit:'Body display is paginated. Load more or download the currently loaded view.',currency:'Currency',unavailable:'Data not available'},
    };
    const css = `
.atelier{color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.55;box-sizing:border-box}.atelier *{box-sizing:border-box}.atelier-dock{width:100%;display:flex;flex-wrap:wrap;gap:5px 15px;padding:6px 4px;color:var(--dsw-alias-label-secondary);font-size:11px}.atelier-state{display:inline-flex;gap:7px;align-items:center;color:var(--dsw-alias-label-primary)}.atelier-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-idle-primary)}.atelier-dot.busy{background:var(--dsw-alias-brand-primary);animation:atelier-pulse 1.4s ease-in-out infinite}@keyframes atelier-pulse{50%{opacity:.35}}@media(prefers-reduced-motion:reduce){.atelier-dot.busy{animation:none}}.atelier-page{height:100%;overflow:auto;padding:24px;max-width:1280px;margin:auto}.atelier-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.atelier h2{font-size:20px;margin:0}.atelier h3{font-size:14px;margin:16px 0 8px}.atelier-muted{color:var(--dsw-alias-label-secondary)}.atelier-note{padding:12px 14px;border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);margin:12px 0}.atelier-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.atelier button{font:inherit;cursor:pointer;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:7px 12px;border-radius:8px}.atelier button:hover{background:var(--dsw-alias-bg-layer-2)}.atelier button:disabled{opacity:.5;cursor:default}.atelier button[aria-selected=true]{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}.atelier button:focus-visible,.atelier textarea:focus-visible,.atelier input:focus-visible,.atelier select:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.atelier-grid{display:grid;grid-template-columns:minmax(220px,300px) minmax(0,1fr);gap:16px}.atelier-list{display:flex;flex-direction:column;gap:6px}.atelier-list button{text-align:left}.atelier-list .selected{border-color:var(--dsw-alias-brand-primary)}.atelier-code{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:16px;font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;max-height:65vh;overflow:auto;margin:8px 0}.atelier-metrics{display:flex;flex-wrap:wrap;gap:12px 24px;margin:12px 0}.atelier-metric strong{display:block;font-size:17px;font-weight:600}.atelier-form{max-width:850px}.atelier-form label{display:block;margin:16px 0 6px;font-weight:500}.atelier-form textarea,.atelier-form input[type=text],.atelier-form input[type=number],.atelier select{width:100%;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:10px;font:inherit}.atelier-form textarea{resize:vertical;min-height:80px}.atelier-form .code{font-family:ui-monospace,monospace}.atelier-row{display:flex;gap:16px;align-items:center;flex-wrap:wrap}.atelier-switch{display:flex!important;align-items:center;gap:10px}.atelier-error{color:var(--dsw-alias-state-error-primary);white-space:pre-wrap}.atelier-success{color:var(--dsw-alias-state-success-primary)}@media(max-width:760px){.atelier-page{padding:16px}.atelier-grid{grid-template-columns:1fr}.atelier-list{max-height:230px;overflow:auto}.atelier-code{max-height:50vh}}

.atelier-dock{width:auto;min-width:0;flex:1 1 auto;align-items:center;justify-content:flex-start;gap:4px 12px;padding:3px 0;font-size:11px;line-height:20px;font-variant-numeric:tabular-nums;font-feature-settings:'tnum';font-weight:400}.atelier-cell{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;min-width:0;height:20px}.atelier-cell svg{width:14px;height:14px;flex:none;display:block;opacity:.72}.atelier-cell .atelier-value{color:var(--dsw-alias-label-secondary)}.atelier-cell.model{max-width:180px;gap:6px}.atelier-cell.model .atelier-value{overflow:hidden;text-overflow:ellipsis;color:var(--dsw-alias-label-primary)}.atelier-cell.model svg{width:17px;height:17px;color:var(--dsw-alias-brand-primary);opacity:1}.atelier-provider{font-size:10px;opacity:.65;overflow:hidden;text-overflow:ellipsis;max-width:68px}.atelier-cell.cost{margin-left:2px}.atelier-orbit-spin{transform-origin:12px 12px;animation:atelier-orbit 4s linear infinite}.atelier-orbit-reverse{transform-origin:12px 12px;animation:atelier-orbit 5.5s linear infinite reverse}.atelier-orbit-core{animation:atelier-breathe 2s ease-in-out infinite}.atelier-paused .atelier-orbit-spin,.atelier-paused .atelier-orbit-reverse,.atelier-paused .atelier-orbit-core{animation:none}.atelier-sr{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@keyframes atelier-orbit{to{transform:rotate(360deg)}}@keyframes atelier-breathe{50%{opacity:.4}}@media(prefers-reduced-motion:reduce){.atelier-orbit-spin,.atelier-orbit-reverse,.atelier-orbit-core{animation:none}}@media(max-width:700px){.atelier-dock{gap:3px 9px;font-size:10px}.atelier-cell.model{max-width:150px}.atelier-provider{display:none}}
`;
    const number = value => compactNumber(value);
    const seconds = ms => compactDuration(ms);
    function costLabel(cost,t) {
      const parts = Object.entries(cost?.totals ?? {}).map(([currency,amount])=>compactMoney(amount,currency));
      if (cost?.unknown) parts.push(t('unknown'));
      return parts.join(' + ') || t('unknown');
    }
    return {
      inject:['slots','locale','connection'],
      apply(ctx) {
        for (const [id,dict] of Object.entries(dicts)) ctx.effect(()=>ctx.locale.register(NS,id,dict));
        const translate = ctx.locale.bind(NS);
        const call = async (action,args={}) => {
          const result = await ctx.connection.rpc.call('/api','atelier',{...args,action});
          if (!result.ok) throw new Error(result.error?.message ?? 'Atelier RPC failed');
          return result.value;
        };
        let activity;
        ctx.effect(()=>{
          let stopped=false;let pollTimer;let lastReport=0;
          activity=installChatActivity(ctx.locale,{onDiagnostic:value=>{
            if(stopped||Date.now()-lastReport<5000)return;lastReport=Date.now();
            call('client-report',{runtime:{...value,build:'atelier-1.4.1'}}).catch(error=>console.error('[atelier] client diagnostic:',error));
          }});
          async function refreshDisplay(){
            try{const display=await call('display');if(!stopped)activity.configure(display);}catch(error){console.error('[atelier] display settings:',error);}
            if(!stopped)pollTimer=setTimeout(refreshDisplay,10000);
          }
          refreshDisplay();
          return()=>{stopped=true;clearTimeout(pollTimer);activity.dispose();};
        });
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
          const [now,setNow]=React.useState(Date.now());
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
          return {value,error,stats:projection??value?.stats,running,now};
        }
        function Glyph({kind}) {
          const paths={clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2',thought:'M9 4a4 4 0 0 0-5 4 4 4 0 0 0-1 7 4 4 0 0 0 6 4m6-15a4 4 0 0 1 5 4 4 4 0 0 1 1 7 4 4 0 0 1-6 4M9 4v16m6-16v16M6 10h3m6 4h3',input:'M12 20V4m-5 5 5-5 5 5M5 20h14',output:'M12 4v16m-5-5 5 5 5-5M5 4h14',cache:'M19 8V5h-3M5 16v3h3M18 6a8 8 0 0 0-13 4m1 8a8 8 0 0 0 13-4',cost:'M20 7c0 2-4 3-8 3s-8-1-8-3 4-3 8-3 8 1 8 3Zm0 0v5c0 2-4 3-8 3s-8-1-8-3V7m16 5v5c0 2-4 3-8 3s-8-1-8-3v-5',model:'M8 3H5v5m14 0V3h-3M5 16v5h3m8 0h3v-5M8 8h8v8H8z'};
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
        function Metric({kind,label,value,full}){return h('span',{className:`atelier-cell ${kind}`,title:full??`${label}: ${value}`,'aria-label':full??`${label}: ${value}`},h(Glyph,{kind}),h('span',{className:'atelier-value'},value));}
        function Status(props) {
          const t=useT();const {value,error,stats,running,now}=useStatus(props);
          const last=value?.live?.[0]??value?.last;
          const model=stats?.model||last?.model||t('unavailable');const provider=stats?.provider||last?.provider||'—';
          const elapsed=stats?.turnStartedAt&&running ? now-stats.turnStartedAt : stats?.turnElapsedMs;
          const reasoning=last?.reasoningStartedAt ? (last.reasoningEndedAt??now)-last.reasoningStartedAt : null;
          const usage=stats?.usage??{};const full=n=>Number(n??0).toLocaleString();
          const costs=costLabel(value?.cost,t);
          React.useEffect(()=>{
            call('client-report',{runtime:{build:'atelier-1.4.1',footer:{mode:'metrics-only',iconCount:7,family:modelFamily(model),model,input:compactNumber(usage.inputTokens),output:compactNumber(usage.outputTokens),cache:compactNumber(usage.cacheReadTokens),elapsed:compactDuration(elapsed),cost:costs,animation:modelFamily(model)==='gpt'?'orbital':'model-icon'}}}).catch(error=>console.error('[atelier] footer diagnostic:',error));
          },[model,usage.inputTokens,usage.outputTokens,usage.cacheReadTokens,running,costs]);
          return h('div',{className:'atelier atelier-dock','data-atelier-footer':'metrics-only','data-model-family':modelFamily(model)},
            h('span',{className:'atelier-cell model',title:`${t('model')}: ${model}\nProvider: ${provider}`,'aria-label':`${t('model')}: ${model}, ${provider}`},h(ModelGlyph,{model,running}),h('span',{className:'atelier-value'},model),h('span',{className:'atelier-provider'},provider)),
            h(Metric,{kind:'clock',label:t('elapsed'),value:seconds(elapsed),full:`${t('elapsed')}: ${seconds(elapsed)}`}),
            h(Metric,{kind:'thought',label:t('reasoning'),value:reasoning===null?'—':seconds(reasoning),full:reasoning===null?t('noReasoning'):`${t('reasoning')}: ${seconds(reasoning)}`}),
            h(Metric,{kind:'input',label:t('input'),value:number(usage.inputTokens),full:`${t('input')}: ${full(usage.inputTokens)} tokens`}),
            h(Metric,{kind:'output',label:t('output'),value:number(usage.outputTokens),full:`${t('output')}: ${full(usage.outputTokens)} tokens`}),
            h(Metric,{kind:'cache',label:t('cache'),value:number(usage.cacheReadTokens),full:`${t('cache')}: ${full(usage.cacheReadTokens)} tokens`}),
            h(Metric,{kind:'cost',label:t('cost'),value:`API ${costs}`,full:`${t('cost')}: ${costs}\n${value?.cost?.basis??''}\n${(value?.cost?.sources??[]).join('\n')}${value?.cost?.unknown?`\n${value.cost.unknown} requests have no verified price`:''}`}),
            error&&h('span',{className:'atelier-error',role:'status',title:error},'!'),
          );
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
          return h('section',null,
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
          const promptKeys=['identityEnabled','identityText','extraPrompt','hideClientIdentity'];
          const matchingPreset=(settings,library)=>(library??[]).find(row=>promptKeys.every(key=>key==='identityText'&&!row.identityEnabled&&!settings.identityEnabled||row[key]===settings[key]))?.id??'custom';
          async function load(){try{const value=await call('settings');setState(value);setPresetId(value.selectedPrompt??matchingPreset(value.settings,value.promptLibrary));setPhrases(value.settings.phrases.join('\n'));setPrices(JSON.stringify(value.settings.prices,null,2));setError('');}catch(e){setError(e.message);}}
          React.useEffect(()=>{load();},[]);
          const patch=(key,value)=>{setState(old=>({...old,settings:{...old.settings,[key]:value}}));if(promptKeys.includes(key))setPresetId('custom');};
          function choosePreset(id){const row=state.promptLibrary?.find(item=>item.id===id);setPresetId(id);if(row)setState(old=>({...old,settings:{...old.settings,...Object.fromEntries(promptKeys.map(key=>[key,row[key]]))}}));}
          function storePreset(){
            if(!presetName.trim()){setError(t('nameRequired'));return;}
            const row={id:`user-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,name:presetName.trim(),description:'',...Object.fromEntries(promptKeys.map(key=>[key,state.settings[key]]))};
            setState(old=>({...old,settings:{...old.settings,promptLibrary:[...(old.settings.promptLibrary??[]),row]},promptLibrary:[...(old.promptLibrary??[]),{...row,builtin:false}]}));setPresetId(row.id);setPresetName('');setError('');setMessage(t('presetStored'));
          }
          function deletePreset(){if(!state.promptLibrary?.some(row=>row.id===presetId&&!row.builtin))return;setState(old=>({...old,settings:{...old.settings,promptLibrary:old.settings.promptLibrary.filter(row=>row.id!==presetId)},promptLibrary:old.promptLibrary.filter(row=>row.id!==presetId)}));setPresetId('custom');setMessage(t('presetDeleted'));}
          async function save(event){event.preventDefault();setBusy(true);setMessage('');try{const value=await call('save',{revision:state.revision,settings:{...state.settings,phrases:phrases.split('\n').map(v=>v.trim()).filter(Boolean),prices:JSON.parse(prices)}});setState(value);setPresetId(value.selectedPrompt??'custom');setMessage(t('saved'));setError('');}catch(e){setError(e.message);}finally{setBusy(false);}}
          const field=(key,label,rows=3)=>h('div',{key},h('label',{htmlFor:`atelier-${key}`},t(label)),h('textarea',{id:`atelier-${key}`,value:state.settings[key],rows,onChange:e=>patch(key,e.target.value)}));
          const toggle=(key,label)=>h('label',{key,className:'atelier-switch'},h('input',{type:'checkbox',checked:state.settings[key],onChange:e=>patch(key,e.target.checked)}),t(label));
          return h('form',{className:'atelier-form',onSubmit:save},error&&h('p',{role:'alert',className:'atelier-error'},error),message&&h('p',{role:'status',className:'atelier-success'},message),state&&h(React.Fragment,null,
            h('div',{className:'atelier-note'},t('scopeHelp')),
            h('h3',null,t('library')),h('p',{className:'atelier-muted'},t('libraryHelp')),
            h('label',{htmlFor:'atelier-prompt-library'},t('library')),h('select',{id:'atelier-prompt-library',value:presetId,onChange:e=>choosePreset(e.target.value)},h('option',{value:'custom'},t('customPrompt')),(state.promptLibrary??[]).map(row=>h('option',{key:row.id,value:row.id},row.name))),
            h('p',{className:'atelier-muted'},state.promptLibrary?.find(row=>row.id===presetId)?.description),
            h('label',{htmlFor:'atelier-preset-name'},t('presetName')),h('input',{id:'atelier-preset-name',type:'text',maxLength:100,value:presetName,onChange:e=>setPresetName(e.target.value)}),
            h('div',{className:'atelier-row'},h('button',{type:'button',onClick:storePreset},t('storePreset')),h('button',{type:'button',onClick:deletePreset,disabled:!state.promptLibrary?.some(row=>row.id===presetId&&!row.builtin)},t('deletePreset'))),
            toggle('hideClientIdentity','reduceIdentity'),h('p',{className:'atelier-muted'},t('reduceHelp')),
            toggle('identityEnabled','identity'),h('p',{className:'atelier-muted'},t('identityHelp')),field('identityText','identityText'),field('extraPrompt','extra',5),
            h('h3',null,t('logs')),toggle('chatDynamicLabels','chatDynamic'),h('p',{className:'atelier-muted'},t('chatDynamicHelp')),toggle('captureEnabled','capture'),h('p',{className:'atelier-muted'},t('privacy')),
            h('div',{className:'atelier-row'},[['retentionDays','retention',1,365],['maxLogMB','quota',1,4096],['rotationSeconds','rotation',1,60]].map(([key,label,min,max])=>h('div',{key},h('label',{htmlFor:`atelier-${key}`},t(label)),h('input',{id:`atelier-${key}`,type:'number',min,max,value:state.settings[key],onChange:e=>patch(key,Number(e.target.value))})))),
            h('label',{htmlFor:'atelier-phrases'},t('phrases')),h('textarea',{id:'atelier-phrases',value:phrases,rows:5,onChange:e=>setPhrases(e.target.value)}),
            h('h3',null,t('prices')),h('p',{className:'atelier-muted'},t('priceHelp')),h('label',{htmlFor:'atelier-prices'},t('prices')),h('textarea',{id:'atelier-prices',className:'code',value:prices,rows:12,onChange:e=>setPrices(e.target.value)}),
            h('button',{type:'button',onClick:()=>setPrices(JSON.stringify([{provider:'YOUR_PROVIDER',model:'YOUR_MODEL',currency:'USD',input:1,output:2,cacheRead:0.1,cacheWrite:1.25}],null,2))},t('example')),h('p',{className:'atelier-muted'},t('noPrice')),
            h('div',{className:'atelier-row'},h('button',{type:'submit',disabled:busy},t(busy?'saving':'save')),h('button',{type:'button',onClick:load,disabled:busy},t('refresh'))),
          ));
        }
        function Page(props) {
          const t=useT();const [tab,setTab]=React.useState('logs');
          return h('div',{className:'atelier atelier-page'},h('div',{className:'atelier-head'},h('h2',null,t('title')),h('span',{className:'atelier-muted'},t('local'))),
            h('div',{className:'atelier-note'},t('privacy')),
            h('div',{className:'atelier-tabs',role:'tablist'},['logs','settings'].map(key=>h('button',{key,role:'tab','aria-selected':tab===key,onClick:()=>setTab(key)},t(key)))),
            tab==='logs'?h(LogView,props):h(Settings),
          );
        }
        function Dock(props){return h(React.Fragment,null,h('style',null,css),h(Status,props));}
        function View(props){return h(React.Fragment,null,h('style',null,css),h(Page,props));}
        ctx.slots.inject('shell.overlay',()=>ctx.slots.register({name:'shell.overlay',id:'atelier-activity-monitor',order:90},ActivityMonitor));
        ctx.slots.inject('conversation.composer.dock',()=>[
          ctx.slots.register({name:'conversation.composer.dock',id:'activity',order:0,priority:-10},Dock),
        ]);
        ctx.slots.inject('conversation.view',()=>ctx.slots.register({name:'conversation.view',id:'atelier',order:35,label:()=>translate('title')},View));
        function GlobalSettings(){return h('div',{className:'atelier atelier-page'},h('style',null,css),h('h2',null,translate('settings')),h(Settings));}
        ctx.slots.inject('settings.section',()=>ctx.slots.register({name:'settings.section',id:'atelier-global',order:25,label:()=>translate('title')},GlobalSettings));
      },
    };
  },
});
