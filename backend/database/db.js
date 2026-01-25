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
      "refreshToken" VARCHAR(500),
      "refreshTokenExpires" BIGINT,
      "lastLogin" BIGINT,
      "passwordUpdatedAt" BIGINT,
      "createdAt" BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
      "updatedAt" BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
      CONSTRAINT email_format CHECK (email LIKE '%@tip.edu.ph'),
      CONSTRAINT studentId_format CHECK ("studentId" IS NULL OR "studentId" ~ '^\d{7}$')
    )
  `;

  const facultyInvitationsTable = `
    CREATE TABLE IF NOT EXISTS faculty_invitations (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      role VARCHAR(50) NOT NULL CHECK(role IN ('adviser', 'admin')),
      "invitationToken" VARCHAR(255) NOT NULL UNIQUE,
      "invitationExpires" BIGINT NOT NULL,
      "invitedBy" INTEGER REFERENCES users(id) ON DELETE SET NULL,
      "isUsed" BOOLEAN DEFAULT false,
      "usedAt" BIGINT,
      "createdAt" BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
      CONSTRAINT invitation_email_format CHECK (email LIKE '%@tip.edu.ph')
    )
  `;

  const auditLogTable = `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      "userId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      "resourceType" VARCHAR(50),
      "resourceId" INTEGER,
      details TEXT,
      "ipAddress" VARCHAR(45),
      "userAgent" VARCHAR(500),
      "createdAt" BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
    )
  `;

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_user_action ON audit_logs ("userId", action);
    CREATE INDEX IF NOT EXISTS idx_created ON audit_logs ("createdAt");
  `;

  try {
    await pool.query(usersTable);
    await pool.query(facultyInvitationsTable);
    await pool.query(auditLogTable);
    await pool.query(createIndexes);
    console.log('Database tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err);
  }
};

// Initialize database
createTables();

module.exports = pool;
