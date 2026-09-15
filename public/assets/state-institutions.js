const $=s=>document.querySelector(s);
const form=$('#stateInstitutionForm');
if(form){
  const notice=$('#stateInstitutionNotice');
  const button=$('#addStateInstitutionBtn');
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
  const show=(html,type='success')=>{notice.className=type==='success'?'admin-success':'notice';notice.innerHTML=html;notice.scrollIntoView({behavior:'smooth',block:'nearest'})};
  form.addEventListener('submit',async e=>{
    e.preventDefault();notice.className='hidden';
    const stir=$('#stateInstStir').value.replace(/\s/g,'');
    if(!/^\d{9,14}$/.test(stir)){show('STIR 9–14 ta raqamdan iborat bo‘lishi kerak.','error');return}
    if(!/^[-+0-9()\s]{7,30}$/.test($('#statePhone').value.trim())){show('Telefon raqamini to‘g‘ri kiriting.','error');return}
    button.disabled=true;const old=button.textContent;button.innerHTML='<span class="pro-submit-spinner"></span>Ro‘yxatdan o‘tkazilmoqda...';
    try{
      const sr=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'});if(sr.status===401){location.href='/login';return}const session=await sr.json();if(!sr.ok)throw new Error(session.error||'Sessiya olinmadi.');
      const payload={name:$('#stateInstName').value.trim(),type:$('#stateInstType').value,stir,district:$('#stateInstDistrict').value,address:$('#stateInstAddress').value.trim(),directorName:$('#stateDirectorName').value.trim(),contactName:$('#stateContactName').value.trim(),phone:$('#statePhone').value.trim(),email:$('#stateEmail').value.trim()};
      const r=await fetch('/api/admin/state-institutions',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','x-csrf-token':session.csrf},body:JSON.stringify(payload)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Davlat muassasasini qo‘shib bo‘lmadi.');
      form.reset();show(`<b>Davlat muassasasi ro‘yxatdan o‘tkazildi.</b><br>Muassasa kodi: <b>${esc(j.institution.id)}</b> • Reyestr: ${esc(j.registrationId)}<br><a class="btn admin-action" href="${esc(j.institution.feedbackUrl)}" target="_blank" rel="noopener">Baholashni ochish</a> <a class="btn admin-action" href="${esc(j.institution.qrUrl)}" target="_blank" rel="noopener">QR-kodni ochish</a>`,'success');
      setTimeout(()=>location.reload(),1800);
    }catch(error){show(error.message,'error')}finally{button.disabled=false;button.textContent=old}
  });
}
