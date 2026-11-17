import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer} from 'node:net';

const root=resolve(import.meta.dirname,'../../');
const tmp=mkdtempSync(join(tmpdir(),'relieflink-test-'));
const dbFile=join(tmp,'test.sqlite');
let proc,port;
async function freePort(){return new Promise((resolvePort,reject)=>{const x=createServer();x.once('error',reject);x.listen(0,'127.0.0.1',()=>{const n=x.address().port;x.close(()=>resolvePort(n))})})}
async function boot(){port=await freePort();proc=spawn(process.execPath,['backend/server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),RELIEFLINK_DB:dbFile},stdio:['ignore','pipe','pipe']});let output='';proc.stderr.on('data',x=>output+=x);for(let i=0;i<140;i++){if(proc.exitCode!==null)throw new Error(`Server exited: ${output}`);try{const r=await fetch(`http://127.0.0.1:${port}/api/health`);if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,80))}throw new Error('Server did not start: '+output)}
async function stop(){if(proc&&proc.exitCode===null){proc.kill('SIGTERM');await new Promise(r=>{proc.once('exit',r);setTimeout(r,2000)})}}
async function call(method,path,body,token){const res=await fetch(`http://127.0.0.1:${port}/api${path}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const value=await res.json();return {status:res.status,...value}}
const login=async(mail)=>call('POST','/auth/login',{email:mail,password:'ReliefDemo#2026!'});

test('ReliefLink SQLite API integration: auth, security, CRUD, assignments, realtime, durability',async(t)=>{
 await boot();
 try{
  let admin,vol,cit,incID,taskID,shelterID,alertID;
  await t.test('health reports SQLite and SSE',async()=>{const r=await call('GET','/health');assert.equal(r.status,'ok');assert.equal(r.database,'sqlite');assert.equal(r.realtime,'sse')});
  await t.test('seeded database has incidents, shelters, alerts, tasks and statistics',async()=>{const [i,s,a,st]=await Promise.all([call('GET','/incidents'),call('GET','/shelters'),call('GET','/alerts'),call('GET','/stats')]);assert.equal(i.incidents.length,8);assert.equal(s.shelters.length,5);assert.equal(a.alerts.length,2);assert.equal(st.incidents.total,8);assert.ok(st.shelters.capacity>0)});
  await t.test('real credentials authenticate all roles',async()=>{const [a,v,c]=await Promise.all([login('admin@demo.lk'),login('volunteer@demo.lk'),login('citizen@demo.lk')]);assert.equal(a.user.role,'admin');assert.equal(v.user.role,'volunteer');assert.equal(c.user.role,'citizen');admin=a.token;vol=v.token;cit=c.token});
  await t.test('login rejects wrong passwords',async()=>{assert.equal((await call('POST','/auth/login',{email:'admin@demo.lk',password:'wrong'})).status,401)});
  await t.test('auth/me returns user profile, token works across requests',async()=>{const r=await call('GET','/auth/me',undefined,vol);assert.equal(r.user.email,'volunteer@demo.lk');assert.equal(r.user.availability,true)});
  await t.test('register citizen, persist account, reject duplicate & admin self-registration',async()=>{
   const b={name:'Test Person',email:'testperson@demo.lk',password:'Tester123',role:'admin',phone:'0712345678'};
   const created=await call('POST','/auth/register',b);assert.equal(created.status,201);assert.equal(created.user.role,'citizen');assert.ok(created.token);
   assert.equal((await call('POST','/auth/register',b)).status,409);
   assert.equal((await call('POST','/auth/register',{name:'X',email:'not-an-email',password:'abc123456'})).status,400);
  });
  await t.test('profile edits are real and role cannot be escalated',async()=>{
   const r=await call('PATCH','/auth/me',{name:'Nimal Updated',phone:'0775555555',role:'admin',availability:true},vol);assert.equal(r.user.name,'Nimal Updated');assert.equal(r.user.role,'volunteer');
  });
  await t.test('anonymous cannot report incident, citizen can report valid coordinates',async()=>{
   const b={title:'Bridge flooding test',type:'flood',severity:'high',description:'This is a test',address:'Galle',lat:6.05,lng:80.22};
   assert.equal((await call('POST','/incidents',b)).status,401);
   assert.equal((await call('POST','/incidents',{...b,lat:999},cit)).status,400);
   const r=await call('POST','/incidents',b,cit);assert.equal(r.status,201);assert.equal(r.incident.status,'reported');incID=r.incident.id;
  });
  await t.test('filters and admin-only verification work',async()=>{
   assert.equal((await call('PATCH',`/incidents/${incID}/status`,{status:'verified'},cit)).status,403);
   const r=await call('PATCH',`/incidents/${incID}/status`,{status:'verified'},admin);assert.equal(r.incident.status,'verified');
   assert.ok((await call('GET','/incidents?status=verified')).incidents.some(x=>x.id===incID));
  });
  await t.test('only admin creates tasks, volunteer may claim',async()=>{
   const b={title:'Carry emergency water',description:'Two cases',required_skill:'driving',incident_id:incID};
   assert.equal((await call('POST','/tasks',b,cit)).status,403);
   const tsk=await call('POST','/tasks',b,admin);assert.equal(tsk.status,201);taskID=tsk.task.id;
   const claimed=await call('POST',`/tasks/${taskID}/accept`,{},vol);assert.equal(claimed.task.status,'assigned');assert.equal(claimed.task.assigned_to,2);
   assert.equal((await call('POST',`/tasks/${taskID}/accept`,{},vol)).status,409);
  });
  await t.test('volunteer cannot modify others tasks; assigned worker can start and finish',async()=>{
   const other=(await call('POST','/auth/register',{name:'Other Volunteer',email:'other@demo.lk',password:'Other1234',role:'volunteer'})).token;
   assert.equal((await call('PATCH',`/tasks/${taskID}/status`,{status:'completed'},other)).status,403);
   assert.equal((await call('PATCH',`/tasks/${taskID}/status`,{status:'in_progress'},vol)).task.status,'in_progress');
   assert.equal((await call('PATCH',`/tasks/${taskID}/status`,{status:'completed'},vol)).task.status,'completed');
   assert.equal((await call('POST',`/tasks/${taskID}/release`,{},vol)).status,409);
   assert.ok((await call('GET','/tasks?mine=1',undefined,vol)).tasks.some(x=>x.id===taskID));
  });
  await t.test('admin shelter capacity validation and occupancy/status changes',async()=>{
   const b={name:'Test shelter',address:'Galle',lat:6.052,lng:80.217,capacity:30,occupancy:5,contact:'0911234567',supplies:'water'};
   assert.equal((await call('POST','/shelters',b,cit)).status,403);
   const created=await call('POST','/shelters',b,admin);assert.equal(created.status,201);shelterID=created.shelter.id;
   assert.equal((await call('PATCH',`/shelters/${shelterID}`,{occupancy:31},admin)).status,400);
   assert.equal((await call('PATCH',`/shelters/${shelterID}`,{occupancy:30},admin)).shelter.status,'full');
   assert.equal((await call('PATCH',`/shelters/${shelterID}`,{status:'closed'},admin)).shelter.status,'closed');
   assert.equal((await call('PATCH',`/shelters/${shelterID}`,{status:'open'},admin)).shelter.status,'full');
  });
  await t.test('admin-only alert broadcasting and removal',async()=>{
   assert.equal((await call('POST','/alerts',{message:'Test alert for everyone',level:'warning'},vol)).status,403);
   const r=await call('POST','/alerts',{message:'Test alert for everyone',level:'warning'},admin);assert.equal(r.status,201);alertID=r.alert.id;
   assert.ok((await call('GET','/alerts')).alerts.some(x=>x.id===alertID));
   assert.equal((await call('DELETE',`/alerts/${alertID}`,undefined,admin)).ok,true);
  });
  await t.test('admin volunteer workload counts are consistent',async()=>{
   const r=await call('GET','/users/volunteers',undefined,admin);const n=r.volunteers.find(x=>x.id===2);assert.ok(n.completed_tasks>=3);
   assert.equal((await call('GET','/users/volunteers',undefined,vol)).status,403);
  });
  await t.test('live SSE stream emits event on incident creation',async()=>{
   const cancel=new AbortController();const r=await fetch(`http://127.0.0.1:${port}/api/events`,{signal:cancel.signal});assert.equal(r.status,200);
   const reader=r.body.getReader();const pending=reader.read();
   await call('POST','/incidents',{title:'Live realtime test',type:'fire',severity:'medium',lat:6,lng:80},cit);
   let data='';let finished=false;for(let n=0;n<5;n++){
     const r1=n===0?await pending:await reader.read();data+=new TextDecoder().decode(r1.value||new Uint8Array());if(data.includes('incident:new')){finished=true;break}
   }
   cancel.abort();assert.equal(finished,true);
  });
  await t.test('data persists after a process restart',async()=>{
   await stop();await boot();const r=await call('GET','/incidents');assert.ok(r.incidents.some(x=>x.id===incID));
   const profile=await call('GET','/auth/me',undefined,vol);assert.equal(profile.user.name,'Nimal Updated');
   assert.ok((await call('GET','/shelters')).shelters.some(x=>x.id===shelterID));
  });
  await t.test('deleting an incident cascades dependent tasks',async()=>{
   assert.equal((await call('DELETE',`/incidents/${incID}`,undefined,cit)).status,403);
   assert.equal((await call('DELETE',`/incidents/${incID}`,undefined,admin)).ok,true);
   assert.ok(!(await call('GET','/tasks',undefined,admin)).tasks.some(x=>x.id===taskID));
  });
  await t.test('admin can delete shelters; unauthorized users cannot',async()=>{
   assert.equal((await call('DELETE',`/shelters/${shelterID}`,undefined,cit)).status,403);
   assert.equal((await call('DELETE',`/shelters/${shelterID}`,undefined,admin)).ok,true);
  });
  await t.test('logout revokes bearer session',async()=>{
   assert.equal((await call('POST','/auth/logout',{},cit)).ok,true);
   assert.equal((await call('GET','/auth/me',undefined,cit)).status,401);
  });
 }finally{await stop();rmSync(tmp,{recursive:true,force:true})}
});
