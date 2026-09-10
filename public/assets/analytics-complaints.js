const q=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?String(value??''):new Intl.DateTimeFormat('uz-UZ',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tashkent'}).format(d)};
const dayKey=value=>{const d=value instanceof Date?value:new Date(value);if(Number.isNaN(d.getTime()))return'';return new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Tashkent'}).format(d)};
let loading=false;

function currentDistrict(){
  const select=q('#districtFilter');
  const value=select?.value||new URLSearchParams(location.search).get('hudud')||'';
  return value&&value!=='all'?value:'';
}
function complaintStats(rows){
  const now=Date.now(),today=dayKey(new Date());
  const valid=rows.map(x=>({...x,_time:new Date(x.created_at).getTime()})).filter(x=>Number.isFinite(x._time));
  return{
    total:rows.length,
    today:valid.filter(x=>dayKey(x.created_at)===today).length,
    week:valid.filter(x=>now-x._time<=7*86400000).length,
    month:valid.filter(x=>now-x._time<=30*86400000).length,
    one:rows.filter(x=>Number(x.rating)===1).length,
    two:rows.filter(x=>Number(x.rating)===2).length,
    three:rows.filter(x=>Number(x.rating)===3).length,
    latest:valid.length?fmt(valid.sort((a,b)=>b._time-a._time)[0].created_at):'—'
  };
}
function renderSummary(rows){
  const s=complaintStats(rows);let host=q('#complaintSummary');
  if(!host){host=document.createElement('div');host.id='complaintSummary';host.className='complaint-summary';q('#complaintsBody')?.insertAdjacentElement('beforebegin',host)}
  host.innerHTML=`<article><span>Jami murojaatlar</span><strong>${s.total}</strong><small>Tanlangan hudud bo‘yicha</small></article><article><span>Bugun</span><strong>${s.today}</strong><small>Bugungi murojaatlar</small></article><article><span>Oxirgi 7 kun</span><strong>${s.week}</strong><small>Haftalik murojaatlar</small></article><article><span>Oxirgi 30 kun</span><strong>${s.month}</strong><small>Oylik murojaatlar</small></article><article class="rating-split"><span>Baho bo‘yicha</span><strong><i>1★ ${s.one}</i><i>2★ ${s.two}</i><i>3★ ${s.three}</i></strong><small>Shikoyatlar taqsimoti</small></article><article class="latest"><span>Oxirgi murojaat</span><strong>${esc(s.latest)}</strong><small>Murojaat sanasi va vaqti</small></article>`;
}

async function loadComplaints(){
  if(loading)return;
  const panel=q('#complaintsPanel'), body=q('#complaintsBody'), title=q('#complaintsTitle');
  if(!panel||!body)return;
  loading=true;
  panel.classList.remove('hidden');
  body.innerHTML='<div class="complaints-loading">Murojaatlar yuklanmoqda...</div>';
  const district=currentDistrict();
  if(title)title.textContent=district?`${district} — murojaatlar`:'Barcha hududlar — murojaatlar';
  panel.scrollIntoView({behavior:'smooth',block:'start'});
  try{
    const url='/api/analytics/complaints'+(district?`?hudud=${encodeURIComponent(district)}`:'');
    const r=await fetch(url,{credentials:'same-origin',cache:'no-store'});
    if(r.status===401){location.href='/login';return}
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error||'Murojaatlar olinmadi.');
    const rows=j.complaints||[];
    q('#complaintsCount').textContent=`${rows.length} ta murojaat`;
    renderSummary(rows);
    if(!rows.length){body.innerHTML='<div class="complaints-empty"><b>Murojaat mavjud emas.</b><span>Tanlangan hudud bo‘yicha hozircha shikoyat yoki murojaat tushmagan.</span></div>';return}
    body.innerHTML=`<div class="table-wrap complaints-table-wrap"><table class="analytics-table complaints-table"><thead><tr><th>Murojaat sanasi</th><th>Muassasa</th><th>Shifokor</th><th>Baho</th><th>Fuqaro</th><th>Telefon</th><th>Izoh / shikoyat</th></tr></thead><tbody>${rows.map(x=>`<tr><td><time class="complaint-date" datetime="${esc(x.created_at||'')}">${esc(fmt(x.created_at))}</time></td><td><b>${esc(x.institution_name)}</b><small>${esc(x.district||'')}</small></td><td>${esc(x.doctor||'—')}</td><td><span class="complaint-stars">${'★'.repeat(Number(x.rating)||0)}</span> ${esc(x.rating)}/5</td><td>${esc(x.citizen_name||'—')}</td><td class="complaint-phone">${esc(x.citizen_phone||'—')}</td><td><div class="complaint-text" title="${esc(x.comment||'')}">${esc(x.comment||'—')}</div></td></tr>`).join('')}</tbody></table></div>`;
  }catch(e){
    const host=q('#complaintSummary');if(host)host.innerHTML='';
    body.innerHTML=`<div class="complaints-empty error"><b>Xatolik</b><span>${esc(e.message)}</span></div>`;
  }finally{loading=false}
}

document.addEventListener('click',e=>{
  const card=e.target.closest('.complaint-card');
  if(card){e.preventDefault();loadComplaints();return}
  if(e.target.closest('#closeComplaints'))q('#complaintsPanel')?.classList.add('hidden');
});

document.addEventListener('keydown',e=>{
  const card=e.target.closest?.('.complaint-card');
  if(card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();loadComplaints()}
});

const observer=new MutationObserver(()=>{
  document.querySelectorAll('.complaint-card').forEach(card=>{
    card.setAttribute('role','button');
    card.setAttribute('tabindex','0');
    card.setAttribute('title','Murojaatlarni ko‘rish');
    card.classList.add('is-clickable');
  });
});
const kpi=q('#kpiGrid');
if(kpi)observer.observe(kpi,{childList:true,subtree:true});
