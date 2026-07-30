const { getDataverseToken } = require('../shared/dataverseTokenCache');

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

const esc = v => String(v).replace(/'/g, "''");

// Only include a numeric field in a PATCH when the form actually supplied a value —
// coercing blanks to 0 would overwrite real D365 data.
function num(v) {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function assignDefined(target, fields) {
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) target[k] = v;
  }
  return target;
}

// The SPA is created in D365 F&O by the Power Automate import flow, which leaves the
// SPA ID blank so D365 assigns it from its own number sequence. The document's SPA
// number is carried across as the vendor approval ID, so that is the only reliable
// key linking a staged import back to the SPA D365 created for it.
const D365_HEADER_ENTITY = process.env.D365_SPA_HEADER_ENTITY ?? 'mserp_vysspaheaderdataentities';
const D365_LINE_ENTITY   = process.env.D365_SPA_LINE_ENTITY   ?? 'mserp_vysspaagreemententities';

async function findD365Spa(token, apiUrl, company, { spaId, vendorApprovalId }) {
  // Prefer the assigned SPA ID when the flow has already written it back; otherwise fall
  // back to the document SPA number carried as vendor approval.
  const scope  = `mserp_dataareaid eq '${esc(company)}'`;
  const filter = spaId
    ? `${scope} and mserp_spaid eq '${esc(spaId)}'`
    : `${scope} and mserp_vendapproval eq '${esc(vendorApprovalId)}'`;
  const url = `${apiUrl}/${D365_HEADER_ENTITY}`
    + `?$select=mserp_spaid,mserp_vysspaheaderdataentityid`
    + `&$filter=${encodeURIComponent(filter)}&$top=5`;
  const res = await fetch(url, { headers: baseHeaders(token) });
  if (!res.ok) throw new Error(`SPA lookup failed: ${await d365Error(res)}`);
  const { value = [] } = await res.json();
  return value;
}

