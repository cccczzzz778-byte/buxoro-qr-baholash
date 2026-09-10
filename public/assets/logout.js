const host=document.querySelector('.admin-top-actions');

const style=document.createElement('style');
style.textContent=`
.topbar .topbar-inner{
  width:min(1320px,calc(100% - 28px));
  margin-inline:auto;
  min-height:72px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:18px;
}
.topbar .brand{flex:0 1 auto;min-width:0}
.topbar .admin-top-actions{
  display:flex!important;
  align-items:center!important;
  justify-content:flex-end!important;
  gap:7px!important;
  flex-wrap:nowrap!important;
  min-width:0;
}
.topbar .admin-top-actions .pro-user-chip{
  min-height:38px!important;
  height:38px;
  padding:0 12px!important;
  border-radius:11px!important;
  background:rgba(5,30,54,.62)!important;
  border:1px solid rgba(90,176,244,.22)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04)!important;
  color:#b8d8f5!important;
  font-size:12px!important;
  white-space:nowrap;
}
.topbar .admin-top-actions .admin-link{
  min-height:38px!important;
  height:38px!important;
  padding:0 14px!important;
  border-radius:11px!important;
  border:1px solid rgba(72,157,229,.34)!important;
  background:linear-gradient(180deg,rgba(14,77,130,.82),rgba(7,48,86,.88))!important;
  color:#eaf6ff!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 6px 16px rgba(0,20,45,.18)!important;
  font-size:12px!important;
  font-weight:800!important;
  line-height:1!important;
  white-space:nowrap;
  cursor:pointer;
}
.topbar .admin-top-actions .admin-link:hover{
  transform:translateY(-1px);
  border-color:rgba(94,189,255,.58)!important;
  background:linear-gradient(180deg,rgba(18,92,154,.92),rgba(8,58,103,.94))!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.09),0 9px 20px rgba(0,24,55,.24)!important;
}
.topbar .admin-top-actions #logoutBtn{
  border-color:rgba(255,104,126,.36)!important;
  background:linear-gradient(180deg,rgba(112,27,43,.72),rgba(73,17,30,.82))!important;
  color:#ffdce2!important;
  min-width:88px;
}
.topbar .admin-top-actions #logoutBtn:hover{
  border-color:rgba(255,114,137,.58)!important;
  background:linear-gradient(180deg,rgba(135,32,51,.82),rgba(86,19,34,.9))!important;
}

/* Admin KPI kartalarining barchasi ishlaydi */
#adminKpis .pro-kpi.pro-kpi-action{
  position:relative;
  cursor:pointer;
  user-select:none;
  padding-bottom:27px!important;
  transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,filter .18s ease;
}
#adminKpis .pro-kpi.pro-kpi-action:hover,
#adminKpis .pro-kpi.pro-kpi-action:focus-visible{
  transform:translateY(-3px);
  border-color:rgba(98,188,255,.58)!important;
  box-shadow:0 18px 42px rgba(0,15,42,.34),0 0 24px rgba(43,151,255,.10)!important;
  filter:brightness(1.06);
  outline:none;
}
#adminKpis .pro-kpi.pro-kpi-action::after{
  content:'BOSIB KO‘RING';
  position:absolute;
  right:12px;
  bottom:8px;
  font-size:8px;
  line-height:1;
  font-weight:900;
  letter-spacing:.055em;
  color:#7fb7e4;
  opacity:.84;
}
#adminKpis .pro-kpi.pro-kpi-action.is-danger::after{color:#ff93a5}

/* Ma'lumotlar sahifani haddan tashqari uzaytirmaydi */
#instList .institution-admin-grid,
#districtUserList .district-user-grid,
#feedbackList .table-wrap,
#institutionTable.table-wrap,
#rankingTable.table-wrap,
#districtOwnList .district-own-grid,
#complaintsBody .table-wrap{
  scrollbar-width:thin;
  scrollbar-color:rgba(77,157,224,.45) rgba(3,19,34,.25);
}
#instList .institution-admin-grid{max-height:590px;overflow:auto;padding-right:5px}
#districtUserList .district-user-grid{max-height:450px;overflow:auto;padding-right:5px}
#feedbackList .table-wrap{max-height:560px;overflow:auto}
#institutionTable.table-wrap{max-height:500px;overflow:auto}
#rankingTable.table-wrap{max-height:520px;overflow:auto}
#districtOwnList .district-own-grid{max-height:520px;overflow:auto;padding-right:5px}
#complaintsBody .table-wrap{max-height:520px;overflow:auto}

#feedbackList table thead,
#institutionTable table thead,
#rankingTable table thead,
#complaintsBody table thead{position:sticky;top:0;z-index:5}

.institution-card-copy{min-width:0}
.institution-card-copy h3{
  display:-webkit-box;
  -webkit-box-orient:vertical;
  -webkit-line-clamp:2;
  overflow:hidden;
  line-height:1.28;
}
.institution-card-copy p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.institution-meta{max-width:100%;overflow:hidden}
.institution-meta span{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#feedbackList td{max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#feedbackList td .pro-comment{max-width:270px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.analytics-table td:first-child{max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.district-own-card h3{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
.district-own-meta{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}

.ui-focus-pulse{animation:uiFocusPulse .75s ease}
@keyframes uiFocusPulse{
  0%{box-shadow:0 0 0 0 rgba(43,151,255,.38)}
  100%{box-shadow:0 0 0 15px rgba(43,151,255,0)}
}

@media(max-width:900px){
  .topbar .topbar-inner{width:calc(100% - 18px);gap:10px}
  .topbar .brand-title{max-width:210px}
  .topbar .admin-top-actions{overflow-x:auto;max-width:66vw;padding:3px 0;scrollbar-width:none}
  .topbar .admin-top-actions::-webkit-scrollbar{display:none}
  .topbar .admin-top-actions .admin-link{height:36px!important;min-height:36px!important;padding:0 11px!important;font-size:11px!important}
  .topbar .admin-top-actions .pro-user-chip{height:36px;min-height:36px!important;font-size:11px!important}
  #instList .institution-admin-grid{max-height:64vh}
  #feedbackList .table-wrap,#institutionTable.table-wrap,#complaintsBody .table-wrap{max-height:58vh}
}
@media(max-width:620px){
  .topbar .topbar-inner{align-items:center;min-height:64px}
  .topbar .brand-kicker{font-size:8px!important}
  .topbar .brand-title{font-size:12px!important;max-width:120px}
  .topbar .admin-top-actions{max-width:58vw;gap:5px!important}
  .topbar .admin-top-actions .pro-user-chip{display:none!important}
  .topbar .admin-top-actions .admin-link{padding:0 9px!important;font-size:10px!important;border-radius:9px!important}
  .topbar .admin-top-actions #logoutBtn{min-width:64px}
  #adminKpis .pro-kpi.pro-kpi-action{padding-bottom:24px!important}
  #adminKpis .pro-kpi.pro-kpi-action::after{font-size:7px;right:9px;bottom:7px}
  .institution-admin-card{min-height:0!important}
  .institution-card-copy h3{-webkit-line-clamp:1}
  .institution-actions{gap:6px!important}
  .institution-actions .btn{font-size:10px!important;padding:8px 9px!important;min-height:34px!important}
  #districtUserList .district-user-grid{max-height:50vh}
  #rankingTable.table-wrap{max-height:55vh}
}
`;
document.head.appendChild(style);

