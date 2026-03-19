require('dotenv').config();

const useSsl = process.env.DB_SSL === 'false' ? false : true;

module.exports = {
  development: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: useSsl
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {}
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: useSsl
      ? { ssl: { require: true, rejectUnauthorized: true } }
      : {}
  }
};
