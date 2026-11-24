#!/usr/bin/env node
// Human-review verifier for a catalogue proposal. It never writes or publishes.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { listings } from '../public/catalogue-data.js';
import { assessCatalogueProposal } from '../server/catalogue-proposal-review.js';

const file=process.argv[2];
if (!file || process.argv.length!==3) {
  console.error('Usage: node scripts/verify-catalogue-proposal.mjs /absolute/path/to/proposal.json');
  process.exit(2);
}
try {
  const candidate=JSON.parse(await readFile(resolve(file),'utf8'));
  const result=assessCatalogueProposal(candidate,listings);
  if (!result.valid) {
    console.error('NOT READY FOR PR REVIEW:');
    result.errors.forEach(e=>console.error('- '+e));
    process.exitCode=1;
  } else {
    console.log('STRUCTURAL GATES PASS. This remains an unpublished, human-reviewed proposal.');
    console.log('Open a separate PR containing the source-reviewed catalogue change and evidence.');
    console.log('Recheck external dates, venue, eligibility, fees, link destination and rights before merge.');
  }
} catch (error) {
  console.error('Cannot assess proposal: '+error.message);
  process.exitCode=2;
}