function pulseAndScroll(target){
  if(!target)return;
  target.classList.remove('ui-focus-pulse');
  void target.offsetWidth;
  target.classList.add('ui-focus-pulse');
  target.scrollIntoView({behavior:'smooth',block:'start'});
  setTimeout(()=>target.classList.remove('ui-focus-pulse'),900);
}
function setSelect(selector,value){
  const el=document.querySelector(selector);
  if(!el)return;
  el.value=value;
  el.dispatchEvent(new Event('change',{bubbles:true}));
}
function clearSearch(selector){
  const el=document.querySelector(selector);
  if(!el)return;
  el.value='';
  el.dispatchEvent(new Event('input',{bubbles:true}));
}
function openAdminSection(index){
  if(index===0){
    clearSearch('#instSearch');
    setSelect('#instFilterDistrict','all');
    setSelect('#instFilterStatus','all');
    pulseAndScroll(document.querySelector('#instList')?.closest('.panel'));
    return;
  }
  if(index===1){
    clearSearch('#feedbackSearch');
    setSelect('#feedbackType','all');
    setSelect('#feedbackRating','all');
    pulseAndScroll(document.querySelector('#feedbackList')?.closest('.panel'));
    return;
  }
  if(index===2){
    clearSearch('#feedbackSearch');
    setSelect('#feedbackType','complaint');
    setSelect('#feedbackRating','all');
    pulseAndScroll(document.querySelector('#feedbackList')?.closest('.panel'));
    return;
  }
  if(index===3){
    clearSearch('#instSearch');
    setSelect('#instFilterDistrict','all');
    setSelect('#instFilterStatus','active');
    pulseAndScroll(document.querySelector('#instList')?.closest('.panel'));
    return;
  }
  if(index===4){
    pulseAndScroll(document.querySelector('.district-access-panel'));
  }
}
function markAdminKpis(){
  const root=document.querySelector('#adminKpis');
  if(!root)return;
  const titles=['Muassasalarni ko‘rish','Barcha baholarni ko‘rish','Shikoyatlarni ko‘rish','Faol QR muassasalarni ko‘rish','Hudud loginlarini ko‘rish'];
  [...root.querySelectorAll('.pro-kpi')].forEach((card,index)=>{
    if(card.classList.contains('pro-skeleton'))return;
    card.classList.add('pro-kpi-action');
    card.dataset.kpiIndex=String(index);
    card.setAttribute('role','button');
    card.setAttribute('tabindex','0');
    card.setAttribute('aria-label',titles[index]||'Batafsil ko‘rish');
    card.title=titles[index]||'Batafsil ko‘rish';
  });
}
const kpiHost=document.querySelector('#adminKpis');
if(kpiHost){
  markAdminKpis();
  new MutationObserver(markAdminKpis).observe(kpiHost,{childList:true,subtree:true});
  kpiHost.addEventListener('click',event=>{
    const card=event.target.closest('.pro-kpi-action');
    if(card)openAdminSection(Number(card.dataset.kpiIndex));
  });
  kpiHost.addEventListener('keydown',event=>{
    const card=event.target.closest('.pro-kpi-action');
    if(card&&(event.key==='Enter'||event.key===' ')){
      event.preventDefault();
      openAdminSection(Number(card.dataset.kpiIndex));
    }
  });
}

if(host&&!document.querySelector('#logoutBtn')){
  const button=document.createElement('button');
  button.id='logoutBtn';
  button.type='button';
  button.className='admin-link';
  button.textContent='Chiqish';
  button.setAttribute('aria-label','Tizimdan chiqish');
  button.addEventListener('click',async()=>{
    if(button.disabled)return;
    button.disabled=true;
    const old=button.textContent;
    button.textContent='Chiqilmoqda...';
    try{
      await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:'{}'});
    }catch{}
    sessionStorage.clear();
    localStorage.removeItem('csrf');
    location.replace('/login');
    setTimeout(()=>{button.disabled=false;button.textContent=old},3000);
  });
  host.appendChild(button);
}
