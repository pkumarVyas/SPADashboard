const { getDataverseToken } = require('../shared/dataverseTokenCache');

const CORS = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Content-Type': 'application/json',
});

module.exports = async function (context, req) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  const cors   = CORS(origin);

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } };
    return;
  }

  const id = req.query.id;
  if (!id) {
    context.res = { status: 400, headers: cors, body: { success: false, error: 'id is required' } };
    return;
  }

  try {
    const token = await getDataverseToken();
    const { DATAVERSE_API_URL } = process.env;
    const headers = {
      Authorization: `Bearer ${token}`,
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Accept: 'application/json',
    };

    // Best-effort: remove associated agreement lines first. cr876_vysspaheaderid is a
    // plain text column, not a Dataverse lookup, so nothing cascades — lines must be
    // deleted explicitly or they are left orphaned. Older imports predate that column
    // and are still matched on the SPA number.
    const esc  = v => String(v).replace(/'/g, "''");
    const ors  = [
      `cr876_vysspaheaderid eq '${esc(id)}'`,
      ...[req.query.vendorApprovalId, req.query.spaId].filter(Boolean)
        .map(k => `crfc2_spaid eq '${esc(k)}'`),
    ];
    {
      try {
        const clause   = ors.join(' or ');
        const filter   = encodeURIComponent(clause);
        const linesUrl = `${DATAVERSE_API_URL}/crfc2_vysspaagreementlinetables?$select=crfc2_vysspaagreementlinetableid&$filter=${filter}`;
        const linesRes = await fetch(linesUrl, { headers });
        if (linesRes.ok) {
          const { value: lines = [] } = await linesRes.json();
          for (const line of lines) {
            await fetch(
              `${DATAVERSE_API_URL}/crfc2_vysspaagreementlinetables(${line.crfc2_vysspaagreementlinetableid})`,
              { method: 'DELETE', headers }
            );
          }
        }
      } catch (e) {
        context.log.warn('Failed to delete agreement lines (continuing with header delete):', e.message);
      }
    }

    const headerRes = await fetch(`${DATAVERSE_API_URL}/crfc2_vysspaheadertables(${id})`, { method: 'DELETE', headers });
    if (!headerRes.ok) {
      const errText = await headerRes.text();
      context.res = { status: headerRes.status, headers: cors, body: { success: false, error: errText } };
      return;
    }

    context.res = { status: 200, headers: cors, body: { success: true } };
  } catch (err) {
    context.log.error('DeleteSPAImport error:', err.message);
    context.res = { status: 500, headers: cors, body: { success: false, error: err.message } };
  }
};
