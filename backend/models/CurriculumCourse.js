const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const CurriculumCourse = sequelize.define('CurriculumCourse', {
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
  yearLevel: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  semester: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  isElective: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'curriculum_courses',
  timestamps: false
});

module.exports = CurriculumCourse;
