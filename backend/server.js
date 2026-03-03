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
Curriculum.hasMany(Subject, { foreignKey: 'curr_id' });
Subject.belongsTo(Curriculum, { foreignKey: 'curr_id' });

User.hasMany(Grade, { foreignKey: 'user_id' });
Grade.belongsTo(User, { foreignKey: 'user_id' });

Subject.hasMany(Grade, { foreignKey: 'subject_id' });
Grade.belongsTo(Subject, { foreignKey: 'subject_id' });

Grade.hasOne(ProofDocument, { foreignKey: 'grade_id' });
ProofDocument.belongsTo(Grade, { foreignKey: 'grade_id' });

User.hasMany(StudyPlan, { foreignKey: 'user_id' });
StudyPlan.belongsTo(User, { foreignKey: 'user_id' });

StudyPlan.hasMany(PlanSubject, { foreignKey: 'plan_id' });
PlanSubject.belongsTo(StudyPlan, { foreignKey: 'plan_id' });

Subject.hasMany(PlanSubject, { foreignKey: 'subject_id' });
PlanSubject.belongsTo(Subject, { foreignKey: 'subject_id' });

// Sync database and start server
sequelize.sync({ alter: true }).then(() => {
  console.log('Database synced successfully');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to sync database:', err);
});
