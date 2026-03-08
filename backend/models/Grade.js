const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const Grade = sequelize.define('Grade', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  grade_value: {
    type: DataTypes.DECIMAL
  },
  prelim_grade: {
    type: DataTypes.DECIMAL,
    allowNull: true
  },
  midterm_grade: {
    type: DataTypes.DECIMAL,
    allowNull: true
  },
  final_grade: {
    type: DataTypes.STRING,
    allowNull: true
  },
  term_taken: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'verified', 'rejected', 'passed', 'failed')
  },
  risk_status: {
    type: DataTypes.ENUM('pending', 'on_track', 'at_risk'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'grades',
  timestamps: false,
  indexes: [
    { fields: ['UserId'] },
    { fields: ['SubjectId'] },
    { fields: ['status'] },
    { fields: ['UserId', 'status'] },
    { fields: ['UserId', 'SubjectId'] }
  ]
});

module.exports = Grade;
