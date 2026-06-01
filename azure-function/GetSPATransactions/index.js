const { getDataverseToken } = require('../shared/dataverseTokenCache');

const CORS = o => ({ 'Access-Control-Allow-Origin': o, 'Content-Type': 'application/json' });

// ── Field-mapping caches (warm across invocations) ────────────────────────────
let CACHED_JF = null; // journal fields
let CACHED_TF = null; // trans fields

async function fetchSchema(token, apiUrl, entity) {
  const url = `${apiUrl}/EntityDefinitions(LogicalName='${entity}')/Attributes`
    + `?$select=LogicalName,DisplayName,AttributeType`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json',
                'OData-MaxVersion': '4.0', 'OData-Version': '4.0' }
  });
  if (!res.ok) return [];
  const j = await res.json();
  return j.value ?? [];
}

function pickField(attrs, type, ...pats) {
  const eligible = attrs.filter(a =>
    a.LogicalName !== 'versionnumber' &&
    !a.LogicalName.endsWith('_idname') &&
    a.AttributeType !== 'Lookup' &&
    a.AttributeType !== 'Owner' &&
    a.AttributeType !== 'Customer' &&
    (type === 'Virtual' || a.AttributeType !== 'Virtual')
  );
  for (const scope of ['logical', 'display']) {
    for (const pat of pats) {
      const lp = pat.toLowerCase();
      const match = eligible.find(a => {
        const hay = scope === 'logical'
          ? a.LogicalName.toLowerCase()
          : (a.DisplayName?.UserLocalizedLabel?.Label ?? '').toLowerCase();
        return (!type || a.AttributeType === type) && hay.includes(lp);
      });
      if (match) return match.LogicalName;
    }
  }
  return null;
}

