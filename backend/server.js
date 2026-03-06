const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models (centralized associations)
const { sequelize } = require('./models');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const googleAuthRoutes = require('./routes/googleAuthRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const curriculumRoutes = require('./routes/curriculumRoutes');
const importRoutes = require('./routes/importRoutes');
const gradeRoutes = require('./routes/gradeRoutes');
const termRoutes = require('./routes/termRoutes');
const advisingRoutes = require('./routes/advisingRoutes');
const forecastingRoutes = require('./routes/forecastingRoutes');
const courseOfferingRoutes = require('./routes/courseOfferingRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Support multiple allowed origins via comma-separated CLIENT_URL
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin like mobile apps or curl
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', invitationRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/import', importRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/terms', termRoutes);
app.use('/api/advising', advisingRoutes);
app.use('/api/forecasting', forecastingRoutes);
app.use('/api/course-offerings', courseOfferingRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

// Sync database and start server
sequelize.sync().then(() => {
  console.log('Database synced successfully');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to sync database:', err);
});
