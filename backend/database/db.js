const { Sequelize } = require('sequelize');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set. Check your .env file.');
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: isProduction
    }
  },
  retry: {
    // Retries transient connection/query failures that can occur with managed DB poolers.
    max: 3,
    match: [
      /SequelizeConnectionError/i,
      /SequelizeConnectionRefusedError/i,
      /SequelizeConnectionTimedOutError/i,
      /SequelizeHostNotReachableError/i,
      /SequelizeHostNotFoundError/i,
      /Connection terminated unexpectedly/i,
      /ECONNRESET/i,
      /ETIMEDOUT/i
    ]
  },
  logging: false,
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000
  }
});

module.exports = sequelize;
