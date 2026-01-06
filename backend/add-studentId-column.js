const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.uxnfpqxzbgtdboqcwjjw:StudentAdvisingPortal@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function addStudentIdColumn() {
  try {
    console.log('Adding studentId column to users table...');
    
    // Add studentId column if it doesn't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "studentId" VARCHAR(7) UNIQUE;
    `);
    
    console.log('✓ studentId column added successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error adding studentId column:', err);
    process.exit(1);
  }
}

addStudentIdColumn();
