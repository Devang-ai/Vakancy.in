const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const db = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

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

const app = express();
const PORT = process.env.PORT || 5000;

if (process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// CORS Configuration supporting production domains and environment variable overrides
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.replace(/[\[\]"]/g, '').split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'https://vakancy.in', 'https://www.vakancy.in', 'https://admin.vakancy.in'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy error: Origin not allowed'));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Vakancy Recruitment Portal API',
    timestamp: new Date().toISOString(),
    db_status: db.isFallback() ? 'In-Memory Fallback Active' : 'MySQL Connected'
  });
});

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

// Global Error Handler
app.use(errorHandler);

// Start Express Server after Database Connection
db.initDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Vakancy Server running on port ${PORT}`);
      console.log(`📡 Base API URL: http://localhost:${PORT}/api`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ [FATAL] Port ${PORT} is already in use by another process.`);
        console.error(`Please stop the process running on port ${PORT} or change PORT in backend/.env.`);
      } else {
        console.error(`❌ Server error:`, err.message);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error('❌ Server startup aborted due to MySQL connection failure:');
    console.error(err.message);
    process.exit(1);
  });
