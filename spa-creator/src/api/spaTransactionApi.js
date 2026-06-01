const MOCK = import.meta.env.VITE_MOCK === 'true';
const SPA_TRANSACTIONS_URL = import.meta.env.VITE_SPA_TRANSACTIONS_URL || '/api/GetSPATransactions';

export async function getSPATransactions({ filter = '' } = {}) {
  if (MOCK) {
    await new Promise(r => setTimeout(r, 400));
    return { success: true, count: 0, value: [] };
  }

  const params = new URLSearchParams();
  if (filter) params.set('filter', filter);
  const res  = await fetch(`${SPA_TRANSACTIONS_URL}?${params}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
  return json;
}
