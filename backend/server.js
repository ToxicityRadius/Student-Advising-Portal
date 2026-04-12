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

const ALLOWED_NODE_ENVS = ['development', 'test', 'production'];

function validateStartupEnvironment() {
  const missingAlwaysRequired = ['JWT_SECRET', 'DATABASE_URL'].filter((key) => !process.env[key]);
  if (missingAlwaysRequired.length > 0) {
    logger.fatal({ missing: missingAlwaysRequired }, 'Missing required environment variables');
    process.exit(1);
  }

  if (process.env.NODE_ENV && !ALLOWED_NODE_ENVS.includes(process.env.NODE_ENV)) {
    logger.fatal(
      { nodeEnv: process.env.NODE_ENV, allowed: ALLOWED_NODE_ENVS },
      'Invalid NODE_ENV value',
    );
    process.exit(1);
  }

  // Warn about optional but recommended configs
  const smtpVars = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASSWORD'];
  const missingSMTP = smtpVars.filter((k) => !process.env[k]);
  if (missingSMTP.length > 0 && missingSMTP.length < smtpVars.length) {
    logger.warn({ missing: missingSMTP }, 'Partial SMTP config — email sending may fail');
  }

  const oauthVars = ['GOOGLE_CLIENT_ID'];
  const missingOAuth = oauthVars.filter((k) => !process.env[k]);
  if (missingOAuth.length > 0) {
    logger.warn(
      { missing: missingOAuth },
      'Google OAuth credentials not set — Google Sign-In will be unavailable',
    );
  }

  // Verify upload directory exists and is writable
  const fs = require('fs');
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
      logger.info({ path: uploadDir }, 'Created uploads directory');
    } catch (err) {
      logger.warn(
        { path: uploadDir, err: err.message },
        'Could not create uploads directory — file uploads may fail',
      );
    }
  }
}

validateStartupEnvironment();

// Validate required secrets at startup
if (!process.env.JWT_REFRESH_SECRET) {
  logger.warn(
    'JWT_REFRESH_SECRET is not set. Falling back to JWT_SECRET — set a separate value for production.',
  );
} else if (process.env.JWT_REFRESH_SECRET === process.env.JWT_SECRET) {
  logger.warn('JWT_REFRESH_SECRET is identical to JWT_SECRET. Use distinct secrets in production.');
}

// Additional production-mode checks
if (process.env.NODE_ENV === 'production') {
  const required = ['DATABASE_URL', 'CLIENT_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    logger.fatal({ missing }, 'Missing required production env vars');
    process.exit(1);
  }
  // Warn when JWT_EXPIRE is too long (> 60 minutes).
  // Access tokens should be short-lived; refresh tokens handle session continuity.
  const jwtExpire = process.env.JWT_EXPIRE || '30m';
  const isLongLived =
    jwtExpire.endsWith('d') ||
    (jwtExpire.endsWith('h') && parseInt(jwtExpire, 10) > 1) ||
    (jwtExpire.endsWith('m') && parseInt(jwtExpire, 10) > 60);
  if (isLongLived) {
    logger.warn(
      { JWT_EXPIRE: jwtExpire },
      'JWT_EXPIRE is too long for production. Recommended: 15-30 min.',
    );
  }
}

// Import models (centralized associations)
const { sequelize } = require('./models');
const { protect, requireRole } = require('./middleware/auth');
const csrf = require('./middleware/csrf');
const requestContext = require('./middleware/requestContext');
const responseEnvelope = require('./middleware/responseEnvelope');

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
const notificationRoutes = require('./routes/notificationRoutes');
const { setupSwagger } = require('./docs/swagger');

const app = express();

// Swagger API docs — mount before other middleware so /api/docs has no auth
setupSwagger(app);

// Attach per-request context (requestId, startTime, ip) before any other middleware
app.use(requestContext);

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Strict-Transport-Security: require HTTPS for 1 year in production
    strictTransportSecurity:
      process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
    // Prevent browsers from MIME-sniffing away from the declared content-type
    noSniff: true,
    // X-Frame-Options: block clickjacking
    frameguard: { action: 'deny' },
    // Content-Security-Policy: restrictive baseline; CDN fonts/icons whitelisted
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          // Google Sign-In
          'https://accounts.google.com',
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          // Allow the frontend origin(s) to call the API (e.g. in CSP-restricted browsers)
          ...(process.env.CLIENT_URL || '')
            .split(',')
            .map((o) => o.trim())
            .filter((o) => o.length > 0),
        ],
        frameSrc: ['https://accounts.google.com'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  }),
);
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
// Support multiple allowed origins via comma-separated CLIENT_URL
// CORS must be registered before CSRF so that error responses always
// include the correct Access-Control-Allow-Origin header.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin like mobile apps or curl
      if (!origin) return callback(null, true);

      // In development, allow localhost/127.0.0.1 on any port (Expo/Web dev servers).
      const isDevLocalOrigin =
        process.env.NODE_ENV !== 'production' &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

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
    credentials: true,
  }),
);
app.use(csrf);
app.use(responseEnvelope);

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
app.use('/api/notifications', notificationRoutes);

