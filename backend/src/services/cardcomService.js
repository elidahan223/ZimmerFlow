/**
 * Cardcom Low Profile API (v11) wrapper.
 *
 * Flow:
 *   1) createLowProfileDeal() — POSTs to /api/v11/LowProfile/Create with the
 *      amount, the URLs Cardcom should call/redirect on success/failure, and
 *      a ReturnValue we use to look the deal back up (we set it to the
 *      paymentId so the redirect/webhook handler can update the right row).
 *   2) Caller redirects the customer to the returned `url`. Customer enters
 *      their card on Cardcom's hosted page.
 *   3) Cardcom calls our WebHookUrl (server-to-server) AND redirects the
 *      browser to SuccessRedirectUrl / FailedRedirectUrl.
 *   4) The handler verifies via getLowProfileResult() before marking the
 *      payment COMPLETED — Cardcom's docs say to always re-check; never
 *      trust the redirect parameters alone.
 *
 * Test credentials Cardcom publishes for the playground terminal:
 *   CARDCOM_TERMINAL=1000  CARDCOM_API_NAME=barak9611  CARDCOM_API_PASSWORD=123456
 */

const CARDCOM_BASE_URL = process.env.CARDCOM_BASE_URL || 'https://secure.cardcom.solutions';

function getCredentials() {
  const terminal = process.env.CARDCOM_TERMINAL;
  const apiName = process.env.CARDCOM_API_NAME;
  const apiPassword = process.env.CARDCOM_API_PASSWORD;
  if (!terminal || !apiName) {
    throw new Error('Missing Cardcom credentials — set CARDCOM_TERMINAL and CARDCOM_API_NAME env vars');
  }
  const creds = {
    TerminalNumber: Number(terminal),
    ApiName: apiName,
  };
  // Some Cardcom terminals require an API password too; include only when
  // explicitly configured so terminals that don't use one (e.g. older
  // playground terminals) still work.
  if (apiPassword) creds.ApiPassword = apiPassword;
  return creds;
}

async function postJson(pathname, body) {
  const url = `${CARDCOM_BASE_URL}${pathname}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (_) { json = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`Cardcom ${pathname} HTTP ${res.status}: ${text.slice(0, 200)}`);
    err.cardcomResponse = json;
    throw err;
  }
  return json;
}

/**
 * Create a Low Profile deal. Cardcom returns { LowProfileId, Url, ResponseCode, Description }.
 * ResponseCode 0 = success; non-zero = error.
 *
 * When opts.issueInvoice is true and customerEmail is set, Cardcom also
 * produces a tax invoice + receipt (חשבונית מס/קבלה) and emails it to the
 * customer after a successful charge. We use Operation 'ChargeAndCreateInvoice'
 * for that; otherwise we stay on 'ChargeOnly' (no document).
 *
 * @param {object} opts
 * @param {number} opts.amount
 * @param {string} opts.returnValue
 * @param {string} opts.productName
 * @param {string} opts.successRedirectUrl
 * @param {string} opts.failedRedirectUrl
 * @param {string} [opts.webhookUrl]
 * @param {string} [opts.customerName]
 * @param {string} [opts.customerEmail]
 * @param {string} [opts.customerIdNumber] — ת"ז for tax invoice
 * @param {string} [opts.language='he']
 * @param {boolean} [opts.issueInvoice=false] — produce TaxInvoiceAndReceipt + email
 */
async function createLowProfileDeal(opts) {
  const creds = getCredentials();
  const amount = Number(opts.amount.toFixed(2));
  const body = {
    ...creds,
    Operation: opts.issueInvoice ? 'ChargeAndCreateInvoice' : 'ChargeOnly',
    ReturnValue: opts.returnValue,
    Amount: amount,
    SuccessRedirectUrl: opts.successRedirectUrl,
    FailedRedirectUrl: opts.failedRedirectUrl,
    WebHookUrl: opts.webhookUrl,
    ProductName: opts.productName,
    Language: opts.language || 'he',
    ISOCoinId: 1, // 1 = ILS
    UIDefinition: { IsHideCardOwnerName: false, IsHideCardOwnerEmail: false, IsHideCardOwnerPhone: false },
  };
  if (opts.customerName) body.UIDefinition.CardOwnerName = opts.customerName;
  if (opts.customerEmail) body.UIDefinition.CardOwnerEmail = opts.customerEmail;

  if (opts.issueInvoice) {
    body.Document = {
      DocumentTypeToCreate: 'TaxInvoiceAndReceipt',
      Name: opts.customerName || 'לקוח',
      TaxId: opts.customerIdNumber || '',
      Email: opts.customerEmail || '',
      IsSendByEmail: Boolean(opts.customerEmail),
      Products: [
        {
          Description: opts.productName,
          UnitCost: amount,
          Quantity: 1,
          TotalLineCost: amount,
        },
      ],
    };
  }

  console.log('[cardcom] createLowProfile request:', JSON.stringify({ ...body, ApiName: '[redacted]' }));
  const response = await postJson('/api/v11/LowProfile/Create', body);
  console.log('[cardcom] createLowProfile response:', JSON.stringify({
    ResponseCode: response.ResponseCode,
    Description: response.Description,
    LowProfileId: response.LowProfileId,
    Url: response.Url ? '[present]' : '[missing]',
  }));

  if (response.ResponseCode !== 0) {
    const err = new Error(`Cardcom rejected the request: ${response.Description || 'unknown error'} (code ${response.ResponseCode})`);
    err.cardcomResponse = response;
    throw err;
  }
  return {
    lowProfileId: response.LowProfileId,
    url: response.Url,
    raw: response,
  };
}

/**
 * Verify a Low Profile transaction after the customer comes back from Cardcom.
 * Returns the full response object; success when ResponseCode === 0 AND
 * TranzactionInfo.ResponseCode === 0.
 */
async function getLowProfileResult(lowProfileId) {
  const creds = getCredentials();
  const body = { ...creds, LowProfileId: lowProfileId };
  console.log(`[cardcom] getLowProfileResult lookup id=${lowProfileId}`);
  const response = await postJson('/api/v11/LowProfile/GetLpResult', body);
  console.log('[cardcom] getLowProfileResult response:', JSON.stringify({
    ResponseCode: response.ResponseCode,
    Description: response.Description,
    TranzactionResponseCode: response.TranzactionInfo?.ResponseCode,
    DealNumber: response.TranzactionInfo?.TranzactionId,
    Last4: response.TranzactionInfo?.Last4CardDigits,
  }));
  return response;
}

function isTransactionSuccessful(getLpResultResponse) {
  return (
    getLpResultResponse &&
    getLpResultResponse.ResponseCode === 0 &&
    getLpResultResponse.TranzactionInfo &&
    getLpResultResponse.TranzactionInfo.ResponseCode === 0
  );
}

module.exports = {
  createLowProfileDeal,
  getLowProfileResult,
  isTransactionSuccessful,
};
