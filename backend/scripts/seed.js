/**
 * seed.js — Full database reset + re-seed
 *
 * What this script does:
 *   1. Truncates every table in the public schema (except SequelizeMeta),
 *      resetting all identity sequences.
 *   2. Creates the three default user accounts (admin, adviser, student).
 *   3. Imports all BS CPE curricula (2018, 2023, 2025) from the pre-built
 *      normalized CSVs in data/curriculum_normalized/.
 *
 * Usage (from repo root):
 *   node backend/scripts/seed.js
 *
 * Usage (from backend/):
 *   node scripts/seed.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const {
  sequelize,
  User,
  Curriculum,
  Course,
  CurriculumCourse,
  Prerequisite,
  ElectiveTrack,
  ElectiveTrackCourse
} = require('../models');

const normalizedDir = path.resolve(__dirname, '..', '..', 'data', 'curriculum_normalized');

// ─── CSV helpers ────────────────────────────────────────────────────────────

const parseCsvLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
};

const readCsv = (fileName) => {
  const filePath = path.join(normalizedDir, fileName);
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? '';
    });
    return row;
  });
};

const toBoolean = (value) => String(value || '').trim().toLowerCase() === 'true';

const toIntOrNull = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : null;
};

// ─── Main ────────────────────────────────────────────────────────────────────

(async () => {
  try {
    await sequelize.authenticate();
    console.log('[seed] connected to database');

    // ── 1. Truncate all tables ───────────────────────────────────────────────
    const [tableRows] = await sequelize.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('SequelizeMeta') ORDER BY tablename"
    );

    if (tableRows.length > 0) {
      const names = tableRows.map((r) => `"${r.tablename}"`).join(', ');
      await sequelize.query(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
      console.log(`[seed] truncated ${tableRows.length} tables`);
    } else {
      console.log('[seed] no tables found to truncate');
    }

    // ── 2. Default users ─────────────────────────────────────────────────────
    const hash = await bcrypt.hash('Password123!', 10);
    const now = Date.now();

    await User.bulkCreate([
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
        updatedAt: now
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
        updatedAt: now
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
        updatedAt: now
      }
    ]);

    console.log('[seed] default users created (admin, adviser, student)');

    // ── 3. Curriculum import from normalized CSVs ────────────────────────────
    console.log('[seed] loading normalized csv files...');

    const [curriculumRows, courseRows, curriculumCourseRows, prerequisiteRows, trackRows, trackCourseRows] = [
      readCsv('curriculums.csv'),
      readCsv('courses.csv'),
      readCsv('curriculum_courses.csv'),
      readCsv('prerequisites.csv'),
      readCsv('elective_tracks.csv'),
      readCsv('elective_track_courses.csv')
    ];

    const transaction = await sequelize.transaction();

    try {
      await sequelize.query("SET LOCAL statement_timeout = '120000ms'", { transaction });

      const admin = await User.findOne({ where: { role: 'admin' }, order: [['id', 'ASC']], transaction });
      const createdById = admin?.id || null;

      // Curricula
      console.log('[seed] inserting curriculums...');
      const curriculumIdByCode = new Map();

      for (const row of curriculumRows) {
        const curriculum = await Curriculum.create({
          name: row.name,
          description: row.description || null,
          isActive: toBoolean(row.is_active),
          createdById,
          createdAt: now,
          updatedAt: now
        }, { transaction });

        curriculumIdByCode.set(row.curriculum_code, curriculum.id);
      }

      // Courses
      console.log('[seed] inserting courses...');
      const courseIdByCode = new Map();

      for (const row of courseRows) {
        const course = await Course.create({
          code: row.course_code,
          name: row.course_title,
          units: toIntOrNull(row.credit_units) || 0,
          createdAt: now,
          updatedAt: now
        }, { transaction });

        courseIdByCode.set(row.course_code, course.id);
      }

      // Curriculum ↔ Course mappings
      console.log('[seed] inserting curriculum_courses...');
      const curriculumCourseData = [];

      for (const row of curriculumCourseRows) {
        const curriculumId = curriculumIdByCode.get(row.curriculum_code);
        const courseId = courseIdByCode.get(row.course_code);
        if (!curriculumId || !courseId) continue;

        curriculumCourseData.push({
          curriculumId,
          courseId,
          yearLevel: toIntOrNull(row.year_level),
          semester: toIntOrNull(row.semester),
          isElective: toBoolean(row.is_elective)
        });
      }

      await CurriculumCourse.bulkCreate(curriculumCourseData, { transaction });

      // Prerequisites
      console.log('[seed] inserting prerequisites...');
      const prerequisiteData = [];

      for (const row of prerequisiteRows) {
        const curriculumId = curriculumIdByCode.get(row.curriculum_code);
        const courseId = courseIdByCode.get(row.course_code);
        const prerequisiteCourseId = courseIdByCode.get(row.prerequisite_course_code);
        if (!curriculumId || !courseId || !prerequisiteCourseId) continue;

        prerequisiteData.push({ curriculumId, courseId, prerequisiteCourseId });
      }

      await Prerequisite.bulkCreate(prerequisiteData, { transaction });

      // Elective tracks
      console.log('[seed] inserting elective_tracks...');
      const trackIdByKey = new Map();

      for (const row of trackRows) {
        const curriculumId = curriculumIdByCode.get(row.curriculum_code);
        if (!curriculumId) continue;

        const track = await ElectiveTrack.create({
          curriculumId,
          name: row.track_name,
          description: row.description || null
        }, { transaction });

        trackIdByKey.set(`${row.curriculum_code}|${row.track_name}`, track.id);
      }

      // Elective track ↔ course mappings
      console.log('[seed] inserting elective_track_courses...');
      const trackCourseData = [];

      for (const row of trackCourseRows) {
        const trackId = trackIdByKey.get(`${row.curriculum_code}|${row.track_name}`);
        const courseId = courseIdByCode.get(row.course_code);
        if (!trackId || !courseId) continue;

        trackCourseData.push({
          electiveTrackId: trackId,
          courseId,
          yearLevel: toIntOrNull(row.year_level),
          semester: toIntOrNull(row.semester)
        });
      }

      await ElectiveTrackCourse.bulkCreate(trackCourseData, { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    // ── 4. Summary ───────────────────────────────────────────────────────────
    const counts = {
      users: await User.count(),
      curriculums: await Curriculum.count(),
      courses: await Course.count(),
      curriculumCourses: await CurriculumCourse.count(),
      prerequisites: await Prerequisite.count(),
      electiveTracks: await ElectiveTrack.count(),
      electiveTrackCourses: await ElectiveTrackCourse.count()
    };

    console.log('[seed] complete');
    console.log(JSON.stringify(counts, null, 2));

    await sequelize.close();
  } catch (error) {
    console.error('[seed] error:', error.message || error);
    try { await sequelize.close(); } catch {}
    process.exit(1);
  }
})();
