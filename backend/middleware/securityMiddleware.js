const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://vakancy.in',
  'https://www.vakancy.in',
  'https://admin.vakancy.in'
];

const parseAllowedOrigins = (rawValue = process.env.ALLOWED_ORIGINS) => {
  if (!rawValue) return [...DEFAULT_ORIGINS];

  const origins = rawValue
    .replace(/[\[\]"]/g, '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.includes('*')) {
    throw new Error('ALLOWED_ORIGINS must contain explicit origins; wildcard origins are not permitted.');
  }

  for (const origin of origins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch (_) {
      throw new Error(`Invalid origin configured in ALLOWED_ORIGINS: ${origin}`);
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error(`ALLOWED_ORIGINS entry must be an exact HTTP(S) origin: ${origin}`);
    }
  }

  return origins;
};

const createCorsOptions = (allowedOrigins) => ({
  origin(origin, callback) {
    // Requests without Origin are server-to-server/CLI requests, not browser CORS requests.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);

    const error = new Error('Origin is not allowed by CORS policy.');
    error.status = 403;
    error.code = 'CORS_ORIGIN_DENIED';
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'X-Requested-With', 'X-Access-Code', 'X-Shortlist-Verify-Token'],
  maxAge: 600
});

// Fallback headers remain active even when a reverse proxy strips optional headers.
const fallbackSecurityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  next();
};

const productionResponseSanitizer = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') return next();
  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const safePayload = { ...payload };
      delete safePayload.stack;
      delete safePayload.error;
      return originalJson(safePayload);
    }
    return originalJson(payload);
  };
  next();
};

const rejectAmbiguousParameters = (req, res, next) => {
  for (const [key, value] of Object.entries(req.query || {})) {
    if (Array.isArray(value) || (value !== null && typeof value === 'object')) {
      return res.status(400).json({
        success: false,
        code: 'AMBIGUOUS_QUERY_PARAMETER',
        message: `Query parameter '${key}' must be supplied once as a scalar value.`
      });
    }
  }
  next();
};

const createRateLimiter = ({ windowMs, limit, code, message, keyGenerator } = {}) => {
  const hits = new Map();
  const safeWindowMs = Number(windowMs) > 0 ? Number(windowMs) : 15 * 60 * 1000;
  const safeLimit = Number(limit) > 0 ? Number(limit) : 100;

  return (req, res, next) => {
    const now = Date.now();
    const identity = keyGenerator
      ? keyGenerator(req)
      : (req.user?.id || req.ip || req.socket?.remoteAddress || 'unknown');
    const key = `${req.baseUrl || ''}:${req.path || ''}:${identity}`;
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + safeWindowMs };
      hits.set(key, entry);
    }

    entry.count += 1;
    const remaining = Math.max(safeLimit - entry.count, 0);
    res.setHeader('RateLimit-Limit', String(safeLimit));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > safeLimit) {
      const retryAfter = Math.max(Math.ceil((entry.resetAt - now) / 1000), 1);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        code: code || 'RATE_LIMIT_EXCEEDED',
        message: message || 'Too many requests. Please wait and try again.',
        retry_after_seconds: retryAfter
      });
    }

    // Bound memory without a long-running timer that complicates tests/shutdown.
    if (hits.size > 10000) {
      for (const [storedKey, storedEntry] of hits) {
        if (storedEntry.resetAt <= now) hits.delete(storedKey);
      }
    }

    next();
  };
};

/**
 * Failed Login Tracker
 * Enforces Security Check 1:
 * Maximum 5 failed login attempts per minute per IP address,
 * with additional account/email-based protection so attackers cannot bypass limits
 * simply by rotating proxy IP addresses.
 * Successful logins reset the counter for legitimate users.
 */