// Serve uploaded files
// Profile pictures are public so they can be displayed in the frontend without auth.
app.use('/uploads/profiles', express.static(path.join(__dirname, 'uploads', 'profiles')));
// Proof documents are restricted to staff accounts until object-level ownership checks are implemented.
app.use(
  '/uploads/proofs',
  protect,
  requireRole('adviser', 'admin'),
  express.static(path.join(__dirname, 'uploads', 'proofs')),
);
// Deny all other /uploads paths that don't match the above.
app.use('/uploads', (req, res) => {
  res.status(403).json({ success: false, message: 'Access denied' });
});

// Health check with dependency verification
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    const statusCode = isShuttingDown ? 503 : 200;
    return res.status(statusCode).json({
      status: isShuttingDown ? 'DEGRADED' : 'OK',
      message: isShuttingDown ? 'Server is shutting down' : 'Server is running',
      dependencies: {
        database: 'up',
      },
    });
  } catch (err) {
    logger.error({ err }, 'Health check failed: database unavailable');
    return res.status(503).json({
      status: 'UNHEALTHY',
      message: 'Database connectivity check failed',
      dependencies: {
        database: 'down',
      },
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = err.statusCode || err.status || 500;

  const errorPayload = {
    name: err.name,
    message: err.message,
    code: err.code,
    statusCode,
    stack: err.stack,
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
      sql: err.sql,
    };
  }

  logger.error(
    {
      method: req.method,
      path: req.originalUrl,
      ...errorPayload,
    },
    'Request failed',
  );

  // Mask Sequelize / database errors regardless of status code in production.
  // These errors can expose table names, column names, and constraint names.
  const isSequelizeError =
    err.name && (err.name.startsWith('Sequelize') || err.original != null || err.parent != null);

  let clientMessage;
  if (statusCode >= 500 || (isProduction && isSequelizeError)) {
    clientMessage = 'Internal Server Error';
  } else {
    clientMessage = err.message || 'Internal Server Error';
  }

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
  });
});

const PORT = process.env.PORT || 5000;
let server;
let isShuttingDown = false;

// Sync database and start server
const syncOptions =
  process.env.NODE_ENV === 'production'
    ? {} // production: authenticate only, use migrations
    : { alter: { drop: false } }; // dev: auto-alter tables

async function runPendingMigrations() {
  const { Umzug, SequelizeStorage } = require('umzug');
  const Sequelize = require('sequelize');
  const umzug = new Umzug({
    migrations: {
      glob: path.join(__dirname, 'migrations/*.js'),
      resolve: ({ name, path: migrationPath, context }) => {
        const migration = require(migrationPath);
        return {
          name,
          up: async () => migration.up(context, Sequelize),
          down: async () => migration.down(context, Sequelize),
        };
      },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: {
      info: (msg) => logger.info(msg, 'migration'),
      warn: (msg) => logger.warn(msg, 'migration'),
      error: (msg) => logger.error(msg, 'migration'),
      debug: () => {},
    },
  });
  const pending = await umzug.pending();
  if (pending.length > 0) {
    logger.info(
      { count: pending.length, names: pending.map((m) => m.name) },
      'Running pending migrations',
    );
    await umzug.up();
    logger.info('Migrations completed successfully');
  } else {
    logger.info('No pending migrations');
  }
}

(process.env.NODE_ENV === 'production' ? sequelize.authenticate() : sequelize.sync(syncOptions))
  .then(async () => {
    logger.info('Database connected successfully');
    try {
      await runPendingMigrations();
    } catch (migErr) {
      logger.error({ err: migErr }, 'Migration failed — server starting without migration');
    }
    server = app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Server running');
    });
  })
  .catch((err) => {
    logger.fatal({ err }, 'Failed to connect to database');
  });

const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Graceful shutdown started');

  if (!server) {
    sequelize
      .close()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    return;
  }

  // Stop accepting new connections and wait for in-flight requests to complete.
  server.close(async (closeErr) => {
    if (closeErr) {
      logger.error({ err: closeErr }, 'HTTP server close failed during shutdown');
    }

    try {
      await sequelize.close();
      logger.info('Database connection closed');
      process.exit(closeErr ? 1 : 0);
    } catch (dbErr) {
      logger.error({ err: dbErr }, 'Failed to close database connection during shutdown');
      process.exit(1);
    }
  });

  // Force-exit if shutdown hangs.
  setTimeout(() => {
    logger.error('Graceful shutdown timeout reached; forcing exit');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Graceful handling of unhandled async errors to prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason }, 'Unhandled Rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception');
  process.exit(1);
});

module.exports = app;
