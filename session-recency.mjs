export function sessionRecency(row,now=Date.now()){
  const at=row?.updatedAt;
  if(!row||row.blank===true||row.subagent!=null||typeof at!=='number'||!Number.isFinite(at)||at<=0||at>now)return {recent:false,hot:false};
  const age=now-at;
  return {recent:age<86400000,hot:age<3600000};
}
function sidebarAttribute(value){return String(value).replaceAll('\\','\\\\').replaceAll('"','\\"').replace(/[\n\r\f]/g,char=>`\\${char.charCodeAt(0).toString(16)} `);}
function recentRowSelector(id){return `.JoiKIa_sessionRow[data-row-key="session:${sidebarAttribute(id)}"][role="treeitem"]:not(.JoiKIa_archived)`;}
/** Select the first recent row crossed at the SAME top line in either direction. Pure geometry. */
export function crossedRecentRow(previousTop,currentTop,positions,skipId=null){
  if(!Number.isFinite(previousTop)||!Number.isFinite(currentTop)||Math.abs(currentTop-previousTop)<.5)return null;
  const down=currentTop>previousTop;
  const crossed=positions.filter(row=>row.id!==skipId&&Number.isFinite(row.top)&&(down?row.top>previousTop+.5&&row.top<=currentTop+.5:row.top<previousTop-.5&&row.top>=currentTop-.5));
  crossed.sort((a,b)=>down?a.top-b.top:b.top-a.top);
  return crossed[0]??null;
}
export function recentSessionStyles(rows,now,{marks=true,snap=true}={},stop=null){
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
export function observeRecentStops(doc,getHotIds,onStop,{now=()=>Date.now(),schedule=setTimeout,cancel=clearTimeout}={}){
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
