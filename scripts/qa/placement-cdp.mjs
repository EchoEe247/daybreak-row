// Portable, explicit CDP inspection; runs in a dedicated Chromium browser with
// ?touchqa, never in the owner's normal Chrome profile.
// Usage: node scripts/qa/placement-cdp.mjs [http://127.0.0.1:9230]
import {writeFileSync,mkdirSync} from "node:fs";
const endpoint=process.argv[2]??"http://127.0.0.1:9230";
const targets=await fetch(endpoint+"/json/list").then(r=>r.json());
const tab=targets.find(t=>t.url?.includes("touchqa")&&t.webSocketDebuggerUrl);
if(!tab)throw Error("No isolated ?touchqa browser tab. Start the dedicated QA browser first.");
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((ok,fail)=>{ws.addEventListener("open",ok,{once:true});ws.addEventListener("error",fail,{once:true});});
let serial=0;const pending=new Map();
ws.addEventListener("message",ev=>{const x=JSON.parse(ev.data);if(!pending.has(x.id))return;const h=pending.get(x.id);pending.delete(x.id);if(x.error)h.reject(x.error);else h.resolve(x.result);});
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const evalJs=async expression=>{const x=await call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(x.exceptionDetails)throw Error(JSON.stringify(x.exceptionDetails));return x.result.value;};
if(!await evalJs("!!window.__controlsTest"))throw Error("Game QA hooks unavailable");
await evalJs("(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent?.trim()==='Start');if(b)b.click();return true;})()");
const roomData=await evalJs("(()=>{const q=window.__controlsTest;return {actions:q.getActionsQA(),colliders:q.getCollidersQA(),rooms:q.getRoomsQA()};})()");
const RADIUS=.34;
function reachable(room,area,actions,step=.22){
  const nx=Math.floor((area.x1-area.x0)/step),nz=Math.floor((area.z1-area.z0)/step);
  const key=(i,j)=>i*nz+j;
  const inside=(i,j)=>i>=0&&i<nx&&j>=0&&j<nz;
  const point=(i,j)=>({x:area.x0+(i+.5)*step,z:area.z0+(j+.5)*step});
  const start={i:Math.floor((area.spawn.x-area.x0)/step),j:Math.floor((area.spawn.z-area.z0)/step)};
  const blocked=new Set();
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
    const p=point(i,j);
    if((roomData.colliders[room]||[]).some(c=>p.x>c.minX-RADIUS&&p.x<c.maxX+RADIUS&&p.z>c.minZ-RADIUS&&p.z<c.maxZ+RADIUS))blocked.add(key(i,j));
  }
  const seen=new Set([key(start.i,start.j)]),queue=[start];
  for(let x=0;x<queue.length;x++){
    const {i,j}=queue[x];
    for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const a=i+di,b=j+dj,k=key(a,b);
      if(!inside(a,b)||blocked.has(k)||seen.has(k))continue;
      seen.add(k);queue.push({i:a,j:b});
    }
  }
  return actions.map(a=>{
    let best=Infinity;
    for(const {i,j} of queue){
      const p=point(i,j);const dist=Math.hypot(p.x-a.x,p.z-a.z);
      if(dist<best)best=dist;
      if(best<a.r)break;
    }
    return {id:a.id,reachable:best<a.r,distance:Number(best.toFixed(2))};
  });
}
const findings=[];
for(const [room,area] of Object.entries(roomData.rooms)){
  const acts=roomData.actions.filter(a=>a.place===room);
  const access=reachable(room,area,acts);
  await evalJs("window.__controlsTest.setSceneForQA("+JSON.stringify(room)+","+area.spawn.x+","+area.spawn.z+")");
  await new Promise(r=>setTimeout(r,350));
  const props=await evalJs("(()=>{const q=window.__controlsTest;return {place:q.getPlace(),render:q.getRenderQA(),models:q.getAssetsQA().filter(x=>Math.abs(x.z-"+area.spawn.z+")<15).length};})()");
  findings.push({room,actions:access,...props});
}
const report={date:new Date().toISOString(),url:tab.url,findings};
mkdirSync("work",{recursive:true});writeFileSync("work/placement-cdp-report.json",JSON.stringify(report,null,2));
ws.close();
const failed=findings.flatMap(x=>x.actions.filter(a=>!a.reachable).map(a=>x.room+":"+a.id));
console.log("Audited",findings.length,"rooms; actions",findings.reduce((n,x)=>n+x.actions.length,0),"unreachable",failed);
if(failed.length)process.exitCode=1;
