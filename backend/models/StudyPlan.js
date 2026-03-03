const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const StudyPlan = sequelize.define('StudyPlan', {
  plan_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER
  },
  status: {
    type: DataTypes.ENUM('draft', 'approved')
  }
}, {
  tableName: 'study_plans',
  timestamps: false
});

module.exports = StudyPlan;
