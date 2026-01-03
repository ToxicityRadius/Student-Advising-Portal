const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.uxnfpqxzbgtdboqcwjjw:StudentAdvisingPortal@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('PostgreSQL database connected successfully');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

// Create tables
const createTables = async () => {
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      "firstName" VARCHAR(255) NOT NULL,
      "lastName" VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'student' CHECK(role IN ('student', 'adviser', 'admin')),
      "isActive" BOOLEAN DEFAULT false,
      "activationToken" VARCHAR(255),
      "activationTokenExpires" BIGINT,
      "resetPasswordToken" VARCHAR(255),
      "resetPasswordExpires" BIGINT,
      "verificationCode" VARCHAR(10),
      "verificationCodeExpires" BIGINT,
      "isVerified" BOOLEAN DEFAULT false,
      "createdAt" BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
      "updatedAt" BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
      "lastLogin" BIGINT
    )
  `;

  try {
    await pool.query(usersTable);
    console.log('Database tables created successfully');
  } catch (err) {
    console.error('Error creating users table:', err);
  }
};

// Initialize database
createTables();

module.exports = pool;
