const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const StudyPlanCourse = sequelize.define('StudyPlanCourse', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  studyPlanVersionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'study_plan_versions', key: 'id' }
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'courses', key: 'id' }
  },
  yearLevel: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  semester: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  grade: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'passed', 'failed', 'dropped', 'incomplete'),
    defaultValue: 'pending'
  },
  createdAt: {
    type: DataTypes.BIGINT,
    defaultValue: () => Date.now()
  },
  updatedAt: {
    type: DataTypes.BIGINT,
    defaultValue: () => Date.now()
  }
}, {
  tableName: 'study_plan_courses',
  timestamps: false
});

module.exports = StudyPlanCourse;
