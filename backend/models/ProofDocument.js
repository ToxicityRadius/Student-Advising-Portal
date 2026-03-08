const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const ProofDocument = sequelize.define('ProofDocument', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  file_path: {
    type: DataTypes.STRING
  },
  upload_date: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'proof_documents',
  timestamps: false
});

module.exports = ProofDocument;
