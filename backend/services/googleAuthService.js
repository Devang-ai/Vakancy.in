const { OAuth2Client } = require('google-auth-library');

const getGoogleClientId = () => {
  return process.env.GOOGLE_CLIENT_ID || '15631312508-0r23i2q9aaor4teum3sehvk0j65v3qi9.apps.googleusercontent.com';
};

let oauthClientInstance = null;
const getOAuthClient = () => {
  if (!oauthClientInstance) {
    oauthClientInstance = new OAuth2Client(getGoogleClientId());
  }
  return oauthClientInstance;
};

/**
 * Verify a Google ID token server-side using the official Google OAuth library.
 * Validates audience, issuer, expiration, and email verification.
 * 
 * @param {string} idToken - The JWT credential returned by Google Identity Services.
 * @returns {Promise<{ sub: string, email: string, name: string, picture: string, email_verified: boolean }>}
 */
async function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
    const error = new Error('Google ID token is required.');
    error.code = 'MISSING_GOOGLE_TOKEN';
    throw error;
  }

  const clientId = getGoogleClientId();
  const client = getOAuthClient();

  try {
    const ticket = await client.verifyIdToken({
      idToken: idToken.trim(),
      audience: clientId
    });

    const payload = ticket.getPayload();
    if (!payload) {
      const error = new Error('Invalid Google token: No payload received.');
      error.code = 'INVALID_GOOGLE_PAYLOAD';
      throw error;
    }

    // 1. Audience Verification
    if (payload.aud !== clientId) {
      const error = new Error('Google token audience does not match this application.');
      error.code = 'AUDIENCE_MISMATCH';
      throw error;
    }

    // 2. Issuer Verification
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!validIssuers.includes(payload.iss)) {
      const error = new Error(`Untrusted token issuer: ${payload.iss}`);
      error.code = 'UNTRUSTED_ISSUER';
      throw error;
    }

    // 3. Expiry Verification
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowInSeconds) {
      const error = new Error('Google token has expired. Please sign in again.');
      error.code = 'EXPIRED_GOOGLE_TOKEN';
      throw error;
    }

    // 4. Stable Subject ID
    if (!payload.sub) {
      const error = new Error('Missing Google user identifier (sub).');
      error.code = 'MISSING_GOOGLE_SUB';
      throw error;
    }

    // 5. Verified Email Requirement
    const isEmailVerified = payload.email_verified === true || payload.email_verified === 'true';
    if (!isEmailVerified) {
      const error = new Error('Your Google email address has not been verified by Google.');
      error.code = 'UNVERIFIED_GOOGLE_EMAIL';
      throw error;
    }

    if (!payload.email) {
      const error = new Error('Missing email address in Google account profile.');
      error.code = 'MISSING_GOOGLE_EMAIL';
      throw error;
    }

    return {
      sub: String(payload.sub),
      email: String(payload.email).trim().toLowerCase(),
      name: payload.name ? String(payload.name).trim() : String(payload.email).split('@')[0],
      given_name: payload.given_name || '',
      family_name: payload.family_name || '',
      picture: payload.picture || null,
      email_verified: true
    };
  } catch (err) {
    if (err.code) throw err;
    console.error('Google token verification failed:', err.message);
    const error = new Error(err.message || 'Google token verification failed.');
    error.code = 'INVALID_GOOGLE_TOKEN';
    throw error;
  }
}

module.exports = {
  verifyGoogleIdToken,
  getGoogleClientId
};
