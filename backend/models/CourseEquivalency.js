const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const CourseEquivalency = sequelize.define(
  'CourseEquivalency',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'courses', key: 'id' },
    },
    equivalentCourseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'courses', key: 'id' },
    },
    ownerProgramId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'programs', key: 'id' },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'course_equivalencies',
    timestamps: false,
    indexes: [
      { fields: ['ownerProgramId'] },
      {
        fields: ['courseId', 'equivalentCourseId', 'ownerProgramId'],
        unique: true,
        name: 'course_equiv_owner_pair_unique',
      },
    ],
  },
);

module.exports = CourseEquivalency;
