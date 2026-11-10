const required = ['id','title','sport','type','area','date','endDate','timeNote','venue','host','eligibility','level','priceLabel','priceNote','description','deadlineLabel','sourceName','sourceUrl','registrationUrl','registrationNote','checkedOn'];
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
export function validateCatalogue(input, today = new Date().toISOString().slice(0,10)) {
  const errors=[];
  if (!Array.isArray(input) || !input.length || input.length > 2000) return {valid:false,errors:['Provide an array of 1–2,000 reviewed event records.']};
  const ids=new Set();
  for(const [i,e] of input.entries()) {
    const prefix=`Record ${i+1}`;
    if(!e || typeof e !== 'object' || Array.isArray(e)) { errors.push(`${prefix}: expected an object.`);continue; }
    for(const k of required) if(typeof e[k] !== 'string' || !e[k].trim() || e[k].length>2500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(e[k])) errors.push(`${prefix}: invalid or missing ${k}.`);
    if(typeof e.id !== 'string' || !/^[a-z0-9][a-z0-9-]{2,99}$/.test(e.id) || ids.has(e.id)) errors.push(`${prefix}: id must be a unique slug.`);
    ids.add(e.id);
    if(typeof e.sport !== 'string' || !/^[A-Za-z][A-Za-z &-]{2,40}$/.test(e.sport)) errors.push(`${prefix}: sport must be a plain-language sport name.`);
    if(!['Tournament','League','Training camp','Social play','Race'].includes(e.type)) errors.push(`${prefix}: unsupported event type.`);
    for(const k of ['date','endDate','checkedOn']) if(!day(e[k])) errors.push(`${prefix}: ${k} must be a real YYYY-MM-DD date.`);
    if(e.date>e.endDate) errors.push(`${prefix}: endDate is before date.`);
    if(e.checkedOn>today) errors.push(`${prefix}: source check date cannot be in the future.`);
    if(e.deadline !== null && !(day(e.deadline) || (typeof e.deadline==='string' && /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d\+05:30$/.test(e.deadline) && day(e.deadline.slice(0,10))))) errors.push(`${prefix}: deadline must be null, a date, or an exact IST timestamp.`);
    for(const k of ['sourceUrl','registrationUrl']) {
      try { const u=new URL(e[k]); if(u.protocol!=='https:' || u.username || u.password || u.hostname==='localhost' || !u.hostname.includes('.') || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname)) throw Error(); }
      catch { errors.push(`${prefix}: ${k} must be a public HTTPS URL without credentials.`); }
    }
  }
  return {valid:errors.length===0,errors};
}
