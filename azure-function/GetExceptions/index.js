const { ServiceBusClient } = require('@azure/service-bus');

module.exports = async function (context, req) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: cors };
    return;
  }

  const { SERVICE_BUS_CONN, SERVICE_BUS_QUEUE } = process.env;
  if (!SERVICE_BUS_CONN || !SERVICE_BUS_QUEUE) {
    context.res = { status: 200, headers: cors, body: { messages: [] } };
    return;
  }

  const client = new ServiceBusClient(SERVICE_BUS_CONN);
  // peekMessages reads without consuming — messages stay in the queue
  const receiver = client.createReceiver(SERVICE_BUS_QUEUE);

  try {
    const maxCount = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const peeked = await receiver.peekMessages(maxCount);
    const messages = peeked.map(m => ({
      id: m.messageId,
      enqueuedAt: m.enqueuedTimeUtc,
      body: m.body
    }));
    context.res = { status: 200, headers: cors, body: { messages } };
  } finally {
    await receiver.close();
    await client.close();
  }
};
