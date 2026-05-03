const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const InactiveCurriculumRegenerationRequest = sequelize.define(
  'InactiveCurriculumRegenerationRequest',
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
    programId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'programs', key: 'id' },
    },
    curriculumId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'curriculums', key: 'id' },
    },
    studyPlanVersionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'study_plan_versions', key: 'id' },
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
    tableName: 'inactive_curriculum_regeneration_requests',
    timestamps: false,
    indexes: [
      { fields: ['status'], name: 'idx_inactive_regen_status' },
      { fields: ['programId'], name: 'idx_inactive_regen_program' },
      { fields: ['studentAcademicRecordId'], name: 'idx_inactive_regen_sar' },
      { fields: ['studyPlanVersionId'], name: 'idx_inactive_regen_version' },
      {
        fields: ['studentAcademicRecordId', 'studyPlanVersionId', 'curriculumId', 'status'],
        name: 'inactive_curriculum_regen_sar_version_status',
      },
    ],
  },
);

module.exports = InactiveCurriculumRegenerationRequest;
