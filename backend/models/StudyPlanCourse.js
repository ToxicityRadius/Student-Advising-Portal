const { DataTypes, Op } = require('sequelize');
const sequelize = require('../database/db');

const StudyPlanCourse = sequelize.define(
  'StudyPlanCourse',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    studyPlanVersionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'study_plan_versions', key: 'id' },
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'courses', key: 'id' },
    },
    yearLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    grade: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(25),
      defaultValue: 'pending',
      validate: {
        isIn: [
          [
            'pending',
            'passed',
            'failed',
            'dropped',
            'incomplete',
            'officially_dropped',
            'unofficially_dropped',
          ],
        ],
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: 'study_plan_courses',
    timestamps: false,
    defaultScope: {
      where: { deletedAt: null },
    },
    scopes: {
      withDeleted: { where: {} },
      onlyDeleted: { where: { deletedAt: { [Op.not]: null } } },
    },
    indexes: [
      { fields: ['studyPlanVersionId'] },
      { fields: ['status', 'semester'], name: 'study_plan_courses_status_semester' },
      { fields: ['deletedAt'] },
    ],
  },
);

StudyPlanCourse.prototype.softDelete = async function () {
  this.deletedAt = new Date();
  return this.save();
};

StudyPlanCourse.prototype.restore = async function () {
  this.deletedAt = null;
  return this.save();
};

module.exports = StudyPlanCourse;
