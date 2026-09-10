const q=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?String(value??''):new Intl.DateTimeFormat('uz-UZ',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Tashkent'}).format(d)};
let loading=false;

function currentDistrict(){
  const select=q('#districtFilter');
  const value=select?.value||new URLSearchParams(location.search).get('hudud')||'';
  return value&&value!=='all'?value:'';
}

async function loadComplaints(){
  if(loading)return;
  const panel=q('#complaintsPanel'), body=q('#complaintsBody'), title=q('#complaintsTitle');
  if(!panel||!body)return;
  loading=true;
  panel.classList.remove('hidden');
  body.innerHTML='<div class="complaints-loading">Shikoyatlar yuklanmoqda...</div>';
  const district=currentDistrict();
  if(title)title.textContent=district?`${district} — shikoyatlar`:'Barcha hududlar — shikoyatlar';
  panel.scrollIntoView({behavior:'smooth',block:'start'});
  try{
    const url='/api/analytics/complaints'+(district?`?hudud=${encodeURIComponent(district)}`:'');
    const r=await fetch(url,{credentials:'same-origin',cache:'no-store'});
    if(r.status===401){location.href='/login';return}
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error||'Shikoyatlar olinmadi.');
    const rows=j.complaints||[];
    q('#complaintsCount').textContent=`${rows.length} ta shikoyat`;
    if(!rows.length){body.innerHTML='<div class="complaints-empty"><b>Shikoyat mavjud emas.</b><span>Tanlangan hudud bo‘yicha hozircha shikoyat tushmagan.</span></div>';return}
    body.innerHTML=`<div class="table-wrap"><table class="analytics-table complaints-table"><thead><tr><th>Sana</th><th>Muassasa</th><th>Shifokor</th><th>Baho</th><th>Fuqaro</th><th>Telefon</th><th>Shikoyat matni</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(fmt(x.created_at))}</td><td><b>${esc(x.institution_name)}</b><small>${esc(x.district||'')}</small></td><td>${esc(x.doctor||'—')}</td><td><span class="complaint-stars">${'★'.repeat(Number(x.rating)||0)}</span> ${esc(x.rating)}/5</td><td>${esc(x.citizen_name||'—')}</td><td>${esc(x.citizen_phone||'—')}</td><td><div class="complaint-text">${esc(x.comment||'—')}</div></td></tr>`).join('')}</tbody></table></div>`;
  }catch(e){
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
    card.setAttribute('title','Shikoyatlarni ko‘rish');
    card.classList.add('is-clickable');
  });
});
const kpi=q('#kpiGrid');
if(kpi)observer.observe(kpi,{childList:true,subtree:true});
