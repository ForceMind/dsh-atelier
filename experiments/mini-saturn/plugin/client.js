window.__ModuleLoader__.load({
  id:'@local/dsh-mini-saturn',
  factory(require){
    const React=require('react');const h=React.createElement;
    function MiniSaturn(){return h('span',{className:'mini-saturn','aria-hidden':'true'},h('style',null,`.mini-saturn{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;flex:none;color:inherit;pointer-events:none}.mini-saturn svg{display:block;width:14px;height:14px;transform-origin:50% 50%;animation:mini-saturn-rock 3s ease-in-out infinite}@keyframes mini-saturn-rock{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}@media(prefers-reduced-motion:reduce){.mini-saturn svg{animation:none;transform:none}}`),h('svg',{width:14,height:14,viewBox:'0 0 16 16',fill:'none',focusable:'false'},h('circle',{cx:8,cy:8,r:3.2,fill:'currentColor',opacity:.12}),h('path',{d:'M5.1 6.6a3.2 3.2 0 0 1 5.9 2.4M10.8 9.6a3.2 3.2 0 0 1-5.9-2.4',stroke:'currentColor',strokeWidth:1.1,strokeLinecap:'round'}),h('ellipse',{cx:8,cy:8,rx:7,ry:2.1,transform:'rotate(-24 8 8)',stroke:'currentColor',strokeWidth:1.1})) );}
    return {inject:['slots'],apply(ctx){ctx.slots.inject('conversation.chat.running.icon',()=>ctx.slots.register({name:'conversation.chat.running.icon',priority:-10},MiniSaturn));}};
  },
});
