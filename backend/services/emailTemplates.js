/**
 * Vakancy.in Transactional Email Templates
 *
 * PRIVACY GUARANTEE:
 * Employer email templates must NEVER include candidate personal information:
 * - No candidate name, phone, email, resume, address, skills, experience, or notes.
 */

const baseEmailLayout = ({ title, preheader, contentHtml }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Vakancy.in Notification'}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; }
    .wrapper { width: 100%; max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; margin-top: 24px; margin-bottom: 24px; }
    .header { background: #0F172A; padding: 24px; text-align: center; }
    .header h1 { margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 700; letter-spacing: -0.025em; }
    .header p { margin: 4px 0 0; color: #94A3B8; font-size: 12px; }
    .content { padding: 32px 24px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge-blue { background-color: #E0F2FE; color: #0369A1; }
    .badge-teal { background-color: #CCFBF1; color: #0F766E; }
    .badge-amber { background-color: #FEF3C7; color: #B45309; }
    .detail-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .detail-table td { padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #F1F5F9; }
    .detail-table td.label { font-weight: 600; color: #64748B; width: 35%; }
    .detail-table td.value { color: #0F172A; font-weight: 500; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #0284C7; color: #FFFFFF !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; }
    .footer { background-color: #F8FAFC; padding: 20px 24px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #64748B; line-height: 1.5; }
    .privacy-notice { background-color: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 6px; padding: 12px 16px; margin: 20px 0; font-size: 12px; color: #475569; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || ''}
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC;">
    <tr>
      <td align="center">
        <div class="wrapper">
          <div class="header">
            <h1>Vakancy.in</h1>
            <p>Recruitment Management & Placement Platform</p>
          </div>
          <div class="content">
            ${contentHtml}
          </div>
          <div class="footer">
            <p>This is an automated recruitment notification from Vakancy.in.</p>
            <p>© ${new Date().getFullYear()} Vakancy.in. All rights reserved.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * 1. Employer Notification: New Application Received
 * STRICT PRIVACY: Zero candidate personal data.
 */
const renderApplicationReceivedTemplate = ({
  jobTitle,
  applicationRef,
  appliedAt,
  dashboardUrl
}) => {
  const contentHtml = `
    <span class="badge badge-blue">New Application</span>
    <h2 style="margin: 12px 0 8px; font-size: 18px; color: #0F172A;">Application Received for Your Job Opening</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px;">
      A new candidate has submitted an application for your position. You can review the application record and request recruitment updates directly from your employer portal.
    </p>

    <table class="detail-table">
      <tr>
        <td class="label">Job Opening</td>
        <td class="value"><strong>${jobTitle || 'Job Opening'}</strong></td>
      </tr>
      <tr>
        <td class="label">Application Ref</td>
        <td class="value"><code>${applicationRef || 'APP-RECEIVED'}</code></td>
      </tr>
      <tr>
        <td class="label">Received On</td>
        <td class="value">${appliedAt || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
      </tr>
      <tr>
        <td class="label">Status</td>
        <td class="value"><span style="color: #0284C7; font-weight: 600;">Submitted / Processing</span></td>
      </tr>
    </table>

    <div class="btn-container">
      <a href="${dashboardUrl || '#'}" class="btn">View Applicants in Portal</a>
    </div>

    <div class="privacy-notice">
      🔒 <strong>Privacy & Placement Process:</strong> In accordance with the Vakancy.in recruitment model, candidate contact information and full dossiers are managed confidentially by our recruitment team. To coordinate candidate interviews or request profile reviews, please use the enquiry action in your dashboard.
    </div>
  `;

  return baseEmailLayout({
    title: `New Application Received: ${jobTitle || 'Job Opening'}`,
    preheader: `A new application has been received for ${jobTitle}. Log in to review application details.`,
    contentHtml
  });
};

/**
 * 2. Employer Notification: Enquiry Confirmation
 * Sent to the employer when they submit a recruitment enquiry.
 */
const renderEmployerEnquiryConfirmationTemplate = ({
  enquiryRef,
  jobTitle,
  applicationRef,
  enquiryType,
  message,
  submittedAt
}) => {
  const contentHtml = `
    <span class="badge badge-teal">Enquiry Submitted</span>
    <h2 style="margin: 12px 0 8px; font-size: 18px; color: #0F172A;">We Have Received Your Recruitment Enquiry</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px;">
      Thank you for contacting Vakancy.in. Your recruitment request has been registered and routed to our dedicated recruitment team.
    </p>

    <table class="detail-table">
      <tr>
        <td class="label">Enquiry Reference</td>
        <td class="value"><code>${enquiryRef || 'ENQ-CONFIRMED'}</code></td>
      </tr>
      <tr>
        <td class="label">Job Opening</td>
        <td class="value"><strong>${jobTitle || 'Not specified'}</strong></td>
      </tr>
      <tr>
        <td class="label">Application Ref</td>
        <td class="value"><code>${applicationRef || 'N/A'}</code></td>
      </tr>
      <tr>
        <td class="label">Enquiry Type</td>
        <td class="value"><strong>${enquiryType || 'General Enquiry'}</strong></td>
      </tr>
      <tr>
        <td class="label">Submitted On</td>
        <td class="value">${submittedAt || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
      </tr>
      ${message ? `
      <tr>
        <td class="label">Your Note</td>
        <td class="value" style="font-style: italic; color: #475569;">"${message}"</td>
      </tr>` : ''}
    </table>

    <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; padding: 14px 16px; margin: 20px 0; font-size: 13px; color: #166534;">
      <strong>Next Steps:</strong> A Vakancy.in recruitment specialist is reviewing your request. We will follow up with you promptly regarding next steps and candidate coordination.
    </div>
  `;

  return baseEmailLayout({
    title: `Enquiry Received: ${enquiryRef || 'Recruitment Request'} - Vakancy.in`,
    preheader: `Your enquiry for ${jobTitle || 'recruitment'} has been logged. Reference: ${enquiryRef}`,
    contentHtml
  });
};

/**
 * 3. Internal Team Notification: Employer Enquiry Alert
 * Sent to Vakancy.in internal recruitment/admin team.
 */
const renderInternalEnquiryAlertTemplate = ({
  enquiryRef,
  employerName,
  employerEmail,
  jobTitle,
  applicationRef,
  enquiryType,
  message,
  submittedAt
}) => {
  const contentHtml = `
    <span class="badge badge-amber">Action Required: New Employer Enquiry</span>
    <h2 style="margin: 12px 0 8px; font-size: 18px; color: #0F172A;">Employer Request Submitted</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px;">
      An employer has submitted a recruitment enquiry that requires internal team review and coordination.
    </p>

    <table class="detail-table">
      <tr>
        <td class="label">Enquiry Ref</td>
        <td class="value"><code>${enquiryRef || 'N/A'}</code></td>
      </tr>
      <tr>
        <td class="label">Employer</td>
        <td class="value"><strong>${employerName || 'Employer Partner'}</strong> (${employerEmail || 'No email'})</td>
      </tr>
      <tr>
        <td class="label">Job Title</td>
        <td class="value"><strong>${jobTitle || 'N/A'}</strong></td>
      </tr>
      <tr>
        <td class="label">Application Ref</td>
        <td class="value"><code>${applicationRef || 'N/A'}</code></td>
      </tr>
      <tr>
        <td class="label">Enquiry Type</td>
        <td class="value"><span style="color: #B45309; font-weight: 700;">${enquiryType || 'General'}</span></td>
      </tr>
      <tr>
        <td class="label">Submitted At</td>
        <td class="value">${submittedAt || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
      </tr>
      <tr>
        <td class="label">Employer Note</td>
        <td class="value" style="background-color: #F8FAFC; padding: 12px; border-radius: 4px; font-family: monospace;">${message || '(No extra notes provided)'}</td>
      </tr>
    </table>

    <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 12px 16px; font-size: 12px; color: #991B1B;">
      ⚠️ <strong>Internal Notice:</strong> Please review this enquiry in the admin recruitment queue and initiate contact with the employer to coordinate candidate evaluation.
    </div>
  `;

  return baseEmailLayout({
    title: `[Internal Alert] Employer Enquiry: ${employerName || 'Employer'} - ${enquiryType}`,
    preheader: `New employer enquiry from ${employerName} for ${jobTitle}.`,
    contentHtml
  });
};

module.exports = {
  renderApplicationReceivedTemplate,
  renderEmployerEnquiryConfirmationTemplate,
  renderInternalEnquiryAlertTemplate
};
