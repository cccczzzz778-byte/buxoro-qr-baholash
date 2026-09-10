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
