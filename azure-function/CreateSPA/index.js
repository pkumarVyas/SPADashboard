const { ServiceBusClient } = require('@azure/service-bus');
const { getD365Token } = require('../shared/tokenCache');

// Node 18 has fetch built-in — no node-fetch needed

async function pushException(payload, err) {
  const { SERVICE_BUS_CONN, SERVICE_BUS_QUEUE } = process.env;
  if (!SERVICE_BUS_CONN || !SERVICE_BUS_QUEUE) return;

  const client = new ServiceBusClient(SERVICE_BUS_CONN);
  const sender = client.createSender(SERVICE_BUS_QUEUE);
  try {
    await sender.sendMessages({
      body: {
        timestamp: new Date().toISOString(),
        payload,
        error: err.message
      },
      contentType: 'application/json'
    });
  } finally {
    await sender.close();
    await client.close();
  }
}

module.exports = async function (context, req) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Content-Type': 'application/json'
  };

  // CORS preflight
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: {
        ...cors,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    };
    return;
  }

  const payload = req.body;
  if (!payload) {
    context.res = { status: 400, headers: cors, body: { success: false, error: 'Request body required' } };
    return;
  }

  try {
    const token = await getD365Token();
    const { D365_RESOURCE, D365_SPA_ENDPOINT } = process.env;

    // D365 custom services wrap the body in the X++ contract parameter name.
    // Adjust the key below to match your X++ method's parameter name if needed.
    const d365Res = await fetch(`${D365_RESOURCE}${D365_SPA_ENDPOINT}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!d365Res.ok) {
      throw new Error(`D365 ${d365Res.status}: ${await d365Res.text()}`);
    }

    const data = await d365Res.json();
    context.res = { status: 200, headers: cors, body: { success: true, data } };
  } catch (err) {
    context.log.error('CreateSPA error:', err.message);
    try {
      await pushException(payload, err);
    } catch (sbErr) {
      context.log.error('Service Bus push failed:', sbErr.message);
    }
    context.res = {
      status: 200,
      headers: cors,
      body: { success: false, queued: true, error: err.message }
    };
  }
};