async function safeJson(res, tag, ctx) {
  if (!res.ok) {
    ctx.log.warn(`${tag} ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
    return { value: [] };
  }
  return res.json();
}

// Derive display status from journal statusName + whether a payment exists
function deriveStatus(statusName, hasPay) {
  if (hasPay) return 'Linked';
  const s = (statusName || '').toLowerCase();
  if (s.includes('cancel') || s.includes('reject') || s.includes('fail') || s.includes('error') || s.includes('void'))
    return 'Failed';
  return 'Invoiced';
}

// ─────────────────────────────────────────────────────────────────────────────
module.exports = async function (context, req) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  const cors   = CORS(origin);

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } };
    return;
  }

  // ?resetCache=1 clears field-mapping caches
  if (req.query.resetCache) { CACHED_JF = null; CACHED_TF = null; context.log('SPA Transactions cache cleared'); }

  // ?schema=trans|journal — raw schema dump for debugging
  if (req.query.schema) {
    const MAP = {
      journal: 'mserp_vysspatransjourdatav2entity',
      trans:   'mserp_vysspatransdatav2entity',
    };
    try {
      const token = await getDataverseToken();
      const attrs = await fetchSchema(token, process.env.DATAVERSE_API_URL, MAP[req.query.schema] ?? MAP.trans);
      context.res = { status: 200, headers: cors, body: { entity: MAP[req.query.schema], count: attrs.length, attrs } };
    } catch (e) {
      context.res = { status: 500, headers: cors, body: { error: e.message } };
    }
    return;
  }

  try {
    const token = await getDataverseToken();
    const { DATAVERSE_API_URL, DATAVERSE_COMPANY_ID = 'USMF' } = process.env;

    const JOURNAL_TABLE = process.env.DATAVERSE_SPA_JOURNAL_TABLE ?? 'mserp_vysspatransjourdatav2entities';
    const TRANS_TABLE   = process.env.DATAVERSE_SPA_TRANS_TABLE   ?? 'mserp_vysspatransdatav2entities';
    const PAYMENT_TABLE = process.env.DATAVERSE_SPA_PAYMENT_TABLE ?? 'mserp_vysspapaymentdetailsv2entities';

    const top    = Math.min(parseInt(req.query.top ?? '500', 10), 1000);
    const search = (req.query.filter ?? '').trim().toLowerCase();

    const dvH = {
      Authorization: `Bearer ${token}`,
      'OData-MaxVersion': '4.0', 'OData-Version': '4.0',
      Accept: 'application/json',
    };
    const coF = encodeURIComponent(`mserp_dataareaid eq '${DATAVERSE_COMPANY_ID}'`);

    // ── Phase 1: discover field mappings (cached) ─────────────────────────────
    if (!CACHED_JF) {
      context.log('Discovering journal field mapping…');
      const jAttrs = await fetchSchema(token, DATAVERSE_API_URL, 'mserp_vysspatransjourdatav2entity');
      CACHED_JF = {
        amount:     pickField(jAttrs, 'Decimal',  'claimamount','amount','lineamount','totalamount','socost','baseamount'),
        vendor:     pickField(jAttrs, 'String',   'vendid','vendorid','vendor','vendaccount','accountnum'),
        date:       pickField(jAttrs, 'DateTime', 'claimdate','transdate','spatransdate','journaldate','invoicedate','date'),
        status:     pickField(jAttrs, 'Picklist', 'claimstatus','spatransstatus','status','transstatus'),
        statusName: pickField(jAttrs, 'Virtual',  'claimstatusname','spatransstatusname','statusname'),
      };
      context.log('Journal fields:', CACHED_JF);
    }

    if (!CACHED_TF) {
      context.log('Discovering trans field mapping…');
      const tAttrs = await fetchSchema(token, DATAVERSE_API_URL, 'mserp_vysspatransdatav2entity');
      CACHED_TF = {
        salesOrderId: pickField(tAttrs, 'String', 'salesid','salesordernumber','salesnumber','salesref','salesorder'),
        itemId:       pickField(tAttrs, 'String', 'itemid','item','productnumber','itemnumber','product'),
        customer:     pickField(tAttrs, 'String', 'custaccount','customeraccount','custid','customer','custname'),
        custName:     pickField(tAttrs, 'String', 'custname','customername','name'),
        lineNum:      pickField(tAttrs, 'Decimal','linenum','linenumber','line'),
      };
      context.log('Trans fields:', CACHED_TF);
    }

    const JF = CACHED_JF;
    const TF = CACHED_TF;

    // ── Phase 2: parallel fetch ───────────────────────────────────────────────
    const [jRes, tRes, pRes] = await Promise.all([
      fetch(`${DATAVERSE_API_URL}/${JOURNAL_TABLE}?$filter=${coF}&$top=${top}`, { headers: dvH }),
      fetch(`${DATAVERSE_API_URL}/${TRANS_TABLE}?$filter=${coF}&$top=${top}`,   { headers: dvH }),
      fetch(`${DATAVERSE_API_URL}/${PAYMENT_TABLE}?$select=mserp_spatransid,mserp_spaid&$filter=${coF}&$top=${top}`, { headers: dvH }),
    ]);

    const [jJson, tJson, pJson] = await Promise.all([
      safeJson(jRes, 'JOURNAL', context),
      safeJson(tRes, 'TRANS',   context),
      safeJson(pRes, 'PAYMENT', context),
    ]);

    // ── Map raw records ───────────────────────────────────────────────────────
    const journal = (jJson.value ?? []).map(r => ({
      transId:    r.mserp_spatransid  ?? '',
      spaId:      r.mserp_spaid       ?? '',
      vendor:     JF.vendor     ? (r[JF.vendor]     ?? '') : '',
      date:       JF.date       ? (r[JF.date]       ?? null) : null,
      amount:     Math.abs(Number(JF.amount ? (r[JF.amount] ?? 0) : 0)),
      status:     JF.status     ? (r[JF.status]     ?? null) : null,
      statusName: JF.statusName ? (r[JF.statusName] ?? '') : '',
    }));

    const trans = (tJson.value ?? []).map(r => ({
      transId:     r.mserp_spatransid  ?? '',
      spaId:       r.mserp_spaid       ?? '',
      salesOrderId:TF.salesOrderId ? (r[TF.salesOrderId] ?? '') : '',
      itemId:      TF.itemId       ? (r[TF.itemId]       ?? '') : '',
      customer:    TF.custName     ? (r[TF.custName]     ?? (TF.customer ? r[TF.customer] ?? '' : '')) : (TF.customer ? r[TF.customer] ?? '' : ''),
    }));

    // Set of transIds that have at least one payment
    const paidTransIds = new Set(
      (pJson.value ?? []).map(r => r.mserp_spatransid).filter(Boolean)
    );

    // ── Build lookup maps ─────────────────────────────────────────────────────
    // Trans: keyed by transId (take first match per transId for SO/item/customer)
    const transMap = new Map();
    for (const t of trans) {
      if (t.transId && !transMap.has(t.transId)) transMap.set(t.transId, t);
    }

    // Journal: keyed by transId (there may be multiple journal entries per transId — take all)
    const journalByTransId = new Map();
    for (const j of journal) {
      if (!journalByTransId.has(j.transId)) journalByTransId.set(j.transId, j);
    }

    // ── Build result rows ─────────────────────────────────────────────────────
    // Primary key: journal records. Enrich each with trans data.
    // Also include trans records that have no matching journal.
    const seen = new Set();
    const rows = [];

    for (const j of journal) {
      const key = j.transId || j.spaId;
      if (seen.has(key)) continue;
      seen.add(key);

      const t = transMap.get(j.transId) ?? {};
      const hasPay = paidTransIds.has(j.transId);

      rows.push({
        transId:     j.transId,
        spaId:       j.spaId || t.spaId || '',
        salesOrderId:t.salesOrderId || '',
        item:        t.itemId || '',
        customer:    t.customer || '',
        vendor:      j.vendor,
        date:        j.date,
        amount:      j.amount,
        statusName:  j.statusName,
        status:      deriveStatus(j.statusName, hasPay),
      });
    }

    // Also include any trans records not seen in journal
    for (const t of trans) {
      if (!t.transId || seen.has(t.transId)) continue;
      seen.add(t.transId);
      const hasPay = paidTransIds.has(t.transId);
      rows.push({
        transId:     t.transId,
        spaId:       t.spaId,
        salesOrderId:t.salesOrderId,
        item:        t.itemId,
        customer:    t.customer,
        vendor:      '',
        date:        null,
        amount:      0,
        statusName:  '',
        status:      hasPay ? 'Linked' : 'Invoiced',
      });
    }

    // ── Apply search filter ───────────────────────────────────────────────────
    const filtered = search
      ? rows.filter(r =>
          r.transId.toLowerCase().includes(search)     ||
          r.spaId.toLowerCase().includes(search)       ||
          r.salesOrderId.toLowerCase().includes(search)||
          r.item.toLowerCase().includes(search)        ||
          r.customer.toLowerCase().includes(search)    ||
          r.vendor.toLowerCase().includes(search)
        )
      : rows;

    context.log(`GetSPATransactions: journal=${journal.length} trans=${trans.length} payments=${pJson.value?.length ?? 0} rows=${filtered.length}`);

    context.res = {
      status: 200,
      headers: cors,
      body: {
        success: true,
        count:   filtered.length,
        value:   filtered,
        _fieldMapping: { journal: JF, trans: TF },
      },
    };
  } catch (err) {
    context.log.error('GetSPATransactions error:', err.message);
    context.res = { status: 500, headers: cors, body: { success: false, error: err.message } };
  }
};
