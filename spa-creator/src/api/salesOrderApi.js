import { salesOrders } from '../data/mockData';

const MOCK                   = import.meta.env.VITE_MOCK === 'true';
const SALES_ORDER_URL        = import.meta.env.VITE_SALES_ORDERS_URL;
const SALES_ORDER_LINES_URL  = import.meta.env.VITE_SALES_ORDER_LINES_URL;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Derive mock headers from the denormalised salesOrders array
function mockHeaders(filter = '') {
  const map = new Map();
  for (const o of salesOrders) {
    if (!map.has(o.soId)) {
      map.set(o.soId, {
        soId:            o.soId,
        customerAccount: o.customerAccount,
        customerName:    o.customerName,
        currencyCode:    'USD',
        companyId:       'USMF',
        status:          o.status ?? 'Open order',
        orderDate:       o.orderDate ?? null,
      });
    }
  }
  let items = Array.from(map.values());
  if (filter) {
    const q = filter.toLowerCase();
    items = items.filter(h =>
      h.soId.toLowerCase().includes(q) ||
      h.customerAccount.toLowerCase().includes(q) ||
      h.customerName.toLowerCase().includes(q)
    );
  }
  return items;
}

export async function getSalesOrders({ filter = '' } = {}) {
  if (MOCK) {
    await sleep(400);
    const items = mockHeaders(filter);
    return { success: true, count: items.length, value: items };
  }

  const params = new URLSearchParams({ filter });
  const res    = await fetch(`${SALES_ORDER_URL}?${params}`);
  const json   = await res.json();
  if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
  return json;
}

export async function getSalesOrderLines(soId, customerAccount = '') {
  if (MOCK) {
    await sleep(350);
    const lines = salesOrders.filter(o => o.soId === soId);
    return { success: true, count: lines.length, value: lines };
  }

  const params = new URLSearchParams({ soId, customerAccount });
  const res    = await fetch(`${SALES_ORDER_LINES_URL}?${params}`);
  const json   = await res.json();
  if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
  return json;
}
