const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const response = await nativeFetch(input, init);
  const url = typeof input === 'string' ? input : input?.url || '';
  if (!url.includes('/api/auth/session')) return response;
  const clone = response.clone();
  const data = await clone.json().catch(() => null);
  if (!data || data.role !== 'management') return response;
  document.documentElement.dataset.accessRole = 'management';
  const bridged = { ...data, actualRole: 'management', role: 'admin' };
  return new Response(JSON.stringify(bridged), { status: response.status, statusText: response.statusText, headers: response.headers });
};

function applyManagementUi() {
  if (document.documentElement.dataset.accessRole !== 'management') return;
  const back = document.querySelector('#adminBackLink');
  if (back) back.remove();
  const scope = document.querySelector('#scopeLabel');
  if (scope) scope.textContent = 'Boshqarma monitoringi';
  const eyebrow = document.querySelector('.analytics-hero .eyebrow');
  if (eyebrow) eyebrow.textContent = 'BOSHQARMA MONITORINGI';
}

document.addEventListener('DOMContentLoaded', applyManagementUi);
setTimeout(applyManagementUi, 250);
setTimeout(applyManagementUi, 900);
