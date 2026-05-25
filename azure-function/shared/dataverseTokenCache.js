// Separate token cache for Dataverse (different OAuth resource from D365 F&O)
let cache = { token: null, expiresAt: 0 };

async function getDataverseToken() {
  const now = Date.now();
  if (cache.token && now < cache.expiresAt - 60_000) {
    return cache.token;
  }

  const tenantId     = process.env.DATAVERSE_TENANT_ID  || process.env.TENANT_ID;
  const clientId     = process.env.DATAVERSE_CLIENT_ID  || process.env.CLIENT_ID;
  const clientSecret = process.env.DATAVERSE_CLIENT_SECRET || process.env.CLIENT_SECRET;
  // Derive resource (base org URL) from DATAVERSE_API_URL or fall back to DATAVERSE_RESOURCE
  const apiUrl   = process.env.DATAVERSE_API_URL || '';
  const resource = process.env.DATAVERSE_RESOURCE || apiUrl.replace(/\/api\/data\/.*$/, '');

  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     clientId,
    client_secret: clientSecret,
    resource,
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    }
  );

  if (!res.ok) {
    throw new Error(`Dataverse token failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cache.token = data.access_token;
  cache.expiresAt = now + data.expires_in * 1000;
  return cache.token;
}

module.exports = { getDataverseToken };
