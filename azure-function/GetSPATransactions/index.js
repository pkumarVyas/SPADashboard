const { getDataverseToken } = require('../shared/dataverseTokenCache');

const CORS = o => ({ 'Access-Control-Allow-Origin': o, 'Content-Type': 'application/json' });

let CACHED_JF = null; // journal vendor field (discovered once)

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
    const body = await res.text().catch(() => '');
    ctx.log.error(`${tag} FAILED ${res.status}: ${body.slice(0, 400)}`);
    return { value: [] };
  }
  return res.json();
}

function deriveStatus(statusName, hasPay) {
  if (hasPay) return 'Linked';
  const s = (statusName || '').toLowerCase();
  if (s.includes('cancel') || s.includes('reject') || s.includes('fail') || s.includes('void'))
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

  if (req.query.resetCache) { CACHED_JF = null; context.log('Cache cleared'); }

  // ?schema=trans|journal — raw schema dump
  if (req.query.schema) {
    const MAP = { journal: 'mserp_vysspatransjourdatav2entity', trans: 'mserp_vysspatransdatav2entity' };
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

    const TRANS_TABLE   = process.env.DATAVERSE_SPA_TRANS_TABLE   ?? 'mserp_vysspatransdatav2entities';
    const JOURNAL_TABLE = process.env.DATAVERSE_SPA_JOURNAL_TABLE ?? 'mserp_vysspatransjourdatav2entities';
    const PAYMENT_TABLE = process.env.DATAVERSE_SPA_PAYMENT_TABLE ?? 'mserp_vysspapaymentdetailsv2entities';

    const top    = Math.min(parseInt(req.query.top ?? '500', 10), 1000);
    const search = (req.query.filter ?? '').trim().toLowerCase();

    const dvH = {
      Authorization: `Bearer ${token}`,
      'OData-MaxVersion': '4.0', 'OData-Version': '4.0',
      Accept: 'application/json',
    };
    const coF = encodeURIComponent(`mserp_dataareaid eq '${DATAVERSE_COMPANY_ID}'`);

    // Discover journal vendor field once
    if (!CACHED_JF) {
      context.log('Discovering journal vendor field…');
      const jAttrs = await fetchSchema(token, DATAVERSE_API_URL, 'mserp_vysspatransjourdatav2entity');
      CACHED_JF = {
        vendor: pickField(jAttrs, 'String', 'vendid','vendorid','vendor','vendaccount','accountnum'),
      };
      context.log('Journal vendor field:', CACHED_JF.vendor);
    }
    const JF = CACHED_JF;

    // ── Parallel fetch: trans + journal + payment ─────────────────────────────
    // Trans: known fields from schema (no virtual fields in $select)
    const TRANS_SEL = 'mserp_spatransid,mserp_spaid,mserp_transrefid,mserp_itemid,mserp_spatransdate,mserp_spatransstatus';
    // Journal: transId + spaId + vendor + customer — joined by mserp_spatransid
    const JOURNAL_SEL = JF.vendor
      ? `mserp_spatransid,mserp_spaid,${JF.vendor},mserp_customer`
      : `mserp_spatransid,mserp_spaid,mserp_customer`;

    const [tRes, jRes, pRes] = await Promise.all([
      fetch(`${DATAVERSE_API_URL}/${TRANS_TABLE}?$select=${TRANS_SEL}&$filter=${coF}&$top=${top}&$orderby=mserp_spatransdate desc`, { headers: dvH }),
      fetch(`${DATAVERSE_API_URL}/${JOURNAL_TABLE}?$select=${JOURNAL_SEL}&$filter=${coF}&$top=${top}`, { headers: dvH }),
      fetch(`${DATAVERSE_API_URL}/${PAYMENT_TABLE}?$select=mserp_spatransid,mserp_spaid&$filter=${coF}&$top=${top}`, { headers: dvH }),
    ]);

    const [tJson, jJson, pJson] = await Promise.all([
      safeJson(tRes, 'TRANS',   context),
      safeJson(jRes, 'JOURNAL', context),
      safeJson(pRes, 'PAYMENT', context),
    ]);

    // ── Map records ───────────────────────────────────────────────────────────
    const trans = (tJson.value ?? []).map(r => ({
      transId:     r.mserp_spatransid   ?? '',
      spaId:       r.mserp_spaid        ?? '',
      salesOrderId:r.mserp_transrefid   ?? '',
      item:        r.mserp_itemid       ?? '',
      date:        r.mserp_spatransdate ?? null,
    }));

    // Journal keyed by mserp_spatransid — same join used in GetClaimsData
    const journalMap = new Map(
      (jJson.value ?? [])
        .filter(r => r.mserp_spatransid)
        .map(r => [r.mserp_spatransid, {
          vendor:   JF.vendor ? (r[JF.vendor] ?? '') : '',
          customer: r.mserp_customer ?? '',
        }])
    );

    // Payment set — transIds that have a payment → "Linked"
    const paidTransIds = new Set(
      (pJson.value ?? []).map(r => r.mserp_spatransid).filter(Boolean)
    );

    // ── Join & build rows ─────────────────────────────────────────────────────
    let rows = trans.map(t => {
      const j = journalMap.get(t.transId) ?? {};
      return {
        transId:     t.transId,
        spaId:       t.spaId,
        salesOrderId:t.salesOrderId,
        item:        t.item,
        customer:    j.customer ?? '',
        vendor:      j.vendor   ?? '',
        date:        t.date,
        status:      deriveStatus('', paidTransIds.has(t.transId)),
      };
    });

    if (search) {
      rows = rows.filter(r =>
        r.transId.toLowerCase().includes(search)      ||
        r.spaId.toLowerCase().includes(search)        ||
        r.salesOrderId.toLowerCase().includes(search) ||
        r.item.toLowerCase().includes(search)         ||
        r.customer.toLowerCase().includes(search)     ||
        r.vendor.toLowerCase().includes(search)
      );
    }

    context.log(`GetSPATransactions: trans=${trans.length} journal=${jJson.value?.length ?? 0} payments=${pJson.value?.length ?? 0} rows=${rows.length} joinHits=${rows.filter(r => r.vendor || r.customer).length}`);

    context.res = {
      status: 200, headers: cors,
      body: { success: true, count: rows.length, value: rows },
    };
  } catch (err) {
    context.log.error('GetSPATransactions error:', err.message);
    context.res = { status: 500, headers: cors, body: { success: false, error: err.message } };
  }
};
