/** Persistent local SQLite store, using the built-in node:sqlite module (Node 22.13+). */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto';

const here=dirname(fileURLToPath(import.meta.url));
export const DB_PATH=resolve(process.env.RELIEFLINK_DB || resolve(here,'data','relieflink.sqlite'));
mkdirSync(dirname(DB_PATH),{recursive:true});
export const db=new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
export const now=()=>new Date().toISOString();
export const get=(sql,...p)=>db.prepare(sql).get(...p);
export const all=(sql,...p)=>db.prepare(sql).all(...p);
export const run=(sql,...p)=>db.prepare(sql).run(...p);
export const sha=(s)=>createHash('sha256').update(s).digest('hex');
export function hashPassword(password){const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(password,salt,64).toString('hex')}`}
export function verifyPassword(password,stored){const [salt,val]=String(stored||'').split(':');if(!salt||!val)return false;const a=scryptSync(password,salt,64),b=Buffer.from(val,'hex');return a.length===b.length&&timingSafeEqual(a,b)}
export const pub=(u)=>({id:u.id,name:u.name,email:u.email,role:u.role,phone:u.phone,skills:u.skills,availability:Boolean(u.availability)});
export function transaction(cb){db.exec('BEGIN IMMEDIATE');try{const v=cb();db.exec('COMMIT');return v}catch(e){db.exec('ROLLBACK');throw e}}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','volunteer','citizen')),
 phone TEXT NOT NULL DEFAULT '', skills TEXT NOT NULL DEFAULT '', availability INTEGER NOT NULL DEFAULT 1 CHECK(availability IN (0,1)),
 created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS incidents (
 id INTEGER PRIMARY KEY AUTOINCREMENT, reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
 title TEXT NOT NULL, type TEXT NOT NULL, severity TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'reported' CHECK(status IN ('reported','verified','in_progress','resolved')),
 description TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', lat REAL NOT NULL, lng REAL NOT NULL,
 created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS incidents_status ON incidents(status,created_at);
CREATE TABLE IF NOT EXISTS shelters (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT NOT NULL DEFAULT '',
 lat REAL NOT NULL, lng REAL NOT NULL, capacity INTEGER NOT NULL CHECK(capacity>0),
 occupancy INTEGER NOT NULL DEFAULT 0 CHECK(occupancy>=0 AND occupancy<=capacity),
 status TEXT NOT NULL CHECK(status IN ('open','full','closed')),contact TEXT NOT NULL DEFAULT '',
 supplies TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tasks (
 id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',
 required_skill TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','assigned','in_progress','completed')),
 incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
 assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS tasks_status ON tasks(status);
CREATE TABLE IF NOT EXISTS alerts (
 id INTEGER PRIMARY KEY AUTOINCREMENT,message TEXT NOT NULL,level TEXT NOT NULL CHECK(level IN ('info','warning','danger')),
 created_at TEXT NOT NULL);
`);

const empty=get('SELECT COUNT(*) AS n FROM users').n===0;
if(empty){
 const seed=JSON.parse(readFileSync(resolve(here,'seed.json'),'utf8'));
 transaction(()=>{
  const insertUser=db.prepare('INSERT INTO users(id,name,email,password_hash,role,phone,skills,availability,created_at) VALUES(?,?,?,?,?,?,?,?,?)');
  const h=hashPassword('ReliefDemo#2026!');
  for(const u of seed.users)insertUser.run(u.id,u.name,u.email,h,u.role,u.phone||'',u.skills||'',u.availability?1:0,now());
  const inc=db.prepare('INSERT INTO incidents(id,reporter_id,title,type,severity,status,description,address,lat,lng,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)');
  const ids=new Map(seed.users.map(u=>[u.name,u.id]));
  for(const x of seed.incidents)inc.run(x.id,ids.get(x.reporter_name)||null,x.title,x.type,x.severity,x.status,x.description,x.address,x.lat,x.lng,x.created_at);
  const shelter=db.prepare('INSERT INTO shelters(id,name,address,lat,lng,capacity,occupancy,status,contact,supplies,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)');
  for(const s of seed.shelters)shelter.run(s.id,s.name,s.address,s.lat,s.lng,s.capacity,s.occupancy,s.status,s.contact,s.supplies,s.updated_at);
  const task=db.prepare('INSERT INTO tasks(id,title,description,required_skill,status,incident_id,assigned_to,created_at) VALUES(?,?,?,?,?,?,?,?)');
  for(const t of seed.tasks)task.run(t.id,t.title,t.description,t.required_skill,t.status,t.incident_id,t.assigned_to,t.created_at);
  const alert=db.prepare('INSERT INTO alerts(id,message,level,created_at) VALUES(?,?,?,?)');
  for(const a of seed.alerts)alert.run(a.id,a.message,a.level,a.created_at);
 });
}
