const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const Prerequisite = sequelize.define('Prerequisite', {
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
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'courses', key: 'id' }
  },
  prerequisiteCourseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'courses', key: 'id' }
  }
}, {
  tableName: 'prerequisites',
  timestamps: false
});

module.exports = Prerequisite;
