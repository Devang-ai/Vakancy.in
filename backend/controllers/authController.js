const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { generateToken } = require('../config/jwt');
const { createResetToken, hashResetToken, buildResetUrl } = require('../services/passwordResetService');
const {
  createOtp,
  verifyOtp,
  generateResetAuthToken,
  verifyResetAuthToken
} = require('../services/otpService');
const {
  sendPasswordResetEmail,
  sendOtpEmail,
  sendCandidateWelcomeEmail,
  sendEmployerWelcomeEmail
} = require('../services/emailService');
const { verifyGoogleIdToken } = require('../services/googleAuthService');
const { failedLoginTracker } = require('../middleware/securityMiddleware');

const verifyPassword = async (submittedPassword, storedHash) => {
  if (!submittedPassword || !storedHash) return false;

  // Single secure password-hash verification path for all environments.
  // Requires standard salted bcrypt hash ($2a$, $2b$, or $2y$). Stored plaintext is strictly rejected.
  if (typeof storedHash === 'string' && (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$'))) {
    try {
      const match = await bcrypt.compare(submittedPassword, storedHash);
      if (match) return true;
      if (typeof submittedPassword === 'string' && submittedPassword.trim() !== submittedPassword) {
        const trimmedMatch = await bcrypt.compare(submittedPassword.trim(), storedHash);
        if (trimmedMatch) return true;
      }
    } catch (_) {}
  }

  return false;
};

const register = async (req, res) => {
  try {
    const { email, password, role, phone, name } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const targetRole = (role || 'employer').trim().toLowerCase();
    const publicRoles = ['candidate', 'employer'];
    if (!publicRoles.includes(targetRole)) {
      return res.status(403).json({
        success: false,
        message: 'Security Violation: Internal team members, administrative roles, and custom operational accounts cannot self-register through the public registration portal. Accounts must be provisioned by the Director.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUsers = await db.query('SELECT id, role FROM USERS WHERE LOWER(email) = ?', [cleanEmail]);
    if (existingUsers.length > 0) {
      const existingRole = existingUsers[0].role;
      const isExistingCandidate = existingRole === 'candidate';
      const isExistingEmployer = existingRole === 'employer' || existingRole === 'recruiter';
      const isTargetCandidate = targetRole === 'candidate';
      const isTargetEmployer = targetRole === 'employer' || targetRole === 'recruiter';

      if (isTargetCandidate && isExistingEmployer) {
        return res.status(409).json({
          success: false,
          code: 'ACCOUNT_ROLE_CONFLICT',
          message: 'This email is already registered as an Employer. Please use a different email for Candidate registration.',
          existing_role: existingRole,
          requested_role: targetRole,
          login_path: '/login?role=employer'
        });
      }

      if (isTargetEmployer && isExistingCandidate) {
        return res.status(409).json({
          success: false,
          code: 'ACCOUNT_ROLE_CONFLICT',
          message: 'This email is already registered as a Candidate. Please use a different email for Employer registration.',
          existing_role: existingRole,
          requested_role: targetRole,
          login_path: '/login?role=candidate'
        });
      }

      if (isTargetCandidate && isExistingCandidate) {
        return res.status(409).json({
          success: false,
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'This email is already registered as a Candidate. Please sign in to your Candidate portal or use a different email.',
          existing_role: existingRole,
          requested_role: targetRole,
          login_path: '/login?role=candidate'
        });
      }

      if (isTargetEmployer && isExistingEmployer) {
        return res.status(409).json({
          success: false,
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'This email is already registered as an Employer. Please sign in to your Employer portal or use a different email.',
          existing_role: existingRole,
          requested_role: targetRole,
          login_path: '/login?role=employer'
        });
      }

      const portalName = isExistingCandidate ? 'Candidate' : (isExistingEmployer ? 'Employer' : existingRole);
      return res.status(409).json({
        success: false,
        code: 'ACCOUNT_ROLE_CONFLICT',
        message: `This email is already registered as a ${portalName}. Each email can only be used for one portal.`,
        existing_role: existingRole,
        requested_role: targetRole,
        login_path: `/login?role=${existingRole}`
      });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const userId = uuidv4();
    const cleanPhone = phone ? String(phone).trim() : null;
    const cleanName = name ? String(name).trim() : cleanEmail.split('@')[0];

    await db.query(
      'INSERT INTO USERS (id, email, password_hash, role, phone, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [userId, cleanEmail, password_hash, targetRole, cleanPhone]
    );

    let profileData = null;

    if (targetRole === 'candidate') {
      const candidateId = uuidv4();
      await db.query(
        'INSERT INTO CANDIDATES (id, user_id, name, profile_type, is_premium) VALUES (?, ?, ?, "experienced", 0)',
        [candidateId, userId, cleanName]
      );
      profileData = { candidate_id: candidateId, name: cleanName };
    } else if (targetRole === 'employer' || targetRole === 'recruiter') {
      const employerId = uuidv4();
      await db.query(
        `INSERT INTO EMPLOYERS (
          id, user_id, company_name, contact_person_name, official_email, official_phone,
          contact_email, contact_phone, is_onboarding_completed, onboarding_step, approval_status
        ) VALUES (?, ?, 'Pending Company Profile', ?, ?, ?, ?, ?, 0, 1, 'approved')`,
        [employerId, userId, cleanName, cleanEmail, cleanPhone, cleanEmail, cleanPhone]
      );
      profileData = {
        id: employerId,
        employer_id: employerId,
        company_name: 'Pending Company Profile',
        contact_person_name: cleanName,
        official_email: cleanEmail,
        official_phone: cleanPhone,
        is_onboarding_completed: false,
        onboarding_step: 1
      };
    }

    const userObj = { id: userId, email: cleanEmail, role: targetRole, name: cleanName, phone: cleanPhone, is_active: 1 };
    const token = generateToken(userObj);

    // Welcome In-App Notification
    const notifId = uuidv4();
    try {
      await db.query(
        'INSERT INTO NOTIFICATION (id, user_id, type, title, message) VALUES (?, ?, "welcome", "Welcome to Vakancy!", "Thank you for registering your account on Vakancy Recruitment Portal.")',
        [notifId, userId]
      );
    } catch (_) {}

    // Send Welcome Email (Non-blocking async)
    try {
      if (targetRole === 'candidate') {
        sendCandidateWelcomeEmail(cleanEmail, { name: cleanName }).catch(err => {
          console.warn('⚠️ [Email Warning] Failed to send candidate welcome email:', err.message);
        });
      } else if (targetRole === 'employer' || targetRole === 'recruiter') {
        sendEmployerWelcomeEmail(cleanEmail, {
          name: cleanName,
          companyName: profileData?.company_name || 'your organization'
        }).catch(err => {
          console.warn('⚠️ [Email Warning] Failed to send employer welcome email:', err.message);
        });
      }
    } catch (e) {
      console.warn('⚠️ [Email Dispatch Error] Unexpected error triggering welcome email:', e.message);
    }

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: userObj,
      profile: profileData
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration.', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const rawIdentifier = (req.body.email || req.body.identifier || '');
    const cleanIdentifier = rawIdentifier.trim().toLowerCase();
    const password = req.body.password;
    const requestedRole = (req.body.role || req.body.requestedRole || req.body.portal || '').trim().toLowerCase();

    if (!cleanIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Email/Mobile and password are required.' });
    }

    const users = await db.query(
      'SELECT * FROM USERS WHERE LOWER(email) = ? OR phone = ? OR phone = ?',
      [cleanIdentifier, rawIdentifier.trim(), cleanIdentifier]
    );

    if (users.length === 0) {
      failedLoginTracker.recordFailure(req.ip, cleanIdentifier);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact administrator.' });
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      failedLoginTracker.recordFailure(req.ip, cleanIdentifier);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Reset failed counter upon successful credential match
    failedLoginTracker.recordSuccess(req.ip, cleanIdentifier);

    // Role validation against requested portal/role
    const isInternalUser = ['director', 'bd_lead', 'tl_coordinator', 'recruiter', 'admin', 'main_admin'].includes(user.role);

    if (requestedRole) {
      const isCandidatePortal = requestedRole === 'candidate';
      const isEmployerPortal = requestedRole === 'employer';
      const isAdminPortal = requestedRole === 'admin';
      const userIsCandidate = user.role === 'candidate';
      const userIsEmployer = user.role === 'employer';

      if (isAdminPortal && !isInternalUser) {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_ROLE_CONFLICT',
          message: 'You cannot login with this email. This email does not have administrative privileges.',
          existing_role: user.role,
          requested_role: requestedRole
        });
      }

      if (isCandidatePortal && !userIsCandidate && !isInternalUser) {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_ROLE_CONFLICT',
          message: 'You cannot login with this email. This email is registered as an Employer.',
          existing_role: user.role,
          requested_role: requestedRole
        });
      }

      if (isEmployerPortal && !userIsEmployer && !isInternalUser) {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_ROLE_CONFLICT',
          message: 'You cannot login with this email. This email is registered as a Candidate.',
          existing_role: user.role,
          requested_role: requestedRole
        });
      }
    }

    // Only reached if credentials AND role match requested portal
    const token = generateToken(user);

    let profile = null;
    if (user.role === 'candidate') {
      const cands = await db.query('SELECT * FROM CANDIDATES WHERE user_id = ?', [user.id]);
      if (cands.length > 0) profile = cands[0];
    } else if (user.role === 'employer' || user.role === 'recruiter') {
      const emps = await db.query('SELECT * FROM EMPLOYERS WHERE user_id = ?', [user.id]);
      if (emps.length > 0) profile = emps[0];
    }

    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name || null,
      role: user.role,
      is_main_admin: Boolean(user.is_main_admin || user.role === 'main_admin' || user.role === 'director') ? 1 : 0,
      phone: user.phone,
      auth_provider: user.auth_provider || 'local',
      has_password: Boolean(user.password_hash),
      google_linked: Boolean(user.google_id),
      avatar_url: user.avatar_url || null,
      created_at: user.created_at
    };

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: userResponse,
      profile
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.', error: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = req.user;
    let profile = null;

    if (user.role === 'candidate') {
      const cands = await db.query('SELECT * FROM CANDIDATES WHERE user_id = ?', [user.id]);
      if (cands.length > 0) profile = cands[0];
    } else if (user.role === 'employer' || user.role === 'recruiter') {
      const emps = await db.query('SELECT * FROM EMPLOYERS WHERE user_id = ?', [user.id]);
      if (emps.length > 0) profile = emps[0];
    }

    res.json({
      success: true,
      user,
      profile
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching user context.', error: error.message });
  }
};

/**
 * Phase 2 — Change Password (Scenario A & C: Authenticated user with existing local password)
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ success: false, message: 'New password must be between 8 and 128 characters long.' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'New password cannot be the same as your current password.' });
    }

    const users = await db.query('SELECT * FROM USERS WHERE id = ?', [userId]);
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const user = users[0];

    // Scenario B Check: Google-only user with no local password set yet
    if (!user.password_hash) {
      return res.status(400).json({
        success: false,
        code: 'NO_LOCAL_PASSWORD',
        message: "Your account does not currently have a local password set. Please use 'Set Password' to verify your email and create a password."
      });
    }

    // Verify current password against existing secure hash
    const isMatch = await verifyPassword(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Your current password is incorrect.' });
    }

    // Prevent reuse of current password
    const isReused = await verifyPassword(newPassword, user.password_hash);
    if (isReused) {
      return res.status(400).json({ success: false, message: 'New password cannot be the same as your current password.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db.query(
      'UPDATE USERS SET password_hash = ?, token_version = COALESCE(token_version, 0) + 1, password_changed_at = NOW() WHERE id = ?',
      [newHash, userId]
    );

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Unable to update your password right now. Please try again.' });
  }
};

/**
 * Phase 2 — Set Password OTP Request (Scenario B: Google-only authenticated user)
 */
const sendSetPasswordOtp = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.email) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    try {
      const { otp, expiresInMinutes, resendCooldownSeconds } = await createOtp({
        email: user.email,
        userId: user.id,
        purpose: 'set_password'
      });

      // Send OTP to user's verified email
      const emailResult = await sendOtpEmail(user.email, {
        otp,
        purpose: 'set_password',
        expiresInMinutes
      });

      if (!emailResult.success && !emailResult.simulated) {
        console.error(`⚠️ [Auth] SMTP dispatch failure for set-password to ${user.email}:`, emailResult.error);
        await db.query('DELETE FROM USER_OTP WHERE email = ? AND purpose = ?', [user.email, 'set_password']);
        return res.status(502).json({
          success: false,
          message: 'Unable to deliver verification email at this moment. Please try again shortly.'
        });
      }

      res.json({
        success: true,
        message: 'A 6-digit verification code has been sent to your email address.',
        resendCooldownSeconds
      });
    } catch (otpErr) {
      if (otpErr.code === 'RESEND_COOLDOWN') {
        return res.status(429).json({
          success: false,
          code: 'RESEND_COOLDOWN',
          message: otpErr.message,
          secondsRemaining: otpErr.secondsRemaining
        });
      }
      throw otpErr;
    }
  } catch (error) {
    console.error('Send set password OTP error:', error);
    res.status(500).json({ success: false, message: 'Unable to send verification code right now. Please try again.' });
  }
};

