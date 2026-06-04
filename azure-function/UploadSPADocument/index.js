const CORS = o => ({
  'Access-Control-Allow-Origin': o,
  'Content-Type': 'application/json',
});

module.exports = async function (context, req) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  const cors   = CORS(origin);

  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: {
        ...cors,
        'Access-Control-Allow-Methods':  'POST, OPTIONS',
        'Access-Control-Allow-Headers':  'Content-Type',
      },
    };
    return;
  }

  const PA_URL = process.env.POWER_AUTOMATE_SPA_IMPORT_URL;
  if (!PA_URL) {
    context.res = {
      status: 503,
      headers: cors,
      body: { success: false, error: 'POWER_AUTOMATE_SPA_IMPORT_URL is not configured. Set it in the Azure Static Web Apps environment variables.' },
    };
    return;
  }

  const { fileName, fileType, fileContent, fileFormat, uploadedAt } = req.body ?? {};

  if (!fileName || !fileContent) {
    context.res = {
      status: 400,
      headers: cors,
      body: { success: false, error: 'fileName and fileContent are required.' },
    };
    return;
  }

  context.log(`UploadSPADocument: forwarding "${fileName}" (${fileFormat}) to Power Automate`);

  try {
    const paRes = await fetch(PA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        fileType:    fileType   ?? '',
        fileContent,            // base64-encoded file bytes
        fileFormat:  fileFormat ?? '',
        uploadedAt:  uploadedAt ?? new Date().toISOString(),
        source:      'web-upload',
      }),
    });

    // Power Automate HTTP triggers return 202 Accepted on success
    if (!paRes.ok) {
      const errText = await paRes.text().catch(() => '');
      context.log.error(`Power Automate returned ${paRes.status}: ${errText.slice(0, 300)}`);
      context.res = {
        status: 502,
        headers: cors,
        body: { success: false, error: `Power Automate returned ${paRes.status}. Check the flow is enabled and the trigger URL is correct.` },
      };
      return;
    }

    context.log(`UploadSPADocument: Power Automate accepted "${fileName}"`);
    context.res = {
      status: 200,
      headers: cors,
      body: {
        success: true,
        message: `"${fileName}" has been submitted. Power Automate is processing it — the record will appear in SPA Imports once the flow completes.`,
      },
    };
  } catch (err) {
    context.log.error('UploadSPADocument error:', err.message);
    context.res = {
      status: 500,
      headers: cors,
      body: { success: false, error: err.message },
    };
  }
};
