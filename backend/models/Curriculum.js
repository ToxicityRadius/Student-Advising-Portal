const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const Curriculum = sequelize.define('Curriculum', {
  curr_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  version_year: {
    type: DataTypes.STRING
  },
  active_status: {
    type: DataTypes.BOOLEAN
  }
}, {
  tableName: 'curricula',
  timestamps: false
});

module.exports = Curriculum;
