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
      "studentId" VARCHAR(7) UNIQUE,
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

  const facultyInvitationsTable = `
    CREATE TABLE IF NOT EXISTS faculty_invitations (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      role VARCHAR(50) NOT NULL CHECK(role IN ('adviser', 'admin')),
      "invitationToken" VARCHAR(255) NOT NULL UNIQUE,
      "invitationExpires" BIGINT NOT NULL,
      "invitedBy" INTEGER REFERENCES users(id),
      "isUsed" BOOLEAN DEFAULT false,
      "createdAt" BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
    )
  `;

  try {
    await pool.query(usersTable);
    await pool.query(facultyInvitationsTable);
    console.log('Database tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err);
  }
};

// Initialize database
createTables();

module.exports = pool;
