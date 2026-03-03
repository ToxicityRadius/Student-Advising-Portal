const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize database
const sequelize = require('./database/db');

// Import models
const User = require('./models/User');
const Invitation = require('./models/Invitation');
const Curriculum = require('./models/Curriculum');
const Subject = require('./models/Subject');
const Prerequisite = require('./models/Prerequisite');
const EquivalencyRule = require('./models/EquivalencyRule');
const Grade = require('./models/Grade');
const ProofDocument = require('./models/ProofDocument');
const StudyPlan = require('./models/StudyPlan');
const PlanSubject = require('./models/PlanSubject');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const googleAuthRoutes = require('./routes/googleAuthRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const curriculumRoutes = require('./routes/curriculumRoutes');
const importRoutes = require('./routes/importRoutes');

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

// Define associations
// Define associations (Let Sequelize handle foreign keys)
Curriculum.hasMany(Subject);
Subject.belongsTo(Curriculum);

User.hasMany(Grade);
Grade.belongsTo(User);

Subject.hasMany(Grade);
Grade.belongsTo(Subject);

Grade.hasOne(ProofDocument);
ProofDocument.belongsTo(Grade);

User.hasMany(StudyPlan);
StudyPlan.belongsTo(User);

StudyPlan.hasMany(PlanSubject);
PlanSubject.belongsTo(StudyPlan);

Subject.hasMany(PlanSubject);
PlanSubject.belongsTo(Subject);

// Sync database and start server
sequelize.sync({ alter: true }).then(() => {
  console.log('Database synced successfully');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to sync database:', err);
});
