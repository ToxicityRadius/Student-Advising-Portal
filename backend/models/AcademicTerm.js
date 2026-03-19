const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const AcademicTerm = sequelize.define('AcademicTerm', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  schoolYear: {
    type: DataTypes.STRING,
    allowNull: false
  },
  semester: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 3
    }
  },
  isCurrent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  startedAt: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  endedAt: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  closedById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  }
}, {
  tableName: 'academic_terms',
  timestamps: false,
  indexes: [
    // Prevent duplicate active terms for the same school year and semester
    { unique: true, fields: ['schoolYear', 'semester'], name: 'academic_terms_school_year_semester' }
  ]
});

module.exports = AcademicTerm;
