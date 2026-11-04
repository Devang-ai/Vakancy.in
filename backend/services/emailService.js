const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const {
  transporter,
  emailFrom,
  frontendUrl,
  isSimulationMode
} = require('../config/smtp');
const {
  renderPasswordResetTemplate,
  renderOtpEmailTemplate,
  renderRecruiterMessageNotificationTemplate,
  renderJobDigestTemplate,
  renderCandidateWelcomeTemplate,
  renderEmployerWelcomeTemplate,
  renderCandidateApplicationTemplate,
  renderApplicationReceivedTemplate,
  renderApplicationStageTemplate,
  renderEmployerEnquiryConfirmationTemplate,
  renderInternalEnquiryAlertTemplate,
  renderExecutiveShortlistSharedTemplate,
  renderEnquiryReplyTemplate
} = require('./emailTemplates');

// In-memory deduplication cache (Key -> Timestamp) to avoid rapid duplicate email dispatches
const recentDispatches = new Map();
const DEDUP_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

// Periodically clean up deduplication cache
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentDispatches.entries()) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      recentDispatches.delete(key);
    }
  }
}, 60 * 1000).unref?.();

/**
 * Audit log email attempts in MySQL EMAIL_LOGS
 */
const logEmailAttempt = async ({
  to,
  subject,
  templateType = 'GENERAL',
  status,
  provider = 'hostinger_smtp',
  providerMessageId = null,
  errorMessage = null
}) => {
  try {
    const id = uuidv4();
    await db.query(
      `INSERT INTO EMAIL_LOGS (id, recipient_email, subject, template_type, status, provider, provider_message_id, error_message) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        to || 'unknown',
        subject || 'No Subject',
        templateType,
        status,
        provider,
        providerMessageId,
        errorMessage ? String(errorMessage).slice(0, 500) : null
      ]
    );
  } catch (logErr) {
    console.warn('⚠️ [Email Log Warning] Failed to log email in EMAIL_LOGS:', logErr.message);
  }
};

/**
 * Core Reusable Email Notification Sender
 */
const sendEmailNotification = async ({
  to,
  subject,
  html,
  text,
  templateType = 'GENERAL',
  deduplicationKey = null
}) => {
  if (!to || typeof to !== 'string') {
    console.warn('⚠️ [Email Warning] Skipping email send: invalid recipient address.');
    return { success: false, reason: 'Invalid recipient address' };
  }

  const cleanRecipient = to.trim().toLowerCase();

  // Deduplication check
  const dedupId = deduplicationKey || `${cleanRecipient}:${subject}`;
  const lastSentTime = recentDispatches.get(dedupId);
  if (lastSentTime && (Date.now() - lastSentTime < DEDUP_WINDOW_MS)) {
    console.log(`ℹ️ [Email Deduplicated] Suppressing duplicate email to ${cleanRecipient} for: "${subject}"`);
    return { success: true, deduplicated: true };
  }

  // Fallback to text version if text not explicitly provided
  const textBody = text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // 1. Live SMTP Mode (Hostinger SMTP via Nodemailer)
  if (!isSimulationMode && transporter) {
    try {
      const mailOptions = {
        from: emailFrom,
        to: cleanRecipient,
        subject: subject,
        html: html,
        text: textBody,
        headers: {
          'X-Application': 'Vakancy.in',
          'X-Template-Type': templateType
        }
      };

      const info = await transporter.sendMail(mailOptions);
      recentDispatches.set(dedupId, Date.now());

      console.log(`📧 [Hostinger SMTP Sent] To: ${cleanRecipient} | ID: ${info.messageId} | Subject: "${subject}"`);

      await logEmailAttempt({
        to: cleanRecipient,
        subject,
        templateType,
        status: 'sent',
        provider: 'hostinger_smtp',
        providerMessageId: info.messageId || null
      });

      return { success: true, messageId: info.messageId };
    } catch (err) {
      // Sanitize error message to prevent any credential or password exposure
      const sanitizedError = String(err.message || 'SMTP transmission failure')
        .replace(/pass(word)?\s*[:=]\s*\S+/gi, 'password=******');

      console.warn(`⚠️ [Hostinger SMTP Error] Failed to send email to ${cleanRecipient}:`, sanitizedError);

      await logEmailAttempt({
        to: cleanRecipient,
        subject,
        templateType,
        status: 'failed',
        provider: 'hostinger_smtp',
        errorMessage: sanitizedError
      });

      return { success: false, error: sanitizedError };
    }
  }

  // 2. Safe Development / Simulation Mode
  console.log(`📧 [Email Simulation] To: ${cleanRecipient} | Subject: "${subject}" | Template: ${templateType}`);
  recentDispatches.set(dedupId, Date.now());

  await logEmailAttempt({
    to: cleanRecipient,
    subject,
    templateType,
    status: 'simulated',
    provider: 'development_simulation'
  });

  return { success: true, simulated: true };
};

/**
 * 1. Password Reset Email
 */
const sendPasswordResetEmail = async (recipientEmail, { resetUrl, expiresInMinutes = 60 }) =>
  sendEmailNotification({
    to: recipientEmail,
    subject: 'Reset your Vakancy.in password',
    html: renderPasswordResetTemplate({ resetUrl, expiresInMinutes }),
    templateType: 'PASSWORD_RESET',
    deduplicationKey: `pwd_reset:${recipientEmail.trim().toLowerCase()}`
  });

/**
 * 2. Welcome Email: Candidate
 */
const sendCandidateWelcomeEmail = async (recipientEmail, { name, portalUrl = `${frontendUrl}/candidate/dashboard` }) =>
  sendEmailNotification({
    to: recipientEmail,
    subject: 'Welcome to Vakancy.in - Your Career Platform',
    html: renderCandidateWelcomeTemplate({ name, portalUrl }),
    templateType: 'WELCOME_CANDIDATE',
    deduplicationKey: `welcome_cand:${recipientEmail.trim().toLowerCase()}`
  });

/**
 * 3. Welcome Email: Employer
 */
const sendEmployerWelcomeEmail = async (recipientEmail, { name, companyName, portalUrl = `${frontendUrl}/recruiter` }) =>
  sendEmailNotification({
    to: recipientEmail,
    subject: 'Welcome to Vakancy.in for Employers',
    html: renderEmployerWelcomeTemplate({ name, companyName, portalUrl }),
    templateType: 'WELCOME_EMPLOYER',
    deduplicationKey: `welcome_emp:${recipientEmail.trim().toLowerCase()}`
  });

/**
 * 4. Candidate Job Application Confirmation
 */
const sendCandidateApplicationConfirmationEmail = async (recipientEmail, details) => {
  const dashUrl = `${frontendUrl}/candidate/applications`;
  return sendEmailNotification({
    to: recipientEmail,
    subject: `Application confirmed: ${details.jobTitle || 'Job Opening'} - Vakancy.in`,
    html: renderCandidateApplicationTemplate({
      ...details,
      dashboardUrl: dashUrl
    }),
    templateType: 'CANDIDATE_APPLICATION_CONFIRMATION',
    deduplicationKey: `app_conf:${recipientEmail.trim().toLowerCase()}:${details.referenceNumber || details.jobTitle}`
  });
};

/**
 * 5. Employer Notification: New Application Received (Zero PII)
 */
const sendEmployerApplicationReceivedEmail = async (employerEmail, { jobTitle, referenceNumber, appliedAt, jobId }) => {
  try {
    if (!employerEmail) {
      console.warn('⚠️ [Email Warning] Skipping employer application email: no employer email provided.');
      return { skipped: true, reason: 'No employer email' };
    }

    const dashboardUrl = `${frontendUrl}/recruiter/jobs/${jobId}/applicants`;
    const html = renderApplicationReceivedTemplate({
      jobTitle,
      applicationRef: referenceNumber,
      appliedAt,
      dashboardUrl
    });

    return await sendEmailNotification({
      to: employerEmail,
      subject: `New Application Received: ${jobTitle || 'Job Opening'} - Vakancy.in`,
      html,
      templateType: 'EMPLOYER_APPLICATION_ALERT',
      deduplicationKey: `emp_alert:${employerEmail.trim().toLowerCase()}:${referenceNumber}`
    });
  } catch (err) {
    console.warn('⚠️ [Email Warning] Error in sendEmployerApplicationReceivedEmail:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 6. Application Stage Progress Email (Candidate)
 */
const sendApplicationStageEmail = async (recipientEmail, details) => {
  const dashUrl = `${frontendUrl}/candidate/applications`;
  return sendEmailNotification({
    to: recipientEmail,
    subject: 'Your application status was updated - Vakancy.in',
    html: renderApplicationStageTemplate({
      ...details,
      dashboardUrl: dashUrl
    }),
    templateType: 'APPLICATION_STAGE_UPDATE'
  });
};

/**
 * 7. Employer Enquiry Confirmation
 */
const sendEmployerEnquiryConfirmationEmail = async (employerEmail, details) => {
  try {
    if (!employerEmail) return { skipped: true, reason: 'No employer email' };
    const html = renderEmployerEnquiryConfirmationTemplate(details);
    return await sendEmailNotification({
      to: employerEmail,
      subject: `Enquiry Received: ${details.enquiryRef || 'Recruitment Request'} - Vakancy.in`,
      html,
      templateType: 'EMPLOYER_ENQUIRY_CONFIRMATION',
      deduplicationKey: `enq_conf:${details.enquiryRef}`
    });
  } catch (err) {
    console.warn('⚠️ [Email Warning] Error in sendEmployerEnquiryConfirmationEmail:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 8. Internal Team Enquiry Alert
 */
const sendInternalEnquiryAlertEmail = async (details) => {
  try {
    const internalEmail = process.env.INTERNAL_RECRUITMENT_EMAIL || process.env.ADMIN_EMAIL || 'support@vakancy.in';
    const html = renderInternalEnquiryAlertTemplate(details);
    return await sendEmailNotification({
      to: internalEmail,
      subject: `[Internal Alert] New Employer Enquiry: ${details.employerName || 'Employer'} (${details.enquiryType || 'General'})`,
      html,
      templateType: 'INTERNAL_ENQUIRY_ALERT',
      deduplicationKey: `int_enq:${details.enquiryRef}`
    });
  } catch (err) {
    console.warn('⚠️ [Email Warning] Error in sendInternalEnquiryAlertEmail:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 9. Email OTP Verification (Password Reset, Set Password & Shortlist Access)
 */
const sendOtpEmail = async (recipientEmail, { otp, purpose = 'password_reset', jobTitle, companyName, expiresInMinutes = 15 }) => {
  const isShortlist = purpose === 'shortlist_verification' || Boolean(jobTitle || companyName);
  const isSetPassword = purpose === 'set_password';

  let subject = `Your Verification Code: ${otp} - Vakancy.in`;
  if (isShortlist) {
    subject = `Your Shortlist Verification Code: ${otp} - Vakancy Executive Search`;
  } else if (isSetPassword) {
    subject = 'Set Password Verification Code - Vakancy.in';
  } else {
    subject = 'Your Password Recovery Verification Code - Vakancy.in';
  }

  return sendEmailNotification({
    to: recipientEmail,
    subject,
    html: renderOtpEmailTemplate({
      otp,
      purpose: isShortlist ? 'shortlist_verification' : purpose,
      jobTitle,
      companyName,
      expiresInMinutes
    }),
    templateType: isShortlist ? 'SHORTLIST_OTP_VERIFICATION' : (isSetPassword ? 'SET_PASSWORD_OTP' : 'PASSWORD_RESET_OTP'),
    deduplicationKey: `otp:${recipientEmail.trim().toLowerCase()}:${Date.now()}`
  });
};

/**
 * 10. Recruiter Direct Message / Communication Notification Dispatch
 */
const sendRecruiterMessageNotificationEmail = async (recipientEmail, { recipientName, senderName, jobTitle }) => {
  const dashUrl = `${frontendUrl}/candidate/applications`;
  return sendEmailNotification({
    to: recipientEmail,
    subject: `New Recruiter Message regarding ${jobTitle || 'Application'} - Vakancy.in`,
    html: renderRecruiterMessageNotificationTemplate({
      recipientName,
      senderName,
      jobTitle,
      dashboardUrl: dashUrl
    }),
    templateType: 'RECRUITER_DIRECT_MESSAGE',
    deduplicationKey: `msg_notif:${recipientEmail.trim().toLowerCase()}:${jobTitle || 'general'}:${Math.floor(Date.now() / (5 * 60 * 1000))}`
  });
};

/**
 * 11. Candidate Job Digest Dispatch
 */
const sendJobDigestEmail = async (recipientEmail, { candidateName, jobs = [] }) => {
  if (!jobs || jobs.length === 0) return { skipped: true, reason: 'No matching jobs' };
  const jobsWithUrls = jobs.map(j => ({
    ...j,
    jobUrl: `${frontendUrl}/jobs/${j.id}`
  }));

  return sendEmailNotification({
    to: recipientEmail,
    subject: `Top Job Matches for You (${jobs.length} open roles) - Vakancy.in`,
    html: renderJobDigestTemplate({
      candidateName,
      jobs: jobsWithUrls,
      portalUrl: `${frontendUrl}/candidate/jobs`
    }),
    templateType: 'JOB_RECOMMENDATION_DIGEST',
    deduplicationKey: `job_digest:${recipientEmail.trim().toLowerCase()}:${new Date().toISOString().slice(0, 10)}`
  });
};

/**
 * 12. Executive Search Shortlist Shared Notification Dispatch
 */
const sendExecutiveShortlistSharedEmail = async (recipientEmail, {
  employerName,
  companyName,
  jobTitle,
  candidateCount = 1,
  shortlistUrl,
  expiresAt,
  customMessage
}) => {
  return sendEmailNotification({
    to: recipientEmail,
    subject: `Candidate Shortlist: ${jobTitle || 'Executive Search Position'}${companyName ? ` - ${companyName}` : ''} - Vakancy Executive Search`,
    html: renderExecutiveShortlistSharedTemplate({
      employerName,
      companyName,
      jobTitle,
      candidateCount,
      shortlistUrl,
      expiresAt,
      customMessage
    }),
    templateType: 'EXECUTIVE_SEARCH_SHORTLIST_SHARED',
    deduplicationKey: `exec_shortlist:${recipientEmail.trim().toLowerCase()}:${jobTitle || 'general'}:${Math.floor(Date.now() / (5 * 60 * 1000))}`
  });
};

/**
 * 13. Direct Admin Enquiry Reply Dispatch
 */
const sendEnquiryReplyEmail = async (recipientEmail, {
  recipientName,
  subject,
  replyMessage,
  originalMessage,
  enquiryRef,
  responderName
}) => {
  return sendEmailNotification({
    to: recipientEmail,
    subject: subject ? `Re: ${subject} - Vakancy Support` : 'Response to your Vakancy.in Enquiry',
    html: renderEnquiryReplyTemplate({
      recipientName,
      subject,
      replyMessage,
      originalMessage,
      enquiryRef,
      responderName
    }),
    templateType: 'ENQUIRY_REPLY',
    deduplicationKey: `enq_reply:${recipientEmail.trim().toLowerCase()}:${enquiryRef || 'general'}:${Date.now()}`
  });
};

module.exports = {
  sendEmailNotification,
  sendPasswordResetEmail,
  sendOtpEmail,
  sendRecruiterMessageNotificationEmail,
  sendJobDigestEmail,
  sendCandidateWelcomeEmail,
  sendEmployerWelcomeEmail,
  sendCandidateApplicationConfirmationEmail,
  sendEmployerApplicationReceivedEmail,
  sendApplicationStageEmail,
  sendEmployerEnquiryConfirmationEmail,
  sendInternalEnquiryAlertEmail,
  sendExecutiveShortlistSharedEmail,
  sendEnquiryReplyEmail
};
