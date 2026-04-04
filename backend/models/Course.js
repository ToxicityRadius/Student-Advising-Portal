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
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
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
  },
);

module.exports = Course;