/**
 * Phase 2 — Set Password Verification & Save (Scenario B: Google-only authenticated user)
 */
const setPassword = async (req, res) => {
  try {
    const user = req.user;
    const { otp, newPassword } = req.body;

    if (!user || !user.email) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Verification code and new password are required.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ success: false, message: 'New password must be between 8 and 128 characters long.' });
    }

    // Verify OTP securely
    try {
      await verifyOtp({
        email: user.email,
        otp,
        purpose: 'set_password'
      });
    } catch (verErr) {
      return res.status(400).json({
        success: false,
        code: verErr.code || 'INVALID_OTP',
        message: verErr.message
      });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    // Save local password securely while preserving existing Google account connection
    await db.query(
      `UPDATE USERS SET 
        password_hash = ?, 
        auth_provider = CASE WHEN auth_provider = 'google' THEN 'google_linked' ELSE auth_provider END,
        token_version = COALESCE(token_version, 0) + 1, 
        password_changed_at = NOW() 
      WHERE id = ?`,
      [newHash, user.id]
    );

    res.json({
      success: true,
      message: 'Password set successfully! You can now log in using either Google or your email and password.'
    });
  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({ success: false, message: 'Unable to set password right now. Please try again.' });
  }
};

/**
 * Phase 3 — Step 1 & 2: Forgot Password — Send Email OTP
 * Non-enumerating response: never reveals whether an email exists in the system
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const users = await db.query('SELECT id, email FROM USERS WHERE LOWER(email) = ?', [cleanEmail]);

    if (users.length === 0) {
      // Non-enumerating timing-safe response
      return res.json({
        success: true,
        message: 'If an account is associated with this email address, a 6-digit verification code has been sent.',
        resendCooldownSeconds: 60
      });
    }

    const user = users[0];

    try {
      const { otp, expiresInMinutes, resendCooldownSeconds } = await createOtp({
        email: cleanEmail,
        userId: user.id,
        purpose: 'password_reset'
      });

      // Send branded Vakancy email containing OTP
      const emailResult = await sendOtpEmail(cleanEmail, {
        otp,
        purpose: 'password_reset',
        expiresInMinutes
      });

      if (!emailResult.success && !emailResult.simulated) {
        console.error(`⚠️ [Auth] SMTP dispatch failure for password recovery to ${cleanEmail}:`, emailResult.error);
        await db.query('DELETE FROM USER_OTP WHERE email = ? AND purpose = ?', [cleanEmail, 'password_reset']);
        return res.status(502).json({
          success: false,
          message: 'Unable to deliver verification email at this moment. Please try again shortly.'
        });
      }

      res.json({
        success: true,
        message: 'If an account is associated with this email address, a 6-digit verification code has been sent.',
        resendCooldownSeconds
      });
    } catch (otpErr) {
      if (otpErr.code === 'RESEND_COOLDOWN') {
        return res.status(429).json({
          success: false,
          code: 'RESEND_COOLDOWN',
          message: otpErr.message,
          secondsRemaining: otpErr.secondsRemaining
        });
      }
      throw otpErr;
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error processing password recovery. Please try again.' });
  }
};

/**
 * Phase 3 — Step 3: Verify OTP
 * Verifies 6-digit OTP and issues a short-lived, single-purpose password-reset authorization token
 */
