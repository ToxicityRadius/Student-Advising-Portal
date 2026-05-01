/**
 * generate_import_csvs.js
 *
 * Reads the three raw curriculum CSV files and produces one import-ready CSV
 * per curriculum, matching the format expected by:
 *   POST /api/curriculums/:id/import/csv/preview
 *   POST /api/curriculums/:id/import/csv/apply
 *
 * Output: data/curriculum_import_ready/
 *   bs_cpe_curriculum_2018_import.csv
 *   bs_cpe_curriculum_2023_import.csv
 *   bs_cpe_curriculum_2025_import.csv
 *
 * Usage:
 *   node backend/scripts/generate_import_csvs.js
 *   npm run generate:import-csvs   (from backend/)
 *
 * NOTE: Leave curriculumId blank in the generated files.
 * The admin creates the curriculum first, then imports the file into it.
 * The import endpoint fills in curriculumId from its own URL parameter.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Paths ────────────────────────────────────────────────────────────────────

const rootDir = path.resolve(__dirname, '..', '..');
const outputDir = path.join(rootDir, 'data', 'curriculum_import_ready');

const CURRICULUM_DEFINITIONS = [
  {
    sourceFile: 'bs_cpe_curriculum_2018_full.csv',
    curriculumName: 'BS CPE Curriculum 2018',
    outputFile: 'bs_cpe_curriculum_2018_import.csv',
  },
  {
    sourceFile: 'bs_cpe_curriculum_2023_full.csv',
    curriculumName: 'BS CPE Curriculum 2023',
    outputFile: 'bs_cpe_curriculum_2023_import.csv',
  },
  {
    sourceFile: 'bs_cpe_curriculum_2025_full.csv',
    curriculumName: 'BS CPE Curriculum 2025',
    outputFile: 'bs_cpe_curriculum_2025_import.csv',
  },
];

// ─── Corequisite overrides ─────────────────────────────────────────────────────
// The source CSVs list these pairs in the "prerequisites" column, but they are
// actually taken concurrently (corequisites), not sequentially.
// Format: Map<courseCode, Set<relatedCode>>
const COREQUISITE_PAIRS = new Map([
  ['CPE 207A', new Set(['CPE 206'])],
  ['CPE 209', new Set(['CPE 206'])],
  ['CPE 331A', new Set(['CPE 203'])],
  ['CPE 331B', new Set(['CPE 203'])],
]);

const buildElectiveTrackDefaultPlacementMap = (placements) =>
  new Map(
    placements.map(([trackName, courseCode, yearLevel, semester]) => [
      `${trackName}|${courseCode}`,
      { yearLevel: String(yearLevel), semester: String(semester) },
    ]),
  );

const ELECTIVE_TRACK_DEFAULT_PLACEMENTS_BY_CURRICULUM = new Map([
  [
    'BS CPE Curriculum 2018',
    buildElectiveTrackDefaultPlacementMap([
      ['Cybersecurity', 'CPE 209', 2, 2],
      ['Cybersecurity', 'CPE 320', 3, 1],
      ['Cybersecurity', 'CPE 315', 3, 2],
      ['Data Science', 'COE 003', 2, 2],
      ['Data Science', 'COE 004', 3, 1],
      ['Data Science', 'COE 005', 3, 2],
      ['Railway Engineering', 'RWE 001', 2, 2],
      ['Railway Engineering', 'RWE 002A', 3, 1],
      ['Railway Engineering', 'RWE 003A', 3, 2],
      ['Robotics', 'CPE 331A', 2, 2],
      ['Robotics', 'CPE 332', 3, 1],
      ['Robotics', 'CPE 343', 3, 2],
      ['Systems Administration', 'CPE 207', 2, 2],
      ['Systems Administration', 'CPE 307', 3, 1],
      ['Systems Administration', 'CPE 312', 3, 2],
      ['Technopreneurship', 'TECH 102', 2, 2],
      ['Technopreneurship', 'TECH 103', 3, 1],
      ['Technopreneurship', 'TECH 104', 3, 2],
    ]),
  ],
  [
    'BS CPE Curriculum 2023',
    buildElectiveTrackDefaultPlacementMap([
      ['Cyber-Physical Systems', 'CPE 331B', 2, 2],
      ['Cyber-Physical Systems', 'CPE 332B', 3, 1],
      ['Cyber-Physical Systems', 'CPE 343C', 3, 2],
      ['Cybersecurity', 'CPE 209', 2, 2],
      ['Cybersecurity', 'CPE 320', 3, 1],
      ['Cybersecurity', 'CPE 315', 3, 2],
      ['Data Science', 'COE 003', 2, 2],
      ['Data Science', 'COE 004A', 3, 1],
      ['Data Science', 'COE 005A', 3, 2],
      ['Railway Engineering', 'RWE 001', 2, 2],
      ['Railway Engineering', 'RWE 002A', 3, 1],
      ['Railway Engineering', 'RWE 003A', 3, 2],
      ['Systems Administration', 'CPE 207A', 2, 2],
      ['Systems Administration', 'CPE 307B', 3, 1],
      ['Systems Administration', 'CPE 312B', 3, 2],
    ]),
  ],
  [
    'BS CPE Curriculum 2025',
    buildElectiveTrackDefaultPlacementMap([
      ['Cyber-Physical Systems', 'CPE 331B', 2, 2],
      ['Cyber-Physical Systems', 'CPE 332B', 3, 1],
      ['Cyber-Physical Systems', 'CPE 343C', 3, 2],
      ['Cybersecurity', 'CPE 209', 2, 2],
      ['Cybersecurity', 'CPE 320', 3, 1],
      ['Cybersecurity', 'CPE 315', 3, 2],
      ['Data Science', 'COE 003', 2, 2],
      ['Data Science', 'COE 004A', 3, 1],
      ['Data Science', 'COE 005A', 3, 2],
      ['Railway Engineering', 'RWE 001', 2, 2],
      ['Railway Engineering', 'RWE 002A', 3, 1],
      ['Railway Engineering', 'RWE 003A', 3, 2],
      ['Systems Administration', 'CPE 207A', 2, 2],
      ['Systems Administration', 'CPE 307B', 3, 1],
      ['Systems Administration', 'CPE 312B', 3, 2],
    ]),
  ],
]);

const getElectiveTrackDefaultPlacement = ({ curriculumName, trackName, courseCode }) => {
  const placements = ELECTIVE_TRACK_DEFAULT_PLACEMENTS_BY_CURRICULUM.get(curriculumName);
  return placements?.get(`${trackName}|${courseCode}`) || null;
};

// ─── Import CSV columns (must match CURRICULUM_CSV_COLUMNS in curriculumController.js) ─

const IMPORT_HEADERS = [
  'exportVersion',
  'rowType',
  'curriculumId',
  'curriculumName',
  'courseCode',
  'courseName',
  'lectureHours',
  'laboratoryHours',
  'units',
  'yearLevel',
  'semester',
  'isElective',
  'minYearStandingRequired',
  'relatedCourseCode',
  'trackName',
  'notes',
];

// ─── CSV helpers ──────────────────────────────────────────────────────────────

const escapeCsvValue = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Minimal RFC-4180-compliant CSV line parser.
 * Handles quoted fields (including embedded commas and doubled quotes).
 */
const parseCsvLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
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

const writeCsv = (filePath, rows) => {
  const lines = [IMPORT_HEADERS.join(',')];
  for (const row of rows) {
    lines.push(IMPORT_HEADERS.map((h) => escapeCsvValue(row[h] ?? '')).join(','));
  }
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
};

// ─── Source CSV helpers ───────────────────────────────────────────────────────

const normalizeCourseCode = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

/**
 * Tokens in the prerequisites column that represent standing requirements rather
 * than real course codes. The import system validates that relatedCourseCode
 * exists as a course record, so standing strings must be stripped out.
 */
const STANDING_PATTERN = /\b(?:\d+(?:ST|ND|RD|TH)\s+YEAR\s+STANDING|GRADUATING|GRADUATE)\b/i;

/**
 * Extracts the minimum year standing requirement from the prerequisites string.
 * Returns 1–5 (where 5 = graduating) or null if no standing requirement.
 */
const extractYearStanding = (value) => {
  if (!value) return null;
  const str = String(value).toUpperCase();
  if (/\bGRADUAT(?:ING|E)\b/.test(str)) return 5;
  const m = str.match(/\b(\d+)(?:ST|ND|RD|TH)\s+YEAR\s+STANDING\b/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 4) return n;
  }
  return null;
};

/**
 * Parses the prerequisites column: semicolon-separated list.
 * Filters out:
 *  - "See Track" placeholders (elective slots, not real prereqs)
 *  - Standing-based requirements (e.g. "3RD YEAR STANDING", "GRADUATING")
 */
const parsePrerequisiteTokens = (value) => {
  if (!value) return [];
  return String(value)
    .split(';')
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !/see\s*track/i.test(t))
    .filter((t) => !STANDING_PATTERN.test(t));
};

