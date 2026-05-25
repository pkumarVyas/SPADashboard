const { getDataverseToken } = require('../shared/dataverseTokenCache');

const CORS = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Content-Type': 'application/json',
});

// Option-set decoders
const RELATION = { 200000000: 'Table', 200000001: 'Group', 200000002: 'All' };
const noYes    = v => v === 200000001;

function mapLine(r) {
  return {
    id:              r.mserp_vysspaagreemententityid,
    spaId:           r.mserp_spaid,
    lineNum:         r.mserp_linenum,
    spaCode:         r.mserp_spacode,
    productRelation: RELATION[r.mserp_productrelation] ?? String(r.mserp_productrelation),
    item:            r.mserp_itemoritemgroup ?? '',
    uom:             r.mserp_unitid ?? '',
    siteId:          r.mserp_siteid ?? '',
    customerRelation:RELATION[r.mserp_accountrelation] ?? String(r.mserp_accountrelation),
    customer:        r.mserp_custorcustgroup ?? '',
    partialSpa:      noYes(r.mserp_partspa),
    bundle:          noYes(r.mserp_bundle),
    gabId:           r.mserp_gabid ?? '',
    minQty:          r.mserp_minqty ?? 0,
    maxQty:          r.mserp_maxqty ?? 0,
    spaCostType:     r.mserp_costtype ?? '',
    spacost:         r.mserp_spacost ?? 0,
    discountAmount:  r.mserp_discamt ?? 0,
    discountPct:     r.mserp_discpct ?? 0,
    claimCurrency:   r.mserp_vysspaheadertable_claimcurrency ?? '',
  };
}

const SELECT = [
  'mserp_spaid', 'mserp_linenum', 'mserp_spacode',
  'mserp_productrelation', 'mserp_itemoritemgroup', 'mserp_unitid', 'mserp_siteid',
  'mserp_accountrelation', 'mserp_custorcustgroup',
  'mserp_partspa', 'mserp_bundle', 'mserp_gabid',
  'mserp_minqty', 'mserp_maxqty',
  'mserp_costtype', 'mserp_spacost', 'mserp_discamt', 'mserp_discpct',
  'mserp_vysspaheadertable_claimcurrency',
  'mserp_vysspaagreemententityid',
].join(',');

module.exports = async function (context, req) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  const cors   = CORS(origin);

  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' }
    };
    return;
  }

  const spaId = req.query.spaId;
  if (!spaId) {
    context.res = { status: 400, headers: cors, body: { success: false, error: 'spaId query parameter is required' } };
    return;
  }

  try {
    const token = await getDataverseToken();
    const { DATAVERSE_API_URL, DATAVERSE_SPA_LINES_TABLE, DATAVERSE_COMPANY_ID = 'USMF' } = process.env;

    const filter = `mserp_spaid eq '${spaId.replace(/'/g, "''")}' and mserp_dataareaid eq '${DATAVERSE_COMPANY_ID}'`;
    const url    = `${DATAVERSE_API_URL}/${DATAVERSE_SPA_LINES_TABLE}`
      + `?$select=${SELECT}&$filter=${encodeURIComponent(filter)}&$orderby=mserp_linenum asc`;

    const dvRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        Accept: 'application/json',
      }
    });

    if (!dvRes.ok) throw new Error(`Dataverse ${dvRes.status}: ${await dvRes.text()}`);

    const json  = await dvRes.json();
    const lines = (json.value ?? []).map(mapLine);

    context.res = { status: 200, headers: cors, body: { success: true, count: lines.length, value: lines } };
  } catch (err) {
    context.log.error('GetSPAAgreementLines error:', err.message);
    context.res = { status: 500, headers: cors, body: { success: false, error: err.message } };
  }
};
