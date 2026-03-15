const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const StudentAcademicRecord = sequelize.define('StudentAcademicRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  curriculumId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'curriculums', key: 'id' }
  },
  electiveTrackId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'elective_tracks', key: 'id' }
  },
  studentName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  studentNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  yearLevel: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  createdByAdviserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  createdAt: {
    type: DataTypes.BIGINT,
    defaultValue: () => Date.now()
  },
  updatedAt: {
    type: DataTypes.BIGINT,
    defaultValue: () => Date.now()
  }
}, {
  tableName: 'student_academic_records',
  timestamps: false,
  indexes: [
    { fields: ['userId'] },
    { fields: ['email'] }
  ]
});

module.exports = StudentAcademicRecord;
