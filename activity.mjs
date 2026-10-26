// Locale-pack adapter: preserve native Chat layout, elapsed time and accessibility.
// Only public locale APIs are used; built-in dictionaries remain untouched.
export function installChatActivity(locale, {now=()=>Date.now(),schedule=setInterval,cancel=clearInterval,onDiagnostic=()=>{}}={}) {
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
