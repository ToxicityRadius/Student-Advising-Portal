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
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  semester: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 3
    }
  },
  isElective: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'curriculum_courses',
  timestamps: false,
  indexes: [
    // Prevent the same course appearing twice in the same curriculum slot
    { unique: true, fields: ['curriculumId', 'courseId'], name: 'curriculum_courses_curriculum_course' }
  ]
});

module.exports = CurriculumCourse;
