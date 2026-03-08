const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const PlanSubject = sequelize.define('PlanSubject', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  target_term: {
    type: DataTypes.STRING
  },
  projected_term: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_historical: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'plan_subjects',
  timestamps: false,
  indexes: [
    { fields: ['StudyPlanId'] },
    { fields: ['SubjectId'] }
  ]
});

module.exports = PlanSubject;
