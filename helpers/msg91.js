const https = require('https');

const API_HOST = 'control.msg91.com';

const getConfig = () => {
  const authkey = process.env.MSG91_AUTHKEY;
  const sender = process.env.MSG91_WHATSAPP_SENDER;
  const template = process.env.MSG91_WHATSAPP_TEMPLATE;
  if (!authkey || !sender || !template) {
    throw new Error('MSG91_AUTHKEY / MSG91_WHATSAPP_SENDER / MSG91_WHATSAPP_TEMPLATE are not set');
  }
  return {
    authkey,
    sender,
    template,
    language: process.env.MSG91_WHATSAPP_TEMPLATE_LANG || 'en',
    otpComponent: process.env.MSG91_WHATSAPP_OTP_COMPONENT || 'body_1',
  };
};

// Stored phones are bare national numbers ("9876543210"); MSG91 wants the
// country code without '+' ("919876543210").
const toInternational = (phone) => {
  let raw = String(phone || '').replace(/[^\d+]/g, '');
  if (!raw) return null;
  if (raw.startsWith('+')) raw = raw.slice(1);
  if (raw.startsWith('00')) raw = raw.slice(2);
  if (raw.length === 10) raw = `91${raw}`;
  return raw;
};

const request = (path, { method = 'POST', body, authkey } = {}) => new Promise((resolve, reject) => {
  const payload = body ? JSON.stringify(body) : null;
  const req = https.request({
    hostname: API_HOST,
    path,
    method,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authkey,
      ...(payload ? { 'content-length': Buffer.byteLength(payload) } : {}),
    },
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      let parsed = null;
      try { parsed = JSON.parse(data); } catch (e) { parsed = { raw: data }; }
      resolve({ statusCode: res.statusCode, body: parsed });
    });
  });
  req.on('error', reject);
  req.setTimeout(20000, () => req.destroy(new Error('MSG91 request timed out')));
  if (payload) req.write(payload);
  req.end();
});

/**
 * Send OTP over WhatsApp via MSG91 template message.
 *
 * @param {string} phone - recipient phone number (raw or with country code)
 * @param {string} otp - the OTP code to send
 * @returns {Promise<object|false>} MSG91 response on success, false on failure
 */
const sendOtpViaWhatsApp = async (phone, otp) => {
  try {
    const cfg = getConfig();
    const to = toInternational(phone);
    if (!to) {
      console.error('[MSG91] WhatsApp OTP skipped: empty phone number');
      return false;
    }

    const { statusCode, body } = await request('/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
      authkey: cfg.authkey,
      body: {
        integrated_number: cfg.sender,
        content_type: 'template',
        payload: {
          type: 'template',
          messaging_product: 'whatsapp',
          template: {
            name: cfg.template,
            language: { code: cfg.language, policy: 'deterministic' },
            to_and_components: [
              {
                to: [to],
                components: {
                  [cfg.otpComponent]: { type: 'text', value: String(otp) },
                },
              },
            ],
          },
        },
      },
    });

    // MSG91 answers HTTP 200 with hasError:true on failures too.
    if (statusCode !== 200 || !body || body.hasError === true || body.status === 'error') {
      console.error('[MSG91] WhatsApp OTP failed:', statusCode, JSON.stringify(body));
      return false;
    }
    return body;
  } catch (error) {
    console.error('[MSG91] WhatsApp OTP failed:', error.message);
    return false;
  }
};

/** WhatsApp sender numbers activated on this MSG91 account (integrated_number). */
const getIntegratedNumbers = async () => {
  const { authkey } = getConfig();
  return request('/api/v5/whatsapp/whatsapp-activation/', { method: 'GET', authkey });
};

/** Approved WhatsApp templates linked to an integrated number. */
const getTemplates = async (number) => {
  const { authkey } = getConfig();
  const encoded = encodeURIComponent(number);
  return request(`/api/v5/whatsapp/get-template-client/${encoded}?template_status=approved`, {
    method: 'GET',
    authkey,
  });
};

module.exports = {
  sendOtpViaWhatsApp,
  getIntegratedNumbers,
  getTemplates,
  toInternational,
};
