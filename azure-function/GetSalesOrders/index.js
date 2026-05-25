const { getDataverseToken } = require('../shared/dataverseTokenCache');

const CORS = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Content-Type': 'application/json',
});

const SO_STATUS = {
  200000001: 'Open order',
  200000002: 'Delivered',
  200000003: 'Invoiced',
  200000004: 'Cancelled',
};

module.exports = async function (context, req) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  const cors   = CORS(origin);

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } };
    return;
  }

  try {
    const token = await getDataverseToken();
    const {
      DATAVERSE_API_URL,
      DATAVERSE_SO_HEADER_TABLE = 'mserp_salesorderheaderv4entities',
      DATAVERSE_COMPANY_ID      = 'USMF',
    } = process.env;

    const top    = Math.min(parseInt(req.query.top  ?? '100', 10), 500);
    const search = (req.query.filter ?? '').trim();

    const select = [
      'mserp_salesordernumber',
      'mserp_orderingcustomeraccountnumber',
      'mserp_salesordername',
      'mserp_currencycode',
      'mserp_dataareaid',
      'mserp_salesorderstatus',
      'mserp_ordercreationdatetime',
    ].join(',');

    // Build OData filter — push search server-side so only matching rows travel over the wire
    let filter = `mserp_dataareaid eq '${DATAVERSE_COMPANY_ID}'`;
    if (search) {
      const s = search.replace(/'/g, "''");   // escape single quotes
      filter += ` and (contains(mserp_salesordernumber,'${s}')`
              + ` or contains(mserp_orderingcustomeraccountnumber,'${s}')`
              + ` or contains(mserp_salesordername,'${s}'))`;
    }

    const url = `${DATAVERSE_API_URL}/${DATAVERSE_SO_HEADER_TABLE}`
      + `?$select=${select}`
      + `&$filter=${encodeURIComponent(filter)}`
      + `&$top=${top}`
      + `&$orderby=mserp_salesordernumber desc`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        Accept: 'application/json',
        Prefer: `odata.maxpagesize=${top}`,
      }
    });

    if (!res.ok) throw new Error(`SO Headers ${res.status}: ${await res.text()}`);

    const json   = await res.json();
    const result = (json.value ?? []).map(h => ({
      soId:            h.mserp_salesordernumber,
      customerAccount: h.mserp_orderingcustomeraccountnumber ?? '',
      customerName:    h.mserp_salesordername ?? '',
      currencyCode:    h.mserp_currencycode ?? '',
      companyId:       h.mserp_dataareaid ?? '',
      status:          SO_STATUS[h.mserp_salesorderstatus] ?? '',
      orderDate:       h.mserp_ordercreationdatetime ?? null,
    }));

    context.res = {
      status: 200, headers: cors,
      body: { success: true, count: result.length, top, value: result }
    };
  } catch (err) {
    context.log.error('GetSalesOrders error:', err.message);
    context.res = { status: 500, headers: cors, body: { success: false, error: err.message } };
  }
};
