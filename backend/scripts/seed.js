/**
 * seed.js — Full database reset + re-seed
 *
 * What this script does:
 *   1. Truncates every table in the public schema (except SequelizeMeta),
 *      resetting all identity sequences.
 *   2. Creates the three default user accounts (admin, adviser, student).
 *   3. Imports all BS CPE curricula (2018, 2023, 2025) from the single-file
 *      import-ready CSVs in data/curriculum_import_ready/.
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
  Program,
  UserProgramAssignment,
  Curriculum,
  Course,
  CurriculumCourse,
  Prerequisite,
  CoRequisite,
  ElectiveTrack,
  ElectiveTrackCourse,
} = require('../models');
const { DEFAULT_PROGRAM } = require('../constants');
const { buildSuperadminSeedUser } = require('../utils/superadminBootstrap');

const importReadyDir = path.resolve(__dirname, '..', '..', 'data', 'curriculum_import_ready');

// ─── CSV helpers ────────────────────────────────────────────────────────────

const parseCsvText = (text) => {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  const pushCell = () => {
    row.push(current);
    current = '';
  };
  const pushRow = () => {
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];
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
      pushCell();
      continue;
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i += 1;
      pushCell();
      pushRow();
      continue;
    }
    current += char;
  }
  pushCell();
  pushRow();
  return rows;
};

const parseBoolean = (value) => {
  const v = String(value || '')
    .trim()
    .toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'y';
};

const toIntOrNull = (value) => {
  const v = String(value ?? '').trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};

const normalizeRowType = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (normalized === 'corequisite' || normalized === 'co_requisite') {
    return 'corequisite';
  }

  return normalized;
};

/**
 * Parses a curriculum import-ready CSV file and returns normalized rows.
 * Columns: exportVersion, rowType, curriculumId, curriculumName,
 *          courseCode, courseName, units, yearLevel, semester,
 *          isElective, relatedCourseCode, trackName, notes
 */
const readImportCsv = (fileName) => {
  const filePath = path.join(importReadyDir, fileName);
  const text = fs.readFileSync(filePath, 'utf8');
  const rawRows = parseCsvText(text);
  if (rawRows.length === 0) return [];

  const headers = rawRows[0].map((h) => String(h || '').trim());
  const idx = headers.reduce((acc, col, i) => {
    acc[col] = i;
    return acc;
  }, {});
  const pick = (rawRow, col) => String(rawRow[idx[col]] ?? '').trim();

  return rawRows.slice(1).map((rawRow) => ({
    rowType: normalizeRowType(pick(rawRow, 'rowType')),
    curriculumName: pick(rawRow, 'curriculumName'),
    courseCode: pick(rawRow, 'courseCode').toUpperCase(),
    courseName: pick(rawRow, 'courseName'),
    units: toIntOrNull(pick(rawRow, 'units')),
    yearLevel: toIntOrNull(pick(rawRow, 'yearLevel')),
    semester: toIntOrNull(pick(rawRow, 'semester')),
    isElective: parseBoolean(pick(rawRow, 'isElective')),
    relatedCourseCode: pick(rawRow, 'relatedCourseCode').toUpperCase(),
    trackName: pick(rawRow, 'trackName'),
    notes: pick(rawRow, 'notes'),
  }));
};

// ─── Main ────────────────────────────────────────────────────────────────────

