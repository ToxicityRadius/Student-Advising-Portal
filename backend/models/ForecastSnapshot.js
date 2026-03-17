const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const ForecastSnapshot = sequelize.define('ForecastSnapshot', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  academicTermId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'academic_terms', key: 'id' }
  },
  schoolYear: {
    type: DataTypes.STRING,
    allowNull: true
  },
  semester: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  snapshotData: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  triggeredByUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  createdAt: {
    type: DataTypes.BIGINT,
    defaultValue: () => Date.now()
  }
}, {
  tableName: 'forecast_snapshots',
  timestamps: false,
  indexes: [
    { fields: ['academicTermId'] }
  ]
});

module.exports = ForecastSnapshot;
