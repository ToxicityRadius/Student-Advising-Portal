const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const ElectiveTrack = sequelize.define('ElectiveTrack', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  curriculumId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'curriculums', key: 'id' }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'elective_tracks',
  timestamps: false
});

module.exports = ElectiveTrack;
