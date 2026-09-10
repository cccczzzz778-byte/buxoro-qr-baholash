const $=s=>document.querySelector(s);
const districts=['Buxoro shahri','Kogon shahri','Buxoro tumani','Vobkent tumani','G‘ijduvon tumani','Jondor tumani','Kogon tumani','Olot tumani','Peshku tumani','Qorako‘l tumani','Qorovulbozor tumani','Romitan tumani','Shofirkon tumani'];
let csrf='',institutions=[],feedback=[];

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/[‘’ʻʼ`]/g,"'").replace(/\s+/g,' ').trim();
const typeOf=name=>{const n=norm(name);if(/(^|\s)oshp($|\s)|oilaviy shifokorlik punkti|shifokorlik punkti/.test(n))return'OSHP';if(/(^|\s)op($|\s)|oilaviy poliklinika|poliklinika/.test(n))return'OP';return'Boshqa'};
const canonicalDistrict=value=>{const n=norm(value);return districts.find(d=>norm(d)===n)||districts.find(d=>n.includes(norm(d).replace(/ (tumani|shahri)$/,'')))||value||'Noma’lum'};

async function api(path){const r=await fetch(path,{credentials:'same-origin',cache:'no-store'});if(r.status===401){location.href='/login';throw new Error('Kirish talab qilinadi.')}const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Ma’lumot olinmadi.');return j}

function statsFor(filterDistrict=null,filterType=null){
  const inst=institutions.filter(i=>(!filterDistrict||canonicalDistrict(i.district)===filterDistrict)&&(!filterType||typeOf(i.name)===filterType));
  const ids=new Set(inst.map(i=>i.id));
  const rows=feedback.filter(f=>ids.has(f.institution_id));
  const avg=rows.length?rows.reduce((a,b)=>a+Number(b.rating||0),0)/rows.length:null;
  return {institutions:inst.length,ratings:rows.length,avg,complaints:rows.filter(x=>x.is_complaint).length,positive:rows.filter(x=>Number(x.rating)>=4).length};
}

function fmtAvg(v){return v==null?'—':Number(v).toFixed(2)}
function pct(a,b){return b?Math.round(a/b*100):0}

function renderKpis(district=null){
  const all=statsFor(district),op=statsFor(district,'OP'),oshp=statsFor(district,'OSHP');
  $('#kpiGrid').innerHTML=`
    <article class="kpi-card"><span>Jami baholar</span><strong>${all.ratings}</strong><small>${all.institutions} ta muassasa</small></article>
    <article class="kpi-card"><span>O‘rtacha baho</span><strong>${fmtAvg(all.avg)}</strong><small>5 ballik tizim</small></article>
    <article class="kpi-card op-card"><span>OP baholari</span><strong>${op.ratings}</strong><small>O‘rtacha: ${fmtAvg(op.avg)}</small></article>
    <article class="kpi-card oshp-card"><span>OSHP baholari</span><strong>${oshp.ratings}</strong><small>O‘rtacha: ${fmtAvg(oshp.avg)}</small></article>
    <article class="kpi-card complaint-card"><span>Shikoyatlar</span><strong>${all.complaints}</strong><small>${pct(all.complaints,all.ratings)}% baholardan</small></article>`;
}

function districtRow(d){const all=statsFor(d),op=statsFor(d,'OP'),oshp=statsFor(d,'OSHP');return {d,all,op,oshp}}
function renderDistrictCards(){
  $('#districtCards').innerHTML=districts.map(d=>{const x=districtRow(d);return `<button class="district-card" data-district="${esc(d)}" type="button"><div class="district-card-top"><div><span class="district-name">${esc(d)}</span><small>${x.all.institutions} ta muassasa</small></div><strong>${fmtAvg(x.all.avg)}</strong></div><div class="split-metric"><div><span>OP</span><b>${fmtAvg(x.op.avg)}</b><small>${x.op.ratings} baho</small></div><div><span>OSHP</span><b>${fmtAvg(x.oshp.avg)}</b><small>${x.oshp.ratings} baho</small></div></div><div class="district-footer"><span>Jami: ${x.all.ratings}</span><span>Shikoyat: ${x.all.complaints}</span></div></button>`}).join('');
}

function renderTypeCards(d){
  const op=statsFor(d,'OP'),oshp=statsFor(d,'OSHP');
  $('#typeCards').innerHTML=`<article class="type-card op-card"><span>Oilaviy poliklinikalar (OP)</span><strong>${fmtAvg(op.avg)}</strong><div><b>${op.ratings}</b> ta baho • <b>${op.institutions}</b> ta muassasa • <b>${op.complaints}</b> shikoyat</div></article><article class="type-card oshp-card"><span>Oilaviy shifokorlik punktlari (OSHP)</span><strong>${fmtAvg(oshp.avg)}</strong><div><b>${oshp.ratings}</b> ta baho • <b>${oshp.institutions}</b> ta muassasa • <b>${oshp.complaints}</b> shikoyat</div></article>`;
}

function renderInstitutionTable(d){
  const rows=institutions.filter(i=>canonicalDistrict(i.district)===d&&['OP','OSHP'].includes(typeOf(i.name))).map(i=>{const f=feedback.filter(x=>x.institution_id===i.id);const avg=f.length?f.reduce((a,b)=>a+Number(b.rating||0),0)/f.length:null;return {i,type:typeOf(i.name),count:f.length,avg,complaints:f.filter(x=>x.is_complaint).length}}).sort((a,b)=>(b.avg??-1)-(a.avg??-1));
  $('#detailCount').textContent=`${rows.length} ta muassasa`;
  $('#institutionTable').innerHTML=rows.length?`<table class="analytics-table"><thead><tr><th>Muassasa</th><th>Turi</th><th>Baholar</th><th>O‘rtacha</th><th>Shikoyat</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.i.name)}</td><td><span class="type-badge ${x.type.toLowerCase()}">${x.type}</span></td><td>${x.count}</td><td><b>${fmtAvg(x.avg)}</b></td><td>${x.complaints}</td></tr>`).join('')}</tbody></table>`:'<div class="empty-state">Bu hududda OP yoki OSHP muassasalari hali qo‘shilmagan.</div>';
}

