const { resendClient, fromEmail } = require('../config/resend');
const {
  renderApplicationReceivedTemplate,
  renderEmployerEnquiryConfirmationTemplate,
  renderInternalEnquiryAlertTemplate
} = require('./emailTemplates');

const sendEmailNotification = async ({ to, subject, html }) => {
  if (resendClient && to) {
    try {
      const data = await resendClient.emails.send({
        from: fromEmail,
        to: [to],
        subject: subject,
        html: html
      });
      console.log(`📧 [Resend Email Sent] To: ${to} | Subject: ${subject}`);
      return { success: true, data };
    } catch (err) {
      console.warn(`⚠️ [Resend Email Warning] Failed to send email to ${to}:`, err.message);
      return { success: false, error: err.message };
    }
  } else {
    console.log(`📧 [Email Simulation] To: ${to || 'user'} | Subject: ${subject}`);
    return { success: true, simulated: true };
  }
};

/**
 * Task 39: Send Employer Application Notification
 * Never exposes candidate PII. Non-blocking with internal try-catch.
 */
const sendEmployerApplicationReceivedEmail = async (employerEmail, { jobTitle, referenceNumber, appliedAt, jobId }) => {
  try {
    if (!employerEmail) {
      console.warn('⚠️ [Email Warning] Skipping employer application email: no employer email address available.');
      return { skipped: true, reason: 'No employer email' };
    }

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const dashboardUrl = `${appUrl}/recruiter/jobs/${jobId}/applicants`;
    const html = renderApplicationReceivedTemplate({
      jobTitle,
      applicationRef: referenceNumber,
      appliedAt,
      dashboardUrl
    });

    return await sendEmailNotification({
      to: employerEmail,
      subject: `New Application Received: ${jobTitle || 'Job Opening'} - Vakancy.in`,
      html
    });
  } catch (err) {
    console.warn('⚠️ [Email Warning] Error in sendEmployerApplicationReceivedEmail:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Task 39: Send Employer Enquiry Confirmation
 * Sent directly to authenticated employer's server-resolved email.
 */
const sendEmployerEnquiryConfirmationEmail = async (employerEmail, { enquiryRef, jobTitle, applicationRef, enquiryType, message, submittedAt }) => {
  try {
    if (!employerEmail) {
      console.warn('⚠️ [Email Warning] Skipping enquiry confirmation email: no employer email.');
      return { skipped: true, reason: 'No employer email' };
    }

    const html = renderEmployerEnquiryConfirmationTemplate({
      enquiryRef,
      jobTitle,
      applicationRef,
      enquiryType,
      message,
      submittedAt
    });

    return await sendEmailNotification({
      to: employerEmail,
      subject: `Enquiry Received: ${enquiryRef || 'Recruitment Request'} - Vakancy.in`,
      html
    });
  } catch (err) {
    console.warn('⚠️ [Email Warning] Error in sendEmployerEnquiryConfirmationEmail:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Task 39: Send Internal Team Enquiry Alert
 * Notifies Vakancy.in recruitment specialists.
 */
const sendInternalEnquiryAlertEmail = async ({ enquiryRef, employerName, employerEmail, jobTitle, applicationRef, enquiryType, message, submittedAt }) => {
  try {
    const internalEmail = process.env.INTERNAL_RECRUITMENT_EMAIL || process.env.ADMIN_EMAIL || 'admissions@vakancy.in';

    const html = renderInternalEnquiryAlertTemplate({
      enquiryRef,
      employerName,
      employerEmail,
      jobTitle,
      applicationRef,
      enquiryType,
      message,
      submittedAt
    });

    return await sendEmailNotification({
      to: internalEmail,
      subject: `[Internal Alert] New Employer Enquiry: ${employerName || 'Employer Partner'} (${enquiryType})`,
      html
    });
  } catch (err) {
    console.warn('⚠️ [Email Warning] Error in sendInternalEnquiryAlertEmail:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  sendEmailNotification,
  sendEmployerApplicationReceivedEmail,
  sendEmployerEnquiryConfirmationEmail,
  sendInternalEnquiryAlertEmail
};