(async () => {
  try {
    const now = Date.now();
    const superadminUser = await buildSuperadminSeedUser({
      env: process.env,
      now,
      hashPassword: bcrypt.hash,
    });

    await sequelize.authenticate();
    console.log('[seed] connected to database');

    // ── 1. Truncate all tables ───────────────────────────────────────────────
    const [tableRows] = await sequelize.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('SequelizeMeta') ORDER BY tablename",
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
    const bscpeProgram = await Program.create({
      ...DEFAULT_PROGRAM,
      createdAt: now,
      updatedAt: now,
    });

    const defaultUsers = [
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
        current_year_level: 3,
        program: 'BSCpE',
        curriculum_id: null,
        student_type: 'regular',
        sex: 'Male',
        createdAt: now,
        updatedAt: now,
      },
    ];

    await User.bulkCreate(defaultUsers);
    const assignedStaff = await User.findAll({ where: { role: ['admin', 'adviser'] } });
    await UserProgramAssignment.bulkCreate(
      assignedStaff.map((user) => ({
        userId: user.id,
        programId: bscpeProgram.id,
        createdAt: now,
        updatedAt: now,
      })),
    );

    console.log('[seed] default program and users created');

    // ── 3. Curriculum import from import-ready CSVs ─────────────────────────
    const importFiles = [
      { file: 'bs_cpe_curriculum_2018_import.csv', isActive: false },
      { file: 'bs_cpe_curriculum_2023_import.csv', isActive: false },
      { file: 'bs_cpe_curriculum_2025_import.csv', isActive: true },
    ];

    console.log('[seed] loading import-ready csv files...');

    const transaction = await sequelize.transaction();

    try {
      await sequelize.query("SET LOCAL statement_timeout = '120000ms'", { transaction });

      const admin = await User.findOne({
        where: { role: 'admin' },
        order: [['id', 'ASC']],
        transaction,
      });
      const createdById = admin?.id || null;

      // Shared course map: course code → Course DB id (courses are global)
      const courseIdByCode = new Map();

      for (const { file, isActive } of importFiles) {
        console.log(`[seed] importing ${file}...`);
        const rows = readImportCsv(file);

        const metaRow = rows.find((r) => r.rowType === 'metadata');
        const curriculumName = metaRow?.curriculumName || path.basename(file, '.csv');

        // Create the curriculum record
        const curriculum = await Curriculum.create(
          {
            name: curriculumName,
            description: null,
            programId: bscpeProgram.id,
            isActive,
            createdById,
            createdAt: now,
            updatedAt: now,
          },
          { transaction },
        );

        const curriculumId = curriculum.id;

        const structureRows = rows.filter((r) => r.rowType === 'structure');
        const prereqRows = rows.filter((r) => r.rowType === 'prerequisite');
        const coreqRows = rows.filter((r) => r.rowType === 'corequisite');
        const trackHeaderRows = rows.filter((r) => r.rowType === 'elective_track');
        const trackCourseRows = rows.filter((r) => r.rowType === 'elective_track_course');

        // Resolve / create courses referenced in this file
        const allCodes = [
          ...new Set(rows.flatMap((r) => [r.courseCode, r.relatedCourseCode]).filter(Boolean)),
        ];

        // Find codes already in DB (from a prior curriculum file)
        const needLookup = allCodes.filter((c) => !courseIdByCode.has(c));

        if (needLookup.length > 0) {
          const existing = await Course.findAll({
            where: { code: needLookup, programId: bscpeProgram.id },
            transaction,
          });
          for (const c of existing) courseIdByCode.set(c.code.toUpperCase(), c.id);
        }

        // Create any courses that are still missing (structure + elective_track_course rows only)
        const createTypes = new Set(['structure', 'elective_track_course']);
        for (const row of rows) {
          if (
            !createTypes.has(row.rowType) ||
            !row.courseCode ||
            courseIdByCode.has(row.courseCode)
          )
            continue;
          const created = await Course.create(
            {
              code: row.courseCode,
              name: row.courseName,
              programId: bscpeProgram.id,
              units: row.units || 0,
            },
            { transaction },
          );
          courseIdByCode.set(created.code.toUpperCase(), created.id);
        }

        // CurriculumCourse (structure rows)
        if (structureRows.length > 0) {
          await CurriculumCourse.bulkCreate(
            structureRows
              .filter((r) => courseIdByCode.has(r.courseCode))
              .map((r) => ({
                curriculumId,
                courseId: courseIdByCode.get(r.courseCode),
                yearLevel: r.yearLevel,
                semester: r.semester,
                isElective: r.isElective,
              })),
            { transaction },
          );
        }

        // Prerequisites
        if (prereqRows.length > 0) {
          await Prerequisite.bulkCreate(
            prereqRows
              .filter(
                (r) => courseIdByCode.has(r.courseCode) && courseIdByCode.has(r.relatedCourseCode),
              )
              .map((r) => ({
                curriculumId,
                courseId: courseIdByCode.get(r.courseCode),
                prerequisiteCourseId: courseIdByCode.get(r.relatedCourseCode),
              })),
            { transaction },
          );
        }

        // Co-requisites
        if (coreqRows.length > 0) {
          await CoRequisite.bulkCreate(
            coreqRows
              .filter(
                (r) => courseIdByCode.has(r.courseCode) && courseIdByCode.has(r.relatedCourseCode),
              )
              .map((r) => ({
                curriculumId,
                courseId: courseIdByCode.get(r.courseCode),
                coRequisiteCourseId: courseIdByCode.get(r.relatedCourseCode),
              })),
            { transaction },
          );
        }

        // Elective tracks and their courses
        const trackByName = new Map();
        const trackNames = new Set(
          [
            ...trackHeaderRows.map((r) => r.trackName),
            ...trackCourseRows.map((r) => r.trackName),
          ].filter(Boolean),
        );

        for (const name of trackNames) {
          const header = trackHeaderRows.find((r) => r.trackName === name);
          const track = await ElectiveTrack.create(
            {
              curriculumId,
              name,
              description: header?.notes || null,
            },
            { transaction },
          );
          trackByName.set(name, track.id);
        }

        if (trackCourseRows.length > 0) {
          await ElectiveTrackCourse.bulkCreate(
            trackCourseRows
              .filter((r) => trackByName.has(r.trackName) && courseIdByCode.has(r.courseCode))
              .map((r) => ({
                electiveTrackId: trackByName.get(r.trackName),
                courseId: courseIdByCode.get(r.courseCode),
                yearLevel: r.yearLevel,
                semester: r.semester,
              })),
            { transaction },
          );
        }

        console.log(
          `[seed]   ${curriculumName}: ${structureRows.length} courses, ${prereqRows.length} prereqs, ${coreqRows.length} coreqs, ${trackNames.size} tracks`,
        );
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    const activeCurriculum = await Curriculum.findOne({
      where: { isActive: true },
      order: [['id', 'ASC']],
    });

    if (activeCurriculum) {
      await User.update(
        {
          curriculum_id: activeCurriculum.id,
          updatedAt: now,
        },
        { where: { email: 'student@tip.edu.ph' } },
      );
    }

    // ── 4. Summary ───────────────────────────────────────────────────────────
    const counts = {
      users: await User.count(),
      curriculums: await Curriculum.count(),
      courses: await Course.count(),
      curriculumCourses: await CurriculumCourse.count(),
      prerequisites: await Prerequisite.count(),
      corequisites: await CoRequisite.count(),
      electiveTracks: await ElectiveTrack.count(),
      electiveTrackCourses: await ElectiveTrackCourse.count(),
    };

    console.log('[seed] complete');
    console.log(JSON.stringify(counts, null, 2));

    await sequelize.close();
  } catch (error) {
    console.error('[seed] error:', error.message || error);
    try {
      await sequelize.close();
    } catch {
      /* ignore close error */
    }
    process.exit(1);
  }
})();
