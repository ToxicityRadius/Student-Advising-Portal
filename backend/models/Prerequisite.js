const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const Prerequisite = sequelize.define('Prerequisite', {
  subject_id: {
    type: DataTypes.INTEGER
  },
  required_subj_id: {
    type: DataTypes.INTEGER
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'prerequisite',
    validate: { isIn: [['prerequisite', 'corequisite']] }
  }
}, {
  tableName: 'prerequisites',
  timestamps: false
});

module.exports = Prerequisite;
