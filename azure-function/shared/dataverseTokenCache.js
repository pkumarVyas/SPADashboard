// Separate token cache for Dataverse (different OAuth resource from D365 F&O)
let cache = { token: null, expiresAt: 0 };

async function getDataverseToken() {
  const now = Date.now();
  if (cache.token && now < cache.expiresAt - 60_000) {
    return cache.token;
  }

  const { TENANT_ID, CLIENT_ID, CLIENT_SECRET, DATAVERSE_RESOURCE } = process.env;

  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    resource:      DATAVERSE_RESOURCE   // e.g. https://your-org.crm.dynamics.com
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/token`,
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