const createFailedLoginTracker = ({ maxFailedAttempts = 5, windowMs = 60 * 1000 } = {}) => {
  const ipFailures = new Map();
  const accountFailures = new Map();

  const getCleanIdentifier = (req) => {
    const raw = req?.body?.email || req?.body?.identifier || '';
    return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  };

  const getClientIp = (req) => {
    return req?.ip || req?.socket?.remoteAddress || 'unknown';
  };

  const checkRecord = (store, key, now) => {
    if (!key) return { count: 0, resetAt: now + windowMs };
    const entry = store.get(key);
    if (!entry || entry.resetAt <= now) {
      return { count: 0, resetAt: now + windowMs };
    }
    return entry;
  };

  const checkLimit = (req, res, next) => {
    const now = Date.now();
    const ip = getClientIp(req);
    const identifier = getCleanIdentifier(req);

    const ipEntry = checkRecord(ipFailures, ip, now);
    const accountEntry = identifier ? checkRecord(accountFailures, identifier, now) : { count: 0, resetAt: now + windowMs };

    if (ipEntry.count >= maxFailedAttempts) {
      const retryAfter = Math.max(Math.ceil((ipEntry.resetAt - now) / 1000), 1);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        code: 'LOGIN_RATE_LIMITED',
        message: `Too many failed sign-in attempts from this connection. Please wait ${retryAfter} second(s) before trying again.`,
        retry_after_seconds: retryAfter
      });
    }

    if (accountEntry.count >= maxFailedAttempts) {
      const retryAfter = Math.max(Math.ceil((accountEntry.resetAt - now) / 1000), 1);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        code: 'LOGIN_RATE_LIMITED',
        message: `Too many failed sign-in attempts for this account. Please wait ${retryAfter} second(s) before trying again.`,
        retry_after_seconds: retryAfter
      });
    }

    next();
  };

  const recordFailure = (ipOrReq, accountOrBody) => {
    const now = Date.now();
    const ip = (typeof ipOrReq === 'object' && ipOrReq !== null) ? getClientIp(ipOrReq) : (ipOrReq || 'unknown');
    let identifier = '';
    if (typeof accountOrBody === 'object' && accountOrBody !== null) {
      identifier = getCleanIdentifier(accountOrBody);
    } else if (typeof accountOrBody === 'string') {
      identifier = accountOrBody.trim().toLowerCase();
    }

    // Record IP failure
    if (ip) {
      const ipEntry = checkRecord(ipFailures, ip, now);
      ipEntry.count += 1;
      ipEntry.resetAt = ipEntry.count === 1 ? now + windowMs : ipEntry.resetAt;
      ipFailures.set(ip, ipEntry);
    }

    // Record Account failure
    if (identifier) {
      const accEntry = checkRecord(accountFailures, identifier, now);
      accEntry.count += 1;
      accEntry.resetAt = accEntry.count === 1 ? now + windowMs : accEntry.resetAt;
      accountFailures.set(identifier, accEntry);
    }

    // Bound memory
    if (ipFailures.size > 10000) {
      for (const [k, v] of ipFailures) {
        if (v.resetAt <= now) ipFailures.delete(k);
      }
    }
    if (accountFailures.size > 10000) {
      for (const [k, v] of accountFailures) {
        if (v.resetAt <= now) accountFailures.delete(k);
      }
    }
  };

  const recordSuccess = (ipOrReq, accountOrBody) => {
    const ip = (typeof ipOrReq === 'object' && ipOrReq !== null) ? getClientIp(ipOrReq) : ipOrReq;
    let identifier = '';
    if (typeof accountOrBody === 'object' && accountOrBody !== null) {
      identifier = getCleanIdentifier(accountOrBody);
    } else if (typeof accountOrBody === 'string') {
      identifier = accountOrBody.trim().toLowerCase();
    }

    if (ip) ipFailures.delete(ip);
    if (identifier) accountFailures.delete(identifier);
  };

  const reset = () => {
    ipFailures.clear();
    accountFailures.clear();
  };

  return {
    checkLimit,
    recordFailure,
    recordSuccess,
    reset
  };
};

const failedLoginTracker = createFailedLoginTracker();

// Configurable Endpoint Rate Limiters
const publicReadLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limit: 100,
  code: 'PUBLIC_READ_RATE_LIMITED',
  message: 'Too many requests to public resources. Please slow down and try again.'
});

const contactSubmissionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 100 : 5,
  code: 'CONTACT_SUBMISSION_RATE_LIMITED',
  message: 'Too many submissions. Please wait a moment before trying again.'
});

const loginRequestLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limit: 20,
  code: 'LOGIN_REQUEST_RATE_LIMITED',
  message: 'Too many sign-in attempts from this connection. Please wait a moment.'
});

const passwordResetSendOtpLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  code: 'OTP_REQUEST_RATE_LIMITED',
  message: 'Too many verification code requests. Please wait before requesting another code.'
});

const passwordResetVerifyOtpLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  code: 'OTP_VERIFY_RATE_LIMITED',
  message: 'Too many verification attempts. Please wait before trying again.'
});

const passwordResetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  code: 'PASSWORD_RESET_RATE_LIMITED',
  message: 'Too many password reset requests. Please wait before trying again.'
});

const registrationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  code: 'REGISTRATION_RATE_LIMITED',
  message: 'Too many registration requests from this connection. Please try again later.'
});

const normalizeEmail = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const validateAuthRequest = (operation) => (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, code: 'INVALID_REQUEST', message: 'A valid request body is required.' });
  }

  const email = normalizeEmail(req.body.email);
  const identifier = typeof req.body.identifier === 'string' ? req.body.identifier.trim() : '';
  const password = req.body.password;
  const newPassword = req.body.newPassword;

  if (['register', 'forgot-password'].includes(operation) && (!email || email.length > 254 || !isEmail(email))) {
    return res.status(400).json({ success: false, code: 'INVALID_EMAIL', message: 'Please provide a valid email address.' });
  }
  if (operation === 'login' && (!email && !identifier)) {
    return res.status(400).json({ success: false, code: 'INVALID_CREDENTIALS', message: 'Email/Mobile and password are required.' });
  }
  if ((email && email.length > 254) || identifier.length > 254) {
    return res.status(400).json({ success: false, code: 'INVALID_IDENTIFIER', message: 'The account identifier is invalid.' });
  }
  if (['register', 'login'].includes(operation) && (typeof password !== 'string' || password.length > 128)) {
    return res.status(400).json({ success: false, code: 'INVALID_PASSWORD', message: 'The password is invalid.' });
  }
  if (operation === 'reset-password') {
    const rawToken = req.body.resetToken || req.body.token;
    if (typeof rawToken !== 'string' || !rawToken.trim()) {
      return res.status(400).json({ success: false, code: 'INVALID_RESET_TOKEN', message: 'Invalid or expired reset token.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ success: false, code: 'INVALID_PASSWORD', message: 'New password must be between 8 and 128 characters.' });
    }
  }
  if (operation === 'register' && typeof req.body.name === 'string' && req.body.name.trim().length > 150) {
    return res.status(400).json({ success: false, code: 'INVALID_NAME', message: 'Name must be 150 characters or fewer.' });
  }

  next();
};

const validateContactRequest = (req, res, next) => {
  const fields = {
    name: 150,
    email: 254,
    phone: 30,
    company: 200,
    company_name: 200,
    subject: 250,
    category: 100,
    message: 5000,
    location: 250
  };
  for (const [field, maxLength] of Object.entries(fields)) {
    if (req.body?.[field] !== undefined && typeof req.body[field] !== 'string') {
      return res.status(400).json({ success: false, code: 'INVALID_INPUT', message: `${field} must be text.` });
    }
    if (typeof req.body?.[field] === 'string' && req.body[field].length > maxLength) {
      return res.status(400).json({ success: false, code: 'INPUT_TOO_LONG', message: `${field} exceeds the allowed length.` });
    }
  }
  next();
};

const validateAiRequest = (req, res, next) => {
  let serialized;
  try {
    serialized = JSON.stringify(req.body || {});
  } catch (_) {
    return res.status(400).json({ success: false, code: 'INVALID_AI_INPUT', message: 'AI input must be valid JSON.' });
  }
  if (Buffer.byteLength(serialized, 'utf8') > 64 * 1024) {
    return res.status(413).json({ success: false, code: 'AI_INPUT_TOO_LARGE', message: 'AI input is too large.' });
  }
  if (typeof req.body?.title === 'string' && req.body.title.length > 200) {
    return res.status(400).json({ success: false, code: 'INVALID_AI_INPUT', message: 'Job title must be 200 characters or fewer.' });
  }
  next();
};

const paymentUnavailable = (req, res) => res.status(503).json({
  success: false,
  code: 'PAYMENTS_UNAVAILABLE',
  message: 'Payments and paid feature activation are temporarily unavailable.'
});

module.exports = {
  DEFAULT_ORIGINS,
  parseAllowedOrigins,
  createCorsOptions,
  fallbackSecurityHeaders,
  productionResponseSanitizer,
  rejectAmbiguousParameters,
  createRateLimiter,
  createFailedLoginTracker,
  failedLoginTracker,
  publicReadLimiter,
  contactSubmissionLimiter,
  loginRequestLimiter,
  passwordResetSendOtpLimiter,
  passwordResetVerifyOtpLimiter,
  passwordResetLimiter,
  registrationLimiter,
  validateAuthRequest,
  validateContactRequest,
  validateAiRequest,
  paymentUnavailable
};
