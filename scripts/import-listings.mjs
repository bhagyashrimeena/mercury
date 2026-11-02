import { readFile,writeFile,rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateCatalogue } from '../server/catalogue-validation.js';
import { listings } from '../public/catalogue-data.js';
const args=process.argv.slice(2),mode=args[0],path=args[1];
if(!['check','import','export'].includes(mode) || !path) { console.error('Usage: node scripts/import-listings.mjs check|import|export /absolute/file.json'); process.exit(1); }
if(mode==='export') { await writeFile(resolve(path),JSON.stringify(listings,null,2)+'\n',{flag:'wx'});console.log(`Exported ${listings.length} current records for review.`); }
else {
 const records=JSON.parse(await readFile(resolve(path),'utf8'));
 const result=validateCatalogue(records);
 if(!result.valid) { console.error(result.errors.join('\n'));process.exit(1); }
 const removed=listings.filter(e=>!records.some(r=>r.id===e.id)).map(e=>e.id);
 if(mode==='import' && removed.length) { console.error('Import would remove existing bookmark identities: '+removed.join(', ')+'. Preserve historical records and withdraw them through the owner desk.');process.exit(1); }
 console.log(`${records.length} records passed structural validation. Human source verification is still required.`);
 if(mode==='import') {
   const target=new URL('../public/catalogue-data.js',import.meta.url), temp=new URL('../public/catalogue-data.js.tmp',import.meta.url);
   await writeFile(temp,'// Reviewed event records. Update with scripts/import-listings.mjs.\nexport const listings = '+JSON.stringify(records,null,2)+';\n');
   await rename(temp,target);console.log('Catalogue updated. Run checks, review the diff, then publish through Sites.');
 }
}
