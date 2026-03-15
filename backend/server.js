const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const logger = require('./utils/logger');

// Validate required secrets at startup
if (!process.env.JWT_SECRET) {
  logger.fatal('JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}
if (!process.env.JWT_REFRESH_SECRET) {
  logger.warn('JWT_REFRESH_SECRET is not set. Falling back to JWT_SECRET — set a separate value for production.');
} else if (process.env.JWT_REFRESH_SECRET === process.env.JWT_SECRET) {
  logger.warn('JWT_REFRESH_SECRET is identical to JWT_SECRET. Use distinct secrets in production.');
}

// Additional production-mode checks
if (process.env.NODE_ENV === 'production') {
  const required = ['DATABASE_URL', 'CLIENT_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    logger.fatal({ missing }, 'Missing required production env vars');
    process.exit(1);
  }
  if (!process.env.JWT_EXPIRE || process.env.JWT_EXPIRE === '7d') {
    logger.warn('JWT_EXPIRE should be 15-30 minutes in production, not 7d.');
  }
}

// Import models (centralized associations)
const { sequelize } = require('./models');
const { protect } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const googleAuthRoutes = require('./routes/googleAuthRoutes');
const curriculumRoutes = require('./routes/curriculumRoutes');
const termRoutes = require('./routes/termRoutes');
const sarRoutes = require('./routes/sarRoutes');
const gradeRoutes = require('./routes/gradeRoutes');
const validationRoutes = require('./routes/validationRoutes');
const exportRoutes = require('./routes/exportRoutes');
const forecastRoutes = require('./routes/forecastRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
// Support multiple allowed origins via comma-separated CLIENT_URL
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin like mobile apps or curl
    if (!origin) return callback(null, true);

    // In development, allow localhost/127.0.0.1 on any port (Expo/Web dev servers).
    const isDevLocalOrigin = process.env.NODE_ENV !== 'production'
      && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

    if (isDevLocalOrigin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const corsErr = new Error('Not allowed by CORS');
    corsErr.statusCode = 403;
    return callback(corsErr);
  },
  credentials: true
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/users', userRoutes);
app.use('/api', curriculumRoutes);
app.use('/api/terms', termRoutes);
app.use('/api/sars', sarRoutes);
app.use('/api', gradeRoutes);
app.use('/api', validationRoutes);
app.use('/api', exportRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Serve uploaded files
// Profile pictures are public so they can be displayed in the frontend without auth.
app.use('/uploads/profiles', express.static(path.join(__dirname, 'uploads', 'profiles')));
// Proof documents require authentication — they contain sensitive student submissions.
app.use('/uploads/proofs', protect, express.static(path.join(__dirname, 'uploads', 'proofs')));
// Deny all other /uploads paths that don't match the above.
app.use('/uploads', (req, res) => {
  res.status(403).json({ success: false, message: 'Access denied' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const errorPayload = {
    name: err.name,
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    stack: err.stack
  };

  // Include useful DB diagnostics when available.
  if (err.original || err.parent) {
    const dbErr = err.original || err.parent;
    errorPayload.database = {
      code: dbErr.code,
      severity: dbErr.severity,
      detail: dbErr.detail,
      hint: dbErr.hint,
      table: dbErr.table,
      column: dbErr.column,
      constraint: dbErr.constraint,
      schema: dbErr.schema,
      routine: dbErr.routine,
      sql: err.sql
    };
  }

  logger.error({
    method: req.method,
    path: req.originalUrl,
    ...errorPayload
  }, 'Request failed');
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

// Sync database and start server
const syncOptions = process.env.NODE_ENV === 'production'
  ? {} // production: authenticate only, use migrations
  : { alter: { drop: false } }; // dev: auto-alter tables

(process.env.NODE_ENV === 'production'
  ? sequelize.authenticate()
  : sequelize.sync(syncOptions)
).then(() => {
  logger.info('Database connected successfully');
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server running');
  });
}).catch((err) => {
  logger.fatal({ err }, 'Failed to connect to database');
});

// Graceful handling of unhandled async errors to prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason }, 'Unhandled Rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception');
  process.exit(1);
});

module.exports = app;
