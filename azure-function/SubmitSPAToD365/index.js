const { getDataverseToken } = require('../shared/dataverseTokenCache');
const { randomUUID } = require('crypto');

const CORS = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Content-Type': 'application/json',
});

// Parse D365/Dataverse error responses — they return { error: { code, message } }
async function d365Error(res) {
  const raw = await res.text();
  try {
    const j = JSON.parse(raw);
    const msg = j?.error?.message ?? j?.message ?? raw;
    return `(${res.status}) ${msg}`;
  } catch {
    return `(${res.status}) ${raw}`;
  }
}

function baseHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

// Convert "2026-05-12" → "2026-05-12T00:00:00Z"
function toDatetime(d) {
  if (!d) return null;
  return d.includes('T') ? d : `${d}T00:00:00Z`;
}

// Query the most recent SPA header matching the D365 number sequence format
// ({DataAreaId}-{NNNNNN}) and increment to get the next ID.
// D365's virtual table API won't auto-assign from the number sequence via Dataverse,
// so we mirror the sequence by finding the highest matching ID and incrementing.
async function generateSpaId(token, apiUrl, company) {
  try {
    // Only consider IDs that follow the standard format: USMF-000302, USMF-000303 …
    // startswith filter ensures we ignore test/manual entries like "Test9999" or "TIS-2026-Q2-3394"
    const prefix = `${company}-`;
    const url = `${apiUrl}/mserp_vysspaheaderdataentities`
      + `?$select=mserp_spaid`
      + `&$filter=mserp_dataareaid eq '${company}' and startswith(mserp_spaid,'${prefix}')`
      + `&$orderby=mserp_spaid desc`
      + `&$top=20`;
    const res  = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'OData-MaxVersion': '4.0', 'OData-Version': '4.0' }
    });
    if (!res.ok) return null;
    const json = await res.json();

    // Keep only IDs that strictly match  {prefix}{digits}  e.g. "USMF-000302"
    const pattern = new RegExp(`^${prefix.replace('-', '\\-')}(\\d+)$`);
    let bestNum = -1, bestPad = 6;
    for (const r of (json.value ?? [])) {
      const m = (r.mserp_spaid ?? '').match(pattern);
      if (!m) continue;
      const n = parseInt(m[1], 10);
      if (n > bestNum) { bestNum = n; bestPad = m[1].length; }
    }
    if (bestNum < 0) return null;

    const next   = bestNum + 1;
    const padded = String(next).padStart(bestPad, '0');
    return `${prefix}${padded}`;
  } catch {
    return null;
  }
}

