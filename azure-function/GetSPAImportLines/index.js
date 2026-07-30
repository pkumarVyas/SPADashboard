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

const D365_LINE_ENTITY = process.env.D365_SPA_LINE_ENTITY ?? 'mserp_vysspaagreemententities';

// Staged lines hold the values extracted from the source document, which is what the
// review screen exists to check. They are joined to their header by cr876_vysspaheaderid
// (a plain text column holding the header GUID — not a Dataverse lookup, so there is no
// referential integrity or cascade delete).
const STAGING_SELECT = [
  'crfc2_vysspaagreementlinetableid',
  'cr876_vysspaheaderid',
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

// Used when a staged record has no lines of its own — the SPA as it currently stands in D365.
const D365_SELECT = [
  'mserp_vysspaagreemententityid',
  'mserp_linenum',
  'mserp_spaid',
  'mserp_spacode',
  'mserp_itemoritemgroup',
  'mserp_custorcustgroup',
  'mserp_spacost',
  'mserp_costtype',
  'mserp_spacostcommission',
  'mserp_discpct',
  'mserp_discamt',
  'mserp_minqty',
  'mserp_maxqty',
].join(',');

const esc = v => String(v).replace(/'/g, "''");

function mapStagingLine(r, idx) {
  return {
    id:                r.crfc2_vysspaagreementlinetableid,
    lineNum:           idx + 1,
    spaId:             r.crfc2_spaid          ?? '',
    spaCode:           r.crfc2_spacode        ?? '',
    itemId:            r.crfc2_itemid         ?? '',
    customer:          r.crfc2_customer       ?? '',
    spaCost:           r.crfc2_spacost        ?? 0,
    spaCostType:       r.crfc2_spacosttype    ?? '',
    spaCostCommission: r.crfc2_spacostcommission ?? null,
    discountPct:       r.crfc2_discountpercentage ?? null,
    discountAmount:    r.crfc2_discountamount ?? null,
    minQty:            r.crfc2_minquantity    ?? 0,
    maxQty:            r.crfc2_maxquantity    ?? null,
    minMarginPct:      r.crfc2_minimummarginpct ?? null,
  };
}

function mapD365Line(r, idx) {
  return {
    id:                r.mserp_vysspaagreemententityid,
    lineNum:           r.mserp_linenum ?? idx + 1,
    spaId:             r.mserp_spaid            ?? '',
    spaCode:           r.mserp_spacode          ?? '',
    itemId:            r.mserp_itemoritemgroup  ?? '',
    customer:          r.mserp_custorcustgroup  ?? '',
    spaCost:           r.mserp_spacost          ?? 0,
    spaCostType:       r.mserp_costtype         ?? '',
    spaCostCommission: r.mserp_spacostcommission ?? null,
    discountPct:       r.mserp_discpct          ?? null,
    discountAmount:    r.mserp_discamt          ?? null,
    minQty:            r.mserp_minqty           ?? 0,
    maxQty:            r.mserp_maxqty           ?? null,
    minMarginPct:      null,
  };
}

module.exports = async function (context, req) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  const cors   = CORS(origin);

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } };
    return;
  }

  const headerId         = req.query.headerId;
  const spaId            = req.query.spaId;
  const vendorApprovalId = req.query.vendorApprovalId;

  if (!headerId && !spaId && !vendorApprovalId) {
    context.res = { status: 400, headers: cors, body: { success: false, error: 'headerId, spaId or vendorApprovalId is required' } };
    return;
  }

  const respond = (source, rows, mapper) => {
    const lines = rows.map(mapper);
    context.res = { status: 200, headers: cors, body: { success: true, count: lines.length, source, value: lines } };
  };

  try {
    const token = await getDataverseToken();
    const { DATAVERSE_API_URL, DATAVERSE_COMPANY_ID = 'USMF' } = process.env;

    // ── 1. Preferred: staged lines joined on the header GUID ──
    if (headerId) {
      const filter = `cr876_vysspaheaderid eq '${esc(headerId)}'`;
      const url    = `${DATAVERSE_API_URL}/crfc2_vysspaagreementlinetables`
        + `?$select=${STAGING_SELECT}&$filter=${encodeURIComponent(filter)}&$orderby=crfc2_itemid asc`;

      const res = await fetch(url, FETCH_OPTS(token));
      if (!res.ok) throw new Error(`Staging line lookup ${res.status}: ${await res.text()}`);

      const { value = [] } = await res.json();
      if (value.length) return respond('staging-fk', value, mapStagingLine);
      context.log(`No staged lines for header ${headerId} — trying D365`);
    }

    // ── 2. The SPA as it currently stands in D365 ──
    if (spaId) {
      const filter = `mserp_dataareaid eq '${esc(DATAVERSE_COMPANY_ID)}' and mserp_spaid eq '${esc(spaId)}'`;
      const url    = `${DATAVERSE_API_URL}/${D365_LINE_ENTITY}`
        + `?$select=${D365_SELECT}&$filter=${encodeURIComponent(filter)}&$orderby=mserp_linenum asc`;

      const res = await fetch(url, FETCH_OPTS(token));
      if (!res.ok) throw new Error(`D365 line lookup ${res.status}: ${await res.text()}`);

      const { value = [] } = await res.json();
      if (value.length) return respond('d365', value, mapD365Line);
      context.log(`No D365 lines for SPA "${spaId}" — trying legacy SPA-number match`);
    }

    // ── 3. Legacy: imports predating the header FK, matched on the SPA number ──
    const keys = [vendorApprovalId, spaId].filter(Boolean);
    if (!keys.length) return respond('staging-fk', [], mapStagingLine);

    const clause = keys.map(k => `crfc2_spaid eq '${esc(k)}'`).join(' or ');
    const url    = `${DATAVERSE_API_URL}/crfc2_vysspaagreementlinetables`
      + `?$select=${STAGING_SELECT}&$filter=${encodeURIComponent(clause)}&$orderby=crfc2_itemid asc`;

    const res = await fetch(url, FETCH_OPTS(token));
    if (!res.ok) throw new Error(`Dataverse ${res.status}: ${await res.text()}`);

    const { value = [] } = await res.json();
    return respond('staging-legacy', value, mapStagingLine);
  } catch (err) {
    context.log.error('GetSPAImportLines error:', err.message);
    context.res = { status: 500, headers: cors, body: { success: false, error: err.message } };
  }
};
