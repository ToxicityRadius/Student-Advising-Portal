const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const StudyPlan = sequelize.define('StudyPlan', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  studentAcademicRecordId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: 'student_academic_records', key: 'id' }
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
  tableName: 'study_plans',
  timestamps: false
});

module.exports = StudyPlan;
