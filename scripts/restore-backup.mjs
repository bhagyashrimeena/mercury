import { DatabaseSync } from 'node:sqlite';
import { readFileSync,readdirSync,openSync,closeSync,unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { BACKUP_TABLES } from '../server/backup.js';
export function restoreBackup(backup, destination) {
  if(backup?.format!=='mercury-backup-v1' || !backup.tables || Object.keys(backup.tables).sort().join('|')!==[...BACKUP_TABLES].sort().join('|')) throw Error('Not a complete supported Mercury backup.');
  if(BACKUP_TABLES.some(t=>!Array.isArray(backup.tables[t]))) throw Error('Invalid table data.');
  // A new local file only. This tool never connects to or overwrites production.
  closeSync(openSync(destination,'wx',0o600));
  const db=new DatabaseSync(destination);
  try {
    db.exec('PRAGMA foreign_keys=ON');
    for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort()) db.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
    db.exec('BEGIN');
    for(const table of BACKUP_TABLES) {
      const columns=db.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name);
      for(const row of backup.tables[table]) {
        if(!row || Object.keys(row).length!==columns.length || columns.some(c=>!(c in row))) throw Error('Unexpected backup schema for '+table);
        db.prepare(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')})`).run(...columns.map(c=>row[c]));
      }
    }
    if(db.prepare('PRAGMA foreign_key_check').all().length) throw Error('Backup has broken references.');
    db.exec('COMMIT');
    if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok') throw Error('Integrity check failed.');
    return Object.fromEntries(BACKUP_TABLES.map(t=>[t,db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n]));
  } catch(error) {try{db.exec('ROLLBACK');}catch{} db.close();unlinkSync(destination);throw error;}
  finally {try{db.close();}catch{}}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [, ,source,destination]=process.argv;
  if(!source || !destination) {console.error('Usage: node scripts/restore-backup.mjs private-backup.json NEW-local-database.sqlite');process.exit(1);}
  console.log(restoreBackup(JSON.parse(readFileSync(source,'utf8')),resolve(destination)));
}
