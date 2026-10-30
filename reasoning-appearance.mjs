// Version-scoped visual adapter for dsh-better-reasoning-effort 0.5.x.
// The existing range control owns supported levels, keyboard input and persistence.
export function installReasoningAppearance(ctx,React){
  const h=React.createElement;
  function Appearance(){return h('style',{'data-atelier-reasoning-style':'deep-space-v2'},`
body .bre-model-menu-host{width:min(320px,calc(100vw - 116px));padding:0!important;overflow:visible!important;background:transparent!important;border:0!important;box-shadow:none!important}
body .bre-slider-body{overflow:visible!important;margin:0!important;background:transparent!important}body .bre-slider-advanced{padding:0!important;overflow:visible!important;background:transparent!important}
body .bre-effort{height:44px;overflow:visible!important}
body .bre-model-row{background:var(--dsw-alias-bg-overlay);border-radius:0 0 8px 8px}
body .bre-model-row:hover{background:var(--dsw-alias-bg-layer-2)}
body .bre-effort-slider{height:44px;overflow:visible!important;border-radius:10px;filter:none!important;--atelier-engine:#69dfff}
body .bre-effort-slider .bre-effort-track{inset:8px 0;border-radius:8px;background:radial-gradient(ellipse at 80% 90%,#65338c99,transparent 60%),radial-gradient(ellipse at 22% 5%,#125c8b99,transparent 58%),linear-gradient(110deg,#040816,#101531 55%,#24123e)!important;box-shadow:inset 0 0 0 1px #99b6ff26,inset 0 0 18px #03051180,0 3px 12px #090b2326!important;animation:none!important}
body .bre-effort-slider .bre-effort-track::before{content:"";position:absolute;inset:-30px;background:radial-gradient(circle at 8% 25%,#e8f4ff 0 1px,transparent 1.4px),radial-gradient(circle at 37% 62%,#83caff 0 .8px,transparent 1.2px),radial-gradient(circle at 68% 18%,#fff 0 .7px,transparent 1.1px),radial-gradient(circle at 90% 72%,#dab5ff 0 1px,transparent 1.4px);background-size:83px 49px,109px 61px,57px 43px,137px 53px;opacity:.7;animation:atelier-star-drift 32s linear infinite}
body .bre-effort-slider .bre-effort-track::after{content:"";display:block;position:absolute;inset:0;background:linear-gradient(90deg,transparent,#8ac7ff15,transparent);opacity:.6}
body .bre-effort-slider .bre-effort-fx,body .bre-effort-slider .bre-effort-canvas,body .bre-effort-slider .bre-effort-flare{display:none!important}
body .bre-effort-slider .bre-effort-knob{width:96px;height:72px;left:var(--bre-progress);border:0!important;border-radius:0;background:none!important;box-shadow:none!important;filter:drop-shadow(0 0 4px #6ccfff80);transform:translate(-50%,-50%)!important;transition:left 150ms ease!important;animation:none!important;isolation:isolate}
body .bre-effort-slider .bre-effort-knob::after{content:"";position:absolute;inset:0;background-image:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2290%22%20height%3D%2264%22%20viewBox%3D%220%200%2090%2064%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22h%22%20x2%3D%220.3%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23fff%22%2F%3E%3Cstop%20offset%3D%22.42%22%20stop-color%3D%22%23cddfee%22%2F%3E%3Cstop%20offset%3D%22.62%22%20stop-color%3D%22%23728fae%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23e4f5ff%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22w%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23c9dcec%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23385378%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22g%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23b9faff%22%2F%3E%3Cstop%20offset%3D%22.45%22%20stop-color%3D%22%2342b7e8%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23123e78%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cg%20stroke%3D%22%23233956%22%20stroke-width%3D%22.8%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M31%2026%2021%206%2032%209%2055%2028%2055%2036%2032%2055%2021%2058%2031%2038%22%20fill%3D%22url%28%23w%29%22%2F%3E%3Cpath%20d%3D%22m30%2023-16-8-5%201%206%2016-6%2016%205%201%2016-8%22%20fill%3D%22%237799bd%22%2F%3E%3Cpath%20d%3D%22M18%2026Q45%2017%2070%2025L85%2032%2070%2039Q45%2047%2018%2038L23%2032Z%22%20fill%3D%22url%28%23h%29%22%2F%3E%3Cpath%20d%3D%22m49%2026%2014-1%209%207-9%206-14-1%204-5Z%22%20fill%3D%22url%28%23g%29%22%2F%3E%3Cpath%20d%3D%22m25%2029%2019-3m-19%209%2019%203M70%2027l9%205-9%205%22%20fill%3D%22none%22%20stroke%3D%22%23f6fbff%22%20stroke-width%3D%221%22%2F%3E%3Cpath%20d%3D%22m21%206%206%2015m-6%2037%206-15%22%20stroke%3D%22%2392d5ff%22%20stroke-width%3D%221.5%22%2F%3E%3Cpath%20d%3D%22m17%2026-4%206%204%206%22%20fill%3D%22none%22%20stroke%3D%22%2346ddff%22%20stroke-width%3D%223%22%2F%3E%3Cpath%20d%3D%22M33%2017%2042%2024M33%2047l9-7%22%20stroke%3D%22%23375575%22%2F%3E%3Ccircle%20cx%3D%2239%22%20cy%3D%2232%22%20r%3D%221.3%22%20fill%3D%22%23e0fcff%22%20stroke%3D%22none%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E");background-repeat:no-repeat;background-position:center;background-size:contain;animation:atelier-ship-hover 3s ease-in-out infinite}
body .bre-effort-slider .bre-effort-knob::before{content:"";position:absolute;right:82%;top:42%;height:16%;width:calc(20px + var(--bre-progress) * .9);max-width:64px;border-radius:80% 8% 8% 80%;background:linear-gradient(90deg,transparent,#7055ff70 28%,var(--atelier-engine) 75%,#fff 99%);filter:blur(.5px);transform-origin:right center;animation:atelier-engine 1.2s ease-in-out infinite;z-index:-1}
body .bre-effort-slider[data-top]{--atelier-engine:#e5b0ff}
body .bre-effort-slider[data-top] .bre-effort-knob{filter:drop-shadow(0 0 7px #bb84ff)}
body .bre-effort-slider[data-top] .bre-effort-knob::after{filter:drop-shadow(0 0 3px #d2a8ff) brightness(1.12)}
body .bre-effort-slider .bre-effort-input{inset:-12px 0;width:100%;height:68px;cursor:grab;touch-action:pan-y}
body .bre-effort-slider .bre-effort-input:active{cursor:grabbing}
body .bre-effort-slider:has(.bre-effort-input:focus-visible){outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}
body .bre-effort-slider .bre-effort-input:focus-visible+.bre-effort-knob{outline:none}
body .bre-effort.is-dragging .bre-effort-knob{transition:none!important}
body .bre-effort.is-dragging .bre-effort-knob::before{filter:blur(.7px) brightness(1.5);animation:atelier-engine .35s ease-in-out infinite}
body .bre-model-row{min-height:38px;padding:0 14px}
body .bre-model-row-name{font-size:12px}
body .bre-model-row-effort{font-size:11px;color:var(--dsw-alias-label-primary)}
@keyframes atelier-star-drift{to{transform:translateX(-40px)}}
@keyframes atelier-ship-hover{0%,100%{transform:translateY(-.8px)}50%{transform:translateY(.8px)}}
@keyframes atelier-engine{0%,100%{opacity:.7;transform:scaleX(.85)}50%{opacity:1;transform:scaleX(1)}}
@media(prefers-reduced-motion:reduce){body .bre-effort-slider .bre-effort-track::before,body .bre-effort-slider .bre-effort-knob::before,body .bre-effort-slider .bre-effort-knob::after{animation:none!important}body .bre-effort-slider .bre-effort-knob{transition:none!important}}
@media(forced-colors:active){body .bre-effort-slider .bre-effort-track{background:Canvas!important;outline:1px solid CanvasText}body .bre-effort-slider .bre-effort-knob::after{background:CanvasText}body .bre-effort-slider .bre-effort-knob::before{display:none}}
`);}
  return ctx.slots.inject('shell.overlay',()=>ctx.slots.register({name:'shell.overlay',id:'atelier-reasoning-appearance',order:92},Appearance));
}
