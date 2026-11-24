// Website-first organizer workspace. All event/participant/request records come
// from authenticated Mercury endpoints; the reference prototype's data is absent.
export const encode = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const E = encode;
const href = (tab, id) => id ? '/host/event/' + encodeURIComponent(id) + '?tab=' + tab : '/host' + (tab === 'home' ? '' : '/' + tab);
const link = (label, url, kind = '') => `<a class="ow-btn ${kind}" href="${E(url)}">${label}</a>`;
const status = value => `<span class="ow-pill ${['published','confirmed','checked_in','resolved'].includes(value) ? 'green' : value === 'cancelled' ? 'red' : ''}">${E(String(value || 'draft').replaceAll('_',' '))}</span>`;
const heading = (kicker, title, sub = '', actions = '') => `<div class="ow-page-heading"><div><p class="ow-eyebrow">${E(kicker)}</p><h1>${E(title)}</h1>${sub ? `<p class="ow-subtitle">${E(sub)}</p>` : ''}</div><div class="ow-actions">${actions}</div></div>`;
const note = text => `<div class="ow-notice">${text}</div>`;
const empty = (title, text, action = '') => `<div class="ow-empty"><span aria-hidden="true">✳</span><h2>${E(title)}</h2><p>${E(text)}</p>${action}</div>`;
const date = event => event.date ? new Date(event.date + 'T12:00:00+05:30').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}) : 'Date to be set';
export function eventStatus(event, now = Date.now()) { return event.status === 'published' && Number(event.startsAt) <= now ? 'completed' : event.status; }
export function filterOrganizerEvents(events, query = '', state = 'all', sport = '') {
  const q = query.trim().toLowerCase();
  return events.filter(e => (!q || [e.title,e.sport,e.venue,e.area].join(' ').toLowerCase().includes(q)) &&
    (!sport || e.sport === sport) && (state === 'all' || (state === 'upcoming' ? e.status === 'published' && Number(e.startsAt) > Date.now() : eventStatus(e) === state)));
}
export function organizerStats(events) {
  return { events: events.length, published: events.filter(e=>eventStatus(e)==='published').length,
    drafts: events.filter(e=>e.status==='draft').length, registered: events.reduce((n,e)=>n+(Number(e.registered)||0),0) };
}
const metric = (label, value, detail) => `<article class="ow-card ow-kpi"><p>${E(label)}</p><strong>${E(value)}</strong><small>${E(detail)}</small></article>`;
const menuLink = (label, url, active) => `<a href="${E(url)}" class="ow-nav-link ${active ? 'selected' : ''}" ${active ? 'aria-current="page"' : ''}>${label}</a>`;
export function workspaceHeader({session, tab = 'home'}) {
  const org = session?.organizer;
  const name = org?.name || 'Your organizer account';
  const initials = name.split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const nav = [['Home','home'],['My events','events'],['Services','services'],['My requests','requests']].map(([label,key])=>menuLink(label,href(key),tab===key)).join('')+menuLink('Explore ↗','/explore',false);
  return `<header class="ow-header"><div class="ow-header-inner"><a class="ow-brand" href="/host" aria-label="Mercury organizer home"><span class="ow-brand-mark">M</span><span>MERCURY<small>FOR ORGANIZERS</small></span></a><nav class="ow-desktop-nav" aria-label="Organizer navigation">${nav}</nav><div class="ow-header-actions">${link('+ Create event','/host/new','lime')}<details class="ow-profile"><summary aria-label="Organization and account options"><span>${E(initials)}</span>⌄</summary><div class="ow-profile-panel"><b>${E(name)}</b>${link('Organization settings','/host/settings')}${link('Your account','/account')}${link('Help & support','/support')}</div></details></div></div><nav class="ow-mobile-nav" aria-label="Mobile organizer navigation">${nav}</nav></header>`;
}
export function eventContext(event, events, active = 'overview') {
  if (!event) return '';
  const tabs = [['Overview',href('overview',event.id)],['Participants','/roster/'+encodeURIComponent(event.id)],['Competition',href('competition',event.id)],['Promote',href('promote',event.id)],['Event day','/roster/'+encodeURIComponent(event.id)+'?tab=eventday']];
  const keys = ['overview','participants','competition','promote','eventday'];
  return `<section class="ow-event-context" aria-label="Selected event workspace"><div class="ow-context-inner"><div class="ow-context-top"><a href="/host/events">← Back to my events</a>${status(eventStatus(event))}</div><div class="ow-context-title"><div><p class="ow-eyebrow">MANAGING THIS EVENT</p><h2>${E(event.title)}</h2><p>${E(event.sport)} · ${E(date(event))} · ${E(event.area)}, Mumbai</p></div><label>Switch event<select id="ow-event-switch" aria-label="Switch current event">${events.map(e=>`<option value="${E(e.id)}" ${e.id===event.id?'selected':''}>${E(e.title)}</option>`).join('')}</select></label></div><nav class="ow-event-tabs" aria-label="Event management sections">${tabs.map(([label,url],i)=>menuLink(label,url,active===keys[i]||(keys[i]==='promote'&&active==='creative'))).join('')}<details class="ow-more"><summary class="ow-nav-link ${['finance','insights','sponsors'].includes(active)?'selected':''}">More ⌄</summary><div>${[['Finances','finance'],['Insights','insights'],['Sponsorships','sponsors']].map(([label,key])=>menuLink(label,href(key,event.id),active===key)).join('')}</div></details></nav></div></section>`;
}
export function workspaceFrame(content, options) {
  return `<div class="organizer-workspace">${workspaceHeader(options)}${eventContext(options.event,options.events||[],options.eventTab)}<div class="ow-content">${content}<div class="ow-footer"><span>© Mercury · NextPlay Sports · Organizer workspace</span><span>${link('Support','/support')} ${link('Privacy','/privacy')} ${link('Public website','/')}</span></div></div></div>`;
}
export function bindEventSwitch(root, go, tab = 'overview') {
  const select = root.querySelector('#ow-event-switch');
  if(select) select.onchange=()=>go(href(tab,select.value));
}
export function organizerSignIn(session) {
  const account='/account?return_to='+encodeURIComponent(location.pathname+location.search);
  return `<div class="ow-auth"><div><a class="ow-brand" href="/for-organizers"><span class="ow-brand-mark">M</span><span>MERCURY<small>FOR ORGANIZERS</small></span></a><div><p class="ow-eyebrow">FOR THE PEOPLE WHO MAKE SPORT HAPPEN</p><h1>YOUR GAME.<br><em>YOUR STAGE.</em></h1><p>Create an event, welcome your players and bring your community together.</p></div>${link('← Back to Mercury','/')}</div><section><div><p class="ow-eyebrow">ORGANIZER WORKSPACE</p><h2>${session?.user?'Finish setting up your account.':'Welcome back to Mercury.'}</h2><p>Use your Mercury account to manage your events and participants.</p>${link(session?.user?'Complete account setup ↗':'Sign in to continue ↗',account,'primary')}<p class="ow-fine">Already accepting registrations elsewhere?</p>${link('Submit your existing event link ↗','/list-event')}</div></section></div>`;
}
function eventCard(e) {
  return `<article class="ow-event-card"><div class="ow-event-cover"><p>${E(e.sport)} / ${E(e.type || e.draft?.format || 'Sport')}</p><h2>${E(e.title)}</h2></div><div class="ow-event-body">${status(eventStatus(e))}<p>${E(date(e))} · ${E(e.time)} IST</p><p>${E(e.venue)} · ${E(e.area)}</p><div class="ow-card-bottom"><b>${E(e.registered)} / ${E(e.capacity)} players</b>${link('Manage ↗',href('overview',e.id),'primary')}</div></div></article>`;
}
function home(events,session) {
  const s=organizerStats(events), org=session.organizer;
  const upcoming=[...events].filter(e=>e.status!=='cancelled').sort((a,b)=>Number(a.startsAt)-Number(b.startsAt)).slice(0,3);
  return heading(org?.name||'YOUR ORGANIZER WORKSPACE','Your next great event starts here.','Create, promote and manage sports events—with support when you need it.',link('View my events ↗','/host/events'))+
  `<section class="ow-start-grid" aria-label="Primary organizer actions">${[
    ['01 / CREATE','Create an event','Start a new session, save a draft, or list an event with external registration.','Get started ↗','/host/new','blue'],
    ['02 / GROW','Reach more players','Make a poster and share your published event with your community.','Promote an event ↗','/host/events?intent=promote','lime'],
    ['03 / SUPPORT',"Get Mercury’s help",'Tell us what you need for your event. Track the response in My requests.','Explore services ↗','/host/services','white']
  ].map(([k,title,body,cta,url,color])=>`<a class="ow-start ${color}" href="${url}"><span>${k}</span><strong>${title}</strong><p>${body}</p><b>${cta}</b></a>`).join('')}</section>`+
  (!org?note('Start by adding your club name and public contact details. '+link('Set up organizer profile ↗','/host/settings','primary')):'')+
  `<div class="ow-metrics">${metric('Your events',s.events,'Across your organizer account')}${metric('Live upcoming events',s.published,'Published and yet to start')}${metric('Active registrations',s.registered,'Confirmed and checked-in players')}${metric('Drafts',s.drafts,'Private until you publish')}</div><div class="ow-main-aside"><section class="ow-card"><div class="ow-section-title"><div><p class="ow-eyebrow">YOUR LINEUP</p><h2>Upcoming & active events</h2></div>${link('View all ↗','/host/events')}</div>${upcoming.length?upcoming.map(e=>`<a class="ow-event-row" href="${href('overview',e.id)}"><span class="ow-event-symbol">${E(e.sport?.[0])}</span><div><h3>${E(e.title)}</h3><p>${E(e.sport)} · ${E(date(e))} · ${E(e.area)}</p></div>${status(eventStatus(e))}<span>↗</span></a>`).join(''):empty('Your first event starts here.','Create a draft or submit an existing registration link.',link('Create event','/host/new','primary'))}</section><aside class="ow-card"><p class="ow-eyebrow">NEXT UP</p><h2>Needs your attention</h2><p>${s.drafts?`${s.drafts} draft${s.drafts===1?'':'s'} ready for your next edit.`:'No unfinished drafts right now.'}</p>${link(s.drafts?'Review drafts ↗':'Create your next event ↗',s.drafts?'/host/events?status=draft':'/host/new')}<hr><h3>Quick actions</h3><div class="ow-quick">${link('Poster maker','/host/events?intent=creative')}${link('Player check-in','/host/events?intent=eventday')}${link('List an external event','/list-event')}${link('Get assistance','/host/services')}</div></aside></div>`;
}
function eventsView(events) {
  const intent=new URLSearchParams(location.search).get('intent');
  return heading('EVENT WORKSPACE','Your events','Build, publish, manage and repeat your sporting events.',link('+ Create event','/host/new','primary'))+
    (intent?note('Choose an event to '+(intent==='eventday'?'check in your players.':intent==='creative'?'make a poster.':'promote it.')):'')+
    `<div class="ow-toolbar"><label class="ow-search">Search your events<input id="ow-search" type="search" placeholder="Event, sport or venue"></label><label>Sport<select id="ow-sport"><option value="">All sports</option>${[...new Set(events.map(e=>e.sport))].map(s=>`<option>${E(s)}</option>`).join('')}</select></label><div class="ow-segment" aria-label="Event view"><button type="button" data-view="cards" aria-pressed="true">Cards</button><button type="button" data-view="table" aria-pressed="false">Table</button></div></div><div class="ow-status-filters" aria-label="Filter events by status">${['all','draft','published','upcoming','completed','cancelled'].map(s=>`<button type="button" data-state="${s}" aria-pressed="${s==='all'}">${s[0].toUpperCase()+s.slice(1)}</button>`).join('')}</div><p id="ow-result-count" role="status" class="ow-fine"></p><div id="ow-events"></div>`;
}
function bindEventList(root,events) {
  let state=new URLSearchParams(location.search).get('status')||'all',view='cards';
  const intent=new URLSearchParams(location.search).get('intent');
  const paint=()=>{
    const rows=filterOrganizerEvents(events,root.querySelector('#ow-search').value,state,root.querySelector('#ow-sport').value);
    root.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.state===state)));
    root.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
    root.querySelector('#ow-result-count').textContent=rows.length+' event'+(rows.length===1?'':'s');
    const target=e=>intent==='eventday'?'/roster/'+encodeURIComponent(e.id)+'?tab=eventday':href(intent==='creative'?'creative':intent==='promote'?'promote':'overview',e.id);
    root.querySelector('#ow-events').innerHTML=!rows.length?empty('No events found.','Try another filter or create your first event.',link('Create event','/host/new','primary')):view==='cards'?'<div class="ow-event-grid">'+rows.map(e=>eventCard(e).replace(E(href('overview',e.id)),E(target(e)))).join('')+'</div>':`<div class="ow-table-wrap"><table><thead><tr><th>Event</th><th>Date / venue</th><th>Players</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(e=>`<tr><td><b>${E(e.title)}</b><small>${E(e.sport)}</small></td><td>${E(date(e))}<small>${E(e.venue)}</small></td><td>${E(e.registered)} / ${E(e.capacity)}</td><td>${status(eventStatus(e))}</td><td>${link('Manage ↗',target(e))}</td></tr>`).join('')}</tbody></table></div>`;
  };
  root.querySelector('#ow-search').oninput=paint;root.querySelector('#ow-sport').onchange=paint;
  root.querySelectorAll('[data-state]').forEach(b=>b.onclick=()=>{state=b.dataset.state;paint();});
  root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;paint();});paint();
}
function overview(e,attendees) {
  return heading('EVENT WORKSPACE','Overview',e.sport+' · '+date(e)+' · '+e.venue,
    link('Edit event','/host/'+encodeURIComponent(e.id))+link('Create next edition','/host/new?duplicate='+encodeURIComponent(e.id))+ (e.status==='published'?link('View player page ↗','/event/'+encodeURIComponent(e.id),'dark'):''))+
    `<div class="ow-metrics">${metric('Event status',eventStatus(e),'Current publication state')}${metric('Active registrations',e.registered,e.capacity+' player capacity')}${metric('Checked in',attendees.filter(p=>p.status==='checked_in').length,'From the live attendee roster')}${metric('Entry fee',Number(e.price)===0?'Free':'₹'+e.price,Number(e.price)===0?'No payment collected':'Paid publication unavailable')}</div><div class="ow-main-aside"><section class="ow-card"><h2>Manage this event</h2><div class="ow-tool-grid">${[
    ['Participants','Find players, export a roster and check them in.','/roster/'+encodeURIComponent(e.id)],['Creative Studio','Make an event poster using your saved details.',href('creative',e.id)],['Competition','Get help planning your draw and court schedule.',href('competition',e.id)],['Event day','Open the live player check-in list.','/roster/'+encodeURIComponent(e.id)+'?tab=eventday'],['Promote','Share your event with your community.',href('promote',e.id)],['Service requests','Ask the Mercury team for event assistance.','/host/services?event='+encodeURIComponent(e.id)]
  ].map(([title,desc,url])=>`<a href="${E(url)}"><b>${title} ↗</b><p>${desc}</p></a>`).join('')}</div><h3>About this event</h3><p>${E(e.description)}</p></section><aside class="ow-card"><h2>Event information</h2><dl class="ow-facts">${[['Status',eventStatus(e)],['Sport',e.sport],['Venue',e.venue],['Date',date(e)],['Start time',e.time+' IST'],['Playing level',e.level],['Capacity',e.capacity+' players']].map(([k,v])=>`<div><dt>${k}</dt><dd>${E(v)}</dd></div>`).join('')}</dl><div class="ow-actions">${e.status==='draft'&&Number(e.price)===0&&Number(e.startsAt)>Date.now()?`<button class="ow-btn primary" data-ow-action="publish">Publish free event ↗</button>`:''}${e.status==='published'&&!Number(e.registered)?'<button class="ow-btn" data-ow-action="unpublish">Return to draft</button>':''}${e.status!=='cancelled'?'<button class="ow-btn danger" data-ow-action="cancel">Cancel event</button>':''}</div>${e.status==='draft'?'<p class="ow-fine">Your draft is private. Only future free events can be published.</p>':''}</aside></div>`;
}
export const ORGANIZER_SERVICES = [
  ['listing','Discovery','Event listing review','Submit an existing registration link for review.'],
  ['promotion','Discovery','Promotion planning','Ask for help planning how to reach your sports community.'],
  ['poster','Creative','Poster & flyer design','Request a design brief, poster or social asset pack.'],
  ['branding','Creative','Tournament branding','Discuss a visual identity and reusable event assets.'],
  ['operations','Operations','Tournament planning','Ask about draws, schedules, courts and event-day operations.'],
  ['registration','Operations','Registration support','Get help planning player registration and check-in.'],
  ['partners','Partners','Venue & partner assistance','Discuss venue, equipment or specialist support needs.'],
  ['sponsors','Partners','Sponsorship planning','Prepare your sponsorship requirements and proposal brief.']
];
export function serviceRequestMessage({service,event,deadline,budget,brief}) {
  const item=ORGANIZER_SERVICES.find(s=>s[0]===service);
  if(!item) throw Error('Choose a service.');
  if(String(brief||'').trim().length<15)throw Error('Describe what you need in at least 15 characters.');
  return `[Mercury service request]\nService: ${item[2]}\nEvent: ${event||'Not selected'}\nNeeded by: ${deadline||'Flexible'}\nBudget: ${budget||'To discuss'}\n\n${String(brief).trim()}`.slice(0,2000);
}
function services(events,session) {
  const params=new URLSearchParams(location.search),selection=params.get('service')||'';
  return heading('MERCURY SERVICES','Everything your event needs.','Tell us what you need. The team will review availability, scope and any quote before work begins.',link('My requests ↗','/host/requests'))+
    `<div class="ow-status-filters" aria-label="Service category">${['All','Discovery','Creative','Operations','Partners'].map(c=>`<button type="button" data-service-filter="${c}" aria-pressed="${c==='All'}">${c}</button>`).join('')}</div><div class="ow-service-grid">${ORGANIZER_SERVICES.map(([id,category,title,body])=>`<article class="ow-card" data-service-category="${category}"><p class="ow-eyebrow">${category}</p><h2>${title}</h2><p>${body}</p>${id==='listing'?link('Submit event link ↗','/list-event'): `<button class="ow-btn" type="button" data-service="${id}">Request assistance ↗</button>`}</article>`).join('')}</div><section class="ow-card ow-request-form"><h2>Tell us about your event</h2><p>Submitting an enquiry does not book a service or charge a fee. Availability and delivery dates are confirmed by the team.</p><form id="ow-service-form"><div class="ow-fields"><label>Service<select name="service" required><option value="">Choose a service</option>${ORGANIZER_SERVICES.filter(s=>s[0]!=='listing').map(([id,,title])=>`<option value="${id}" ${id===selection?'selected':''}>${title}</option>`).join('')}</select></label><label>Event<select name="event"><option value="">Not linked to an event</option>${events.map(e=>`<option value="${E(e.id)}" ${params.get('event')===e.id?'selected':''}>${E(e.title)}</option>`).join('')}</select></label><label>Your name<input name="name" value="${E(session.organizer?.name||session.user?.name||'')}" minlength="2" maxlength="80" required></label><label>Reply email<input name="email" type="email" value="${E(session.user?.email||'')}" maxlength="254" required></label><label>Needed by<input name="deadline" type="date"></label><label>Budget (optional)<input name="budget" maxlength="100" placeholder="e.g. ₹5,000 or to discuss"></label></div><label>What do you need?<textarea name="brief" rows="4" minlength="15" maxlength="1300" required placeholder="Tell us about the event, scope and timings."></textarea></label><label class="ow-check"><input name="consent" type="checkbox" required><span>I agree Mercury may contact me about this request. <a href="/privacy">Privacy notice</a>.</span></label><p role="alert" tabindex="-1"></p><button class="ow-btn primary" type="submit">Send request ↗</button><p class="ow-fine">Track the status in My requests. Email notifications are not automatic.</p></form></section>`;
}
function requestsView(requests) {
  return heading('SERVICES / MY REQUESTS','Your service requests','Requests linked to this signed-in account. Status is updated by the Mercury team.',link('Explore services ↗','/host/services','primary'))+
    (requests.length?`<div class="ow-request-list">${requests.map(r=>`<article class="ow-card"><div class="ow-section-title"><div><p class="ow-eyebrow">${E(r.category)}</p><h2>Request ${E(r.id.slice(0,8))}</h2></div>${status(r.status)}</div><p class="ow-fine">Submitted ${E(new Date(r.created_at).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'}))}</p><pre>${E(r.message)}</pre><p class="ow-fine">Reference: ${E(r.id)}</p></article>`).join('')}</div>`:empty('No requests yet.','Requests you send while signed in appear here.',link('Explore services','/host/services','primary')));
}
function promote(e,creative=false) {
  if(creative)return heading('PROMOTE / CREATIVE STUDIO','Make something worth sharing.','Use your saved event information to export a poster. Drafts are visibly marked.',link('Back to promote',href('promote',e.id)))+`<div class="ow-creative-layout"><section class="ow-card"><h2>Event poster</h2><label>Template<select id="ow-poster-style"><option value="dark">After Dark · Ink & Lime</option><option value="blue">Electric · Blue & Lime</option><option value="light">Chalk · Minimal</option></select></label><label>Headline<input id="ow-poster-title" maxlength="100" value="${E(e.title)}"></label><label>Supporting line<input id="ow-poster-subtitle" maxlength="120" value="${E(e.level||'Everyone’s game.')} "></label><p class="ow-fine">Edits here only affect this export. Event details stay unchanged.</p><button class="ow-btn primary" id="ow-export-poster" type="button">Export PNG ↓</button><p role="status" id="ow-poster-status"></p></section><div class="ow-poster"><canvas id="ow-poster" width="1080" height="1350" role="img" aria-label="Preview of your event poster"></canvas></div></div>`;
  return heading('GROW / PROMOTE','Bring your community together.','Make a poster and share the event yourself. Mercury does not send messages or run paid campaigns.',link('Open Creative Studio ↗',href('creative',e.id),'primary'))+
    `<div class="ow-main-aside"><section class="ow-card"><p class="ow-eyebrow">EVENT LINK</p><h2>${E(e.title)}</h2>${e.status==='published'?`<p>Send this player page to your community. Registrations are confirmed on Mercury.</p><label>Public event link<input id="ow-share-url" readonly value="${E(location.origin+'/event/'+encodeURIComponent(e.id))}"></label><button type="button" class="ow-btn primary" id="ow-copy-link">Copy event link ↗</button>`:note('Publish this event before sharing a registration link. You can export a clearly marked draft poster now.') }<hr><h3>A simple promotion checklist</h3><ul><li>Check your date, venue, capacity and player eligibility.</li><li>Export a poster in your preferred style.</li><li>Share your published event link with your community.</li><li>Review registrations in the Participants tab.</li></ul></section><aside class="ow-card"><p class="ow-eyebrow">MERCURY ASSISTANCE</p><h2>Need a hand reaching players?</h2><p>Discuss a promotion plan or creative brief. Campaign delivery and pricing are confirmed separately.</p>${link('Request promotion help ↗','/host/services?service=promotion&event='+encodeURIComponent(e.id))}</aside></div>`;
}
function bindPoster(root,e,toast) {
  const canvas=root.querySelector('#ow-poster');if(!canvas)return;
  const context=canvas.getContext('2d');if(!context){root.querySelector('#ow-poster-status').textContent='Canvas export is unavailable in this browser.';root.querySelector('#ow-export-poster').disabled=true;return;}
  const wrap=(text,x,y,width,size,max=5)=>{const words=String(text).split(/\s+/);let line='',lines=[];for(const word of words){const next=line?line+' '+word:word;if(context.measureText(next).width>width&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);lines.slice(0,max).forEach((s,i)=>context.fillText(s,x,y+i*size,width));return y+Math.min(lines.length,max)*size;};
  const draw=()=>{const style=root.querySelector('#ow-poster-style').value,light=style==='light';context.fillStyle=light?'#f7f8f2':style==='blue'?'#3156f5':'#10131a';context.fillRect(0,0,1080,1350);context.save();context.strokeStyle=light?'#3156f5':'#d9ff38';context.lineWidth=68;context.beginPath();context.ellipse(1030,830,390,280,-.5,0,Math.PI*2);context.stroke();context.restore();context.fillStyle=light?'#10131a':'#fff';context.font='bold 28px Arial';context.fillText('MERCURY / '+String(e.sport).toUpperCase(),70,95);context.font='italic 900 86px Arial';const y=wrap(root.querySelector('#ow-poster-title').value.toUpperCase(),70,290,920,88);context.font='bold 32px Arial';wrap(root.querySelector('#ow-poster-subtitle').value,70,y+60,800,44,3);context.font='bold 34px Arial';context.fillText(date(e)+' · '+e.time+' IST',70,1045);context.font='28px Arial';wrap(e.venue+' · '+e.area,70,1100,900,38,2);context.font='bold 30px Arial';context.fillText(Number(e.price)===0?'FREE ENTRY':'₹'+e.price+' / player',70,1220);context.font='24px Arial';context.fillText(e.status==='published'?'playonmercury.com/event/'+e.id:'DRAFT · NOT OPEN FOR REGISTRATION',70,1280,930);if(e.status==='cancelled'){context.fillStyle='#c63847';context.fillRect(0,630,1080,100);context.fillStyle='#fff';context.font='bold 48px Arial';context.fillText('CANCELLED',70,696);}};
  root.querySelector('#ow-poster-style').onchange=draw;root.querySelector('#ow-poster-title').oninput=draw;root.querySelector('#ow-poster-subtitle').oninput=draw;draw();
  root.querySelector('#ow-export-poster').onclick=()=>canvas.toBlob(blob=>{if(!blob){toast('The poster could not be exported. Try again.');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mercury-event-poster.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);root.querySelector('#ow-poster-status').textContent='PNG downloaded. Nothing has been posted or sent.';},'image/png');
}
function insights(e,people) {
  const active=people.filter(p=>['confirmed','checked_in'].includes(p.status));const checked=people.filter(p=>p.status==='checked_in').length;
  return heading('ORGANIZER INSIGHTS','Participation at a glance.','These counts come from your Mercury registrations.')+`<div class="ow-metrics">${metric('Active registrations',active.length,'Confirmed and checked-in')}${metric('Checked in',checked,'Recorded by your team')}${metric('Attendance',active.length?Math.round(checked/active.length*100)+'%':'—','Checked in / active registrations')}${metric('Remaining capacity',Math.max(0,e.capacity-active.length),'Places available')}</div><section class="ow-card"><h2>Registration status</h2><dl class="ow-facts">${['confirmed','checked_in','cancelled','event_cancelled'].map(s=>`<div><dt>${E(s.replaceAll('_',' '))}</dt><dd>${people.filter(p=>p.status===s).length}</dd></div>`).join('')}</dl><p class="ow-fine">External platform registrations and campaign reach are not included.</p>${link('Open participants ↗','/roster/'+encodeURIComponent(e.id))}</section>`;
}
function unavailable(e,tab) {
 const content={competition:['COMPETITION OPERATIONS','Plan your competition.','Bracket generation, scoring and public results are not connected to this website yet. Your live participant roster is available to download for planning.','operations','Request tournament planning'],finance:['BUSINESS OPERATIONS','Payments & finance','Mercury currently publishes free native events. Paid checkout, payouts and refunds are not enabled. No income or settlement data is recorded here.','operations','Ask about event operations'],sponsors:['COMMERCIAL GROWTH','Sponsorship & partners','Discuss your sponsorship requirements with the Mercury team. Sponsor outreach, deals and payments are not managed automatically.','sponsors','Request sponsorship assistance']}[tab];
 return heading(content[0],content[1])+`<div class="ow-main-aside"><section class="ow-card ow-unavailable"><p class="ow-eyebrow">${tab==='sponsors'?'PLANNING SUPPORT':'NOT YET AVAILABLE'}</p><h2>${tab==='competition'?'Your players are the starting point.':tab==='finance'?'Clear fees. No simulated balances.':'Build your sponsorship brief.'}</h2><p>${content[2]}</p><div class="ow-actions">${link(content[4]+' ↗','/host/services?service='+content[3]+'&event='+encodeURIComponent(e.id),'primary')}${link('Open participants','/roster/'+encodeURIComponent(e.id))}</div></section><aside class="ow-card"><p class="ow-eyebrow">YOUR EVENT</p><h2>${E(e.title)}</h2><p>${E(e.sport)} · ${E(date(e))}</p><p>${E(e.registered)} active players / ${E(e.capacity)} places</p></aside></div>`;
}
export async function renderOrganizerWorkspace({main,session,api,go,toast,confirmAction,section='home',eventId=null}) {
  if(!session?.user||!session.consentAccepted){main.innerHTML=organizerSignIn(session);return;}
  const {events}=await api('organizer/events');
  let event=eventId?events.find(e=>e.id===eventId):null;
  if(eventId&&!event)throw Error('This event is not available in your organizer account.');
  let tab=new URLSearchParams(location.search).get('tab')||'overview';
  if(!['overview','competition','promote','creative','finance','insights','sponsors'].includes(tab))tab='overview';
  let content,people=[];
  if(event){if(['overview','insights'].includes(tab)){const result=await api('organizer/events/'+encodeURIComponent(event.id)+'/attendees');people=result.attendees;}
    content=tab==='overview'?overview(event,people):['promote','creative'].includes(tab)?promote(event,tab==='creative'):tab==='insights'?insights(event,people):unavailable(event,tab);
  }else if(section==='events')content=eventsView(events);
  else if(section==='services')content=services(events,session);
  else if(section==='requests'){const result=await api('organizer/requests');content=requestsView(result.requests);}
  else content=home(events,session);
  main.innerHTML=workspaceFrame(content,{session,tab:section,event,events,eventTab:tab});
  bindEventSwitch(main,go,tab);
  if(section==='events')bindEventList(main,events);
  if(section==='services'){
    main.querySelectorAll('[data-service-filter]').forEach(button=>button.onclick=()=>{main.querySelectorAll('[data-service-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));main.querySelectorAll('[data-service-category]').forEach(card=>card.hidden=button.dataset.serviceFilter!=='All'&&card.dataset.serviceCategory!==button.dataset.serviceFilter);});
    const form=main.querySelector('#ow-service-form');
    main.querySelectorAll('[data-service]').forEach(b=>b.onclick=()=>{form.elements.namedItem('service').value=b.dataset.service;form.scrollIntoView({behavior:'smooth',block:'start'});form.elements.namedItem('brief').focus({preventScroll:true});});
    form.onsubmit=async ev=>{ev.preventDefault();if(form.dataset.busy||!form.reportValidity())return;form.dataset.busy='1';const button=form.querySelector('button[type=submit]'),alert=form.querySelector('[role=alert]');button.disabled=true;alert.textContent='';try{const data=Object.fromEntries(new FormData(form));const selected=events.find(e=>e.id===data.event);const message=serviceRequestMessage({...data,event:selected?selected.title+' ('+selected.id+')':''});const result=await api('support',{name:data.name,email:data.email,category:'Organizer enquiry',message,consent:data.consent==='on'});toast('Request sent. Reference: '+result.id);go('/host/requests');}catch(error){if(error.name!=='AbortError'){alert.textContent=error.message;alert.focus();}}finally{delete form.dataset.busy;button.disabled=false;}};
  }
  if(event){
    main.querySelectorAll('[data-ow-action]').forEach(b=>b.onclick=()=>{const act=b.dataset.owAction;confirmAction(act==='publish'?'Publish this event?':act==='cancel'?'Cancel this event?':'Return to draft?',act==='publish'?'Confirm your venue is ready. Players will be able to reserve a free place.':act==='cancel'?'All active registrations will be cancelled. Players receive an in-app update. This cannot be undone.':'The event will no longer appear in discovery.',act==='publish'?'Publish event':act==='cancel'?'Cancel event':'Return to draft',async()=>{await api('organizer/events/'+encodeURIComponent(event.id)+'/'+act,{});go(href('overview',event.id));toast('Event updated.');});});
    const copy=main.querySelector('#ow-copy-link');if(copy)copy.onclick=async()=>{try{await navigator.clipboard.writeText(main.querySelector('#ow-share-url').value);toast('Event link copied.');}catch{main.querySelector('#ow-share-url').select();toast('Select and copy the event link.');}};
    if(tab==='creative')bindPoster(main,event,toast);
  }
}
