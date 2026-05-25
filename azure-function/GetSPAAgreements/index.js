const { getDataverseToken } = require('../shared/dataverseTokenCache');

const CORS = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Content-Type': 'application/json',
});

// Option-set decoders
const SPA_STATUS = {
  200000000: 'Draft',
  200000001: 'Open',
  200000002: 'Created',
  200000003: 'Active',
  200000004: 'Expired',
  200000005: 'Cancelled',
};
const RSP_TYPE = {
  200000000: '',
  200000001: 'New',
  200000002: 'Renewal',
  200000003: 'Amendment',
};
const noYes = v => v === 200000001;

function fmt(dateStr) {
  if (!dateStr) return '';
  return dateStr.split('T')[0]; // "2025-02-22T00:00:00Z" → "2025-02-22"
}

function mapHeader(r) {
  return {
    id:                 r.mserp_spaid,
    spaCode:            r.mserp_spacode,
    description:        r.mserp_description,
    status:             SPA_STATUS[r.mserp_spastatus] ?? String(r.mserp_spastatus),
    vendorId:           r.mserp_vendorid,
    vendorApprovalId:   r.mserp_vendapproval ?? '',
    inactive:           noYes(r.mserp_stopped),
    startDate:          fmt(r.mserp_startdate),
    endDate:            fmt(r.mserp_enddate),
    distributorDealId:  r.mserp_dealid ?? '',
    systemExchangeRate: r.mserp_exchrate ?? 100,
    sourceSpaId:        r.mserp_sourcespaid ?? '',
    companyId:          r.mserp_dataareaid ?? '',
    manufacturer:       r.mserp_manufacturer ?? '',
    rspType:            RSP_TYPE[r.mserp_rsptype] ?? '',
    rspId:              r.mserp_rspid ?? '',
    rspCompanyId:       r.mserp_rspcompanyid ?? '',
    claimCurrency:      r.mserp_claimcurrency ?? '',
    currencyCode:       r.mserp_currencycode ?? '',
    primaryKey:         r.mserp_vysspaheaderdataentityid,
  };
}

const SELECT = [
  'mserp_spaid', 'mserp_spacode', 'mserp_description', 'mserp_spastatus',
  'mserp_vendorid', 'mserp_vendapproval', 'mserp_stopped',
  'mserp_startdate', 'mserp_enddate', 'mserp_dealid', 'mserp_exchrate',
  'mserp_sourcespaid', 'mserp_dataareaid', 'mserp_manufacturer',
  'mserp_rsptype', 'mserp_rspid', 'mserp_rspcompanyid',
  'mserp_claimcurrency', 'mserp_currencycode',
  'mserp_vysspaheaderdataentityid',
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

  try {
    const token = await getDataverseToken();
    const { DATAVERSE_API_URL, DATAVERSE_SPA_HEADER_TABLE, DATAVERSE_COMPANY_ID = 'USMF' } = process.env;

    const top    = Math.min(parseInt(req.query.top ?? '100', 10), 500);
    const search = (req.query.filter ?? '').trim();

    // Build OData filter — push search to server so only matching rows travel the wire
    let filter = `mserp_dataareaid eq '${DATAVERSE_COMPANY_ID}'`;
    if (search) {
      const s = search.replace(/'/g, "''");
      filter += ` and (contains(mserp_spaid,'${s}')`
              + ` or contains(mserp_description,'${s}')`
              + ` or contains(mserp_spacode,'${s}')`
              + ` or contains(mserp_vendorid,'${s}'))`;
    }

    const url = `${DATAVERSE_API_URL}/${DATAVERSE_SPA_HEADER_TABLE}`
      + `?$select=${SELECT}`
      + `&$filter=${encodeURIComponent(filter)}`
      + `&$top=${top}`
      + `&$orderby=mserp_spaid desc`;

    const dvRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        Accept: 'application/json',
        Prefer: `odata.maxpagesize=${top}`,
      }
    });

    if (!dvRes.ok) throw new Error(`Dataverse ${dvRes.status}: ${await dvRes.text()}`);

    const json  = await dvRes.json();
    const items = (json.value ?? []).map(mapHeader);

    context.res = { status: 200, headers: cors, body: { success: true, count: items.length, top, value: items } };
  } catch (err) {
    context.log.error('GetSPAAgreements error:', err.message);
    context.res = { status: 500, headers: cors, body: { success: false, error: err.message } };
  }
};
