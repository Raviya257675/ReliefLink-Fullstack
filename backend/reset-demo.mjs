// Run only when the server is stopped. Deletes local demo data on next launch.
import {rmSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const p=resolve(process.env.RELIEFLINK_DB||resolve(dirname(fileURLToPath(import.meta.url)),'data/relieflink.sqlite'));
for(const f of [p,p+'-wal',p+'-shm'])rmSync(f,{force:true});
console.log('Demo database reset. Start ReliefLink again to recreate sample records.');
