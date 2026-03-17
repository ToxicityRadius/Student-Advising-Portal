const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  studentId: {
    type: DataTypes.STRING(7),
    unique: true
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING(50),
    defaultValue: 'student'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  activationToken: {
    type: DataTypes.STRING
  },
  activationTokenExpires: {
    type: DataTypes.BIGINT
  },
  resetPasswordToken: {
    type: DataTypes.STRING
  },
  resetPasswordExpires: {
    type: DataTypes.BIGINT
  },
  verificationCode: {
    type: DataTypes.STRING(10)
  },
  verificationCodeExpires: {
    type: DataTypes.BIGINT
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  mustChangePassword: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  refreshToken: {
    type: DataTypes.STRING(500)
  },
  refreshTokenExpires: {
    type: DataTypes.BIGINT
  },
  lastLogin: {
    type: DataTypes.BIGINT
  },
  passwordUpdatedAt: {
    type: DataTypes.BIGINT
  },
  createdAt: {
    type: DataTypes.BIGINT,
    defaultValue: () => Date.now()
  },
  updatedAt: {
    type: DataTypes.BIGINT,
    defaultValue: () => Date.now()
  },
  current_year_level: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  is_onboarded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  middle_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  program: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contact_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  profile_picture: {
    type: DataTypes.STRING,
    allowNull: true
  },
  adviserId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // --- Phase 1: Extended Profile Fields ---
  // Identity
  suffix: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  preferred_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Academic identity
  curriculum_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  student_type: {
    type: DataTypes.STRING(30),
    allowNull: true
    // 'regular', 'irregular', 'transferee', 'ladderized'
  },
  // Contact
  alternate_email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Demographics
  sex: {
    type: DataTypes.STRING(30),
    allowNull: true
    // 'Male', 'Female', 'Non-binary', 'Prefer not to say'
  },
  citizenship: {
    type: DataTypes.STRING(60),
    allowNull: true
  },
  // Location
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Emergency contact
  emergency_contact_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  emergency_contact_relationship: {
    type: DataTypes.STRING(60),
    allowNull: true
  },
  emergency_contact_number: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  // Metadata
  profile_updated_at: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  profile_last_submitted_term_key: {
    type: DataTypes.STRING(40),
    allowNull: true
  },
  profile_submission_locked_at: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  // --- Phase 2A: Credential Rotation Fields ---
  mustChangeEmail: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  pendingEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  emailChangeCode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  emailChangeCodeExpires: {
    type: DataTypes.BIGINT,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: false,
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['adviserId'] },
    { fields: ['role'] },
    { fields: ['studentId'], unique: true }
  ]
});

module.exports = User;
