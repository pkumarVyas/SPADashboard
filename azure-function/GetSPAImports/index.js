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
    // Include FormattedValue so option-set labels (e.g. CreationStatus) come back as text
    Prefer: 'odata.maxpagesize=500,odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
  }
});

// Dataverse custom option-set values for crfc2_spastatus
// Confirm exact values in your Dataverse option set configuration
const SPA_STATUS = {
  508510000: 'Pending Review',
  508510001: 'Extracted',
  508510002: 'Approved',
  508510003: 'Exception',
};

const SELECT = [
  'crfc2_vysspaheadertableid',
  'crfc2_spaid',
  'crfc2_spacode',
  'crfc2_spaagreementdescription',
  'crfc2_spastatus',
  'cr876_creationstatus',
  'crfc2_vendorid',
  'crfc2_vendorapprovalid',
  'crfc2_startdate',
  'crfc2_enddate',
  'cr876_spatemplate_name',
  'cr876_templatefilename',
  'createdon',
  'statecode',
].join(',');

function fmt(d) { return d ? d.split('T')[0] : ''; }

function mapHeader(r) {
  // Prefer the Dataverse-formatted label for option-set fields; fall back to raw value
  const creationStatusLabel =
    r['cr876_creationstatus@OData.Community.Display.V1.FormattedValue']
    ?? (r.cr876_creationstatus != null ? String(r.cr876_creationstatus) : '');

  return {
    id:           r.crfc2_vysspaheadertableid,
    spaId:        r.crfc2_spaid          ?? '',
    spaCode:      r.crfc2_spacode        ?? '',
    description:  r.crfc2_spaagreementdescription ?? '',
    status:       SPA_STATUS[r.crfc2_spastatus] ?? `Status ${r.crfc2_spastatus}`,
    statusCode:   r.crfc2_spastatus,
    creationStatus:     creationStatusLabel,
    creationStatusCode: r.cr876_creationstatus ?? null,
    vendorId:     r.crfc2_vendorid       ?? '',
    vendorApprovalId: r.crfc2_vendorapprovalid ?? '',
    startDate:    fmt(r.crfc2_startdate),
    endDate:      fmt(r.crfc2_enddate),
    templateName:     r.cr876_spatemplate_name  ?? '',
    templateFilename: r.cr876_templatefilename  ?? '',
    createdOn:        r.createdon               ?? '',
    active:       r.statecode === 0,
  };
}

const D365_HEADER_ENTITY = process.env.D365_SPA_HEADER_ENTITY ?? 'mserp_vysspaheaderdataentities';

// D365 F&O is the system of record for agreement data — the import flow creates the SPA
// there and no longer fully populates the staging record. The staging row remains the
// import registry (uploaded document, upload time, import status), so the two are merged:
// D365 wins for agreement fields, staging fills any gap.
async function fetchD365Headers(token, apiUrl, company) {
  const filter = `mserp_dataareaid eq '${String(company).replace(/'/g, "''")}'`;
  const url = `${apiUrl}/${D365_HEADER_ENTITY}`
    + `?$select=mserp_spaid,mserp_spacode,mserp_description,mserp_vendorid,mserp_vendapproval,mserp_startdate,mserp_enddate`
    + `&$filter=${encodeURIComponent(filter)}`;
  const res = await fetch(url, FETCH_OPTS(token));
  if (!res.ok) throw new Error(`D365 header lookup ${res.status}: ${await res.text()}`);
  const { value = [] } = await res.json();
  return new Map(value.filter(r => r.mserp_spaid).map(r => [r.mserp_spaid, r]));
}

const prefer = (d365, staged) => (d365 !== undefined && d365 !== null && d365 !== '') ? d365 : staged;

module.exports = async function (context, req) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  const cors   = CORS(origin);

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } };
    return;
  }

  // GET ?schema=creationstatus  →  return option-set values for cr876_creationstatus
  if (req.query.schema === 'creationstatus') {
    try {
      const token = await getDataverseToken();
      const { DATAVERSE_API_URL } = process.env;
      const metaUrl = `${DATAVERSE_API_URL}/EntityDefinitions(LogicalName='crfc2_vysspaheadertable')`
        + `/Attributes(LogicalName='cr876_creationstatus')`
        + `/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$expand=OptionSet`;
      const metaRes = await fetch(metaUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'OData-MaxVersion': '4.0', 'OData-Version': '4.0' }
      });
      const metaJson = await metaRes.json();
      const options = (metaJson?.OptionSet?.Options ?? []).map(o => ({
        value: o.Value,
        label: o.Label?.UserLocalizedLabel?.Label ?? '',
      }));
      context.res = { status: 200, headers: cors, body: { options } };
    } catch (err) {
      context.res = { status: 500, headers: cors, body: { error: err.message } };
    }
    return;
  }

  try {
    const token = await getDataverseToken();
    const { DATAVERSE_API_URL } = process.env;

    const url = `${DATAVERSE_API_URL}/crfc2_vysspaheadertables?$select=${SELECT}&$orderby=createdon desc`;

    const res  = await fetch(url, FETCH_OPTS(token));
    if (!res.ok) throw new Error(`Dataverse ${res.status}: ${await res.text()}`);

    const json = await res.json();
    let items  = (json.value ?? []).map(mapHeader);

    // Overlay D365 agreement data. Best-effort: if D365 is unreachable the list still
    // renders from staging rather than failing outright.
    try {
      const { DATAVERSE_COMPANY_ID = 'USMF' } = process.env;
      const d365 = await fetchD365Headers(token, DATAVERSE_API_URL, DATAVERSE_COMPANY_ID);
      items = items.map(i => {
        const d = i.spaId ? d365.get(i.spaId) : null;
        if (!d) return { ...i, inD365: false };
        return {
          ...i,
          spaCode:          prefer(d.mserp_spacode,      i.spaCode),
          description:      prefer(d.mserp_description,  i.description),
          vendorId:         prefer(d.mserp_vendorid,     i.vendorId),
          vendorApprovalId: prefer(d.mserp_vendapproval, i.vendorApprovalId),
          startDate:        prefer(fmt(d.mserp_startdate), i.startDate),
          endDate:          prefer(fmt(d.mserp_enddate),   i.endDate),
          inD365:           true,
        };
      });
    } catch (e) {
      context.log.warn('D365 enrichment skipped:', e.message);
    }

    const searchQ = (req.query.filter ?? '').toLowerCase();
    if (searchQ) {
      items = items.filter(i =>
        i.spaId.toLowerCase().includes(searchQ)       ||
        i.description.toLowerCase().includes(searchQ) ||
        i.spaCode.toLowerCase().includes(searchQ)     ||
        i.vendorId.toLowerCase().includes(searchQ)
      );
    }

    const creationStatusQ = (req.query.creationStatus ?? '').toLowerCase();
    if (creationStatusQ) {
      items = items.filter(i => (i.creationStatus ?? '').toLowerCase() === creationStatusQ);
    }

    context.res = { status: 200, headers: cors, body: { success: true, count: items.length, value: items } };
  } catch (err) {
    context.log.error('GetSPAImports error:', err.message);
    context.res = { status: 500, headers: cors, body: { success: false, error: err.message } };
  }
};
