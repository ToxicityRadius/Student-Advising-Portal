const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const Grade = sequelize.define('Grade', {
  grade_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER
  },
  subject_id: {
    type: DataTypes.INTEGER
  },
  grade_value: {
    type: DataTypes.DECIMAL
  },
  term_taken: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected')
  }
}, {
  tableName: 'grades',
  timestamps: false
});

module.exports = Grade;
