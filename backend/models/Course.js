const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const Course = sequelize.define(
  'Course',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    programId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'programs', key: 'id' },
    },
    units: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 9,
      },
    },
    lectureHours: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 0 },
    },
    laboratoryHours: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 0 },
    },
    maxStudentsPerSection: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1 },
    },
    createdAt: {
      type: DataTypes.BIGINT,
      defaultValue: () => Date.now(),
    },
    updatedAt: {
      type: DataTypes.BIGINT,
      defaultValue: () => Date.now(),
    },
  },
  {
    tableName: 'courses',
    timestamps: false,
    indexes: [
      { fields: ['programId'] },
      { fields: ['programId', 'code'], unique: true, name: 'courses_program_code_unique' },
    ],
  },
);

module.exports = Course;