async function fetchD365Lines(token, apiUrl, spaId) {
  const filter = `mserp_spaid eq '${esc(spaId)}'`;
  const url = `${apiUrl}/${D365_LINE_ENTITY}`
    + `?$select=mserp_vysspaagreemententityid,mserp_linenum`
    + `&$filter=${encodeURIComponent(filter)}&$orderby=mserp_linenum asc`;
  const res = await fetch(url, { headers: baseHeaders(token) });
  if (!res.ok) throw new Error(`Line lookup failed: ${await d365Error(res)}`);
  const { value = [] } = await res.json();
  return value;
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
      const required = attrs.filter(a => a.requiredLevel === 'SystemRequired' || a.requiredLevel === 'ApplicationRequired');
      context.res = { status: 200, headers: cors, body: { entity, required, all: attrs } };
    } catch (err) {
      context.res = { status: 500, headers: cors, body: { error: err.message } };
    }
    return;
  }

  const { header, lines = [], importId } = req.body ?? {};

  if (!header?.spaId && !header?.vendorApprovalId) {
    context.res = {
      status: 400, headers: cors,
      body: { success: false, error: 'header.spaId or header.vendorApprovalId is required to locate the SPA in D365.' },
    };
    return;
  }

  const {
    DATAVERSE_API_URL,
    DATAVERSE_COMPANY_ID = 'USMF',
    DATAVERSE_CREATION_STATUS_SUBMITTED,
    DATAVERSE_CREATION_STATUS_FAILED,
  } = process.env;

  // Flip the staged import record to Failed so a bad outcome is visible in the list
  // rather than silently leaving it Pending.
  async function markFailed(token) {
    if (!importId || !DATAVERSE_CREATION_STATUS_FAILED) return;
    try {
      await fetch(`${DATAVERSE_API_URL}/crfc2_vysspaheadertables(${importId})`, {
        method:  'PATCH',
        headers: baseHeaders(token),
        body:    JSON.stringify({ cr876_creationstatus: parseInt(DATAVERSE_CREATION_STATUS_FAILED, 10) }),
      });
    } catch { /* best-effort */ }
  }

  let token;
  try {
    token = await getDataverseToken();

    // ── 1. Locate the SPA that the import flow created in D365 ──
    const lookupBy    = header.spaId ? 'SPA ID' : 'vendor approval';
    const lookupValue = header.spaId || header.vendorApprovalId;
    const matches     = await findD365Spa(token, DATAVERSE_API_URL, DATAVERSE_COMPANY_ID, header);

    if (!matches.length) {
      await markFailed(token);
      context.res = {
        status: 404, headers: cors,
        body: {
          success: false,
          error: `No SPA found in D365 with ${lookupBy} "${lookupValue}". `
               + `The import flow may still be running, or it did not create the SPA for this document.`,
        },
      };
      return;
    }
    if (matches.length > 1) {
      await markFailed(token);
      context.res = {
        status: 409, headers: cors,
        body: {
          success: false,
          error: `${matches.length} SPAs in D365 share ${lookupBy} "${lookupValue}" `
               + `(${matches.map(m => m.mserp_spaid).join(', ')}). Resolve the duplicate before submitting.`,
        },
      };
      return;
    }

    const assignedSpaId = matches[0].mserp_spaid;
    const d365HeaderId  = matches[0].mserp_vysspaheaderdataentityid;
    context.log(`Matched ${lookupBy} "${lookupValue}" to D365 SPA ${assignedSpaId}`);

    // ── 2. Push edited header fields to the existing D365 SPA ──
    const headerPatch = assignDefined({}, {
      mserp_spacode:      header.spaCode,
      mserp_description:  header.description,
      mserp_vendorid:     header.vendorId,
      mserp_startdate:    toDatetime(header.startDate),
      mserp_enddate:      toDatetime(header.endDate),
    });

    const hdrRes = await fetch(
      `${DATAVERSE_API_URL}/${D365_HEADER_ENTITY}(${d365HeaderId})`,
      { method: 'PATCH', headers: baseHeaders(token), body: JSON.stringify(headerPatch) }
    );
    if (!hdrRes.ok) {
      const errMsg = await d365Error(hdrRes);
      context.log.error(`Header update failed for ${assignedSpaId}:`, errMsg);
      await markFailed(token);
      context.res = {
        status: 502, headers: cors,
        body: { success: false, assignedSpaId, error: `Could not update SPA ${assignedSpaId} in D365: ${errMsg}` },
      };
      return;
    }

    // ── 3. Push edited lines, matched to their D365 counterparts by line number ──
    const lineResults = [];
    if (lines.length) {
      const d365Lines = await fetchD365Lines(token, DATAVERSE_API_URL, assignedSpaId);
      const byLineNum = new Map(d365Lines.map(l => [Number(l.mserp_linenum), l]));

      for (let i = 0; i < lines.length; i++) {
        const l       = lines[i];
        const lineNum = Number(l.lineNum ?? i + 1);
        const target  = byLineNum.get(lineNum);

        if (!target) {
          lineResults.push({ lineNum, itemId: l.itemId, ok: false, error: 'no matching line in D365' });
          continue;
        }

        const linePatch = assignDefined({}, {
          mserp_itemoritemgroup: l.itemId,
          mserp_custorcustgroup: l.customer,
          mserp_costtype:        l.spaCostType,
          mserp_spacost:         num(l.spaCost),
          mserp_discpct:         num(l.discountPct),
          mserp_discamt:         num(l.discountAmount),
          mserp_minqty:          num(l.minQty),
          mserp_maxqty:          num(l.maxQty),
        });

        const lineRes = await fetch(
          `${DATAVERSE_API_URL}/${D365_LINE_ENTITY}(${target.mserp_vysspaagreemententityid})`,
          { method: 'PATCH', headers: { ...baseHeaders(token), Prefer: 'return=minimal' }, body: JSON.stringify(linePatch) }
        );

        if (!lineRes.ok) {
          const errMsg = await d365Error(lineRes);
          context.log.error(`Line ${lineNum} (${l.itemId}) update failed:`, errMsg);
          lineResults.push({ lineNum, itemId: l.itemId, ok: false, error: errMsg });
        } else {
          lineResults.push({ lineNum, itemId: l.itemId, ok: true });
        }
      }
    }

    // ── 4. Sync the real SPA ID and edited fields back to the staged import record ──
    let syncWarning = null;
    if (importId) {
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
      if (DATAVERSE_CREATION_STATUS_SUBMITTED) {
        patchBody.cr876_creationstatus = parseInt(DATAVERSE_CREATION_STATUS_SUBMITTED, 10);
      }
      const patchRes = await fetch(
        `${DATAVERSE_API_URL}/crfc2_vysspaheadertables(${importId})`,
        { method: 'PATCH', headers: baseHeaders(token), body: JSON.stringify(patchBody) }
      );
      if (!patchRes.ok) {
        syncWarning = `SPA ${assignedSpaId} was updated in D365, but writing it back to the import record failed: ${await d365Error(patchRes)}`;
        context.log.warn(syncWarning);
      } else {
        context.log(`Import record updated — SPA ID ${assignedSpaId}, creation status Submitted`);
      }
    }

    const failedLines = lineResults.filter(l => !l.ok);
    const warnings = [
      failedLines.length
        ? `${failedLines.length} line(s) failed: ${failedLines.map(l => `Line ${l.lineNum} "${l.itemId}": ${l.error}`).join(' | ')}`
        : null,
      syncWarning,
    ].filter(Boolean);

    context.res = {
      status: 200, headers: cors,
      body: {
        success:       true,
        assignedSpaId,
        autoGenerated: true,           // D365's number sequence assigned it, not this app
        lineResults,
        warning: warnings.length ? warnings.join(' — ') : null,
      },
    };
  } catch (err) {
    context.log.error('SubmitSPAToD365 error:', err.message);
    if (token) await markFailed(token);
    context.res = {
      status: 500, headers: cors,
      body: { success: false, error: err.message },
    };
  }
};