const parseSemester = (raw) => {
  const v = String(raw || '')
    .trim()
    .toLowerCase();
  if (v === '1') return 1;
  if (v === '2') return 2;
  if (v === '3' || v === 'summer') return 3;
  return null;
};

const parseYearLevel = (raw) => {
  const n = parseInt(String(raw || '').trim(), 10);
  return Number.isInteger(n) && n >= 1 && n <= 8 ? n : null;
};

// ─── Row builder ──────────────────────────────────────────────────────────────

const makeRow = (curriculumName, rowType, overrides = {}) => ({
  exportVersion: '1',
  rowType,
  curriculumId: '', // left blank — matched by URL param during import
  curriculumName,
  courseCode: '',
  courseName: '',
  lectureHours: '',
  laboratoryHours: '',
  units: '',
  yearLevel: '',
  semester: '',
  isElective: '',
  minYearStandingRequired: '',
  relatedCourseCode: '',
  trackName: '',
  notes: '',
  ...overrides,
});

// ─── Per-curriculum processing ────────────────────────────────────────────────

const processCurriculum = (def) => {
  const sourcePath = path.join(rootDir, def.sourceFile);

  if (!fs.existsSync(sourcePath)) {
    console.error(`[error] Source file not found: ${sourcePath}`);
    return null;
  }

  const raw = fs.readFileSync(sourcePath, 'utf8');
  const lines = raw
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .slice(1); // skip header row

  const structureRows = [];
  const prerequisiteRows = [];
  const corequisiteRows = [];
  const electiveTrackRows = [];
  const electiveTrackCourseRows = [];

  const seenTracks = new Set();
  const prereqDedup = new Set();

  // Track which course codes are placed as regular structure courses.
  // Only these courses (plus courses already in the DB) can be referenced
  // in prerequisite rows, because resolveCourseByCodeMap only creates courses
  // from structure rows. Elective-track-only courses would be "unknown".
  const structureCodes = new Set();

  // Also track elective-track-only course codes (for prereq pass 3).
  const electiveTrackCodes = new Set();

  // First pass: collect all rows, build structureCodes and raw track data
  const rawStructureRows = [];
  // Raw elective track courses keyed by courseCode — for pass 3
  const rawElectiveTrackCourses = [];

  for (const line of lines) {
    const cells = parseCsvLine(line);
    if (cells.length < 9) continue;

    const courseCode = normalizeCourseCode(cells[0]);
    const courseName = String(cells[1] || '').trim();
    const creditUnits = Number(cells[4]);
    const prerequisites = String(cells[5] || '').trim();
    const yearRaw = String(cells[6] || '')
      .trim()
      .toLowerCase();
    const semRaw = String(cells[7] || '')
      .trim()
      .toLowerCase();

    if (!courseCode || !courseName) continue;

    const isElectiveTrackRow = yearRaw === 'elective' && semRaw === 'track';

    // The track name lives in the 9th column (cells[8], the "category" column) for elective rows.
    // Some versions of the CSV also have a 10th column (cells[9]) — prefer that if present.
    const trackName = isElectiveTrackRow
      ? (cells.length >= 10 ? String(cells[9] || '').trim() : '') || String(cells[8] || '').trim()
      : '';

    if (isElectiveTrackRow) {
      // ── Elective track header (one per unique track name) ──
      if (trackName && !seenTracks.has(trackName)) {
        seenTracks.add(trackName);
        electiveTrackRows.push(
          makeRow(def.curriculumName, 'elective_track', {
            trackName,
          }),
        );
      }

      // ── Elective track course row ──
      electiveTrackCodes.add(courseCode);
      electiveTrackCourseRows.push(
        makeRow(def.curriculumName, 'elective_track_course', {
          courseCode,
          courseName,
          units: Number.isFinite(creditUnits) ? String(Math.round(creditUnits)) : '',
          ...getElectiveTrackDefaultPlacement({
            curriculumName: def.curriculumName,
            trackName,
            courseCode,
          }),
          trackName,
        }),
      );
      // Collect raw data for pass 3 (elective track course prereqs)
      rawElectiveTrackCourses.push({
        courseCode,
        courseName,
        creditUnits,
        prerequisites,
        trackName,
      });
    } else {
      // ── Regular curriculum placement (structure row) ──
      const yearLevel = parseYearLevel(yearRaw);
      const semester = parseSemester(semRaw);

      if (!yearLevel || !semester) continue;

      // CPEC/CPEE placeholder courses (elective slots) are marked isElective=true
      const isElective = /see\s*track/i.test(prerequisites) || /^CPE[CE]\b/i.test(courseCode);

      const minYearStandingRequired = isElective ? null : extractYearStanding(prerequisites);

      structureCodes.add(courseCode);
      structureRows.push(
        makeRow(def.curriculumName, 'structure', {
          courseCode,
          courseName,
          units: Number.isFinite(creditUnits) ? String(Math.round(creditUnits)) : '',
          yearLevel: String(yearLevel),
          semester: String(semester),
          isElective: isElective ? 'true' : 'false',
          minYearStandingRequired:
            minYearStandingRequired !== null ? String(minYearStandingRequired) : '',
        }),
      );

      if (!isElective) {
        rawStructureRows.push({ courseCode, courseName, creditUnits, prerequisites });
      }
    }
  }

  // Second pass: emit prerequisite/corequisite rows for structure courses.
  for (const { courseCode, courseName, creditUnits, prerequisites } of rawStructureRows) {
    for (const token of parsePrerequisiteTokens(prerequisites)) {
      const prereqCode = normalizeCourseCode(token);
      if (!prereqCode) continue;
      // relatedCourseCode must also be a structure course so it can be resolved
      if (!structureCodes.has(prereqCode)) continue;
      const key = `${courseCode}|${prereqCode}`;
      if (!prereqDedup.has(key)) {
        prereqDedup.add(key);
        const isCoreq = COREQUISITE_PAIRS.get(courseCode)?.has(prereqCode);
        const targetRows = isCoreq ? corequisiteRows : prerequisiteRows;
        targetRows.push(
          makeRow(def.curriculumName, isCoreq ? 'corequisite' : 'prerequisite', {
            courseCode,
            courseName,
            units: Number.isFinite(creditUnits) ? String(Math.round(creditUnits)) : '',
            relatedCourseCode: prereqCode,
          }),
        );
      }
    }
  }

  // Third pass: emit prerequisite/corequisite rows for elective track courses.
  // relatedCourseCode must exist in structureCodes OR electiveTrackCodes
  // (both will be created as Course records during import).
  const allKnownCodes = new Set([...structureCodes, ...electiveTrackCodes]);
  for (const { courseCode, courseName, creditUnits, prerequisites } of rawElectiveTrackCourses) {
    for (const token of parsePrerequisiteTokens(prerequisites)) {
      const prereqCode = normalizeCourseCode(token);
      if (!prereqCode) continue;
      if (!allKnownCodes.has(prereqCode)) continue;
      const key = `${courseCode}|${prereqCode}`;
      if (!prereqDedup.has(key)) {
        prereqDedup.add(key);
        const isCoreq = COREQUISITE_PAIRS.get(courseCode)?.has(prereqCode);
        const targetRows = isCoreq ? corequisiteRows : prerequisiteRows;
        targetRows.push(
          makeRow(def.curriculumName, isCoreq ? 'corequisite' : 'prerequisite', {
            courseCode,
            courseName,
            units: Number.isFinite(creditUnits) ? String(Math.round(creditUnits)) : '',
            relatedCourseCode: prereqCode,
          }),
        );
      }
    }
  }

  // ── Assemble final row order ──
  const allRows = [
    makeRow(def.curriculumName, 'metadata', {
      notes: `generatedAt=${Date.now()}`,
    }),
    ...structureRows,
    ...prerequisiteRows,
    ...corequisiteRows,
    ...electiveTrackRows,
    ...electiveTrackCourseRows,
  ];

  const outputPath = path.join(outputDir, def.outputFile);
  writeCsv(outputPath, allRows);

  return {
    file: def.outputFile,
    counts: {
      structure: structureRows.length,
      prerequisites: prerequisiteRows.length,
      corequisites: corequisiteRows.length,
      electiveTracks: electiveTrackRows.length,
      electiveTrackCourses: electiveTrackCourseRows.length,
      totalRows: allRows.length,
    },
  };
};

// ─── Main ─────────────────────────────────────────────────────────────────────

fs.mkdirSync(outputDir, { recursive: true });

const results = [];
for (const def of CURRICULUM_DEFINITIONS) {
  const result = processCurriculum(def);
  if (result) {
    results.push(result);
  }
}

console.log(
  JSON.stringify(
    {
      outputDir,
      note: 'curriculumId is intentionally blank — fill it by importing into an existing curriculum via the admin UI.',
      results,
    },
    null,
    2,
  ),
);
