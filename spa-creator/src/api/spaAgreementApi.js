import { spaAgreements, spaAgreementLines } from '../data/mockData';

const MOCK             = import.meta.env.VITE_MOCK === 'true';
const SPA_AGMT_URL     = import.meta.env.VITE_SPA_AGREEMENTS_URL      || '/api/GetSPAAgreements';
const SPA_AGMT_LN_URL  = import.meta.env.VITE_SPA_AGREEMENT_LINES_URL || '/api/GetSPAAgreementLines';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export async function getSPAAgreements({ filter = '', top = 250 } = {}) {
  if (MOCK) {
    await sleep(500);
    const q = filter.toLowerCase();
    const items = q
      ? spaAgreements.filter(a =>
          a.id.toLowerCase().includes(q)         ||
          a.description.toLowerCase().includes(q)||
          a.spaCode.toLowerCase().includes(q)    ||
          a.vendorId.toLowerCase().includes(q)
        )
      : spaAgreements;
    return { success: true, count: items.length, value: items };
  }

  const params = new URLSearchParams({ top });
  if (filter) params.set('filter', filter);
  const res = await fetch(`${SPA_AGMT_URL}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getSPAAgreementLines(spaId) {
  if (MOCK) {
    await sleep(300);
    const lines = spaAgreementLines[spaId] ?? [];
    return { success: true, count: lines.length, value: lines };
  }

  const res = await fetch(`${SPA_AGMT_LN_URL}?spaId=${encodeURIComponent(spaId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
