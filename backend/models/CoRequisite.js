const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const CoRequisite = sequelize.define('CoRequisite', {
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
  coRequisiteCourseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'courses', key: 'id' }
  }
}, {
  tableName: 'co_requisites',
  timestamps: false
});

module.exports = CoRequisite;