module.exports = async function (context, req) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  const cors   = CORS(origin);

  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
    };
    return;
  }

  // GET ?schema=lines|header  →  return Dataverse attribute metadata so we can find correct field names
  if (req.method === 'GET') {
    const entity = req.query.schema === 'header'
      ? 'mserp_vysspaheaderdataentity'
      : 'mserp_vysspaagreemententity';
    try {
      const token = await getDataverseToken();
      const { DATAVERSE_API_URL } = process.env;
      const metaUrl = `${DATAVERSE_API_URL}/EntityDefinitions(LogicalName='${entity}')/Attributes`
        + `?$select=LogicalName,DisplayName,AttributeType,IsValidForCreate,IsValidForUpdate,RequiredLevel`
        + `&$orderby=LogicalName`;
      const metaRes = await fetch(metaUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'OData-MaxVersion': '4.0', 'OData-Version': '4.0' }
      });
      const metaJson = await metaRes.json();
      const attrs = (metaJson.value ?? []).map(a => ({
        logicalName:      a.LogicalName,
        displayName:      a.DisplayName?.UserLocalizedLabel?.Label ?? '',
        type:             a.AttributeType,
        validForCreate:   a.IsValidForCreate,
        requiredLevel:    a.RequiredLevel?.Value ?? '',
      }));
      // Highlight required + createable fields
      const required = attrs.filter(a => a.requiredLevel === 'SystemRequired' || a.requiredLevel === 'ApplicationRequired');
      context.res = { status: 200, headers: cors, body: { entity, required, all: attrs } };
    } catch (err) {
      context.res = { status: 500, headers: cors, body: { error: err.message } };
    }
    return;
  }

  const { header, lines = [], importId } = req.body ?? {};

  if (!header?.vendorId) {
    context.res = {
      status: 400, headers: cors,
      body: { success: false, error: 'header.vendorId is required' },
    };
    return;
  }

  try {
    const token = await getDataverseToken();
    const {
      DATAVERSE_API_URL,
      DATAVERSE_SPA_LINES_TABLE,
      DATAVERSE_COMPANY_ID = 'USMF',
      DATAVERSE_CREATION_STATUS_SUBMITTED,
      DATAVERSE_CREATION_STATUS_FAILED,
    } = process.env;

    const suppliedSpaId = (header.spaId ?? '').trim();
    const autoGenerate  = !suppliedSpaId;

    let assignedSpaId = suppliedSpaId;
    if (autoGenerate) {
      assignedSpaId = await generateSpaId(token, DATAVERSE_API_URL, DATAVERSE_COMPANY_ID);
      if (!assignedSpaId) {
        context.res = {
          status: 400, headers: cors,
          body: { success: false, error: 'Could not auto-generate SPA ID: no existing SPA records found to determine the sequence format. Please provide a SPA ID manually.' },
        };
        return;
      }
      context.log(`Auto-generated SPA ID from last sequence: ${assignedSpaId}`);
    } else {
      context.log(`SPA ID supplied: ${assignedSpaId}`);
    }

    // ── 1. Create lines via composite entity (header created on first line POST) ──
    const lineResults = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];

      const lineBody = {
        // Primary key — must be supplied for virtual table line entities
        mserp_vysspaagreemententityid: randomUUID(),

        mserp_spaid:   assignedSpaId,
        mserp_spacode: header.spaCode || '',

        mserp_vysspaheadertable_spaid: assignedSpaId,
        mserp_vysspaheadertable_spacode:      header.spaCode          || '',
        mserp_vysspaheadertable_description:  header.description       || '',
        mserp_vysspaheadertable_vendorid:     header.vendorId          || '',
        mserp_vysspaheadertable_vendapproval: header.vendorApprovalId  || '',
        mserp_vysspaheadertable_startdate:    toDatetime(header.startDate),
        mserp_vysspaheadertable_enddate:      toDatetime(header.endDate),
        mserp_vysspaheadertable_spastatus:    200000001,

        // Line data
        mserp_linenum:         i + 1,
        mserp_productrelation: 200000000,                           // Table (specific item)
        mserp_itemoritemgroup: l.itemId              || '',
        mserp_accountrelation: l.customer ? 200000000 : 200000002,  // Table or All
        mserp_custorcustgroup: l.customer            || '',
        mserp_spacost:         Number(l.spaCost)         || 0,
        mserp_costtype:        l.spaCostType          || '',
        mserp_discpct:         Number(l.discountPct)     || 0,
        mserp_discamt:         Number(l.discountAmount)  || 0,
        mserp_minqty:          Number(l.minQty)          || 0,
        mserp_maxqty:          Number(l.maxQty)          || 0,
        mserp_dataareaid:      DATAVERSE_COMPANY_ID,
      };

      context.log(`Sending line ${i + 1}:`, JSON.stringify(lineBody));

      const lineRes = await fetch(
        `${DATAVERSE_API_URL}/${DATAVERSE_SPA_LINES_TABLE}`,
        {
          method:  'POST',
          headers: { ...baseHeaders(token), Prefer: 'return=minimal' },
          body:    JSON.stringify(lineBody),
        }
      );

      if (!lineRes.ok) {
        const errMsg = await d365Error(lineRes);
        context.log.error(`Line ${i + 1} (${l.itemId}) failed:`, errMsg);
        lineResults.push({ lineNum: i + 1, itemId: l.itemId, ok: false, error: errMsg });
      } else {
        context.log(`Line ${i + 1} created OK`);
        lineResults.push({ lineNum: i + 1, itemId: l.itemId, ok: true });
      }
    }

    // ── 2. Sync all edited header fields back to the Dataverse import record ──
    if (importId) {
      try {
        const patchBody = {
          crfc2_spaid:                    assignedSpaId,
          crfc2_spacode:                  header.spaCode          || '',
          crfc2_spaagreementdescription:  header.description       || '',
          crfc2_vendorid:                 header.vendorId          || '',
          crfc2_vendorapprovalid:         header.vendorApprovalId  || '',
          crfc2_startdate:                toDatetime(header.startDate),
          crfc2_enddate:                  toDatetime(header.endDate),
          crfc2_spastatus:                508510002,   // Approved
        };
        // Set creation status to Submitted if the option-set code is configured
        if (DATAVERSE_CREATION_STATUS_SUBMITTED) {
          patchBody.cr876_creationstatus = parseInt(DATAVERSE_CREATION_STATUS_SUBMITTED, 10);
        }
        const patchRes = await fetch(
          `${DATAVERSE_API_URL}/crfc2_vysspaheadertables(${importId})`,
          {
            method:  'PATCH',
            headers: baseHeaders(token),
            body:    JSON.stringify(patchBody),
          }
        );
        if (!patchRes.ok) context.log.warn('Dataverse sync patch failed:', await patchRes.text());
        else context.log('Dataverse import record updated — creation status set to Submitted');
      } catch (e) {
        context.log.warn('Dataverse sync patch error:', e.message);
      }
    }

    const failedLines = lineResults.filter(l => !l.ok);
    context.res = {
      status: 200, headers: cors,
      body: {
        success:      true,
        assignedSpaId,
        autoGenerated: autoGenerate,
        lineResults,
        warning: failedLines.length
          ? `${failedLines.length} line(s) failed — check item IDs: ${failedLines.map(l => `Line ${l.lineNum} "${l.itemId}": ${l.error}`).join(' | ')}`
          : null,
      },
    };
  } catch (err) {
    context.log.error('SubmitSPAToD365 error:', err.message);
    // Patch Dataverse creation status to Failed so the record shows the outcome
    const {
      DATAVERSE_API_URL,
      DATAVERSE_CREATION_STATUS_FAILED,
    } = process.env;
    if (req.body?.importId && DATAVERSE_CREATION_STATUS_FAILED) {
      try {
        const token = await getDataverseToken();
        await fetch(
          `${DATAVERSE_API_URL}/crfc2_vysspaheadertables(${req.body.importId})`,
          {
            method:  'PATCH',
            headers: baseHeaders(token),
            body:    JSON.stringify({ cr876_creationstatus: parseInt(DATAVERSE_CREATION_STATUS_FAILED, 10) }),
          }
        );
      } catch { /* best-effort */ }
    }
    context.res = {
      status: 500, headers: cors,
      body: { success: false, error: err.message },
    };
  }
};
