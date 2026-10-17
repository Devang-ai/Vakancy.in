const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY || 're_sample_resend_api_key';

let resendClient = null;

if (apiKey && apiKey !== 'your_resend_api_key_here') {
  try {
    resendClient = new Resend(apiKey);
  } catch (err) {
    console.warn('⚠️ Resend SDK initialization warning:', err.message);
  }
}

module.exports = {
  resendClient,
  fromEmail: process.env.FROM_EMAIL || 'onboarding@resend.dev'
};
