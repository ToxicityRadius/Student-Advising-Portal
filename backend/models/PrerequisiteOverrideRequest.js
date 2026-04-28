const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const PrerequisiteOverrideRequest = sequelize.define(
  'PrerequisiteOverrideRequest',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    studentAcademicRecordId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'student_academic_records', key: 'id' },
    },
    studyPlanVersionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'study_plan_versions', key: 'id' },
    },
    prerequisiteCourseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'courses', key: 'id' },
    },
    dependentCourseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'courses', key: 'id' },
    },
    yearLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'approved', 'rejected']],
      },
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    decisionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    requestedByAdviserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    decidedByAdminId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    decidedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'prerequisite_override_requests',
    timestamps: false,
    indexes: [
      { fields: ['status'] },
      { fields: ['studentAcademicRecordId'] },
      { fields: ['studyPlanVersionId'] },
      {
        fields: [
          'studyPlanVersionId',
          'prerequisiteCourseId',
          'dependentCourseId',
          'yearLevel',
          'semester',
        ],
        name: 'prereq_override_version_pair_slot',
      },
    ],
  },
);

module.exports = PrerequisiteOverrideRequest;
