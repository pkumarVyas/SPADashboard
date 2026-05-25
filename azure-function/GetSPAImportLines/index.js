const { getDataverseToken } = require('../shared/dataverseTokenCache');

const CORS = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Content-Type': 'application/json',
});

const FETCH_OPTS = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
    Accept: 'application/json',
  }
});

const SELECT = [
  'crfc2_vysspaagreementlinetableid',
  'crfc2_spaid',
  'crfc2_spacode',
  'crfc2_itemid',
  'crfc2_customer',
  'crfc2_spacost',
  'crfc2_spacosttype',
  'crfc2_spacostcommission',
  'crfc2_discountpercentage',
  'crfc2_discountamount',
  'crfc2_minquantity',
  'crfc2_maxquantity',
  'crfc2_minimummarginpct',
].join(',');

function mapLine(r, idx) {
  return {
    id:              r.crfc2_vysspaagreementlinetableid,
    lineNum:         idx + 1,
    spaId:           r.crfc2_spaid          ?? '',
    spaCode:         r.crfc2_spacode        ?? '',
    itemId:          r.crfc2_itemid         ?? '',
    customer:        r.crfc2_customer       ?? '',
    spaCost:         r.crfc2_spacost        ?? 0,
    spaCostType:     r.crfc2_spacosttype    ?? '',
    spaCostCommission: r.crfc2_spacostcommission ?? null,
    discountPct:     r.crfc2_discountpercentage ?? null,
    discountAmount:  r.crfc2_discountamount ?? null,
    minQty:          r.crfc2_minquantity    ?? 0,
    maxQty:          r.crfc2_maxquantity    ?? null,
    minMarginPct:    r.crfc2_minimummarginpct ?? null,
  };
}

module.exports = async function (context, req) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  const cors   = CORS(origin);

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } };
    return;
  }

  const spaId = req.query.spaId;
  if (!spaId) {
    context.res = { status: 400, headers: cors, body: { success: false, error: 'spaId is required' } };
    return;
  }

  try {
    const token = await getDataverseToken();
    const { DATAVERSE_API_URL } = process.env;

    const filter = encodeURIComponent(`crfc2_spaid eq '${spaId.replace(/'/g, "''")}'`);
    const url    = `${DATAVERSE_API_URL}/crfc2_vysspaagreementlinetables?$select=${SELECT}&$filter=${filter}&$orderby=crfc2_itemid asc`;

    const res  = await fetch(url, FETCH_OPTS(token));
    if (!res.ok) throw new Error(`Dataverse ${res.status}: ${await res.text()}`);

    const json  = await res.json();
    const lines = (json.value ?? []).map(mapLine);

    context.res = { status: 200, headers: cors, body: { success: true, count: lines.length, value: lines } };
  } catch (err) {
    context.log.error('GetSPAImportLines error:', err.message);
    context.res = { status: 500, headers: cors, body: { success: false, error: err.message } };
  }
};
