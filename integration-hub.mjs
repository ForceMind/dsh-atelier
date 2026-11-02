// Additive navigation only: each feature retains its own lifecycle and storage.
export function installIntegrationHub(ctx,React){
  const h=React.createElement;
  return ctx.inject(['layout'],injected=>{
  const ctx=injected;
  function Hub({close}){
    React.useSyncExternalStore(fn=>ctx.locale.subscribe(fn),()=>ctx.locale.getSnapshot());
    const zh=ctx.locale.getSnapshot().active.startsWith('zh'),text=(cn,en)=>zh?cn:en;
    const[error,setError]=React.useState('');
    const contextAvailable=ctx.slots.entries('sidebar.panellist').some(entry=>entry.options.id==='dsh-context');
    function open(id){try{ctx.layout.selectPanel(id);close();}catch(err){setError(err.message??String(err));}}
    const rows=[
      ['Atelier',text('指标、价格、提示词和请求审计；模型容量管理。','Metrics, pricing, prompts, request auditing and model capacities.'),text('本地版与公开版二选一启用；迁移验收后再卸载旧版。','Enable either the local or public edition, never both. Validate migration before removal.')],
      ['Better Reasoning Effort',text('支持档位、模型默认、切模记忆、保存回滚和输入模态；Atelier 仅提供飞船外观。','Supported levels, model defaults, selection memory, save rollback and modalities; Atelier supplies the ship appearance only.'),text('仍需保留。模型默认在 设置 → 模型 的原卡片编辑；会话菜单使用现有滑块。','Still required. Edit model defaults in Settings → Models; use the existing composer slider.')],
      ['BrowserSkill',text('浏览器连接、Agent Window、浏览器工具与人工协助。','Browser connection, Agent Windows, automation tools and human assistance.'),text('仍需保留；没有迁入 Atelier，不复制连接与权限存储。','Still required; no browser backend or permission storage has moved into Atelier.')],
      ['dsh-context',text('上下文洞察、请求组成与趋势、上下文浏览、Fleet 和文件活动。','Context Insights, request composition and trends, Context Browser, Fleet and file activity.'),text('仍需保留；Atelier 用量统计不能替代完整上下文分析。','Still required; Atelier usage metrics do not replace full context analysis.')],
    ];
    return h('section',{className:'atelier-integration-hub','data-atelier-integrations':'navigation-v1'},h('style',null,`
.atelier-integration-hub{max-width:880px;font-size:13px;line-height:1.65;color:var(--dsw-alias-label-primary)}.atelier-integration-hub h2{font-size:18px;margin:0 0 8px}.atelier-integration-hub p{color:var(--dsw-alias-label-secondary);margin:6px 0}.atelier-integration-card{padding:14px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}.atelier-integration-card h3{font-size:14px;margin:0}.atelier-integration-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.atelier-integration-hub button{font:inherit;padding:7px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:inherit;cursor:pointer}.atelier-integration-hub button:disabled{opacity:.5;cursor:default}.atelier-integration-hub button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.atelier-integration-hub [role=alert]{color:var(--dsw-alias-state-error-primary)}
`),h('h2',null,text('整合与依赖','Integrations and dependencies')),h('p',null,text('统一入口，不等于已替代原插件。此页面不修改配置、不禁用或卸载插件。','Unified navigation is not feature replacement. This page does not change configuration, disable or uninstall plugins.')),rows.map(([name,description,note])=>h('article',{key:name,className:'atelier-integration-card'},h('h3',null,name),h('p',null,description),h('p',null,note))),h('p',null,text('注意：宿主模型选择会后台保存部署默认；当前没有严格“仅本会话覆盖／恢复继承”接口，不提供误导性的重置按钮。','The host selector also saves the deployment default in the background. A strict session-only override/reset API is not available; no misleading reset button is offered.')),h('div',{className:'atelier-integration-actions'},h('button',{type:'button',disabled:!contextAvailable,onClick:()=>open('dsh-context')},text('打开上下文洞察','Open Context Insights')),h('button',{type:'button',onClick:()=>open('plugins')},text('打开插件管理（不自动改动）','Open plugin manager (no automatic changes)'))),!contextAvailable&&h('p',null,text('上下文入口当前未注册；请检查 dsh-context 是否启用。','Context entry is not currently registered; check whether dsh-context is enabled.')),error&&h('p',{role:'alert'},error));
  }
  return ctx.slots.inject('settings.section',()=>ctx.slots.register({name:'settings.section',id:'atelier-integrations',order:26,label:()=>ctx.locale.getSnapshot().active.startsWith('zh')?'整合与依赖':'Integrations'},Hub));
  });
}
