const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const db = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const {
  parseAllowedOrigins,
  createCorsOptions,
  fallbackSecurityHeaders,
  productionResponseSanitizer,
  rejectAmbiguousParameters,
  createRateLimiter
} = require('./middleware/securityMiddleware');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const employerRoutes = require('./routes/employerRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const clientRoutes = require('./routes/clientRoutes');
const atsRoutes = require('./routes/atsRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const aiRoutes = require('./routes/aiRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const contactRoutes = require('./routes/contactRoutes');
const companyRoutes = require('./routes/companyRoutes');
const masterRoutes = require('./routes/masterRoutes');
const fileRoutes = require('./routes/fileRoutes');
const executiveShareRoutes = require('./routes/executiveShareRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

const trustProxyEnv = process.env.TRUST_PROXY;
if (trustProxyEnv) {
  if (trustProxyEnv === 'true') {
    app.set('trust proxy', 1);
  } else if (!isNaN(Number(trustProxyEnv))) {
    app.set('trust proxy', Number(trustProxyEnv));
  } else {
    app.set('trust proxy', trustProxyEnv);
  }
} else if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
} else {
  app.set('trust proxy', false);
}

const allowedOrigins = parseAllowedOrigins();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"]
    }
  }
}));
app.use(fallbackSecurityHeaders);
app.use(productionResponseSanitizer);
app.use(cors(createCorsOptions(allowedOrigins)));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb', strict: true }));
app.use(express.urlencoded({ limit: process.env.FORM_BODY_LIMIT || '256kb', extended: false, parameterLimit: 100 }));
app.use(rejectAmbiguousParameters);
app.use('/api', createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  code: 'API_RATE_LIMIT_EXCEEDED'
}));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check API
const healthCheckHandler = (req, res) => {
  res.json({
    status: 'online',
    app: 'Vakancy Recruitment Portal API',
    timestamp: new Date().toISOString(),
    db_status: db.isFallback() ? 'In-Memory Fallback Active' : 'MySQL Connected'
  });
};
app.get('/health', healthCheckHandler);
app.get('/api/health', healthCheckHandler);

// Readiness Probe (verifies database responsiveness)
const readinessCheckHandler = async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({
      status: 'ready',
      database: db.isFallback() ? 'in-memory-fallback' : 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'unavailable',
      database: 'unreachable',
      error: process.env.NODE_ENV === 'production' ? 'Database query failed' : err.message,
      timestamp: new Date().toISOString()
    });
  }
};
app.get('/ready', readinessCheckHandler);
app.get('/api/ready', readinessCheckHandler);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/employers', employerRoutes);
app.use('/api/employer', employerRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/ats', atsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/locations', masterRoutes);
app.use('/api/job-categories', (req, res, next) => {
  req.url = '/categories' + (req.url === '/' ? '' : req.url);
  masterRoutes(req, res, next);
});
app.use('/api/files', fileRoutes);
app.use('/api/executive-search', executiveShareRoutes);
app.use('/api/shared', executiveShareRoutes);

// Global Error Handler
app.use(errorHandler);

function validateProductionEnvironment() {
  if (process.env.NODE_ENV !== 'production') return;

  const errors = [];
  const jwtSecret = process.env.JWT_SECRET || '';
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes('YOUR_PRODUCTION')) {
    errors.push('JWT_SECRET must be configured with a cryptographically secure key of at least 32 characters in production.');
  }

  const dbPassword = process.env.DB_PASSWORD || '';
  if (!dbPassword || dbPassword.includes('YOUR_PRODUCTION')) {
    errors.push('DB_PASSWORD must be configured with a real production database password.');
  }

  if (errors.length > 0) {
    console.error('❌ [FATAL] Production Environment Validation Failed:');
    errors.forEach(e => console.error(`  - ${e}`));
    throw new Error(`Production environment configuration error: ${errors.join('; ')}`);
  }
}

let activeServer = null;

const startServer = async () => {
  validateProductionEnvironment();

  // In development or when explicitly enabled, ensure schema migrations are applied
  if (process.env.NODE_ENV === 'development' || process.env.AUTO_MIGRATE === 'true') {
    try {
      const { runMigrations } = require('./database/runMigrations');
      await runMigrations(process.env, { target: 'app' });
    } catch (migErr) {
      console.warn('⚠️ [Migration] Notice during startup:', migErr.message);
    }
  }

  return db.initDB()
    .then(() => {
      const server = app.listen(PORT, () => {
        console.log(`🚀 Vakancy Server running on port ${PORT}`);
        console.log(`📡 Base API URL: http://localhost:${PORT}/api`);
      });
      activeServer = server;

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`❌ [FATAL] Port ${PORT} is already in use by another process.`);
          console.error(`Please stop the process running on port ${PORT} or change PORT in backend/.env.`);
        } else {
          console.error(`❌ Server error:`, err.message);
        }
        process.exit(1);
      });
      return server;
    })
    .catch((err) => {
      console.error('❌ Server startup aborted due to MySQL connection failure:');
      console.error(err.message);
      process.exit(1);
    });
};

function handleShutdown(signal) {
  console.log(`\nReceived ${signal}. Gracefully terminating server...`);
  if (activeServer) {
    activeServer.close(async () => {
      console.log('HTTP server terminated.');
      try {
        await db.closeDB();
        console.log('Database connections closed.');
      } catch (err) {
        console.error('Error closing database pool:', err.message);
      }
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Graceful shutdown timeout exceeded; force terminating.');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

if (process.env.NODE_ENV !== 'test') {
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, allowedOrigins, validateProductionEnvironment };
