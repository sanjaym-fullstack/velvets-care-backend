const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CALENDAR_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID');

async function verifyGoogleToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CALENDAR_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
  });
  return ticket.getPayload();
}

module.exports = {
     verifyGoogleToken 
    };
