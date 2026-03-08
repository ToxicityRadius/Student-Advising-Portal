const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const EquivalencyRule = sequelize.define('EquivalencyRule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  source_subject_id: {
    type: DataTypes.INTEGER
  },
  target_subject_id: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'equivalency_rules',
  timestamps: false
});

module.exports = EquivalencyRule;
