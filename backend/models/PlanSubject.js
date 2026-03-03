const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const PlanSubject = sequelize.define('PlanSubject', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  plan_id: {
    type: DataTypes.INTEGER
  },
  subject_id: {
    type: DataTypes.INTEGER
  },
  target_term: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'plan_subjects',
  timestamps: false
});

module.exports = PlanSubject;