const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    try {
      const verified = await verifyOtp({
        email: cleanEmail,
        otp,
        purpose: 'password_reset'
      });

      // Issue single-purpose reset authorization token (does NOT create authenticated login session)
      const resetToken = generateResetAuthToken(cleanEmail, verified.userId);

      res.json({
        success: true,
        message: 'Verification code confirmed. You may now set your new password.',
        resetToken
      });
    } catch (verErr) {
      return res.status(400).json({
        success: false,
        code: verErr.code || 'INVALID_OTP',
        message: verErr.message,
        remainingAttempts: verErr.remainingAttempts
      });
    }
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error verifying code. Please try again.' });
  }
};

/**
 * Phase 3 — Step 4 & 5: Set New Password via Password Reset Authorization
 */
const resetPassword = async (req, res) => {
  try {
    const { resetToken, token, newPassword } = req.body;
    const rawToken = resetToken || token;

    if (!rawToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Reset authorization token and new password are required.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ success: false, message: 'New password must be between 8 and 128 characters long.' });
    }

    let targetEmail = null;

    // Check if token is single-purpose signed JWT from OTP verification
    try {
      const decoded = verifyResetAuthToken(rawToken);
      targetEmail = decoded.email;
    } catch (jwtErr) {
      // Fallback: Check if it's a legacy link reset token
      const tokenHash = hashResetToken(rawToken);
      const legacyUsers = await db.query(
        'SELECT id, email FROM USERS WHERE reset_token_hash = ? AND reset_token_expires > NOW() LIMIT 1',
        [tokenHash]
      );
      if (legacyUsers.length === 0) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_OR_EXPIRED_TOKEN',
          message: 'Password reset authorization has expired or is invalid. Please request a new verification code.'
        });
      }
      targetEmail = legacyUsers[0].email;
    }

    const users = await db.query('SELECT * FROM USERS WHERE LOWER(email) = ?', [targetEmail.toLowerCase()]);
    if (users.length === 0) {
      return res.status(400).json({ success: false, message: 'User account not found.' });
    }

    const user = users[0];

    // Prevent reuse of same password if user already had a password
    if (user.password_hash) {
      const isReused = await verifyPassword(newPassword, user.password_hash);
      if (isReused) {
        return res.status(400).json({ success: false, message: 'New password cannot be the same as your previous password.' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    // Invalidate existing sessions (increment token_version), clear legacy reset tokens, and preserve Google linking
    await db.query(
      `UPDATE USERS SET 
        password_hash = ?, 
        reset_token_hash = NULL, 
        reset_token_expires = NULL, 
        auth_provider = CASE WHEN auth_provider = 'google' THEN 'google_linked' ELSE auth_provider END,
        token_version = COALESCE(token_version, 0) + 1, 
        password_changed_at = NOW() 
      WHERE id = ?`,
      [newHash, user.id]
    );

    res.json({
      success: true,
      message: 'Password has been successfully reset! Please sign in with your new password.',
      role: user.role
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error during password reset.' });
  }
};

const normalizePortalRole = (role) => {
  const target = (role || 'candidate').trim().toLowerCase();
  const forbidden = ['admin', 'super_admin', 'director', 'main_admin', 'bd_lead', 'tl_coordinator', 'recruiter'];
  if (forbidden.includes(target)) {
    const err = new Error('Security Violation: Administrative and internal operational roles cannot be accessed or provisioned through public Google authentication.');
    err.code = 'PRIVILEGED_ROLE_FORBIDDEN';
    throw err;
  }
  if (['employer', 'company'].includes(target)) return 'employer';
  return 'candidate';
};

/**
 * Public Google Authentication Handler (Sign In / Sign Up)
 * Supports ID Token flow from Google Identity Services.
 */
const googleAuth = async (req, res) => {
  try {
    const { credential, role, company_name } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_CREDENTIAL',
        message: 'Google credential (ID token) is required.'
      });
    }

    // 1. Verify Google ID token cryptographically server-side
    let googleUser;
    try {
      googleUser = await verifyGoogleIdToken(credential);
    } catch (tokenErr) {
      return res.status(401).json({
        success: false,
        code: tokenErr.code || 'INVALID_GOOGLE_TOKEN',
        message: tokenErr.message || 'Google authentication failed.'
      });
    }

    // Enforce role constraints — never grant admin or internal roles through Google public auth
    let targetRole;
    try {
      targetRole = normalizePortalRole(role);
    } catch (roleErr) {
      return res.status(403).json({
        success: false,
        code: roleErr.code || 'PRIVILEGED_ROLE_FORBIDDEN',
        message: roleErr.message
      });
    }

    // 2. Check if an account is already linked with this google_id
    const existingGoogleUsers = await db.query(
      'SELECT * FROM USERS WHERE google_id = ?',
      [googleUser.sub]
    );

    if (existingGoogleUsers.length > 0) {
      const user = existingGoogleUsers[0];

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Your account is deactivated. Please contact support.'
        });
      }

      // Role check: prevent accessing wrong portal
      if (user.role !== targetRole) {
        const portalName = user.role === 'candidate' ? 'Candidate' : (user.role === 'employer' ? 'Employer' : user.role);
        return res.status(409).json({
          success: false,
          code: 'ACCOUNT_ROLE_CONFLICT',
          message: `This Google account is registered as a ${portalName}. Please switch to the ${portalName} portal to sign in.`,
          existing_role: user.role,
          requested_role: targetRole,
          login_path: `/login?role=${user.role}`
        });
      }

      // Update avatar if not previously set
      if (googleUser.picture && !user.avatar_url) {
        try {
          await db.query('UPDATE USERS SET avatar_url = ? WHERE id = ?', [googleUser.picture, user.id]);
          user.avatar_url = googleUser.picture;
        } catch (_) {}
      }

      const token = generateToken(user);
      let profile = null;
      if (user.role === 'candidate') {
        const cands = await db.query('SELECT * FROM CANDIDATES WHERE user_id = ?', [user.id]);
        if (cands.length > 0) profile = cands[0];
      } else if (user.role === 'employer' || user.role === 'recruiter') {
        const emps = await db.query('SELECT * FROM EMPLOYERS WHERE user_id = ?', [user.id]);
        if (emps.length > 0) profile = emps[0];
      }

      return res.json({
        success: true,
        message: 'Google login successful.',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name || googleUser.name,
          role: user.role,
          phone: user.phone,
          avatar_url: user.avatar_url || googleUser.picture,
          auth_provider: user.auth_provider || 'google',
          is_main_admin: 0,
          created_at: user.created_at
        },
        profile,
        isNewUser: false
      });
    }

    // 3. User NOT found by google_id. Check if an account already exists with this email
    const emailUsers = await db.query(
      'SELECT * FROM USERS WHERE LOWER(email) = ?',
      [googleUser.email]
    );

    if (emailUsers.length > 0) {
      const existingUser = emailUsers[0];

      // Anti-Account Takeover Protection:
      // Do not automatically link an existing password account solely because email matches;
      // require secure account-linking password verification.
      return res.status(409).json({
        success: false,
        code: 'LINK_PASSWORD_REQUIRED',
        message: 'An existing account was found for this email address. For your security, please confirm your account password to securely link Google Sign-In.',
        email: googleUser.email,
        existing_role: existingUser.role,
        requires_password: true
      });
    }

    // 4. Create NEW user with verified Google Identity
    const userId = uuidv4();
    const cleanName = googleUser.name || googleUser.email.split('@')[0];
    const cleanEmail = googleUser.email;

    await db.query(
      `INSERT INTO USERS (
        id, email, password_hash, role, phone, google_id, auth_provider, google_email, avatar_url, name, is_active
      ) VALUES (?, ?, NULL, ?, NULL, ?, 'google', ?, ?, ?, 1)`,
      [userId, cleanEmail, targetRole, googleUser.sub, cleanEmail, googleUser.picture || null, cleanName]
    );

    let profileData = null;

    if (targetRole === 'candidate') {
      const candidateId = uuidv4();
      await db.query(
        'INSERT INTO CANDIDATES (id, user_id, name, profile_type, is_premium, onboarding_step, is_onboarding_completed) VALUES (?, ?, ?, "experienced", 0, 1, 0)',
        [candidateId, userId, cleanName]
      );
      profileData = {
        id: candidateId,
        candidate_id: candidateId,
        name: cleanName,
        onboarding_step: 1,
        is_onboarding_completed: false
      };
    } else if (targetRole === 'employer') {
      const employerId = uuidv4();
      const compName = (company_name || '').trim() || 'Pending Company Profile';
      await db.query(
        `INSERT INTO EMPLOYERS (
          id, user_id, company_name, contact_person_name, official_email,
          contact_email, is_onboarding_completed, onboarding_step, approval_status
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 1, 'approved')`,
        [employerId, userId, compName, cleanName, cleanEmail, cleanEmail]
      );
      profileData = {
        id: employerId,
        employer_id: employerId,
        company_name: compName,
        contact_person_name: cleanName,
        official_email: cleanEmail,
        is_onboarding_completed: false,
        onboarding_step: 1
      };
    }

    const userObj = {
      id: userId,
      email: cleanEmail,
      role: targetRole,
      name: cleanName,
      phone: null,
      avatar_url: googleUser.picture || null,
      auth_provider: 'google',
      is_main_admin: 0,
      is_active: 1
    };

    const token = generateToken(userObj);

    // Welcome In-App Notification
    try {
      const notifId = uuidv4();
      await db.query(
        'INSERT INTO NOTIFICATION (id, user_id, type, title, message) VALUES (?, ?, "welcome", "Welcome to Vakancy!", "Thank you for signing up with Google on Vakancy Recruitment Portal.")',
        [notifId, userId]
      );
    } catch (_) {}

    // Send Welcome Email (Non-blocking async)
    try {
      if (targetRole === 'candidate') {
        sendCandidateWelcomeEmail(cleanEmail, { name: cleanName }).catch(err => {
          console.warn('⚠️ [Email Warning] Failed to send Google candidate welcome email:', err.message);
        });
      } else if (targetRole === 'employer' || targetRole === 'recruiter') {
        sendEmployerWelcomeEmail(cleanEmail, {
          name: cleanName,
          companyName: compName || 'your organization'
        }).catch(err => {
          console.warn('⚠️ [Email Warning] Failed to send Google employer welcome email:', err.message);
        });
      }
    } catch (e) {
      console.warn('⚠️ [Email Dispatch Error] Unexpected error triggering welcome email for Google user:', e.message);
    }

    res.status(201).json({
      success: true,
      message: 'Google account registered successfully.',
      token,
      user: userObj,
      profile: profileData,
      isNewUser: true
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during Google authentication.',
      error: error.message
    });
  }
};

