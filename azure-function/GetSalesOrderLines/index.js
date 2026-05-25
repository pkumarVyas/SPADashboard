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

// ── SPA eligibility matching ───────────────────────────────────────────────────
function matchSPA(soItem, soCustomer, activeSpaLines) {
  let best = null;
  let bestScore = 0;

  for (const spa of activeSpaLines) {
    let score = 0;

    if (spa.productRelation === 0 && spa.item === soItem) {
      score += 50;
    } else if (spa.productRelation === 1) {
      score += 20;
    } else if (spa.productRelation === 2) {
      score += 15;
    } else {
      continue;
    }

    if (spa.customerRelation === 0 && spa.customer === soCustomer) {
      score += 50;
    } else if (spa.customerRelation === 1) {
      score += 30;
    } else if (spa.customerRelation === 2) {
      score += 20;
    } else {
      continue;
    }

    if (score > bestScore) { bestScore = score; best = spa; }
  }

  if (!best) return { eligibleSpa: null, spaDesc: '', confidence: 0, reason: 'No active SPA found for this item and customer', matchType: 'none' };

  const today    = new Date();
  const expiry   = new Date(best.endDate);
  const daysDiff = Math.round((expiry - today) / 86400000);

  let reason = '';
  if (bestScore >= 100) {
    reason = daysDiff < 30
      ? `Active SPA — exact match · expires in ${daysDiff} days`
      : 'Active SPA — exact item and customer match';
  } else if (bestScore >= 80) {
    reason = 'Active SPA — exact item match, customer group';
  } else if (bestScore >= 70) {
    reason = 'Item via group relation — verify item coverage';
  } else {
    reason = 'Partial SPA match — manual verification required';
  }

  const penalty    = daysDiff < 7 ? 20 : daysDiff < 30 ? 8 : 0;
  const confidence = Math.min(Math.max(bestScore - penalty, 50), 99);
  const matchType  = confidence >= 90 ? 'auto' : 'review';

  return { eligibleSpa: best.spaId, spaDesc: best.spaDesc, vendorId: best.vendorId, confidence, reason, matchType, expiresInDays: daysDiff };
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function (context, req) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  const cors   = CORS(origin);

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } };
    return;
  }

  const soId = req.query.soId;
  if (!soId) {
    context.res = { status: 400, headers: cors, body: { success: false, error: 'soId query param is required' } };
    return;
  }

  try {
    const token = await getDataverseToken();
    const {
      DATAVERSE_API_URL,
      DATAVERSE_SO_LINES_TABLE  = 'mserp_salesorderlinev3entities',
      DATAVERSE_SPA_LINES_TABLE = 'mserp_vysspaagreemententities',
      DATAVERSE_COMPANY_ID      = 'USMF',
    } = process.env;

    const today = new Date().toISOString().split('T')[0];

    const soLinesSelect = [
      'mserp_salesordernumber', 'mserp_linenumber', 'mserp_itemnumber',
      'mserp_orderedsalesquantity', 'mserp_salesprice', 'mserp_lineamount',
      'mserp_salesunitsymbol', 'mserp_linedescription', 'mserp_dataareaid',
    ].join(',');

    const spaSelect = [
      'mserp_spaid', 'mserp_spacode', 'mserp_productrelation',
      'mserp_itemoritemgroup', 'mserp_accountrelation', 'mserp_custorcustgroup',
      'mserp_vysspaheadertable_enddate', 'mserp_vysspaheadertable_description',
      'mserp_vysspaheadertable_vendorid',
    ].join(',');

    // Filter SO lines by sales order number + company
    const soFilter  = encodeURIComponent(`mserp_salesordernumber eq '${soId}' and mserp_dataareaid eq '${DATAVERSE_COMPANY_ID}'`);
    const spaFilter = encodeURIComponent(`mserp_dataareaid eq '${DATAVERSE_COMPANY_ID}'`);
    const soUrl     = `${DATAVERSE_API_URL}/${DATAVERSE_SO_LINES_TABLE}?$select=${soLinesSelect}&$filter=${soFilter}&$orderby=mserp_linenumber asc`;
    const spaUrl    = `${DATAVERSE_API_URL}/${DATAVERSE_SPA_LINES_TABLE}?$select=${spaSelect}&$filter=${spaFilter}&$top=2000`;

    const [linesRes, spaRes] = await Promise.all([
      fetch(soUrl,  FETCH_OPTS(token)),
      fetch(spaUrl, FETCH_OPTS(token)),
    ]);

    if (!linesRes.ok) throw new Error(`SO Lines ${linesRes.status}: ${await linesRes.text()}`);
    if (!spaRes.ok)   throw new Error(`SPA Lines ${spaRes.status}: ${await spaRes.text()}`);

    const soLines = (await linesRes.json()).value ?? [];
    const spaRaw  = (await spaRes.json()).value   ?? [];

    // Filter active SPA lines in code (date OData filter unreliable on virtual tables)
    const RELATION = { 200000000: 0, 200000001: 1, 200000002: 2 };
    const activeSpaLines = spaRaw
      .filter(s => { const end = s.mserp_vysspaheadertable_enddate; return !end || end >= today; })
      .map(s => ({
        spaId:           s.mserp_spaid,
        spaDesc:         s.mserp_vysspaheadertable_description,
        vendorId:        s.mserp_vysspaheadertable_vendorid,
        endDate:         s.mserp_vysspaheadertable_enddate,
        productRelation: RELATION[s.mserp_productrelation] ?? 0,
        item:            s.mserp_itemoritemgroup,
        customerRelation:RELATION[s.mserp_accountrelation] ?? 0,
        customer:        s.mserp_custorcustgroup,
      }));

    const customerAccount = req.query.customerAccount ?? '';

    const result = soLines.map(so => {
      const match = matchSPA(so.mserp_itemnumber, customerAccount, activeSpaLines);
      return {
        id:              `${so.mserp_salesordernumber}-${so.mserp_linenumber}`,
        soId:            so.mserp_salesordernumber,
        lineNum:         so.mserp_linenumber,
        companyId:       so.mserp_dataareaid,
        item:            so.mserp_itemnumber,
        itemDescription: so.mserp_linedescription,
        uom:             so.mserp_salesunitsymbol,
        qty:             so.mserp_orderedsalesquantity,
        unitPrice:       so.mserp_salesprice,
        lineAmount:      so.mserp_lineamount,
        ...match,
      };
    });

    context.res = {
      status: 200, headers: cors,
      body: { success: true, count: result.length, value: result }
    };
  } catch (err) {
    context.log.error('GetSalesOrderLines error:', err.message);
    context.res = { status: 500, headers: cors, body: { success: false, error: err.message } };
  }
};
