/**
 * Vakancy.in Transactional Email Templates
 *
 * Professional, Responsive, Vakancy-branded HTML Email Templates.
 *
 * PRIVACY GUARANTEE:
 * Employer email templates must NEVER include candidate personal information:
 * - No candidate name, phone, email, resume, address, skills, experience, or notes.
 */

const { SUPPORT_EMAIL } = require('../config/constants');

const escapeHtml = value =>
  String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));

const baseEmailLayout = ({ title, preheader, contentHtml }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title || 'Vakancy.in Notification')}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; }
    .email-container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; margin-top: 32px; margin-bottom: 32px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); }
    .header-bar { background: linear-gradient(135deg, #1E40AF 0%, #0F172A 100%); padding: 32px 24px; text-align: center; }
    .header-logo { color: #FFFFFF; font-size: 26px; font-weight: 800; letter-spacing: -0.03em; margin: 0; text-transform: uppercase; }
    .header-tagline { color: #93C5FD; font-size: 13px; font-weight: 500; margin: 6px 0 0; letter-spacing: 0.05em; }
    .body-content { padding: 36px 32px; }
    .pill-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
    .pill-blue { background-color: #EFF6FF; color: #1D4ED8; border: 1px solid #DBEAFE; }
    .pill-green { background-color: #ECFDF5; color: #047857; border: 1px solid #D1FAE5; }
    .pill-amber { background-color: #FFFBEB; color: #B45309; border: 1px solid #FEF3C7; }
    .detail-table { width: 100%; border-collapse: collapse; margin: 24px 0; background-color: #F8FAFC; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; }
    .detail-table td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #F1F5F9; }
    .detail-table tr:last-child td { border-bottom: none; }
    .detail-table td.label { font-weight: 600; color: #64748B; width: 35%; }
    .detail-table td.value { color: #0F172A; font-weight: 600; }
    .btn-container { text-align: center; margin: 32px 0 24px; }
    .action-btn { display: inline-block; background-color: #2563EB; color: #FFFFFF !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.39); letter-spacing: 0.01em; }
    .action-btn:hover { background-color: #1D4ED8; }
    .footer-bar { background-color: #F8FAFC; padding: 24px 32px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #64748B; line-height: 1.6; }
    .security-callout { background-color: #F8FAFC; border-left: 4px solid #2563EB; padding: 14px 16px; margin: 20px 0; font-size: 12px; color: #475569; border-radius: 0 8px 8px 0; }
    .privacy-notice { background-color: #EFF6FF; border: 1px dashed #93C5FD; border-radius: 8px; padding: 14px 16px; margin: 20px 0; font-size: 12px; color: #1E3A8A; line-height: 1.5; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
      .body-content { padding: 24px 20px !important; }
    }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${escapeHtml(preheader || '')}
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0F172A; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <div class="email-container">
          <div class="header-bar">
            <h1 class="header-logo">Vakancy<span style="color:#60A5FA;">.in</span></h1>
            <p class="header-tagline">Next-Gen Recruitment &amp; Placement Platform</p>
          </div>
          <div class="body-content">
            ${contentHtml}
          </div>
          <div class="footer-bar">
            <p style="margin: 0 0 8px;"><strong>Vakancy.in Support Team</strong> | <a href="mailto:support@vakancy.in" style="color: #2563EB; text-decoration: none;">support@vakancy.in</a></p>
            <p style="margin: 0 0 8px;">Official Support Line &amp; Verified Recruiter Gateway</p>
            <p style="margin: 0; font-size: 11px; color: #94A3B8;">© ${new Date().getFullYear()} Vakancy.in. All rights reserved. Do not share sensitive verification links.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * 1. Password Reset Template
 */
const renderPasswordResetTemplate = ({ resetUrl, expiresInMinutes = 60 }) => baseEmailLayout({
  title: 'Reset your Vakancy.in Password',
  preheader: 'Single-use security link to reset your Vakancy.in account password.',
  contentHtml: `
    <span class="pill-badge pill-amber">Security Alert</span>
    <h2 style="margin: 14px 0 10px; font-size: 20px; font-weight: 800; color: #0F172A;">Reset Your Password</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
      We received a request to reset your password for your <strong>Vakancy.in</strong> account. You can securely set a new password using the button below:
    </p>

    <div class="btn-container">
      <a href="${escapeHtml(resetUrl)}" class="action-btn">Reset My Password</a>
    </div>

    <div class="security-callout">
      ⏱️ <strong>Single-Use Security Token:</strong> This link will expire in <strong>${Number(expiresInMinutes)} minutes</strong> and can only be used once. If you did not request a password reset, you can safely ignore this email — your account remains completely secure.
    </div>

    <p style="font-size: 12px; color: #94A3B8; margin-top: 24px; word-break: break-all;">
      Button not working? Copy and paste this URL into your browser:<br>
      <a href="${escapeHtml(resetUrl)}" style="color: #2563EB;">${escapeHtml(resetUrl)}</a>
    </p>
  `
});

/**
 * 2. Candidate Welcome Template
 */
const renderCandidateWelcomeTemplate = ({ name, portalUrl }) => baseEmailLayout({
  title: 'Welcome to Vakancy.in - Your AI-Powered Career Partner',
  preheader: 'Welcome to Vakancy! Start discovering verified career opportunities.',
  contentHtml: `
    <span class="pill-badge pill-green">Account Activated</span>
    <h2 style="margin: 14px 0 10px; font-size: 20px; font-weight: 800; color: #0F172A;">Welcome aboard, ${escapeHtml(name || 'Candidate')}!</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 18px;">
      Your Vakancy.in candidate account has been successfully created. You now have full access to our curated jobs network, intelligent resume builder, and direct employer pipeline.
    </p>

    <div style="background-color: #F8FAFC; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #E2E8F0;">
      <h3 style="margin: 0 0 12px; font-size: 14px; color: #0F172A; text-transform: uppercase; letter-spacing: 0.05em;">Get Started in 3 Steps:</h3>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.8;">
        <li><strong>Complete Your Profile:</strong> Showcase your skills, experience, and preferred roles.</li>
        <li><strong>Build with AI Resume Studio:</strong> Create an ATS-optimized professional resume in minutes.</li>
        <li><strong>1-Click Applications:</strong> Apply directly to verified corporate openings and track status in real time.</li>
      </ul>
    </div>

    <div class="btn-container">
      <a href="${escapeHtml(portalUrl || 'https://vakancy.in/candidate/dashboard')}" class="action-btn">Go to Candidate Dashboard</a>
    </div>

    <p style="font-size: 12px; color: #64748B; margin-top: 16px;">
      Need assistance? Contact our career concierge anytime at <a href="mailto:support@vakancy.in" style="color: #2563EB;">support@vakancy.in</a>.
    </p>
  `
});

/**
 * 3. Employer Welcome Template
 */
const renderEmployerWelcomeTemplate = ({ name, companyName, portalUrl }) => baseEmailLayout({
  title: 'Welcome to Vakancy.in - Enterprise Recruitment Gateway',
  preheader: 'Welcome to Vakancy for Employers. Streamline your hiring pipeline.',
  contentHtml: `
    <span class="pill-badge pill-blue">Employer Partner</span>
    <h2 style="margin: 14px 0 10px; font-size: 20px; font-weight: 800; color: #0F172A;">Welcome to Vakancy.in, ${escapeHtml(name || 'Partner')}!</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 18px;">
      Your employer workspace for <strong>${escapeHtml(companyName || 'your organization')}</strong> is ready. Vakancy connects high-growth companies with pre-vetted professionals through automated screening and ATS workflows.
    </p>

    <div style="background-color: #F8FAFC; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #E2E8F0;">
      <h3 style="margin: 0 0 12px; font-size: 14px; color: #0F172A; text-transform: uppercase; letter-spacing: 0.05em;">Recruitment Tools Available:</h3>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.8;">
        <li><strong>Post &amp; Distribute Jobs:</strong> Publish roles with AI-assisted job descriptions.</li>
        <li><strong>Browse Candidate Database:</strong> Access verified candidate profiles matching your requirements.</li>
        <li><strong>ATS Pipeline Board:</strong> Manage stages from Applied to Interview, Offer, and Hired.</li>
        <li><strong>Executive Search:</strong> Request dedicated recruiter support for senior or niche placements.</li>
      </ul>
    </div>

    <div class="btn-container">
      <a href="${escapeHtml(portalUrl || 'https://vakancy.in/recruiter')}" class="action-btn">Launch Employer Workspace</a>
    </div>

    <div class="security-callout">
      🛡️ <strong>Verification &amp; Security:</strong> Our employer onboarding team verifies company credentials to protect both employers and job seekers. If you haven't completed your company profile, please finish onboarding to unlock active listings.
    </div>
  `
});

/**
 * 4. Candidate Job Application Confirmation
 */
const renderCandidateApplicationTemplate = ({
  jobTitle,
  companyName,
  referenceNumber,
  appliedAt,
  dashboardUrl
}) => baseEmailLayout({
  title: `Application Confirmed: ${escapeHtml(jobTitle || 'Job Opening')} - Vakancy.in`,
  preheader: `Your application for ${escapeHtml(jobTitle)} was successfully submitted.`,
  contentHtml: `
    <span class="pill-badge pill-green">Application Submitted</span>
    <h2 style="margin: 14px 0 10px; font-size: 20px; font-weight: 800; color: #0F172A;">Your Application Has Been Received!</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 18px;">
      Great news! Your application for <strong>${escapeHtml(jobTitle || 'the position')}</strong>${companyName ? ` at <strong>${escapeHtml(companyName)}</strong>` : ''} has been safely delivered to the recruitment team.
    </p>

    <table class="detail-table">
      <tr>
        <td class="label">Position</td>
        <td class="value">${escapeHtml(jobTitle || 'Job Opening')}</td>
      </tr>
      ${companyName ? `
      <tr>
        <td class="label">Company</td>
        <td class="value">${escapeHtml(companyName)}</td>
      </tr>` : ''}
      <tr>
        <td class="label">Reference ID</td>
        <td class="value"><code style="background:#E2E8F0;padding:2px 6px;border-radius:4px;">${escapeHtml(referenceNumber || 'N/A')}</code></td>
      </tr>
      <tr>
        <td class="label">Submitted At</td>
        <td class="value">${escapeHtml(appliedAt || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }))}</td>
      </tr>
      <tr>
        <td class="label">Status</td>
        <td class="value"><span style="color: #2563EB;">Applied / In Review</span></td>
      </tr>
    </table>

    <div class="btn-container">
      <a href="${escapeHtml(dashboardUrl || 'https://vakancy.in/candidate/applications')}" class="action-btn">Track Application Status</a>
    </div>

    <p style="font-size: 12px; color: #64748B;">
      You will receive automated email updates whenever your application progresses to the screening, interview, or selection stage.
    </p>
  `
});

/**
 * 5. Employer Notification: New Application Received (Strict Zero PII)
 */
const renderApplicationReceivedTemplate = ({
  jobTitle,
  applicationRef,
  appliedAt,
  dashboardUrl
}) => baseEmailLayout({
  title: `New Application Received: ${escapeHtml(jobTitle || 'Job Opening')} - Vakancy.in`,
  preheader: `A new candidate applied for ${escapeHtml(jobTitle)}. Review in your employer portal.`,
  contentHtml: `
    <span class="pill-badge pill-blue">New Application</span>
    <h2 style="margin: 14px 0 10px; font-size: 20px; font-weight: 800; color: #0F172A;">New Candidate Application Received</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 18px;">
      A qualified candidate has submitted their profile for your active job posting on Vakancy.in.
    </p>

    <table class="detail-table">
      <tr>
        <td class="label">Job Posting</td>
        <td class="value"><strong>${escapeHtml(jobTitle || 'Job Opening')}</strong></td>
      </tr>
      <tr>
        <td class="label">Application Ref</td>
        <td class="value"><code style="background:#E2E8F0;padding:2px 6px;border-radius:4px;">${escapeHtml(applicationRef || 'APP-RECEIVED')}</code></td>
      </tr>
      <tr>
        <td class="label">Received On</td>
        <td class="value">${escapeHtml(appliedAt || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }))}</td>
      </tr>
      <tr>
        <td class="label">Pipeline Stage</td>
        <td class="value"><span style="color: #2563EB;">Applied / Ready for Review</span></td>
      </tr>
    </table>

    <div class="btn-container">
      <a href="${escapeHtml(dashboardUrl || 'https://vakancy.in/recruiter')}" class="action-btn">Review Applicants in Workspace</a>
    </div>

    <div class="privacy-notice">
      🔒 <strong>Privacy &amp; Candidate Protection:</strong> In compliance with platform standards, candidate contact details and full dossiers are managed securely within the portal. To schedule an interview or request recruiter assistance, use the actions inside your dashboard.
    </div>
  `
});

/**
 * 6. Application Stage Update Template (Candidate)
 */
const renderApplicationStageTemplate = ({ jobTitle, companyName, status, dashboardUrl }) => baseEmailLayout({
  title: `Application Status Updated: ${escapeHtml(jobTitle || 'Role')} - Vakancy.in`,
  preheader: `Your application status has been updated to ${escapeHtml(String(status || '').replace(/_/g, ' '))}.`,
  contentHtml: `
    <span class="pill-badge pill-blue">Status Update</span>
    <h2 style="margin: 14px 0 10px; font-size: 20px; font-weight: 800; color: #0F172A;">Application Status Updated</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 18px;">
      There is an update on your application for <strong>${escapeHtml(jobTitle || 'the role')}</strong>${companyName ? ` at <strong>${escapeHtml(companyName)}</strong>` : ''}.
    </p>

    <table class="detail-table">
      <tr>
        <td class="label">Job Opening</td>
        <td class="value">${escapeHtml(jobTitle || 'Job Opening')}</td>
      </tr>
      <tr>
        <td class="label">New Status</td>
        <td class="value"><strong style="color: #2563EB; text-transform: capitalize;">${escapeHtml(String(status || '').replace(/_/g, ' '))}</strong></td>
      </tr>
      <tr>
        <td class="label">Updated At</td>
        <td class="value">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
      </tr>
    </table>

    <div class="btn-container">
      <a href="${escapeHtml(dashboardUrl || 'https://vakancy.in/candidate/applications')}" class="action-btn">View Details in Dashboard</a>
    </div>
  `
});

/**
 * 7. Employer Enquiry Confirmation Template
 */
const renderEmployerEnquiryConfirmationTemplate = ({
  enquiryRef,
  jobTitle,
  applicationRef,
  enquiryType,
  message,
  submittedAt
}) => baseEmailLayout({
  title: `Enquiry Received: ${escapeHtml(enquiryRef || 'Recruitment Request')} - Vakancy.in`,
  preheader: `Your enquiry for ${escapeHtml(jobTitle || 'recruitment')} has been logged. Reference: ${escapeHtml(enquiryRef)}`,
  contentHtml: `
    <span class="pill-badge pill-green">Enquiry Logged</span>
    <h2 style="margin: 14px 0 10px; font-size: 20px; font-weight: 800; color: #0F172A;">Recruitment Enquiry Registered</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 18px;">
      Thank you for contacting Vakancy.in. Your recruitment request has been logged and assigned to our placement team.
    </p>

    <table class="detail-table">
      <tr>
        <td class="label">Enquiry Ref</td>
        <td class="value"><code>${escapeHtml(enquiryRef || 'ENQ-CONFIRMED')}</code></td>
      </tr>
      <tr>
        <td class="label">Job Opening</td>
        <td class="value">${escapeHtml(jobTitle || 'Not specified')}</td>
      </tr>
      <tr>
        <td class="label">Enquiry Type</td>
        <td class="value"><strong>${escapeHtml(enquiryType || 'General Enquiry')}</strong></td>
      </tr>
      <tr>
        <td class="label">Logged On</td>
        <td class="value">${escapeHtml(submittedAt || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }))}</td>
      </tr>
      ${message ? `
      <tr>
        <td class="label">Your Note</td>
        <td class="value" style="font-style: italic; color: #475569;">"${escapeHtml(message)}"</td>
      </tr>` : ''}
    </table>

    <div class="security-callout">
      🤝 <strong>Next Steps:</strong> A Vakancy recruitment specialist is reviewing your request and will reach out to coordinate candidate schedules.
    </div>
  `
});

/**
 * 8. Internal Team Enquiry Alert Template
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
}) => baseEmailLayout({
  title: `[Internal Alert] Employer Enquiry: ${escapeHtml(employerName || 'Employer')} - ${escapeHtml(enquiryType)}`,
  preheader: `New employer enquiry from ${escapeHtml(employerName)} for ${escapeHtml(jobTitle)}.`,
  contentHtml: `
    <span class="pill-badge pill-amber">Action Required</span>
    <h2 style="margin: 14px 0 10px; font-size: 20px; font-weight: 800; color: #0F172A;">New Employer Enquiry</h2>
    <table class="detail-table">
      <tr>
        <td class="label">Enquiry Ref</td>
        <td class="value"><code>${escapeHtml(enquiryRef || 'N/A')}</code></td>
      </tr>
      <tr>
        <td class="label">Employer</td>
        <td class="value"><strong>${escapeHtml(employerName || 'Employer Partner')}</strong> (${escapeHtml(employerEmail || 'No email')})</td>
      </tr>
      <tr>
        <td class="label">Job Title</td>
        <td class="value">${escapeHtml(jobTitle || 'N/A')}</td>
      </tr>
      <tr>
        <td class="label">Type</td>
        <td class="value"><strong>${escapeHtml(enquiryType || 'General')}</strong></td>
      </tr>
      <tr>
        <td class="label">Submitted</td>
        <td class="value">${escapeHtml(submittedAt || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }))}</td>
      </tr>
      <tr>
        <td class="label">Message</td>
        <td class="value">${escapeHtml(message || '(No note provided)')}</td>
      </tr>
    </table>
  `
});

/**
 * 9. Email OTP Password Recovery & Shortlist Verification Template
 */
const renderOtpEmailTemplate = ({ otp, purpose = 'password_reset', jobTitle, companyName, expiresInMinutes = 15 }) => {
  const isShortlist = purpose === 'shortlist_verification' || Boolean(jobTitle || companyName);
  const isSetPassword = purpose === 'set_password';
  
  let heading = 'Password Recovery Verification Code';
  let description = 'We received a request to reset the password for your Vakancy.in account. Enter the 6-digit verification code below to continue:';
  
  if (isShortlist) {
    heading = 'Executive Shortlist Verification';
    description = `To access the candidate shortlist for <strong>${escapeHtml(jobTitle || 'Executive Opening')}</strong>${companyName ? ` at <strong>${escapeHtml(companyName)}</strong>` : ''}, please enter the 6-digit verification code below:`;
  } else if (isSetPassword) {
    heading = 'Verify Your Email to Set Password';
    description = 'Use the 6-digit verification code below to set a local password for your Vakancy.in account:';
  }

  return baseEmailLayout({
    title: heading + ' - Vakancy.in',
    preheader: `Your 6-digit verification code is ${otp}. Valid for ${expiresInMinutes} minutes.`,
    contentHtml: `
      <span class="pill-badge ${isShortlist ? 'pill-blue' : 'pill-amber'}">${isShortlist ? 'Shortlist Security' : 'Security Verification'}</span>
      <h2 style="margin: 14px 0 10px; font-size: 22px; font-weight: 800; color: #0F172A;">${escapeHtml(heading)}</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
        ${description}
      </p>

      <div style="margin: 28px 0; text-align: center;">
        <div style="display: inline-block; background-color: #F8FAFC; border: 2px dashed #3B82F6; border-radius: 12px; padding: 18px 32px; font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #1E40AF; text-align: center;">
          ${escapeHtml(otp)}
        </div>
      </div>

      <div class="security-callout" style="border-left-color: #E11D48; background-color: #FFF1F2; color: #9F1239;">
        ⚠️ <strong>Do NOT share this code with anyone.</strong> Vakancy support personnel will NEVER ask you for your verification code.
      </div>

      <div class="security-callout">
        ⏱️ <strong>Time-Sensitive:</strong> This verification code will expire in <strong>${Number(expiresInMinutes)} minutes</strong> and can only be used once.
      </div>

      <p style="font-size: 13px; line-height: 1.6; color: #64748B; margin-top: 24px;">
        If you did not request this verification code, please disregard this email. Your Vakancy.in account remains completely secure and no changes have been made.
      </p>
    `
  });
};

/**
 * 10. Recruiter Direct Message / Communication Notification Template
 */
const renderRecruiterMessageNotificationTemplate = ({ recipientName, senderName, jobTitle, dashboardUrl }) => baseEmailLayout({
  title: 'New Message on Vakancy.in',
  preheader: `You have received a new recruiter communication regarding ${jobTitle || 'an application'}.`,
  contentHtml: `
    <span class="pill-badge pill-blue">Direct Communication</span>
    <h2 style="margin: 14px 0 10px; font-size: 20px; font-weight: 800; color: #0F172A;">New Recruiter Message</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 18px;">
      Hello ${escapeHtml(recipientName || 'there')},<br>
      You have received a new direct communication regarding <strong>${escapeHtml(jobTitle || 'your job application')}</strong>${senderName ? ` from <strong>${escapeHtml(senderName)}</strong>` : ''}.
    </p>

    <div class="privacy-notice">
      🔒 <strong>Privacy & Security Protection:</strong> In accordance with Vakancy data security standards, confidential message details are kept inside your authenticated portal.
    </div>

    <div class="btn-container">
      <a href="${escapeHtml(dashboardUrl || 'https://vakancy.in/candidate/applications')}" class="action-btn">View Message in Portal</a>
    </div>

    <p style="font-size: 12px; color: #94A3B8; margin-top: 24px;">
      You received this email because direct recruiter message notifications are enabled in your account settings.
    </p>
  `
});

/**
 * 11. Job Recommendations Digest Template
 */
const renderJobDigestTemplate = ({ candidateName, jobs = [], portalUrl }) => {
  const jobItemsHtml = jobs.map(j => `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
      <h3 style="margin: 0 0 6px; font-size: 15px; font-weight: 700; color: #0F172A;">
        <a href="${escapeHtml(j.jobUrl)}" style="color: #1E40AF; text-decoration: none;">${escapeHtml(j.title)}</a>
      </h3>
      <p style="margin: 0 0 8px; font-size: 13px; color: #475569;">
        🏢 <strong>${escapeHtml(j.company)}</strong> &nbsp;|&nbsp; 📍 ${escapeHtml(j.location || 'India')}
      </p>
      <div style="font-size: 12px; color: #64748B;">
        ${j.salary ? `💰 ${escapeHtml(j.salary)} &nbsp;|&nbsp; ` : ''}${j.experience ? `⏱️ ${escapeHtml(j.experience)}` : ''}
      </div>
    </div>
  `).join('');

  return baseEmailLayout({
    title: 'Top Job Matches for You - Vakancy.in',
    preheader: `Here are ${jobs.length} new career opportunities matching your preferences.`,
    contentHtml: `
      <span class="pill-badge pill-green">Career Recommendations</span>
      <h2 style="margin: 14px 0 10px; font-size: 20px; font-weight: 800; color: #0F172A;">Curated Job Recommendations</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
        Hello ${escapeHtml(candidateName || 'Candidate')},<br>
        Based on your career preferences and profile, here are top verified positions currently open on Vakancy.in:
      </p>

      ${jobItemsHtml}

      <div class="btn-container">
        <a href="${escapeHtml(portalUrl || 'https://vakancy.in/candidate/jobs')}" class="action-btn">Explore All Matching Jobs</a>
      </div>

      <p style="font-size: 12px; color: #94A3B8; margin-top: 24px;">
        You are receiving this digest because Job Recommendations (Email) is enabled in your Vakancy account settings.
      </p>
    `
  });
};

const renderExecutiveShortlistSharedTemplate = ({
  employerName,
  companyName,
  jobTitle,
  candidateCount = 1,
  shortlistUrl,
  expiresAt,
  customMessage
}) => {
  const formattedExpiry = expiresAt ? new Date(expiresAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : '14 days';

  return baseEmailLayout({
    title: `Candidate Shortlist: ${jobTitle} - ${companyName || 'Vakancy Executive Search'}`,
    preheader: `Vakancy Executive Search team has prepared a curated shortlist of ${candidateCount} candidate(s) for ${jobTitle} at ${companyName || 'your company'}.`,
    contentHtml: `
      <span class="pill-badge pill-blue">Executive Search Shortlist</span>
      <h2 style="margin: 14px 0 10px; font-size: 20px; font-weight: 800; color: #0F172A;">Curated Candidate Shortlist Ready</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
        Dear ${escapeHtml(employerName || 'Hiring Team')},<br>
        The Vakancy Executive Search recruitment team has sourced and curated a shortlist of qualified candidates for your executive mandate:
      </p>

      <table class="detail-table">
        <tr>
          <td class="label">Position Mandate</td>
          <td class="value">${escapeHtml(jobTitle || 'Executive Search Job')}</td>
        </tr>
        ${companyName ? `
        <tr>
          <td class="label">Company / Client</td>
          <td class="value">${escapeHtml(companyName)}</td>
        </tr>
        ` : ''}
        <tr>
          <td class="label">Shortlisted Candidates</td>
          <td class="value">${escapeHtml(candidateCount)} Approved Profile(s)</td>
        </tr>
        <tr>
          <td class="label">Link Expiration</td>
          <td class="value">${escapeHtml(formattedExpiry)}</td>
        </tr>
      </table>

      ${customMessage && customMessage.trim() ? `
      <div style="background-color: #F8FAFC; border-left: 4px solid #2563EB; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
        <strong style="color: #0F172A; font-size: 13px; display: block; margin-bottom: 4px;">Message from Vakancy Executive Search Team:</strong>
        <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(customMessage.trim())}</p>
      </div>
      ` : ''}

      <div class="privacy-notice">
        <strong>🔒 Confidential &amp; Protected Shortlist:</strong> Candidate profiles are shared in confidence for evaluation regarding this specific search mandate. This secure link expires automatically.
      </div>

      <div class="btn-container">
        <a href="${escapeHtml(shortlistUrl)}" class="action-btn">Review Candidate Shortlist</a>
      </div>

      <p style="font-size: 12px; color: #64748B; margin-top: 24px; line-height: 1.5;">
        If you have questions about this shortlist or need to schedule interviews with candidates, please reply directly or reach our executive desk at <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color: #2563EB;">${escapeHtml(SUPPORT_EMAIL)}</a>.
      </p>
    `
  });
};

/**
 * 13. Admin Enquiry Direct Response Template
 */
const renderEnquiryReplyTemplate = ({
  recipientName,
  subject,
  replyMessage,
  originalMessage,
  enquiryRef,
  responderName
}) => baseEmailLayout({
  title: `Re: ${subject || 'Your Vakancy Enquiry'} - Vakancy Support`,
  preheader: `Update from Vakancy team regarding your enquiry ${enquiryRef ? `#${enquiryRef}` : ''}`,
  contentHtml: `
    <span class="pill-badge pill-blue">Enquiry Response</span>
    <h2 style="margin: 14px 0 10px; font-size: 20px; font-weight: 800; color: #0F172A;">Response to Your Enquiry</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px;">
      Dear ${escapeHtml(recipientName || 'Visitor')},<br>
      Thank you for reaching out to Vakancy.in. A member of our team has reviewed your enquiry${enquiryRef ? ` (Ref: #${escapeHtml(enquiryRef)})` : ''}:
    </p>

    <div style="background-color: #F8FAFC; border-left: 4px solid #1D4ED8; padding: 16px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0; font-size: 14px; color: #1E293B; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(replyMessage)}</p>
      ${responderName ? `
      <p style="margin: 12px 0 0; font-size: 12px; color: #64748B; font-weight: 600;">
        — ${escapeHtml(responderName)}, Vakancy Recruitment Team
      </p>
      ` : ''}
    </div>

    ${originalMessage ? `
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E2E8F0;">
      <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94A3B8; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">
        Your Original Message
      </span>
      <p style="margin: 0; font-size: 12px; color: #64748B; font-style: italic; line-height: 1.5; background-color: #FAFAFA; padding: 10px 14px; border-radius: 6px;">
        "${escapeHtml(originalMessage)}"
      </p>
    </div>
    ` : ''}

    <p style="font-size: 12px; color: #64748B; margin-top: 24px; line-height: 1.5;">
      You can reply directly to this email or reach us anytime at <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color: #2563EB;">${escapeHtml(SUPPORT_EMAIL)}</a>.
    </p>
  `
});

module.exports = {
  escapeHtml,
  baseEmailLayout,
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
};
