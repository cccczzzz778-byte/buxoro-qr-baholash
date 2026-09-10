const host=document.querySelector('.admin-top-actions');
if(host&&!document.querySelector('#logoutBtn')){
  const button=document.createElement('button');
  button.id='logoutBtn';
  button.type='button';
  button.className='admin-link';
  button.textContent='Chiqish';
  button.setAttribute('aria-label','Tizimdan chiqish');
  button.style.cursor='pointer';
  button.style.borderColor='rgba(255,98,118,.48)';
  button.style.color='#ffd8df';
  button.style.background='rgba(92,20,34,.72)';
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
