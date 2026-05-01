/**
 * seed_users_only.js — Database reset + default users only
 *
 * What this script does:
 *   1. Truncates every table in the public schema (except SequelizeMeta),
 *      resetting all identity sequences.
 *   2. Recreates the default program and default user accounts.
 *
 * Usage (from repo root):
 *   node backend/scripts/seed_users_only.js
 *
 * Usage (from backend/):
 *   node scripts/seed_users_only.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { sequelize, User, Program, UserProgramAssignment } = require('../models');
const { DEFAULT_PROGRAM } = require('../constants');
const { buildSuperadminSeedUser } = require('../utils/superadminBootstrap');

(async () => {
  try {
    const now = Date.now();
    const superadminUser = await buildSuperadminSeedUser({
      env: process.env,
      now,
      hashPassword: bcrypt.hash,
    });

    await sequelize.authenticate();
    console.log('[seed:users-only] connected to database');

    const [tableRows] = await sequelize.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('SequelizeMeta') ORDER BY tablename",
    );

    if (tableRows.length > 0) {
      const names = tableRows.map((row) => `"${row.tablename}"`).join(', ');
      await sequelize.query(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
      console.log(`[seed:users-only] truncated ${tableRows.length} tables`);
    } else {
      console.log('[seed:users-only] no tables found to truncate');
    }

    const hash = await bcrypt.hash('Password123!', 10);
    const bscpeProgram = await Program.create({
      ...DEFAULT_PROGRAM,
      createdAt: now,
      updatedAt: now,
    });

    await User.bulkCreate([
      superadminUser,
      {
        firstName: 'Program',
        lastName: 'Chair',
        email: 'admin.cpe@tip.edu.ph',
        password: hash,
        role: 'admin',
        isActive: true,
        isVerified: true,
        mustChangePassword: true,
        mustChangeEmail: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        firstName: 'Student',
        lastName: 'Adviser',
        email: 'adviser.cpe@tip.edu.ph',
        password: hash,
        role: 'adviser',
        isActive: true,
        isVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        studentId: '1234567',
        firstName: 'Sample',
        lastName: 'Student',
        email: 'student@tip.edu.ph',
        password: hash,
        role: 'student',
        isActive: true,
        isVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const assignedStaff = await User.findAll({ where: { role: ['admin', 'adviser'] } });
    await UserProgramAssignment.bulkCreate(
      assignedStaff.map((user) => ({
        userId: user.id,
        programId: bscpeProgram.id,
        createdAt: now,
        updatedAt: now,
      })),
    );

    const users = await User.count();

    console.log('[seed:users-only] complete');
    console.log(JSON.stringify({ users }, null, 2));

    await sequelize.close();
  } catch (error) {
    console.error('[seed:users-only] error:', error.message || error);
    try {
      await sequelize.close();
    } catch (closeError) {
      // Ignore close errors while exiting after a seed failure.
      void closeError;
    }
    process.exit(1);
  }
})();
