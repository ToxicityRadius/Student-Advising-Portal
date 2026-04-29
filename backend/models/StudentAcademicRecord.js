const { DataTypes, Op } = require('sequelize');
const sequelize = require('../database/db');

const StudentAcademicRecord = sequelize.define(
  'StudentAcademicRecord',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    curriculumId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'curriculums', key: 'id' },
    },
    programId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'programs', key: 'id' },
    },
    electiveTrackId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'elective_tracks', key: 'id' },
    },
    studentName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    studentNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    yearLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    createdByAdviserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
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
    tableName: 'student_academic_records',
    timestamps: false,
    defaultScope: {
      where: { deletedAt: null },
    },
    scopes: {
      withDeleted: { where: {} },
      onlyDeleted: { where: { deletedAt: { [Op.not]: null } } },
    },
    indexes: [
      { fields: ['userId'] },
      { fields: ['email'] },
      { fields: ['programId'] },
      { fields: ['deletedAt'] },
    ],
  },
);

StudentAcademicRecord.prototype.softDelete = async function () {
  this.deletedAt = new Date();
  return this.save();
};

StudentAcademicRecord.prototype.restore = async function () {
  this.deletedAt = null;
  return this.save();
};

module.exports = StudentAcademicRecord;
