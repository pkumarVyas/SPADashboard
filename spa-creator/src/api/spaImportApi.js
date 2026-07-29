const MOCK                 = import.meta.env.VITE_MOCK === 'true';
const SPA_IMPORTS_URL      = import.meta.env.VITE_SPA_IMPORTS_URL      || '/api/GetSPAImports';
const SPA_IMPORT_LINES_URL = import.meta.env.VITE_SPA_IMPORT_LINES_URL || '/api/GetSPAImportLines';
const SUBMIT_SPA_URL       = import.meta.env.VITE_SUBMIT_SPA_URL       || '/api/SubmitSPAToD365';
const DELETE_SPA_URL       = import.meta.env.VITE_DELETE_SPA_URL       || '/api/DeleteSPAImport';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const MOCK_HEADERS = [
  {
    id: '34b11724-bf4e-f111-bec7-000d3a4f9ef9',
    spaId: 'TIS-2026-Q2-3389', spaCode: 'PRCLM',
    description: 'Test_2026-05-13', status: 'Extracted', statusCode: 508510001,
    vendorId: '1001', vendorApprovalId: '', startDate: '2026-05-12', endDate: '2026-05-15',
    templateName: 'Untitled', createdOn: '2026-05-13T11:30:33Z', active: true,
  },
];

const MOCK_LINES = {
  'TIS-2026-Q2-3389': [
    { id: '4fb11724-bf4e-f111-bec7-000d3a4f9ef9', lineNum: 1, spaId: 'TIS-2026-Q2-3389', spaCode: 'PRCLM', itemId: 'RP-001', customer: 'US-001', spaCost: 11.96, spaCostType: 'D', discountPct: null, discountAmount: 10, minQty: 10, maxQty: null, minMarginPct: null },
  ],
};

export async function getSPAImports({ filter = '' } = {}) {
  if (MOCK) {
    await sleep(400);
    let items = MOCK_HEADERS;
    if (filter) {
      const q = filter.toLowerCase();
      items = items.filter(i =>
        i.spaId.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.vendorId.toLowerCase().includes(q)
      );
    }
    return { success: true, count: items.length, value: items };
  }

  const params = new URLSearchParams({ filter });
  const res    = await fetch(`${SPA_IMPORTS_URL}?${params}`);
  const json   = await res.json();
  if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
  return json;
}

export async function getSPAImportLines(spaId) {
  if (MOCK) {
    await sleep(300);
    const lines = MOCK_LINES[spaId] ?? [];
    return { success: true, count: lines.length, value: lines };
  }

  const params = new URLSearchParams({ spaId });
  const res    = await fetch(`${SPA_IMPORT_LINES_URL}?${params}`);
  const json   = await res.json();
  if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
  return json;
}

export async function submitSPAToD365(header, lines, importId) {
  if (MOCK) {
    await sleep(800);
    return { success: true, lineResults: lines.map((_, i) => ({ lineNum: i + 1, itemId: _.itemId, ok: true })), warning: null };
  }

  const res  = await fetch(SUBMIT_SPA_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ header, lines, importId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
  return json;
}

export async function deleteSPAImport(id, spaId) {
  if (MOCK) {
    await sleep(300);
    return { success: true };
  }

  const params = new URLSearchParams({ id, ...(spaId ? { spaId } : {}) });
  const res    = await fetch(`${DELETE_SPA_URL}?${params}`, { method: 'DELETE' });
  const json   = await res.json();
  if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
  return json;
}
