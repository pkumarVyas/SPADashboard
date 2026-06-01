const { getDataverseToken } = require('../shared/dataverseTokenCache');

const CORS = o => ({ 'Access-Control-Allow-Origin': o, 'Content-Type': 'application/json' });
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Field mapping cache (persists across warm invocations) ────────────────────
// Schema discovery is expensive — run it once per function instance and reuse.
let CACHED_JF = null;

async function fetchSchema(token, apiUrl, entity) {
  const url = `${apiUrl}/EntityDefinitions(LogicalName='${entity}')/Attributes`
    + `?$select=LogicalName,DisplayName,AttributeType`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'OData-MaxVersion': '4.0', 'OData-Version': '4.0' }
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

// ── Helpers ───────────────────────────────────────────────────────────────────
async function safeJson(res, tag, ctx) {
  if (!res.ok) {
    ctx.log.warn(`${tag} ${res.status}: ${(await res.text().catch(()=>'')).slice(0,300)}`);
    return { value: [] };
  }
  return res.json();
}

function monthLabel(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt)) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
}
function monthAbbr(ym) { return MONTH_ABBR[parseInt(ym.split('-')[1])-1]; }

function fmt(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
module.exports = async function (context, req) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  const cors   = CORS(origin);

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } };
    return;
  }

  // Schema discovery endpoint (dev/debug only)
  if (req.query.schema) {
    const MAP = {
      journal: 'mserp_vysspatransjourdatav2entity',
      payment: 'mserp_vysspapaymentdetailsv2entity',
      trans:   'mserp_vysspatransdatav2entity',
    };
    try {
      const token = await getDataverseToken();
      const attrs = await fetchSchema(token, process.env.DATAVERSE_API_URL, MAP[req.query.schema] ?? MAP.journal);
      context.res = { status: 200, headers: cors, body: { entity: MAP[req.query.schema], count: attrs.length, attrs } };
    } catch(e) {
      context.res = { status: 500, headers: cors, body: { error: e.message } };
    }
    return;
  }

  // ?resetCache=1 forces re-discovery of field names (useful after schema changes)
  if (req.query.resetCache) {
    CACHED_JF = null;
    context.log('Field mapping cache cleared');
  }

  try {
    const token = await getDataverseToken();
    const { DATAVERSE_API_URL, DATAVERSE_COMPANY_ID = 'USMF' } = process.env;

    const JOURNAL_TABLE = process.env.DATAVERSE_SPA_JOURNAL_TABLE ?? 'mserp_vysspatransjourdatav2entities';
    const PAYMENT_TABLE = process.env.DATAVERSE_SPA_PAYMENT_TABLE ?? 'mserp_vysspapaymentdetailsv2entities';

    const dvH = { Authorization:`Bearer ${token}`, 'OData-MaxVersion':'4.0', 'OData-Version':'4.0', Accept:'application/json' };
    const coF = encodeURIComponent(`mserp_dataareaid eq '${DATAVERSE_COMPANY_ID}'`);

    // ── Phase 1: field mapping — discover once, cache for warm invocations ───
    if (!CACHED_JF) {
      context.log('Discovering journal field mapping (first load or cache cleared)…');
      const jAttrs = await fetchSchema(token, DATAVERSE_API_URL, 'mserp_vysspatransjourdatav2entity');
      CACHED_JF = {
        amount:     pickField(jAttrs, 'Decimal',  'claimamount','amount','lineamount','totalamount','socost','baseamount'),
        vendor:     pickField(jAttrs, 'String',   'vendid','vendorid','vendor','vendaccount','accountnum'),
        date:       pickField(jAttrs, 'DateTime', 'claimdate','transdate','spatransdate','journaldate','invoicedate','date'),
        status:     pickField(jAttrs, 'Picklist', 'claimstatus','spatransstatus','status','transstatus'),
        statusName: pickField(jAttrs, 'Virtual',  'claimstatusname','spatransstatusname','statusname'),
      };
      context.log('Journal field mapping discovered and cached:', CACHED_JF);
    } else {
      context.log('Using cached journal field mapping:', CACHED_JF);
    }
    const JF = CACHED_JF;

    // ── Phase 2: parallel data fetch (journal + payment only) ────────────────
    // Trans table removed — was only used for itemId in Recent Claims (section removed).
    // $top=1000 is sufficient for analytics; reduces payload vs previous 2000.
    const [jRes, pRes] = await Promise.all([
      fetch(`${DATAVERSE_API_URL}/${JOURNAL_TABLE}?$filter=${coF}&$top=1000`, { headers: dvH }),
      fetch(`${DATAVERSE_API_URL}/${PAYMENT_TABLE}?$filter=${coF}&$top=1000`, { headers: dvH }),
    ]);

    const [jJson, pJson] = await Promise.all([
      safeJson(jRes, 'JOURNAL', context),
      safeJson(pRes, 'PAYMENT', context),
    ]);

    const jRaw = jJson.value ?? [];
    const pRaw = pJson.value ?? [];

    // ── Map records ───────────────────────────────────────────────────────────
    const journal = jRaw.map(r => ({
      spaId:      r.mserp_spaid       ?? '',
      transId:    r.mserp_spatransid  ?? '',
      amount:     Math.abs(Number(JF.amount ? (r[JF.amount] ?? 0) : 0)),
      vendor:     JF.vendor ? (r[JF.vendor] ?? '') : '',
      date:       JF.date   ? (r[JF.date]   ?? null) : null,
      status:     JF.status ? (r[JF.status] ?? null) : null,
      statusName: JF.statusName ? (r[JF.statusName] ?? '') : '',
    }));

    const payments = pRaw.map(r => ({
      spaId:      r.mserp_spaid             ?? '',
      transId:    r.mserp_spatransid        ?? '',
      amount:     Math.abs(Number(r.mserp_amountpaid ?? 0)),
      date:       r.mserp_paymentdate       ?? null,
      statusName: r.mserp_paymentstatusname ?? '',
      voucher:    r.mserp_paymentvoucher    ?? '',
    }));

    // ── Join payments to journal by transId ───────────────────────────────────
    const payByTransId = new Map(payments.filter(p => p.transId).map(p => [p.transId, p]));
    const enriched     = journal.map(j => ({ ...j, payment: payByTransId.get(j.transId) ?? null }));

    // ── KPIs ──────────────────────────────────────────────────────────────────
    const totalClaimed = journal.reduce((s,j) => s + j.amount, 0);
    const totalPaid    = payments.reduce((s,p) => s + p.amount, 0);
    const outstanding  = Math.max(0, totalClaimed - totalPaid);
    const payRate      = totalClaimed > 0 ? totalPaid / totalClaimed * 100 : 0;

    const daysArr = enriched
      .filter(j => j.payment?.date && j.date)
      .map(j => Math.round((new Date(j.payment.date) - new Date(j.date)) / 86400000))
      .filter(d => d >= 0 && d < 730);
    const avgDaysToPay = daysArr.length
      ? Math.round(daysArr.reduce((a,b) => a+b, 0) / daysArr.length)
      : null;

    // ── 12-month trend ────────────────────────────────────────────────────────
    const now = new Date();
    const months = Array.from({length:12}, (_,i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11-i), 1);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    });
    const trend = Object.fromEntries(months.map(m => [m, { claimed:0, paid:0 }]));
    journal.forEach(j  => { const m = monthLabel(j.date); if (m && trend[m]) trend[m].claimed += j.amount; });
    payments.forEach(p => { const m = monthLabel(p.date); if (m && trend[m]) trend[m].paid    += p.amount; });
    const chartData = months.map(m => ({
      month:   monthAbbr(m),
      claimed: Math.round(trend[m].claimed / 1000),
      paid:    Math.round(trend[m].paid    / 1000),
    }));

    // ── Top 10 vendors ────────────────────────────────────────────────────────
    const vmap = {};
    journal.forEach(j => {
      if (!j.vendor) return;
      const v = vmap[j.vendor] = vmap[j.vendor] ?? { vendor:j.vendor, claimed:0, paid:0, count:0 };
      v.claimed += j.amount; v.count++;
    });
    enriched.forEach(j => {
      if (j.vendor && j.payment && vmap[j.vendor]) vmap[j.vendor].paid += j.payment.amount;
    });
    const vendors = Object.values(vmap)
      .sort((a,b) => b.claimed - a.claimed)
      .slice(0, 10)
      .map(v => ({ vendor:v.vendor, claimed:Math.round(v.claimed), paid:Math.round(v.paid), count:v.count, claimedFmt:fmt(v.claimed), paidFmt:fmt(v.paid) }));

    // ── Claims by status ──────────────────────────────────────────────────────
    const smap = {};
    journal.forEach(j => {
      const k = j.statusName || String(j.status ?? 'Unknown');
      (smap[k] = smap[k] ?? { status:k, count:0, amount:0 }).count++;
      smap[k].amount += j.amount;
    });
    const totalForStatus = totalClaimed || 1;
    const statusBreakdown = Object.values(smap)
      .sort((a,b) => b.amount - a.amount)
      .map(s => ({ status:s.status, count:s.count, amount:Math.round(s.amount), amountFmt:fmt(s.amount), pct:Math.round(s.amount/totalForStatus*100) }));

    // ── Aging (unpaid claims) ─────────────────────────────────────────────────
    const today = Date.now();
    const ab = { a:{c:0,amt:0}, b:{c:0,amt:0}, c:{c:0,amt:0}, d:{c:0,amt:0} };
    enriched.filter(j => !j.payment).forEach(j => {
      const days = j.date ? Math.round((today - new Date(j.date)) / 86400000) : 0;
      const k = days<=30?'a':days<=60?'b':days<=90?'c':'d';
      ab[k].c++; ab[k].amt += j.amount;
    });
    const totalAging = Object.values(ab).reduce((s,b) => s+b.amt, 0);
    const agingBuckets = [
      { label:'0–30 d',  ...ab.a, pct: totalAging ? Math.round(ab.a.amt/totalAging*100):0, tier:'low',  danger:false },
      { label:'31–60 d', ...ab.b, pct: totalAging ? Math.round(ab.b.amt/totalAging*100):0, tier:'med',  danger:false },
      { label:'61–90 d', ...ab.c, pct: totalAging ? Math.round(ab.c.amt/totalAging*100):0, tier:'high', danger:false },
      { label:'90+ d',   ...ab.d, pct: totalAging ? Math.round(ab.d.amt/totalAging*100):0, tier:'crit', danger:true  },
    ].map(b => ({ ...b, amountFmt: fmt(b.amt) }));

    context.res = {
      status: 200, headers: cors,
      body: {
        success: true,
        kpis: {
          totalClaimed:  { label: fmt(totalClaimed),                                raw: totalClaimed  },
          totalPaid:     { label: fmt(totalPaid),                                   raw: totalPaid     },
          outstanding:   { label: fmt(outstanding),                                 raw: outstanding   },
          payRate:       { label: `${payRate.toFixed(1)}%`,                        raw: payRate       },
          avgDaysToPay:  { label: avgDaysToPay != null ? `${avgDaysToPay} d` : '—', raw: avgDaysToPay },
        },
        chartData,
        vendors,
        statusBreakdown,
        agingBuckets,
        counts: { journal: jRaw.length, payments: pRaw.length },
      },
    };
  } catch(err) {
    context.log.error('GetClaimsData error:', err.message);
    context.res = { status: 500, headers: cors, body: { success: false, error: err.message } };
  }
};
