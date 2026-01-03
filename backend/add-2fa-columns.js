const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.uxnfpqxzbgtdboqcwjjw:StudentAdvisingPortal@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function addColumns() {
  try {
    console.log('Adding 2FA columns to users table...');
    
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "verificationCode" VARCHAR(10),
      ADD COLUMN IF NOT EXISTS "verificationCodeExpires" BIGINT,
      ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false;
    `);
    
    console.log('✓ Columns added successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error adding columns:', err);
    process.exit(1);
  }
}

addColumns();
