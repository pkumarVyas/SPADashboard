// Dataverse Web API wrapper
// Set VITE_DATAVERSE_URL in .env.local when connecting to real Dataverse
// e.g. VITE_DATAVERSE_URL=https://your-org.api.crm.dynamics.com/api/data/v9.2
//
// Auth: Dataverse requires a Bearer token. Use the same Azure Function proxy
// pattern as the D365 calls — add a GetOrders / SaveOrder function that
// fetches a token via client_credentials and forwards to Dataverse.

const MOCK = import.meta.env.VITE_MOCK === 'true';
const PROXY_BASE = import.meta.env.VITE_ORDER_PROXY_URL ?? '';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export async function fetchOrders() {
  if (MOCK) {
    await sleep(400);
    const { orders } = await import('../data/orderMockData.js');
    return orders;
  }
  const res = await fetch(`${PROXY_BASE}/api/GetOrders`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchOrder(id) {
  if (MOCK) {
    await sleep(300);
    const { orders } = await import('../data/orderMockData.js');
    return orders.find(o => o.id === id) ?? null;
  }
  const res = await fetch(`${PROXY_BASE}/api/GetOrder?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function saveOrder(order) {
  if (MOCK) {
    await sleep(700);
    return { success: true, id: order.id };
  }
  const res = await fetch(`${PROXY_BASE}/api/SaveOrder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
