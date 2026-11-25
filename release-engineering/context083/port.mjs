import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const suite='@forcemind/dsh-atelier-suite';
const digest=b=>createHash('sha256').update(b).digest('hex');
function once(source,before,after){assert.equal(source.split(before).length,2,'Anchor mismatch: '+before.slice(0,100));return source.replace(before,()=>after);}
export function portHost(source){
 assert.equal(digest(source),'c2dbbcf4c28d85d2ba36952448c86ba41b25d300fa5440ace0ff20c97015d9c3');
 source=once(source,'let e=await o(n,{projectionMode:`none`}),t=e?.events;if(!Array.isArray(t))return null;let s=K(e);try{let o=oc(e),s=', 'let e=await o(n,{projectionMode:`none`}),release=K(e);try{let t=e?.events;if(!Array.isArray(t))return null;let o=oc(e),s=');
 source=once(source,'counts:mc(p,[n,...d.map(e=>e.id)])}}finally{s()}', 'counts:mc(p,[n,...d.map(e=>e.id)])}}finally{release()}');
 source=once(source,'let t=await o(e,{projectionMode:`none`}),a=t?.events;if(!Array.isArray(a)){l.push(e);continue}let c=K(t);try{let o=oc(t);','let t=await o(e,{projectionMode:`none`}),c=K(t);try{let a=t?.events;if(!Array.isArray(a)){l.push(e);continue}let o=oc(t);');
 source=once(source,'let e=await n(f,{projectionMode:`none`}),t=e?.events;if(!Array.isArray(t))return null;let a=oc(e),o=K(e);try{','let e=await n(f,{projectionMode:`none`}),o=K(e);try{let t=e?.events;if(!Array.isArray(t))return null;let a=oc(e);');
 return source;
}
export function portClient(source){
 assert.equal(digest(source),'5aece21253856759cf8f4d8609c498ba9010bee46fe9dc6751a770a046540989');
 source=once(source,'typeof n==`function`&&n.call(t,dt)}catch{}}function Dt','typeof n==`function`&&n.call(t,`'+suite+'`)}catch{}}function Dt');
 // Do not register the Context form as a bundle-wide card: the Suite owns a row-level form.
 const card='t.effect(()=>i.whileServed([e_],()=>t.slots.inject(`plugins.bundle.config`,()=>t.slots.register({name:`plugins.bundle.config`,key:e_,locale:e_,inject:d},e=>(0,u.createElement)(a,e)))),`dsh-context: plugins-page card`)';
 source=once(source,card,'void 0');
 source=once(source,'this.detail===null&&(this.resetLedger(),this.failures=0),this.fetchWantedParts()),()=>','this.detail===null?(this.resetLedger(),this.failures=0):this.lastHeadRev>this.acceptedRev&&(this.wantedRev=Math.max(this.wantedRev,this.lastHeadRev),this.catchUpTarget=-1,this.inFlight||this.schedule()),this.fetchWantedParts()),()=>');
 source=once(source,'this.detail===null?(this.timer!==null&&(clearTimeout(this.timer),this.timer=null),this.inFlight||this.fire()):(this.clearPartRetries(),this.unavailableParts.clear(),this.fetchWantedParts())','this.detail===null||this.acceptedRev<this.lastHeadRev?(this.wantedRev=Math.max(this.wantedRev,this.lastHeadRev),this.timer!==null&&(clearTimeout(this.timer),this.timer=null),this.inFlight||this.fire()):(this.clearPartRetries(),this.unavailableParts.clear(),this.fetchWantedParts())');
 source=once(source,'this.wantedRev=this.acceptedRev,this.failed=this.detail===null,this.failures++','this.wantedRev=this.acceptedRev,this.failed=this.detail===null||this.acceptedRev<this.lastHeadRev,this.failures++');
 source=once(source,'(this.failed=this.detail===null,this.failures++))}finally','(this.failed=this.detail===null||this.acceptedRev<this.lastHeadRev,this.failures++))}finally');
 source=once(source,':e===null?(ri(a.costRead),{data:a,detailState:s.failed?',':e===null||t!==null&&i&&e.rev!==t.detailRev?(ri(a.costRead),{data:a,detailState:s.failed?');
 return source;
}
export function portForm(source){
 source=once(source,"values:['all','tab','sidebar']","values:['all','tab','sidebar','hide']");
 source=once(source,"values:['count','latest','path','name']","values:['count','lines','latest','path','name']");
 return once(source," {key:'fleetTab'", " {key:'overviewAutoSteps',zh:'趋势自动总览阈值',en:'Trend overview threshold',values:['off','100','200','300']},\n {key:'defaultOverviewRange',zh:'洞察默认时间范围',en:'Insights default range',values:['today','7d','30d','all']},\n {key:'fleetTab'");
}
