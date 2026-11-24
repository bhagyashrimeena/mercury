import test from 'node:test';
import assert from 'node:assert/strict';
import { filterOrganizerEvents, organizerStats, serviceRequestMessage, workspaceFrame, eventStatus } from '../public/organizer-workspace.js';
const future=Date.now()+86400000;
const events=[{id:'one',title:'Sunday Rally',sport:'Tennis',area:'Powai',venue:'Court A',status:'published',startsAt:future,registered:3},{id:'two',title:'Smash Social',sport:'Badminton',area:'Andheri',status:'draft',startsAt:future,registered:0},{id:'three',title:'Earlier match',sport:'Tennis',status:'published',startsAt:0,registered:2}];
test('organizer status filters distinguish completed, draft and upcoming events',()=>{
 assert.deepEqual(filterOrganizerEvents(events,'powai','upcoming').map(e=>e.id),['one']);
 assert.deepEqual(filterOrganizerEvents(events,'','completed').map(e=>e.id),['three']);
 assert.equal(filterOrganizerEvents(events,'','draft','Tennis').length,0);
 assert.equal(filterOrganizerEvents(events,'missing').length,0);
 assert.equal(eventStatus({...events[2],status:'cancelled'}),'cancelled');
 assert.deepEqual(organizerStats(events),{events:3,published:1,drafts:1,registered:5});
});
test('service requests validate known services and preserve a bounded actionable brief',()=>{
 assert.throws(()=>serviceRequestMessage({service:'unknown',brief:'A long enough message.'}),/Choose a service/);
 assert.throws(()=>serviceRequestMessage({service:'poster',brief:'short'}),/15 characters/);
 const message=serviceRequestMessage({service:'poster',event:'Sunday Rally',budget:'₹5,000',brief:'We need an event poster with the date and venue.'});
 assert.match(message,/Poster & flyer design/);assert.match(message,/Sunday Rally/);assert.match(message,/₹5,000/);
 assert.ok(serviceRequestMessage({service:'poster',brief:'x'.repeat(5000)}).length<=2000);
});
test('organizer shell escapes account names and isolates contextual navigation',()=>{
 const html=workspaceFrame('<p>Owned content</p>',{session:{organizer:{name:'<img src=x onerror=alert(1)>'}},events:[]});
 assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));
 assert.ok(html.includes('aria-label="Organizer navigation"'));assert.ok(html.includes('Mobile organizer navigation'));
 assert.ok(!html.includes('sidebar'));assert.ok(!html.includes('LOCAL DEMO'));
});
