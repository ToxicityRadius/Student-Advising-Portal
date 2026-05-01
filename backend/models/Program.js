const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const Program = sequelize.define(
  'Program',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      set(value) {
        this.setDataValue(
          'code',
          String(value || '')
            .trim()
            .toUpperCase(),
        );
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    departmentName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emailSuffix: {
      type: DataTypes.STRING,
      allowNull: true,
      set(value) {
        const normalized = value ? String(value).trim().toLowerCase() : null;
        this.setDataValue('emailSuffix', normalized || null);
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    tableName: 'programs',
    timestamps: false,
    indexes: [{ fields: ['code'], unique: true }, { fields: ['isActive'] }],
  },
);

module.exports = Program;
