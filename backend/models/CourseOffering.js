const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const CourseOffering = sequelize.define('CourseOffering', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  target_term: {
    type: DataTypes.STRING,
    allowNull: false
  },
  is_automatically_opened: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'course_offerings',
  timestamps: false
});

module.exports = CourseOffering;
