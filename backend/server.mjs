/** ReliefLink academic demo API + realtime Server-Sent Events + production frontend. No npm backend packages. */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { resolve, join, extname, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { db, DB_PATH, get, all, run, now, pub, sha, hashPassword, verifyPassword, transaction } from './db.mjs';

const DIST=resolve(dirname(fileURLToPath(import.meta.url)),'../frontend/dist');
const PORT=Number(process.env.PORT||5173);
const HOST=process.env.HOST||'127.0.0.1';
const SESSION_MS=7*24*60*60*1000;
const TYPES=['flood','landslide','cyclone','earthquake','fire','drought','medical','other'];
const SEVERITIES=['low','medium','high','critical'];
const STATUSES=['reported','verified','in_progress','resolved'];
const LEVELS=['info','warning','danger'];
const MIMES={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpeg':'image/jpeg','.jpg':'image/jpeg','.ico':'image/x-icon','.webp':'image/webp','.json':'application/json; charset=utf-8','.woff':'font/woff','.woff2':'font/woff2'};
const listeners=new Set();
const attempts=new Map();
class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
const fail=(code,message)=>{throw new HttpError(code,message)};
const ensure=(v,code,msg)=>v||fail(code,msg);
const text=(v,label,min=1,max=300)=>{ensure(typeof v==='string'&&v.trim().length>=min&&v.trim().length<=max,400,`${label} must be between ${min} and ${max} characters.`);return v.trim()};
const optionalText=(v,label,max=1000)=>v===null||v===undefined||v===''?'':text(v,label,0,max);
const choice=(v,vals,label)=>{ensure(vals.includes(v),400,`${label} must be one of: ${vals.join(', ')}`);return v};
const integer=(v,label,min=0,max=9999999)=>{ensure((typeof v==='number'||typeof v==='string')&&v!==''&&Number.isSafeInteger(Number(v))&&Number(v)>=min&&Number(v)<=max,400,`${label} must be an integer between ${min} and ${max}.`);return Number(v)};
const coords=(b)=>{const lat=Number(b.lat),lng=Number(b.lng);ensure(b.lat!==undefined&&b.lat!==null&&b.lng!==undefined&&b.lng!==null&&Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180,400,'Choose a valid location on the map.');return {lat,lng}};
const respond=(res,status,obj)=>{if(res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj))};
const success=(res,obj,status=200)=>respond(res,status,obj);
async function body(req){let size=0;const parts=[];for await(const p of req){size+=p.length;if(size>65536)fail(413,'JSON request too large.');parts.push(p)}if(!parts.length)return {};try{const x=JSON.parse(Buffer.concat(parts).toString('utf8'));ensure(x&&!Array.isArray(x)&&typeof x==='object',400,'Body must be a JSON object.');return x}catch(e){if(e instanceof HttpError)throw e;fail(400,'Invalid JSON body.')}}
function who(req){const raw=(req.headers.authorization||'').match(/^Bearer ([a-f0-9]{64})$/i)?.[1];if(!raw)return null;const u=get(`SELECT u.* FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?`,sha(raw),now());return u||null}
const authenticated=(u)=>u||fail(401,'Please sign in first.');
const requireRole=(u,...roles)=>{authenticated(u);ensure(roles.includes(u.role),403,'You do not have permission to do that.');return u};
const uniqueUser=(id)=>{const u=get('SELECT * FROM users WHERE id=?',id);ensure(u,404,'User not found.');return u};
const incidentRow=(id)=>{const x=get(`SELECT i.*,u.name AS reporter_name FROM incidents i LEFT JOIN users u ON u.id=i.reporter_id WHERE i.id=?`,id);ensure(x,404,'Incident not found.');return x};
const shelterRow=(id)=>{const x=get('SELECT * FROM shelters WHERE id=?',id);ensure(x,404,'Shelter not found.');return x};
const taskRow=(id)=>{const x=get(`SELECT t.*,i.title AS incident_title,u.name AS assignee_name FROM tasks t LEFT JOIN incidents i ON i.id=t.incident_id LEFT JOIN users u ON u.id=t.assigned_to WHERE t.id=?`,id);ensure(x,404,'Task not found.');return x};
const incidentRows=(filters={})=>{let query=`SELECT i.*,u.name AS reporter_name FROM incidents i LEFT JOIN users u ON u.id=i.reporter_id WHERE 1=1`;const params=[];for(const k of ['status','type','severity'])if(filters[k]){query+=` AND i.${k}=?`;params.push(filters[k]);}return all(query+' ORDER BY i.created_at DESC,i.id DESC',...params)};
const taskRows=(where='',...params)=>all(`SELECT t.*,i.title AS incident_title,u.name AS assignee_name FROM tasks t LEFT JOIN incidents i ON i.id=t.incident_id LEFT JOIN users u ON u.id=t.assigned_to ${where} ORDER BY t.created_at DESC,t.id DESC`,...params);
function push(event,payload){const line=`data: ${JSON.stringify({event,payload})}\n\n`;for(const res of listeners)if(!res.destroyed)res.write(line)}
function cleanupAttempts(){const cutoff=Date.now()-15*60*1000;for(const [key,value] of attempts)if(value.time<cutoff)attempts.delete(key)}
function loginGuard(req,email){cleanupAttempts();const ip=req.socket.remoteAddress||'local';const key=`${ip}:${email}`;let item=attempts.get(key);if(item?.count>=10)fail(429,'Too many failed logins. Please try again in 15 minutes.');return key}
function validatePassword(p){ensure(typeof p==='string'&&p.length>=8&&p.length<=128&&/[A-Za-z]/.test(p)&&/[0-9]/.test(p),400,'Password must be 8-128 characters and contain a letter and a number.');return p}
const email=(e)=>{const v=text(e,'Email',5,254).toLowerCase();ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),400,'Enter a valid email address.');return v};
function makeSession(user){const token=randomBytes(32).toString('hex');run('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha(token),user.id,new Date(Date.now()+SESSION_MS).toISOString(),now());return {token,user:pub(user)}}
function numericPath(path,prefix){const rest=path.slice(prefix.length);if(!/^\d+$/.test(rest))return null;return Number(rest)}
async function api(req,res,url){
 const {pathname:path,searchParams:q}=url,method=req.method;
 if(path==='/api/health'&&method==='GET')return success(res,{status:'ok',service:'ReliefLink',database:'sqlite',realtime:'sse'});
 if(path==='/api/events'&&method==='GET'){
  res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
  res.write(': connected\n\n');listeners.add(res);const ping=setInterval(()=>{if(!res.destroyed)res.write(': keepalive\n\n')},25000);
  const close=()=>{clearInterval(ping);listeners.delete(res)};req.on('close',close);res.on('close',close);return;
 }
 if(path==='/api/auth/login'&&method==='POST'){
  const b=await body(req),mail=email(b.email),key=loginGuard(req,mail),u=get('SELECT * FROM users WHERE email=?',mail);
  if(!u||typeof b.password!=='string'||!verifyPassword(b.password,u.password_hash)){
   const x=attempts.get(key)||{count:0,time:Date.now()};x.count++;attempts.set(key,x);fail(401,'Invalid email or password.');
  }
  attempts.delete(key);return success(res,makeSession(u));
 }
 if(path==='/api/auth/register'&&method==='POST'){
  const b=await body(req),name=text(b.name,'Name',2,100),mail=email(b.email),password=validatePassword(b.password),role=b.role==='volunteer'?'volunteer':'citizen',phone=optionalText(b.phone,'Phone',30),skills=role==='volunteer'?optionalText(b.skills,'Skills',300):'';
  ensure(!get('SELECT id FROM users WHERE email=?',mail),409,'That email is already registered.');
  try{const id=Number(run('INSERT INTO users(name,email,password_hash,role,phone,skills,availability,created_at) VALUES(?,?,?,?,?,?,?,?)',name,mail,hashPassword(password),role,phone,skills,1,now()).lastInsertRowid);return success(res,makeSession(uniqueUser(id)),201)}catch(e){if(/UNIQUE constraint/i.test(e.message))fail(409,'That email is already registered.');throw e}
 }
 const user=who(req);
 if(path==='/api/auth/me'){
  authenticated(user);
  if(method==='GET')return success(res,{user:pub(user)});
  if(method==='PATCH'){
   const b=await body(req),name=b.name!==undefined?text(b.name,'Name',2,100):user.name,phone=b.phone!==undefined?optionalText(b.phone,'Phone',30):user.phone;
   const skills=b.skills!==undefined&&user.role==='volunteer'?optionalText(b.skills,'Skills',300):user.skills;
   const availability=user.role==='volunteer'&&b.availability!==undefined?Boolean(b.availability):Boolean(user.availability);
   run('UPDATE users SET name=?,phone=?,skills=?,availability=? WHERE id=?',name,phone,skills,availability?1:0,user.id);
   return success(res,{user:pub(uniqueUser(user.id))});
  }
 }
 if(path==='/api/auth/logout'&&method==='POST'){authenticated(user);const raw=req.headers.authorization.replace(/^Bearer /,'');run('DELETE FROM sessions WHERE token_hash=?',sha(raw));return success(res,{ok:true})}
 if(path==='/api/stats'&&method==='GET'){
  const incidents=get(`SELECT COUNT(*) total,COALESCE(SUM(status!='resolved'),0) active,COALESCE(SUM(severity='critical' AND status!='resolved'),0) critical FROM incidents`);
  const shelters=get(`SELECT COALESCE(SUM(CASE WHEN status!='closed' THEN occupancy ELSE 0 END),0) sheltered,COALESCE(SUM(CASE WHEN status!='closed' THEN capacity ELSE 0 END),0) capacity FROM shelters`);
  const volunteers=get(`SELECT COUNT(*) total,COALESCE(SUM(availability),0) available FROM users WHERE role='volunteer'`);
  const tasks=get(`SELECT COALESCE(SUM(status='open'),0) open,COALESCE(SUM(status='completed'),0) completed FROM tasks`);
  return success(res,{incidents,shelters,volunteers,tasks});
 }
 if(path==='/api/users/volunteers'&&method==='GET'){
  requireRole(user,'admin');
  const volunteers=all(`SELECT u.id,u.name,u.email,u.role,u.phone,u.skills,u.availability,
    (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to=u.id AND t.status IN ('assigned','in_progress')) AS active_tasks,
    (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to=u.id AND t.status='completed') AS completed_tasks
    FROM users u WHERE u.role='volunteer' ORDER BY u.name`).map(v=>({...v,availability:Boolean(v.availability)}));
  return success(res,{volunteers});
 }
 if(path==='/api/incidents'&&method==='GET'){
  const filters={};for(const [key,vals] of [['status',STATUSES],['type',TYPES],['severity',SEVERITIES]])if(q.has(key))filters[key]=choice(q.get(key),vals,key);
  return success(res,{incidents:incidentRows(filters)});
 }
 if(path==='/api/incidents'&&method==='POST'){
  authenticated(user);const b=await body(req),title=text(b.title,'Title',3,120),type=choice(b.type,TYPES,'Type'),severity=choice(b.severity,SEVERITIES,'Severity'),description=optionalText(b.description,'Details',1000),address=optionalText(b.address,'Address',200),{lat,lng}=coords(b);
  const id=Number(run('INSERT INTO incidents(reporter_id,title,type,severity,status,description,address,lat,lng,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',user.id,title,type,severity,'reported',description,address,lat,lng,now()).lastInsertRowid);
  const incident=incidentRow(id);push('incident:new',incident);return success(res,{incident},201);
 }
 let m;
 if((m=path.match(/^\/api\/incidents\/(\d+)\/status$/))&&method==='PATCH'){
  requireRole(user,'admin');const id=Number(m[1]);incidentRow(id);const b=await body(req),status=choice(b.status,STATUSES,'Status');
  run('UPDATE incidents SET status=? WHERE id=?',status,id);const incident=incidentRow(id);push('incident:update',incident);return success(res,{incident});
 }
 if((m=path.match(/^\/api\/incidents\/(\d+)$/))&&method==='DELETE'){
  requireRole(user,'admin');const id=Number(m[1]);incidentRow(id);run('DELETE FROM incidents WHERE id=?',id);push('incident:delete',{id});push('task:changed',{});return success(res,{ok:true});
 }
 if(path==='/api/shelters'&&method==='GET')return success(res,{shelters:all('SELECT * FROM shelters ORDER BY id')});
 if(path==='/api/shelters'&&method==='POST'){
  requireRole(user,'admin');const b=await body(req),name=text(b.name,'Shelter name',2,150),address=optionalText(b.address,'Address',200),{lat,lng}=coords(b),capacity=integer(b.capacity,'Capacity',1,1000000),occupancy=integer(b.occupancy??0,'Occupancy',0,capacity),contact=optionalText(b.contact,'Contact',60),supplies=optionalText(b.supplies,'Supplies',500),status=occupancy>=capacity?'full':'open';
  const id=Number(run('INSERT INTO shelters(name,address,lat,lng,capacity,occupancy,status,contact,supplies,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',name,address,lat,lng,capacity,occupancy,status,contact,supplies,now()).lastInsertRowid);
  const shelter=shelterRow(id);push('shelter:update',shelter);return success(res,{shelter},201);
 }
 if((m=path.match(/^\/api\/shelters\/(\d+)$/))){
  requireRole(user,'admin');const id=Number(m[1]),s=shelterRow(id);
  if(method==='PATCH'){
   const b=await body(req),occupancy=b.occupancy===undefined?s.occupancy:integer(b.occupancy,'Occupancy',0,s.capacity);
   if(b.status!==undefined)choice(b.status,['open','closed'],'Status');
   const status=b.status==='closed'?'closed':(b.status==='open'?occupancy>=s.capacity?'full':'open':s.status==='closed'?'closed':occupancy>=s.capacity?'full':'open');
   run('UPDATE shelters SET occupancy=?,status=?,updated_at=? WHERE id=?',occupancy,status,now(),id);
   const shelter=shelterRow(id);push('shelter:update',shelter);return success(res,{shelter});
  }
  if(method==='DELETE'){run('DELETE FROM shelters WHERE id=?',id);push('shelter:update',{id,deleted:true});return success(res,{ok:true});}
 }
 if(path==='/api/alerts'&&method==='GET')return success(res,{alerts:all('SELECT * FROM alerts ORDER BY created_at DESC,id DESC')});
 if(path==='/api/alerts'&&method==='POST'){
  requireRole(user,'admin');const b=await body(req),message=text(b.message,'Alert message',5,300),level=choice(b.level,LEVELS,'Alert level');
  const id=Number(run('INSERT INTO alerts(message,level,created_at) VALUES(?,?,?)',message,level,now()).lastInsertRowid),alert=get('SELECT * FROM alerts WHERE id=?',id);
  push('alert:new',alert);return success(res,{alert},201);
 }
 if((m=path.match(/^\/api\/alerts\/(\d+)$/))&&method==='DELETE'){
  requireRole(user,'admin');const id=Number(m[1]);ensure(get('SELECT id FROM alerts WHERE id=?',id),404,'Alert not found.');run('DELETE FROM alerts WHERE id=?',id);push('alert:removed',{id});return success(res,{ok:true});
 }
 if(path==='/api/tasks'&&method==='GET'){
  requireRole(user,'admin','volunteer');let where='WHERE 1=1',params=[];
  if(q.has('mine')&&q.get('mine')!=='false'&&q.get('mine')!=='0'){where+=' AND t.assigned_to=?';params.push(user.id)}
  if(q.has('status')){where+=' AND t.status=?';params.push(choice(q.get('status'),['open','assigned','in_progress','completed'],'Status'))}
  return success(res,{tasks:taskRows(where,...params)});
 }
 if(path==='/api/tasks'&&method==='POST'){
  requireRole(user,'admin');const b=await body(req),title=text(b.title,'Task title',3,150),description=optionalText(b.description,'Description',2000),required_skill=optionalText(b.required_skill,'Required skill',150),incident_id=integer(b.incident_id,'Incident ID',1);incidentRow(incident_id);
  const id=Number(run('INSERT INTO tasks(title,description,required_skill,status,incident_id,created_at) VALUES(?,?,?,?,?,?)',title,description,required_skill,'open',incident_id,now()).lastInsertRowid),task=taskRow(id);
  push('task:changed',task);return success(res,{task},201);
 }
 if((m=path.match(/^\/api\/tasks\/(\d+)(?:\/(accept|release|assign|status))?$/))){
  requireRole(user,'admin','volunteer');const id=Number(m[1]),act=m[2],t=taskRow(id);
  if(!act&&method==='DELETE'){requireRole(user,'admin');run('DELETE FROM tasks WHERE id=?',id);push('task:changed',{id,deleted:true});return success(res,{ok:true});}
  if(act==='accept'&&method==='POST'){
   requireRole(user,'volunteer');ensure(user.availability,409,'Mark yourself available before claiming tasks.');
   const r=run(`UPDATE tasks SET status='assigned',assigned_to=? WHERE id=? AND status='open'`,user.id,id);
   ensure(r.changes===1,409,'Someone already claimed this task.');
  }else if(act==='release'&&method==='POST'){
   ensure(t.status==='assigned'||t.status==='in_progress',409,'Only active tasks can be released.');ensure(user.role==='admin'||t.assigned_to===user.id,403,'Only the assignee or an admin can release this task.');
   run(`UPDATE tasks SET status='open',assigned_to=NULL WHERE id=?`,id);
  }else if(act==='assign'&&method==='POST'){
   requireRole(user,'admin');ensure(t.status==='open'||t.status==='assigned',409,'Completed or started tasks cannot be reassigned.');
   const b=await body(req),volunteer=uniqueUser(integer(b.volunteer_id,'Volunteer ID',1));ensure(volunteer.role==='volunteer',400,'Choose a volunteer account.');ensure(volunteer.availability,409,'The chosen volunteer is unavailable.');
   run(`UPDATE tasks SET status='assigned',assigned_to=? WHERE id=?`,volunteer.id,id);
  }else if(act==='status'&&method==='PATCH'){
   ensure(user.role==='admin'||t.assigned_to===user.id,403,'Only the assigned volunteer or admin may change task status.');
   const b=await body(req),target=choice(b.status,['in_progress','completed'],'Task status');
   ensure(target==='in_progress'&&t.status==='assigned'||target==='completed'&&['assigned','in_progress'].includes(t.status),409,'This task status transition is not allowed.');
   run('UPDATE tasks SET status=? WHERE id=?',target,id);
  }else fail(404,'Unknown task operation.');
  const task=taskRow(id);push('task:changed',task);return success(res,{task});
 }
 fail(404,`Route not found: ${method} ${path}`);
}
function staticFile(req,res,url){
 if(!['GET','HEAD'].includes(req.method))return respond(res,405,{error:'Method not allowed.'});
 if(!existsSync(join(DIST,'index.html')))return respond(res,503,{error:'Frontend is not built. Run "npm run setup" from the project root first.'});
 let name;try{name=decodeURIComponent(url.pathname)}catch{return respond(res,400,{error:'Invalid path.'})}
 const path=resolve(DIST,'.'+name);if(path!==DIST&&!path.startsWith(DIST+sep))return respond(res,403,{error:'Forbidden'});
 let target=path;if(!existsSync(target)||!statSync(target).isFile())target=join(DIST,'index.html');
 const mime=MIMES[extname(target).toLowerCase()]||'application/octet-stream';
 const headers={'Content-Type':mime,'X-Content-Type-Options':'nosniff','Cache-Control':target.endsWith('index.html')?'no-cache':'public,max-age=3600'};
 res.writeHead(200,headers);if(req.method==='HEAD')return res.end();createReadStream(target).pipe(res);
}
export const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  if(url.pathname.startsWith('/api/'))await api(req,res,url);else staticFile(req,res,url);
 }catch(error){if(!res.headersSent)respond(res,error.status||500,{error:error.status?error.message:'Internal server error.'});if(!error.status)console.error('Server error:',error)}
});
if(process.env.RELIEFLINK_IMPORT_ONLY!=='1'){
 server.listen(PORT,HOST,()=>console.log(`ReliefLink ready at http://${HOST}:${PORT} (SQLite: ${DB_PATH})`));
}
process.on('SIGINT',()=>{for(const s of listeners)s.end();server.close(()=>{db.close();process.exit(0)})});
