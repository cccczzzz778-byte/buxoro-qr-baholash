const $ = s => document.querySelector(s);
let csrf = '';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

async function api(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { ...(options.headers || {}) };
  let body = options.body;
  if (body && typeof body !== 'string') {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(body);
  }
  if (method !== 'GET') headers['x-csrf-token'] = csrf;
  const r = await fetch(path, { ...options, method, headers, body, credentials: 'same-origin', cache: 'no-store' });
  if (r.status === 401) { location.href = '/login'; throw new Error('Kirish talab qilinadi.'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Xatolik yuz berdi.');
  return j;
}

function showNotice(text, type = 'success') {
  const box = $('#institutionNotice');
  box.className = type === 'success' ? 'admin-success' : 'notice';
  box.textContent = text;
}

function renderInstitutions(items) {
  if (!items.length) {
    $('#instList').innerHTML = '<div class="admin-empty">Muassasalar hali qo‘shilmagan.</div>';
    return;
  }
  $('#instList').innerHTML = `<div class="institution-admin-grid">${items.map(x => `
    <article class="institution-admin-card ${x.active ? '' : 'is-inactive'}" data-id="${esc(x.id)}">
      <div class="institution-card-main">
        <img class="admin-qr" src="${esc(x.qrUrl)}" alt="${esc(x.name)} QR-kodi" loading="lazy">
        <div class="institution-card-copy">
          <div class="institution-status ${x.active ? 'active' : 'inactive'}">${x.active ? 'Faol' : 'O‘chirilgan'}</div>
          <h3>${esc(x.name)}</h3>
          <p>${esc(x.district)}${x.address ? ` • ${esc(x.address)}` : ''}</p>
          <div class="institution-meta"><span>Kod: ${esc(x.id)}</span><span>Fikrlar: ${x.feedbackCount}</span><span>O‘rtacha: ${x.averageRating?.toFixed?.(2) || '—'}</span></div>
        </div>
      </div>
      <div class="institution-actions">
        <a class="btn admin-action" href="${esc(x.feedbackUrl)}" target="_blank" rel="noopener">Baholashni ochish</a>
        <a class="btn admin-action" href="${esc(x.qrUrl)}" target="_blank" rel="noopener">QR-kodni ochish</a>
        <a class="btn admin-action" href="${esc(x.posterUrl)}" target="_blank" rel="noopener">Poster</a>
        <button class="btn admin-action toggle-inst" type="button" data-active="${x.active ? '0' : '1'}">${x.active ? 'Vaqtincha o‘chirish' : 'Faollashtirish'}</button>
        <button class="btn admin-action danger delete-inst" type="button">O‘chirish</button>
      </div>
    </article>`).join('')}</div>`;
}

function renderFeedback(items) {
  $('#feedbackList').innerHTML = `<div class="table-wrap"><table><thead><tr><th>Sana</th><th>Muassasa</th><th>Shifokor</th><th>Baho</th><th>Shikoyat</th><th>Ism</th><th>Telefon</th><th>Izoh</th></tr></thead><tbody>${items.map(x => `<tr><td>${esc(x.created_at)}</td><td>${esc(x.institution_name)}</td><td>${esc(x.doctor)}</td><td>${esc(x.rating)}</td><td>${x.is_complaint ? 'Ha' : 'Yo‘q'}</td><td>${esc(x.citizen_name)}</td><td>${esc(x.citizen_phone)}</td><td>${esc(x.comment)}</td></tr>`).join('')}</tbody></table></div>`;
}

async function refresh() {
  const [a, b] = await Promise.all([api('/api/admin/institutions'), api('/api/admin/feedback')]);
  renderInstitutions(a.institutions || []);
  renderFeedback(b.feedback || []);
}

async function load() {
  try {
    const session = await api('/api/auth/session');
    csrf = session.csrf;
    await refresh();
  } catch (e) {
    if (e?.message) document.body.insertAdjacentHTML('afterbegin', `<div class="notice">${esc(e.message)}</div>`);
  }
}

$('#institutionForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#addInstitutionBtn');
  btn.disabled = true;
  try {
    const result = await api('/api/admin/institutions', {
      method: 'POST',
      body: {
        name: $('#instName').value.trim(),
        district: $('#instDistrict').value.trim(),
        address: $('#instAddress').value.trim()
      }
    });
    e.currentTarget.reset();
    showNotice(`Muassasa qo‘shildi. QR-kod avtomatik yaratildi: ${result.institution.id}`);
    await refresh();
  } catch (err) {
    showNotice(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

$('#instList')?.addEventListener('click', async e => {
  const card = e.target.closest('.institution-admin-card');
  if (!card) return;
  const id = card.dataset.id;
  if (e.target.closest('.toggle-inst')) {
    const btn = e.target.closest('.toggle-inst');
    btn.disabled = true;
    try {
      await api(`/api/admin/institutions/${encodeURIComponent(id)}`, { method: 'PATCH', body: { active: btn.dataset.active === '1' } });
      await refresh();
    } catch (err) { showNotice(err.message, 'error'); }
    return;
  }
  if (e.target.closest('.delete-inst')) {
    if (!confirm('Muassasani o‘chirishni tasdiqlaysizmi? Agar unda avvalgi fikrlar bo‘lsa, ma’lumotlar saqlanib, muassasa baholashdan chiqariladi.')) return;
    const btn = e.target.closest('.delete-inst');
    btn.disabled = true;
    try {
      const result = await api(`/api/admin/institutions/${encodeURIComponent(id)}`, { method: 'DELETE' });
      showNotice(result.message || 'Muassasa o‘chirildi.');
      await refresh();
    } catch (err) { showNotice(err.message, 'error'); }
  }
});

load();