function renderRanking(){
  const rows=districts.map(d=>districtRow(d)).sort((a,b)=>(b.all.avg??-1)-(a.all.avg??-1));
  $('#rankingTable').innerHTML=`<table class="analytics-table ranking"><thead><tr><th>#</th><th>Hudud</th><th>OP</th><th>OSHP</th><th>Jami baho</th><th>O‘rtacha</th><th>Shikoyat</th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td>${i+1}</td><td><button class="table-link" data-district="${esc(x.d)}">${esc(x.d)}</button></td><td>${fmtAvg(x.op.avg)}</td><td>${fmtAvg(x.oshp.avg)}</td><td>${x.all.ratings}</td><td><b>${fmtAvg(x.all.avg)}</b></td><td>${x.all.complaints}</td></tr>`).join('')}</tbody></table>`;
}

function setView(district){
  const all=!district||district==='all';
  $('#managementSection').classList.toggle('hidden',!all);
  $('#districtSection').classList.toggle('hidden',all);
  $('#districtFilter').value=all?'all':district;
  renderKpis(all?null:district);
  if(!all){$('#districtTitle').textContent=district;renderTypeCards(district);renderInstitutionTable(district)}
  const u=new URL(location.href);if(all)u.searchParams.delete('hudud');else u.searchParams.set('hudud',district);history.replaceState(null,'',u);
}

async function load(){
  try{
    const s=await api('/api/auth/session');csrf=s.csrf;
    const [a,b]=await Promise.all([api('/api/admin/institutions'),api('/api/admin/feedback')]);institutions=a.institutions||[];feedback=b.feedback||[];
    $('#districtFilter').innerHTML='<option value="all">Boshqarma — barcha 13 hudud</option>'+districts.map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join('');
    renderDistrictCards();renderRanking();
    const requested=new URLSearchParams(location.search).get('hudud');setView(districts.includes(requested)?requested:'all');
  }catch(e){document.body.insertAdjacentHTML('afterbegin',`<div class="analytics-error">${esc(e.message)}</div>`)}
}

$('#districtFilter').addEventListener('change',e=>setView(e.target.value));
$('#districtCards').addEventListener('click',e=>{const b=e.target.closest('[data-district]');if(b)setView(b.dataset.district)});
$('#rankingTable').addEventListener('click',e=>{const b=e.target.closest('[data-district]');if(b)setView(b.dataset.district)});
$('#backAll').addEventListener('click',()=>setView('all'));
load();
