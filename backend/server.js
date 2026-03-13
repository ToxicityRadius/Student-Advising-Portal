const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models (centralized associations)
const { sequelize } = require('./models');

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

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

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

  console.error('Request failed', {
    method: req.method,
    path: req.originalUrl,
    ...errorPayload
  });
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
  console.log('Database connected successfully');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to connect to database:', err);
});