/**
 * Link Google identity to existing local password account via password verification
 */
const linkGoogleAccount = async (req, res) => {
  try {
    const { credential, password } = req.body;

    if (!credential || !password) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_CREDENTIALS',
        message: 'Google credential and account password are required to link accounts.'
      });
    }

    // Verify Google ID token
    let googleUser;
    try {
      googleUser = await verifyGoogleIdToken(credential);
    } catch (tokenErr) {
      return res.status(401).json({
        success: false,
        code: tokenErr.code || 'INVALID_GOOGLE_TOKEN',
        message: tokenErr.message || 'Google authentication failed.'
      });
    }

    // Find existing user by verified Google email
    const users = await db.query(
      'SELECT * FROM USERS WHERE LOWER(email) = ?',
      [googleUser.email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'No existing account found with this email address.'
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_DEACTIVATED',
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Verify password securely
    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_PASSWORD',
        message: 'Invalid password. Account linking could not be completed.'
      });
    }

    // Ensure this google_id is not already linked to another account
    const existingOther = await db.query(
      'SELECT id FROM USERS WHERE google_id = ? AND id != ?',
      [googleUser.sub, user.id]
    );
    if (existingOther.length > 0) {
      return res.status(409).json({
        success: false,
        code: 'GOOGLE_ACCOUNT_ALREADY_LINKED',
        message: 'This Google account is already linked to a different Vakancy profile.'
      });
    }

    // Update user record with google_id
    await db.query(
      `UPDATE USERS SET 
        google_id = ?,
        google_email = ?,
        auth_provider = CASE WHEN auth_provider = 'local' THEN 'google_linked' ELSE auth_provider END,
        avatar_url = COALESCE(avatar_url, ?)
      WHERE id = ?`,
      [googleUser.sub, googleUser.email, googleUser.picture || null, user.id]
    );

    user.google_id = googleUser.sub;
    user.google_email = googleUser.email;
    user.avatar_url = user.avatar_url || googleUser.picture || null;

    const token = generateToken(user);
    let profile = null;
    if (user.role === 'candidate') {
      const cands = await db.query('SELECT * FROM CANDIDATES WHERE user_id = ?', [user.id]);
      if (cands.length > 0) profile = cands[0];
    } else if (user.role === 'employer' || user.role === 'recruiter') {
      const emps = await db.query('SELECT * FROM EMPLOYERS WHERE user_id = ?', [user.id]);
      if (emps.length > 0) profile = emps[0];
    }

    res.json({
      success: true,
      message: 'Google account linked successfully.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || googleUser.name,
        role: user.role,
        phone: user.phone,
        avatar_url: user.avatar_url,
        auth_provider: 'google_linked',
        is_main_admin: 0,
        created_at: user.created_at
      },
      profile
    });
  } catch (error) {
    console.error('Link Google Account Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during Google account linking.',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  changePassword,
  sendSetPasswordOtp,
  setPassword,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  googleAuth,
  linkGoogleAccount,
  normalizePortalRole
};
