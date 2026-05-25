const PROXY_URL = import.meta.env.VITE_PROXY_URL;
const EXCEPTIONS_URL = import.meta.env.VITE_EXCEPTIONS_URL;
const MOCK = import.meta.env.VITE_MOCK === 'true';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export async function createSPA(payload) {
  if (MOCK) {
    await sleep(800);
    // Simulate a D365 failure every 3rd submission to test the queued/error path
    const n = (parseInt(sessionStorage.getItem('_mockCount') || '0') + 1);
    sessionStorage.setItem('_mockCount', n);
    if (n % 3 === 0) {
      return { success: false, queued: true, error: 'Mock: D365 service unavailable (simulated)' };
    }
    return {
      success: true,
      data: { SPANumber: payload.SPANumber, RecId: 5637144576, Status: 'Created' }
    };
  }

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getExceptions(limit = 20) {
  if (MOCK) {
    await sleep(400);
    return {
      messages: [
        {
          id: 'mock-001',
          enqueuedAt: new Date(Date.now() - 120_000).toISOString(),
          body: {
            error: 'Mock: D365 service unavailable (simulated)',
            payload: { SPANumber: 'SPA-2025-001', SPAName: 'Mock Agreement' }
          }
        }
      ]
    };
  }

  const res = await fetch(`${EXCEPTIONS_URL}?limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
