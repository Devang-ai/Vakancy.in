const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { generateToken } = require('../config/jwt');

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

    // Welcome Notification
    const notifId = uuidv4();
    try {
      await db.query(
        'INSERT INTO NOTIFICATION (id, user_id, type, title, message) VALUES (?, ?, "welcome", "Welcome to Vakancy!", "Thank you for registering your account on Vakancy Recruitment Portal.")',
        [notifId, userId]
      );
    } catch (_) {}

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
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact administrator.' });
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

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
      role: user.role,
      phone: user.phone,
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

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'New password cannot be the same as your current password' });
    }

    const users = await db.query('SELECT * FROM USERS WHERE id = ?', [userId]);
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = users[0];
    const isMatch = await verifyPassword(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Your current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE USERS SET password_hash = ? WHERE id = ?', [newHash, userId]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Unable to update your password right now. Please try again.' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const cleanEmail = email.toLowerCase().trim();
    const users = await db.query('SELECT * FROM USERS WHERE LOWER(email) = ?', [cleanEmail]);
    if (users.length === 0) {
      return res.json({ success: true, message: 'If the email is registered, a reset link will be sent.' });
    }

    const user = users[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    await db.query('UPDATE USERS SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [resetToken, resetTokenExpires, user.id]);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`Password reset token for ${user.email}: ${resetToken}`);
    }

    const responsePayload = {
      success: true,
      message: 'If the email is registered, a reset link will be sent.'
    };
    if (process.env.NODE_ENV !== 'production') {
      responsePayload._devToken = resetToken;
    }

    res.json(responsePayload);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error during forgot password' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ success: false, message: 'Token and new password are required' });

    const users = await db.query('SELECT * FROM USERS WHERE reset_token = ? AND reset_token_expires > NOW()', [token]);
    if (users.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const user = users[0];
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE USERS SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [newHash, user.id]);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error during password reset' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword
};
