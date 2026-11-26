// Service discovery and guided enquiries. No simulated bookings or transactions.
const E = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const SERVICE_DETAILS = [
  {id:'listing',category:'Discovery',title:'Get your event discovered',name:'Event listing review',description:'Already taking entries? Bring your event to Mercury.',tag:'Submit an existing event',art:'ticket',color:'blue',needs:[]},
  {id:'promotion',category:'Discovery',title:'Bring more players in',name:'Promotion planning',description:'Turn your event into a plan your community wants to join.',tag:'Plan your reach',art:'megaphone',color:'blue',needs:['Community outreach plan','Launch content plan','Registration reminders','Promotion strategy'],prompt:'Who would you like to reach?',placeholder:'e.g. Amateur tennis players around Powai, for a weekend doubles event.'},
  {id:'poster',category:'Creative',title:'Make it unmissable',name:'Poster & flyer design',description:'Give your next game a poster worth sharing.',tag:'Build your creative brief',art:'poster',color:'blue',needs:['Event poster','Instagram story','Social post pack','Print-ready flyer'],prompt:'What are we making?',placeholder:'e.g. A bold badminton poster with our club colours and registration link.'},
  {id:'branding',category:'Creative',title:'Give your event an identity',name:'Tournament branding',description:'A recognisable look, from the first post to the final point.',tag:'Shape your event identity',art:'flag',color:'blue',needs:['Event logo','Colour & type direction','Social templates','On-ground signage'],prompt:'What needs a fresh look?',placeholder:'e.g. A new identity for our annual inter-college tournament.'},
  {id:'operations',category:'Operations',title:'Plan a smoother game day',name:'Tournament planning',description:'Work through draws, schedules and the details in between.',tag:'Get planning support',art:'bracket',color:'blue',needs:['Draw & format planning','Match schedule','Court allocation','Event-day checklist'],prompt:'Where do you need a hand?',placeholder:'e.g. 32 doubles teams, 4 courts and one day. We need help with the schedule.'},
  {id:'registration',category:'Operations',title:'Welcome every player',name:'Registration support',description:'Make the journey from sign-up to check-in feel simple.',tag:'Prepare your player flow',art:'check',color:'blue',needs:['Registration setup','Eligibility & categories','Player communication','Check-in planning'],prompt:'Which part can we help with?',placeholder:'e.g. Two age categories and a simple check-in process for 100 players.'},
  {id:'partners',category:'Partners',title:'Find the missing pieces',name:'Venue & partner assistance',description:'Tell us what you need to bring your event together.',tag:'Explore possible support',art:'pin',color:'blue',needs:['Venue requirements','Equipment requirements','Officials & event staff','Specialist support'],prompt:'What are you looking for?',placeholder:'e.g. Two indoor courts near Andheri, plus officials for a Sunday event.'},
  {id:'sponsors',category:'Partners',title:'Build a stronger proposal',name:'Sponsorship planning',description:'Put your event story and partnership needs into a clear brief.',tag:'Prepare for partnerships',art:'handshake',color:'blue',needs:['Sponsorship proposal','Partnership packages','Audience & event story','Sponsor requirements'],prompt:'What would help you get started?',placeholder:'e.g. A sponsorship deck for a community league with 12 teams.'}
];
export const ORGANIZER_SERVICES = SERVICE_DETAILS.map(s=>[s.id,s.category,s.name,s.description]);
export function filterServices(query='',category='All') {
  const q=query.trim().toLowerCase();
  return SERVICE_DETAILS.filter(s=>(category==='All'||category===s.category)&&(!q||[s.name,s.title,s.description,...s.needs].join(' ').toLowerCase().includes(q)));
}
export function selectedServiceNeeds(service,needs=[]) {
  const item=SERVICE_DETAILS.find(s=>s.id===service);
  return item ? item.needs.filter(n=>Array.isArray(needs)&&needs.includes(n)) : [];
}
export function serviceRequestMessage({service,event,deadline,budget,brief,needs=[]}) {
  const item=SERVICE_DETAILS.find(s=>s.id===service);
  if(!item)throw Error('Choose a service.');
  const selected=selectedServiceNeeds(service,needs),notes=String(brief||'').trim();
  if(!selected.length&&notes.length<15)throw Error('Choose what you need or describe it in at least 15 characters.');
  const bounded=value=>String(value||'').trim().slice(0,160);
  return `[Mercury service request]\nService: ${item.name}\nEvent: ${bounded(event)||'Not selected'}\nNeeded by: ${bounded(deadline)||'Flexible'}\nBudget: ${bounded(budget)||'To discuss'}\nNeeds: ${selected.join(', ')||'See brief'}\n\n${notes.slice(0,1100)||'Please help us scope the selected requirements.'}`.slice(0,2000);
}
function art(kind) {
  const paths={ticket:'<path d="M25 40h110v20a15 15 0 0 0 0 30v20H25V90a15 15 0 0 0 0-30Z"/><path d="M100 42v12m0 10v12m0 10v12m0 9v4"/>',megaphone:'<path d="m28 67 95-35v86L28 85Zm22 29 7 28h22L68 91m67-36 15-9m-15 29h18m-18 21 15 9"/>',poster:'<rect x="38" y="20" width="85" height="112" rx="5"/><path d="M53 43h54M53 54h32m-32 53h54m-54 12h35"/><path d="m56 88 18-23 12 16 13-12 13 22Z"/>',flag:'<path d="M45 134V24m0 6c35-24 40 26 82 0v63c-42 26-47-24-82 0"/>',bracket:'<path d="M24 33h35v34h38v34h38M24 100h35V67m38 34v31H24m0-16v17m111-52v40"/><circle cx="135" cy="55" r="16"/>',check:'<rect x="35" y="22" width="90" height="112" rx="8"/><path d="m50 60 9 9 18-22m-27 51 9 9 18-22m13-25h22m-22 38h22"/>',pin:'<path d="M80 135s-44-44-44-76a44 44 0 0 1 88 0c0 32-44 76-44 76Z"/><circle cx="80" cy="59" r="16"/>',handshake:'<path d="m20 62 23-28 28 8 20-8 48 42-21 34-25 15-42-25Zm51-20L53 64l14 12 19-16 32 29m-25 36-28-26m40 14-28-27m-26 14L20 80Z"/>'};
  return `<svg viewBox="0 0 160 150" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind]}</svg>`;
}
function card(s) {
  const inside=`<span class="os-art blue">${art(s.art)}</span><span class="os-card-body"><strong>${E(s.name)}</strong><span class="os-card-description">${E(s.description)}</span><span class="os-card-tag">Explore service <span aria-hidden="true">↗</span></span></span>`;
  return s.id==='listing'?`<a class="os-service-card" href="/list-event">${inside}</a>`:`<button class="os-service-card" type="button" data-service="${s.id}" aria-haspopup="dialog">${inside}</button>`;
}
export function servicesView() {
  return `<section class="os-hero"><div><p class="ow-eyebrow">MERCURY / SERVICES</p><h1>Run better sporting events.</h1><p>Find creative, planning and event support in one place.</p><label class="os-search"><span class="os-sr">Find a service</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input id="os-search" type="search" placeholder="Try posters, venues or check-in" autocomplete="off"></label></div></section>
  <div class="os-browse-header"><div><p class="ow-eyebrow">SERVICES</p><h2>Find the right support.</h2></div><a class="ow-btn" href="/host/requests">My requests</a></div>
  <div class="os-categories" role="group" aria-label="Service category">${[['All','Everything'],['Discovery','Reach players'],['Creative','Look the part'],['Operations','Run the day'],['Partners','Find support']].map(([id,label])=>`<button type="button" data-service-filter="${id}" aria-pressed="${id==='All'}">${label}</button>`).join('')}</div>
  <p id="os-results-count" class="os-sr" role="status" aria-live="polite"></p><div id="os-results" class="os-grid">${SERVICE_DETAILS.map(card).join('')}</div>
  <section class="os-diy"><div><span class="ow-eyebrow">READY WHEN YOU ARE</span><h2>Need a poster right now?</h2><p>Start with your event details. Pick a style. Download your PNG.</p></div><a class="ow-btn dark" href="/host/events?intent=creative">Open poster maker</a></section>
  <section class="os-how" aria-label="How service requests work"><div><b>01 / Pick your support</b><p>Choose a service and tell us what you have in mind.</p></div><div><b>02 / We review your brief</b><p>The team confirms availability, scope and any quote.</p></div><div><b>03 / Take the next step</b><p>Track the request in My requests. Agree the details before work begins.</p></div></section>
  <dialog class="os-dialog" id="os-request-dialog" aria-labelledby="os-dialog-title"></dialog>`;
}
export function bindServices(root,{events,session,api,go,toast}) {
  const dialog=root.querySelector('#os-request-dialog'),search=root.querySelector('#os-search'),results=root.querySelector('#os-results');
  const params=new URLSearchParams(location.search),drafts=new Map();
  let category='All',service=null,draft=null,step=0,busy=false,opener=null;
  const focusTitle=()=>{dialog.querySelector('#os-step-title')?.focus();dialog.querySelector('.os-dialog-scroll')?.scrollTo(0,0);};
  const capture=()=>{const form=dialog.querySelector('form');if(!form||!draft)return;for(const key of ['brief','event','deadline','budget','name','email']){const field=form.elements.namedItem(key);if(field)draft[key]=field.value;}if(step===0)draft.needs=[...form.querySelectorAll('[name=needs]:checked')].map(x=>x.value);const consent=form.elements.namedItem('consent');if(consent)draft.consent=consent.checked;};
  const paint=()=>{const items=filterServices(search.value,category);results.innerHTML=items.length?items.map(card).join(''):`<div class="os-no-results"><h3>No matches yet.</h3><p>Try a broader search or browse all services.</p><button type="button" class="ow-btn" id="os-reset">Clear filters</button></div>`;root.querySelector('#os-results-count').textContent=items.length+' services found';root.querySelectorAll('[data-service-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.serviceFilter===category)));const reset=root.querySelector('#os-reset');if(reset)reset.onclick=()=>{category='All';search.value='';paint();search.focus();};results.querySelectorAll('[data-service]').forEach(b=>b.onclick=()=>open(b.dataset.service,b));};
  function render() {
    const chosen=events.find(e=>e.id===draft.event),title=['What can we help you make happen?','A few details. Then you’re set.','Everything look good?'][step];
    const summaryRows=[['Service',service.name],['You need',draft.needs.join(', ')||'Custom brief'],['Event',chosen?.title||'Not linked to an event'],['Needed by',draft.deadline||'Flexible'],['Budget',draft.budget||'To discuss'],['Reply to',draft.name+' · '+draft.email]];
    const formBody=step===0?`<p class="os-step-intro">${E(service.description)}</p><fieldset class="os-needs"><legend>${E(service.prompt)}</legend><p>Pick any that apply, or tell us in your own words below.</p><div>${service.needs.map(n=>`<label><input type="checkbox" name="needs" value="${E(n)}" ${draft.needs.includes(n)?'checked':''}><span>${E(n)}</span></label>`).join('')}</div></fieldset><label class="os-field">Anything else we should know?<textarea name="brief" maxlength="1100" rows="3" placeholder="${E(service.placeholder)}">${E(draft.brief)}</textarea></label>${service.id==='poster'?'<p class="os-shortcut">Prefer to make it yourself? <a href="/host/events?intent=creative">Open the poster maker ↗</a></p>':''}`:
      step===1?`<div class="os-details-grid"><label class="os-field os-wide">Which event is this for?<select name="event"><option value="">A new idea / not linked yet</option>${events.map(e=>`<option value="${E(e.id)}" ${draft.event===e.id?'selected':''}>${E(e.title)}</option>`).join('')}</select></label><label class="os-field">Needed by <span class="os-optional">Optional</span><input type="date" name="deadline" value="${E(draft.deadline)}"></label><label class="os-field">Budget <span class="os-optional">Optional</span><select name="budget">${['','Under ₹5,000','₹5,000–₹15,000','₹15,000–₹50,000','₹50,000+'].map(v=>`<option value="${E(v)}" ${draft.budget===v?'selected':''}>${E(v||'Let’s discuss')}</option>`).join('')}</select></label><label class="os-field">Your name<input name="name" autocomplete="name" value="${E(draft.name)}" minlength="2" maxlength="80" required></label><label class="os-field">Reply email<input type="email" name="email" autocomplete="email" value="${E(draft.email)}" maxlength="254" required></label></div><p class="os-step-intro">No event yet? That’s fine. We can help you work through an idea.</p>`:
      `<dl class="os-review">${summaryRows.map(([k,v])=>`<div><dt>${k}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>${draft.brief?`<div class="os-review-notes"><b>Your brief</b><p>${E(draft.brief)}</p></div>`:''}<label class="os-consent"><input type="checkbox" name="consent" required ${draft.consent?'checked':''}><span>I agree Mercury may contact me about this request. <a href="/privacy" target="_blank" rel="noopener">Privacy notice ↗</a></span></label><p class="os-fine">This is an enquiry, not a booking. Any availability, scope and fees will be agreed before work begins. Track updates in My requests.</p>`;
    dialog.innerHTML=`<div class="os-dialog-header"><div><span class="ow-eyebrow">${E(service.category)} / MERCURY SERVICES</span><h2 id="os-dialog-title">${E(service.name)}</h2></div><button type="button" class="os-close" aria-label="Close request">×</button></div><ol class="os-progress" aria-label="Request progress">${['Your brief','Details','Review'].map((label,i)=>`<li ${i===step?'aria-current="step"':''} class="${i<=step?'reached':''}"><span>${i<step?'✓':i+1}</span>${label}</li>`).join('')}</ol><form id="ow-service-form"><input type="hidden" name="service" value="${service.id}"><div class="os-dialog-scroll"><p class="os-step-count">STEP ${step+1} OF 3</p><h3 id="os-step-title" tabindex="-1">${title}</h3>${formBody}<p class="os-error" role="alert" tabindex="-1"></p></div><div class="os-dialog-bottom">${step?'<button type="button" class="ow-btn" id="os-back">← Back</button>':'<span class="os-fine">Made for your event.</span>'}<button type="submit" class="ow-btn primary">${step===2?'Send request ↗':step===1?'Review request →':'Continue →'}</button></div></form>`;
    dialog.querySelector('.os-close').onclick=()=>{if(!busy){capture();dialog.close();}};
    const back=dialog.querySelector('#os-back');if(back)back.onclick=()=>{capture();step--;render();focusTitle();};
    dialog.querySelector('form').oninput=()=>{dialog.querySelector('[role=alert]').textContent='';};
    dialog.querySelector('form').onsubmit=async ev=>{
      ev.preventDefault();if(busy)return;capture();const form=ev.currentTarget,alert=dialog.querySelector('[role=alert]');alert.textContent='';
      try {
        if(step===0){serviceRequestMessage({...draft,service:service.id});step=1;render();focusTitle();return;}
        if(!form.reportValidity())return;
        if(step===1){step=2;render();focusTitle();return;}
        const selected=events.find(e=>e.id===draft.event),message=serviceRequestMessage({...draft,service:service.id,event:selected?selected.title+' ('+selected.id+')':''});
        if(!draft.consent)throw Error('Please confirm we can contact you about this request.');
        busy=true;form.setAttribute('aria-busy','true');dialog.querySelectorAll('button').forEach(b=>b.disabled=true);form.querySelector('[type=submit]').textContent='Sending…';
        const result=await api('support',{name:draft.name.trim(),email:draft.email.trim(),category:'Organizer enquiry',message,consent:true});
        drafts.delete(service.id);dialog.close();toast('Request sent. Reference: '+result.id);go('/host/requests');
      }catch(error){if(error.name!=='AbortError'){alert.textContent=error.message;alert.focus();}}
      finally{if(busy){busy=false;form.removeAttribute('aria-busy');dialog.querySelectorAll('button').forEach(b=>b.disabled=false);const button=form.querySelector('[type=submit]');if(button)button.textContent='Send request ↗';}}
    };
  }
  function open(id,trigger) {
    service=SERVICE_DETAILS.find(s=>s.id===id&&s.id!=='listing');if(!service)return;
    opener=trigger||null;step=0;
    if(!drafts.has(id))drafts.set(id,{needs:[],brief:'',event:events.some(e=>e.id===params.get('event'))?params.get('event'):'',deadline:'',budget:'',name:session.organizer?.name||session.user?.name||'',email:session.user?.email||'',consent:false});
    draft=drafts.get(id);render();dialog.showModal();focusTitle();
  }
  dialog.addEventListener('cancel',ev=>{if(busy)ev.preventDefault();else capture();});
  dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus();});
  search.oninput=paint;root.querySelectorAll('[data-service-filter]').forEach(b=>b.onclick=()=>{category=b.dataset.serviceFilter;paint();});paint();
  if(params.get('service'))open(params.get('service'),null);
}
