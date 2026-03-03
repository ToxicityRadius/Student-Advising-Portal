const { Sequelize } = require('sequelize');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite', // This creates a local SQLite file
  logging: false
});
module.exports = sequelize;
