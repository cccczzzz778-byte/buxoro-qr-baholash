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
.pro-kpi.pro-kpi-action{
  cursor:pointer;
  transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,filter .18s ease;
}
.pro-kpi.pro-kpi-action:hover{
  transform:translateY(-3px);
  border-color:rgba(255,106,132,.62)!important;
  box-shadow:0 20px 48px rgba(0,8,24,.35),0 0 26px rgba(255,80,115,.12)!important;
  filter:brightness(1.05);
}
.pro-kpi.pro-kpi-action:focus-visible{
  outline:3px solid rgba(255,105,132,.35);
  outline-offset:3px;
}
.pro-kpi.pro-kpi-action small::after{
  content:' • Bosib ko‘ring';
  color:#ff9daf;
  font-weight:800;
}
.feedback-focus-pulse{
  animation:feedbackFocusPulse .7s ease;
}
@keyframes feedbackFocusPulse{
  0%{box-shadow:0 0 0 0 rgba(255,95,124,.34)}
  100%{box-shadow:0 0 0 16px rgba(255,95,124,0)}
}
@media(max-width:900px){
  .topbar .topbar-inner{width:calc(100% - 18px);gap:10px}
  .topbar .brand-title{max-width:210px}
  .topbar .admin-top-actions{overflow-x:auto;max-width:66vw;padding:3px 0;scrollbar-width:none}
  .topbar .admin-top-actions::-webkit-scrollbar{display:none}
  .topbar .admin-top-actions .admin-link{height:36px!important;min-height:36px!important;padding:0 11px!important;font-size:11px!important}
  .topbar .admin-top-actions .pro-user-chip{height:36px;min-height:36px!important;font-size:11px!important}
}
@media(max-width:620px){
  .topbar .topbar-inner{align-items:center;min-height:64px}
  .topbar .brand-kicker{font-size:8px!important}
  .topbar .brand-title{font-size:12px!important;max-width:120px}
  .topbar .admin-top-actions{max-width:58vw;gap:5px!important}
  .topbar .admin-top-actions .pro-user-chip{display:none!important}
  .topbar .admin-top-actions .admin-link{padding:0 9px!important;font-size:10px!important;border-radius:9px!important}
  .topbar .admin-top-actions #logoutBtn{min-width:64px}
}
`;
document.head.appendChild(style);

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

const kpiHost=document.querySelector('#adminKpis');
function markComplaintKpi(){
  if(!kpiHost)return;
  [...kpiHost.querySelectorAll('.pro-kpi')].forEach(card=>{
    if(card.querySelector('span')?.textContent?.trim()==='Shikoyatlar'){
      card.classList.add('pro-kpi-action');
      card.setAttribute('role','button');
      card.setAttribute('tabindex','0');
      card.setAttribute('aria-label','Shikoyatlarni ko‘rsatish');
      card.title='Shikoyatlarni ko‘rsatish';
    }
  });
}
function openComplaints(){
  const type=document.querySelector('#feedbackType');
  const rating=document.querySelector('#feedbackRating');
  const search=document.querySelector('#feedbackSearch');
  if(!type)return;
  type.value='complaint';
  if(rating)rating.value='all';
  if(search)search.value='';
  type.dispatchEvent(new Event('change',{bubbles:true}));
  if(rating)rating.dispatchEvent(new Event('change',{bubbles:true}));
  if(search)search.dispatchEvent(new Event('input',{bubbles:true}));
  const panel=type.closest('.panel');
  if(panel){
    panel.classList.remove('feedback-focus-pulse');
    void panel.offsetWidth;
    panel.classList.add('feedback-focus-pulse');
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  }
  history.replaceState(null,'',location.pathname+location.search+'#shikoyatlar');
}
if(kpiHost){
  markComplaintKpi();
  new MutationObserver(markComplaintKpi).observe(kpiHost,{childList:true,subtree:true});
  kpiHost.addEventListener('click',event=>{
    const card=event.target.closest('.pro-kpi-action');
    if(card)openComplaints();
  });
  kpiHost.addEventListener('keydown',event=>{
    const card=event.target.closest('.pro-kpi-action');
    if(card&&(event.key==='Enter'||event.key===' ')){
      event.preventDefault();
      openComplaints();
    }
  });
}
