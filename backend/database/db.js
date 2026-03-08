const { Sequelize } = require('sequelize');

const connectionString = process.env.DATABASE_URL ||
  'postgresql://postgres.uxnfpqxzbgtdboqcwjjw:StudentAdvisingPortal@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

module.exports = sequelize;
