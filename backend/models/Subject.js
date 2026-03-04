const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const Subject = sequelize.define('Subject', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  course_code: {
    type: DataTypes.STRING
  },
  title: {
    type: DataTypes.STRING
  },
  units: {
    type: DataTypes.INTEGER
  },
  seasonal_term: {
    type: DataTypes.STRING
  },
  year_level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  }
}, {
  tableName: 'subjects',
  timestamps: false
});

module.exports = Subject;
