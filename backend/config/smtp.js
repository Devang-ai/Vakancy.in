const nodemailer = require('nodemailer');

/**
 * Hostinger SMTP Mailer Configuration
 *
 * Verified Settings:
 * Host: smtp.hostinger.com
 * Port: 465 (SSL/TLS)
 * Secure: true
 * User: support@vakancy.in
 * Password: Read strictly from backend/.env
 * From: "Vakancy Support" <support@vakancy.in>
 */

const { SUPPORT_EMAIL } = require('./constants');

const smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
const smtpPort = Number(process.env.SMTP_PORT) || 465;
const smtpSecure = process.env.SMTP_SECURE === 'false' ? false : (smtpPort === 465);
const smtpUser = process.env.SMTP_USER || SUPPORT_EMAIL;
const smtpPassword = process.env.SMTP_PASSWORD || '';
const emailFrom = process.env.EMAIL_FROM || `"Vakancy Support" <${SUPPORT_EMAIL}>`;
const frontendUrl = (process.env.FRONTEND_URL || process.env.APP_URL || 'https://vakancy.in').replace(/\/$/, '');

// Check if credentials are production-ready or placeholder/simulation
const isPlaceholderPassword = !smtpPassword ||
  smtpPassword === 'READ_FROM_BACKEND_ENV_ONLY' ||
  smtpPassword === 'your_hostinger_smtp_password_here' ||
  smtpPassword.includes('PLACEHOLDER');

const isSimulationMode = process.env.NODE_ENV === 'test' ||
  process.env.EMAIL_SIMULATION === 'true' ||
  isPlaceholderPassword;

let transporter = null;

if (!isSimulationMode && smtpPassword) {
  try {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword
      },
      tls: {
        // In local development, handle antivirus SSL/TLS mail scanning (e.g. AVG Web/Mail Shield)
        rejectUnauthorized: process.env.NODE_ENV === 'production' && process.env.SMTP_ALLOW_SELF_SIGNED !== 'true'
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 15000
    });
  } catch (err) {
    console.warn('⚠️ [SMTP Init Warning] Failed to initialize SMTP transporter:', err.message);
  }
}

/**
 * Verify SMTP connection safely without exposing credentials
 */
const verifySmtpConnection = async () => {
  if (isSimulationMode) {
    return {
      ready: true,
      simulated: true,
      message: 'SMTP running in Simulation Mode (safe development / placeholder credentials).'
    };
  }

  if (!transporter) {
    return {
      ready: false,
      simulated: false,
      message: 'Transporter not initialized. Please verify SMTP_PASSWORD in backend/.env.'
    };
  }

  try {
    await transporter.verify();
    return {
      ready: true,
      simulated: false,
      message: 'Hostinger SMTP server connection verified successfully.'
    };
  } catch (err) {
    // Sanitize any error output to prevent credential leakage
    const sanitizedMsg = String(err.message || '').replace(new RegExp(smtpPassword, 'g'), '******');
    return {
      ready: false,
      simulated: false,
      message: `Hostinger SMTP verification failed: ${sanitizedMsg}`
    };
  }
};

module.exports = {
  transporter,
  smtpHost,
  smtpPort,
  smtpSecure,
  smtpUser,
  emailFrom,
  frontendUrl,
  isSimulationMode,
  verifySmtpConnection
};
