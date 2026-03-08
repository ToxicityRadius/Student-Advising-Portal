const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const OpenedSection = sequelize.define('OpenedSection', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  target_term: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'opened_sections',
  timestamps: false
});

module.exports = OpenedSection;
