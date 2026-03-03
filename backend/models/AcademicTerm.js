const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const AcademicTerm = sequelize.define('AcademicTerm', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  term_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'academic_terms',
  timestamps: false
});

module.exports = AcademicTerm;
