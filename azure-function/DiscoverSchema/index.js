/**
 * DiscoverSchema — dev/debug helper
 *
 * Mode 1 — list all virtual tables (find the right table name):
 *   GET /api/DiscoverSchema?list=1
 *   GET /api/DiscoverSchema?list=1&prefix=mserp   (filter by prefix)
 *
 * Mode 2 — inspect a specific table (get field names + sample row):
 *   GET /api/DiscoverSchema?table=<EntitySetName>&sample=1
 *
 * IMPORTANT: the ?table= value must be the EntitySetName (plural OData name),
 * not the LogicalName. Use ?list=1 first to find the correct EntitySetName.
 */

const { getDataverseToken } = require('../shared/dataverseTokenCache');

const CORS = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Content-Type': 'application/json',
});

const FETCH_OPTS = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
    'OData-MaxVersion': '4.0',
    'OData-Version':    '4.0',
    Accept: 'application/json',
  }
});

module.exports = async function (context, req) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  const cors   = CORS(origin);

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, OPTIONS' } };
    return;
  }

  try {
    const token             = await getDataverseToken();
    const { DATAVERSE_API_URL } = process.env;

    // ── Mode 1: list tables ────────────────────────────────────────────────
    if (req.query.list === '1') {
      const prefix = (req.query.prefix ?? 'mserp').toLowerCase();

      const metaUrl = `${DATAVERSE_API_URL}/EntityDefinitions`
        + `?$select=LogicalName,EntitySetName,DisplayName`;

      const metaRes = await fetch(metaUrl, FETCH_OPTS(token));
      if (!metaRes.ok) {
        throw new Error(`Dataverse ${metaRes.status}: ${await metaRes.text()}`);
      }

      const meta   = await metaRes.json();
      const tables = (meta.value ?? [])
        .filter(e => e.LogicalName?.toLowerCase().startsWith(prefix))
        .map(e => ({
          logicalName:   e.LogicalName,
          entitySetName: e.EntitySetName,           // ← use THIS in ?table=
          displayName:   e.DisplayName?.UserLocalizedLabel?.Label ?? '',
        }));

      context.res = {
        status: 200,
        headers: cors,
        body: {
          hint: 'Use entitySetName (not logicalName) as the ?table= value',
          count: tables.length,
          tables,
        }
      };
      return;
    }

    // ── Mode 2: inspect a specific table ──────────────────────────────────
    const table = req.query.table;
    if (!table) {
      context.res = {
        status: 400,
        headers: cors,
        body: { error: 'Pass ?list=1 to find table names, or ?table=<EntitySetName>&sample=1 to inspect a table.' }
      };
      return;
    }

    const sampleUrl = `${DATAVERSE_API_URL}/${table}?$top=1`;
    const sampleRes = await fetch(sampleUrl, FETCH_OPTS(token));

    if (!sampleRes.ok) {
      throw new Error(`Dataverse ${sampleRes.status}: ${await sampleRes.text()}`);
    }

    const json     = await sampleRes.json();
    const firstRow = json.value?.[0] ?? null;
    const fields   = firstRow
      ? Object.keys(firstRow).filter(k => !k.startsWith('@'))
      : [];

    context.res = {
      status: 200,
      headers: cors,
      body: {
        table,
        fieldCount: fields.length,
        fields,
        ...(req.query.sample === '1' && firstRow ? { sampleRow: firstRow } : {}),
      }
    };
  } catch (err) {
    context.log.error('DiscoverSchema error:', err.message);
    context.res = { status: 500, headers: cors, body: { error: err.message } };
  }
};
