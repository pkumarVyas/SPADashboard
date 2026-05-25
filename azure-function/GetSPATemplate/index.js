const { getDataverseToken } = require('../shared/dataverseTokenCache');

module.exports = async function (context, req) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: cors };
    return;
  }

  const id = req.query.id;
  if (!id) {
    context.res = { status: 400, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify({ error: 'id is required' }) };
    return;
  }

  try {
    const token = await getDataverseToken();
    const { DATAVERSE_API_URL } = process.env;

    const fileUrl = `${DATAVERSE_API_URL}/crfc2_vysspaheadertables(${id})/cr876_spatemplate/$value`;
    const fileRes = await fetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
      }
    });

    if (!fileRes.ok) {
      const errText = await fileRes.text();
      context.res = { status: fileRes.status, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify({ error: errText }) };
      return;
    }

    const contentType  = fileRes.headers.get('Content-Type') || 'application/octet-stream';
    const arrayBuffer  = await fileRes.arrayBuffer();

    // Forward filename from Dataverse Content-Disposition if present
    const dvDisposition = fileRes.headers.get('Content-Disposition') ?? '';
    const fnMatch       = dvDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\r\n]+)/i);
    const dvFilename    = fnMatch ? decodeURIComponent(fnMatch[1].trim()) : '';

    context.res = {
      status: 200,
      isRaw: true,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline${dvFilename ? `; filename="${dvFilename}"` : ''}`,
        'Access-Control-Expose-Headers': 'Content-Type, Content-Disposition',
        ...cors,
      },
      body: Buffer.from(arrayBuffer),
    };
  } catch (err) {
    context.log.error('GetSPATemplate error:', err.message);
    context.res = { status: 500, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify({ error: err.message }) };
  }
};
