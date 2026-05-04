'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const outputDir = path.join(rootDir, 'data', 'curriculum_import_ready');

const HEADERS = [
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

const TRACK_PLACEMENTS = {
  'Specialization 1': { year: 4, semester: 2 },
  'Specialization 2': { year: 5, semester: 1 },
  'Specialization 3': { year: 5, semester: 2 },
  'Design Economics and Cost Planning': { year: 4, semester: 2 },
  'Procurement and Tendering in Construction': { year: 5, semester: 1 },
  'Contract Practice and Administration Including Cost Reporting': { year: 5, semester: 2 },
};

const escapeCsvValue = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const row = (curriculumName, rowType, overrides = {}) => ({
  exportVersion: '1',
  rowType,
  curriculumId: '',
  curriculumName,
  courseCode: '',
  courseName: '',
  lectureHours: '',
  laboratoryHours: '',
  units: '',
  yearLevel: '',
  semester: '',
  isElective: 'false',
  minYearStandingRequired: '',
  relatedCourseCode: '',
  trackName: '',
  notes: '',
  ...overrides,
});

const course = (
  code,
  name,
  lecture,
  lab,
  units,
  year,
  semester,
  prerequisites = '',
  options = {},
) => ({
  code,
  name,
  lecture,
  lab,
  units,
  year,
  semester,
  prerequisites,
  isElective: options.isElective || false,
  notes: options.notes || '',
});

const trackCourse = (trackName, code, name, lecture, lab, units, prerequisites = '') => ({
  trackName,
  code,
  name,
  lecture,
  lab,
  units,
  prerequisites,
});

const normalizeCode = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

const parsePrerequisiteCodes = (value) => {
  if (!value) return [];
  const matches = String(value)
    .replace(/\(P\)/gi, ' ')
    .match(/\b(?:ARSC|CADD|SURV|NSTP|MATH|GEC|GEE|GEM|PE|QS|AR)\s*\d+[A-Z0-9]*\b/gi);
  return [...new Set((matches || []).map(normalizeCode))];
};

const makeRows = ({ curriculumName, courses, tracks, skippedPrerequisites = [] }) => {
  const outputRows = [
    row(curriculumName, 'metadata', {
      notes: `source=BSARCH PDF;generatedAt=${Date.now()}`,
    }),
  ];

  const structureCodes = new Set(courses.map((entry) => normalizeCode(entry.code)));
  const trackCodes = new Set(tracks.map((entry) => normalizeCode(entry.code)));
  const availableCodes = new Set([...structureCodes, ...trackCodes]);
  const prerequisiteRows = [];
  const seenPrerequisites = new Set();

  for (const entry of courses) {
    outputRows.push(
      row(curriculumName, 'structure', {
        courseCode: normalizeCode(entry.code),
        courseName: entry.name,
        lectureHours: entry.lecture,
        laboratoryHours: entry.lab,
        units: entry.units,
        yearLevel: entry.year,
        semester: entry.semester,
        isElective: entry.isElective ? 'true' : 'false',
        notes: entry.notes,
      }),
    );
  }

  const addPrerequisites = (entry) => {
    for (const relatedCode of parsePrerequisiteCodes(entry.prerequisites)) {
      const courseCode = normalizeCode(entry.code);
      if (!availableCodes.has(relatedCode)) {
        skippedPrerequisites.push(`${courseCode}->${relatedCode}`);
        continue;
      }
      const key = `${courseCode}|${relatedCode}`;
      if (seenPrerequisites.has(key)) continue;
      seenPrerequisites.add(key);
      prerequisiteRows.push(
        row(curriculumName, 'prerequisite', {
          courseCode,
          courseName: entry.name,
          units: entry.units,
          relatedCourseCode: relatedCode,
        }),
      );
    }
  };

  courses.forEach(addPrerequisites);

  const trackNames = [...new Set(tracks.map((entry) => entry.trackName))];
  for (const trackName of trackNames) {
    outputRows.push(row(curriculumName, 'elective_track', { trackName }));
  }

  for (const entry of tracks) {
    const placement =
      TRACK_PLACEMENTS[
        Object.keys(TRACK_PLACEMENTS).find((label) => entry.name.startsWith(label)) || entry.name
      ] || {};
    outputRows.push(
      row(curriculumName, 'elective_track_course', {
        courseCode: normalizeCode(entry.code),
        courseName: entry.name,
        lectureHours: entry.lecture,
        laboratoryHours: entry.lab,
        units: entry.units,
        yearLevel: placement.year || '',
        semester: placement.semester || '',
        isElective: 'true',
        trackName: entry.trackName,
      }),
    );
  }

  tracks.forEach(addPrerequisites);

  return [...outputRows, ...prerequisiteRows];
};

const writeCsv = (fileName, rows) => {
  const content = [HEADERS.join(',')]
    .concat(rows.map((entry) => HEADERS.map((header) => escapeCsvValue(entry[header])).join(',')))
    .join('\n');
  fs.writeFileSync(path.join(outputDir, fileName), `${content}\n`, 'utf8');
};

const validateCurriculum = ({ curriculumName, courses, expectedUnits }) => {
  const errors = [];
  const structureKeys = new Set();
  const terms = new Map();

  for (const entry of courses) {
    const key = normalizeCode(entry.code);
    if (structureKeys.has(key)) errors.push(`${curriculumName}: duplicate structure ${key}`);
    structureKeys.add(key);
    if (entry.year < 1 || entry.year > 5) errors.push(`${curriculumName}: invalid year for ${key}`);
    if (![1, 2].includes(entry.semester)) {
      errors.push(`${curriculumName}: invalid semester for ${key}`);
    }
    const termKey = `${entry.year}-${entry.semester}`;
    terms.set(termKey, (terms.get(termKey) || 0) + Number(entry.units));
  }

  for (let year = 1; year <= 5; year += 1) {
    for (const semester of [1, 2]) {
      const termKey = `${year}-${semester}`;
      if (!terms.has(termKey)) errors.push(`${curriculumName}: missing term ${termKey}`);
      if (expectedUnits[termKey] && terms.get(termKey) !== expectedUnits[termKey]) {
        errors.push(
          `${curriculumName}: ${termKey} has ${terms.get(termKey)} units, expected ${expectedUnits[termKey]}`,
        );
      }
    }
  }

  return { errors, terms: Object.fromEntries([...terms.entries()].sort()) };
};

const shared2023Tracks = [
  trackCourse(
    'Construction Management',
    'AR 492A',
    'Specialization 1: Principles of Construction Management, Planning and Scheduling',
    3,
    0,
    3,
    'AR 401',
  ),
  trackCourse(
    'Construction Management',
    'AR 591A',
    'Specialization 2: Cost Management',
    2,
    3,
    3,
    'AR 492A, ARSC 443',
  ),
  trackCourse(
    'Construction Management',
    'AR 592A',
    'Specialization 3: Construction Safety and Risk Management',
    2,
    3,
    3,
    'AR 591A',
  ),
  trackCourse(
    'Environmental Planning',
    'AR 492B',
    'Specialization 1: Introduction to Environmental Planning and the Planning Process',
    3,
    0,
    3,
    'AR 401',
  ),
  trackCourse(
    'Environmental Planning',
    'AR 591B',
    'Specialization 2: Urban Design Studio',
    2,
    3,
    3,
    'AR 492B, ARSC 443',
  ),
  trackCourse(
    'Environmental Planning',
    'AR 592B',
    'Specialization 3: Special Problems for Urban and Regional Planning',
    2,
    3,
    3,
    'AR 591B',
  ),
  trackCourse(
    'Heritage Conservation',
    'AR 492C',
    'Specialization 1: Introduction to Architectural Heritage Conservation',
    3,
    0,
    3,
    'AR 401',
  ),
  trackCourse(
    'Heritage Conservation',
    'AR 591C',
    'Specialization 2: Heritage Conservation Techniques and Materials',
    2,
    3,
    3,
    'AR 492C, ARSC 443',
  ),
  trackCourse(
    'Heritage Conservation',
    'AR 592C',
    'Specialization 3: Heritage Conservation Management Planning',
    2,
    3,
    3,
    'AR 591C',
  ),
  trackCourse(
    'Quantity Surveying',
    'QS 001',
    'Design Economics and Cost Planning',
    2,
    3,
    3,
    'AR 322, AR 401',
  ),
  trackCourse(
    'Quantity Surveying',
    'QS 003',
    'Procurement and Tendering in Construction',
    3,
    0,
    3,
    'QS 001, ARSC 443',
  ),
  trackCourse(
    'Quantity Surveying',
    'QS 004',
    'Contract Practice and Administration Including Cost Reporting',
    3,
    0,
    3,
    'QS 003',
  ),
];

const curriculums = [
  {
    curriculumName: 'BSARCH Curriculum 2023',
    outputFile: 'bs_arch_curriculum_2023_import.csv',
    expectedUnits: {
      '1-1': 24,
      '1-2': 26,
      '2-1': 25,
      '2-2': 25,
      '3-1': 24,
      '3-2': 23,
      '4-1': 23,
      '4-2': 23,
      '5-1': 16,
      '5-2': 13,
    },
    courses: [
      course('GEC 004', 'Mathematics in the Modern World', 3, 0, 3, 1, 1),
      course('GEE 001B', 'GE Elective 1 - Gender and Society', 3, 0, 3, 1, 1),
      course('GEC 006', 'Art Appreciation', 3, 0, 3, 1, 1),
      course('AR 101', 'Architectural Design 1', 1, 3, 2, 1, 1),
      course('AR 111', 'Theory of Architecture 1', 2, 3, 3, 1, 1),
      course('AR 131', 'Architectural Visual Communication 1', 1, 6, 3, 1, 1),
      course('AR 132', 'Architectural Visual Communication 2', 1, 3, 2, 1, 1),
      course('PE 001', 'Physical Activities Toward Health & Fitness 1 (PATHFit 1)', 2, 0, 2, 1, 1),
      course('NSTP 001', 'National Service Training Program 1', 3, 0, 3, 1, 1),
      course('MATH 016', 'Solid Mensuration', 2, 0, 2, 1, 2),
      course('GEE 002B', 'GE Elective 2 - Living in the IT Era', 3, 0, 3, 1, 2, 'GEE 001B'),
      course('AR 102', 'Architectural Design 2', 1, 3, 2, 1, 2, 'AR 101, AR 111'),
      course('AR 112', 'Theory of Architecture 2', 2, 3, 3, 1, 2, 'AR 111'),
      course('AR 114', 'History of Architecture 1', 3, 0, 3, 1, 2),
      course('AR 113', 'Architectural Interiors', 2, 3, 3, 1, 2, 'AR 111'),
      course('AR 135', 'Architectural Visual Communication 3', 1, 6, 3, 1, 2, 'AR 131'),
      course('AR 134', 'Architectural Visual Communication 4', 1, 3, 2, 1, 2, 'AR 132'),
      course(
        'PE 002',
        'Physical Activities Toward Health & Fitness 2 (PATHFit 2)',
        2,
        0,
        2,
        1,
        2,
        'PE 001',
      ),
      course('NSTP 002', 'National Service Training Program 2', 3, 0, 3, 1, 2, 'NSTP 001'),
      course('MATH 020', 'Differential and Integral Calculus', 3, 0, 3, 2, 1),
      course('GEE 007', 'GE Elective 3 - Indigenous Creative Crafts', 3, 0, 3, 2, 1, 'GEE 002B'),
      course('GEC 001', 'Understanding the Self', 3, 0, 3, 2, 1),
      course('AR 201', 'Architectural Design 3', 1, 6, 3, 2, 1, 'AR 102, AR 112, AR 113'),
      course('AR 221', 'Building Technology 1', 3, 0, 3, 2, 1, 'AR 102'),
      course('AR 225', 'Building Utilities 1', 2, 3, 3, 2, 1, 'AR 102'),
      course('AR 211', 'History of Architecture 2', 3, 0, 3, 2, 1, 'AR 114'),
      course('AR 235', 'Architectural Visual Communication 5', 1, 3, 2, 2, 1, 'AR 134'),
      course(
        'PE 003',
        'Physical Activities Toward Health & Fitness 3 (PATHFit 3)',
        2,
        0,
        2,
        2,
        1,
        'PE 002',
      ),
      course('GEC 002', 'Readings in Philippine History', 3, 0, 3, 2, 2),
      course('AR 202', 'Architectural Design 4', 1, 6, 3, 2, 2, 'AR 201, AR 221'),
      course('AR 222', 'Building Technology 2', 2, 3, 3, 2, 2, 'AR 221, AR 225'),
      course('AR 203', 'Tropical Design', 2, 0, 2, 2, 2, 'AR 201'),
      course('AR 212', 'History of Architecture 3', 3, 0, 3, 2, 2, 'AR 211'),
      course('AR 226', 'Building Utilities 2', 2, 3, 3, 2, 2, 'AR 225'),
      course('ARSC 223', 'Statics of Rigid Bodies', 3, 0, 3, 2, 2),
      course('SURV 002F1', 'Surveying', 2, 3, 3, 2, 2, 'MATH 016'),
      course(
        'PE 004',
        'Physical Activities Toward Health & Fitness 4 (PATHFit 4)',
        2,
        0,
        2,
        2,
        2,
        'PE 003',
      ),
      course('GEC 005', 'Purposive Communication', 3, 0, 3, 3, 1),
      course('GEC 003', 'The Contemporary World', 3, 0, 3, 3, 1),
      course('AR 301', 'Architectural Design 5', 1, 9, 4, 3, 1, 'AR 202, AR 222, AR 225'),
      course('AR 321', 'Building Technology 3', 2, 3, 3, 3, 1, 'AR 222, AR 226'),
      course('AR 311', 'History of Architecture 4', 3, 0, 3, 3, 1, 'AR 212'),
      course('AR 341', 'Professional Practice 1', 3, 0, 3, 3, 1, 'AR 202'),
      course(
        'CADD 331',
        'Computer-Aided Design and Drafting for Architecture 1',
        1,
        3,
        2,
        3,
        1,
        'AR 222, AR 235',
      ),
      course('ARSC 313', 'Strength of Materials', 3, 0, 3, 3, 1, 'ARSC 223'),
      course('GEC 008', 'Ethics', 3, 0, 3, 3, 2),
      course('AR 302', 'Architectural Design 6', 1, 9, 4, 3, 2, 'AR 301, AR 321, AR 341'),
      course('AR 322', 'Building Technology 4', 2, 3, 3, 3, 2, 'AR 321'),
      course('AR 324', 'Building Utilities 3', 2, 3, 3, 3, 2, 'AR 226'),
      course('AR 351', 'Planning 1', 3, 0, 3, 3, 2, 'AR 203, SURV 002F1'),
      course(
        'CADD 332',
        'Computer-Aided Design and Drafting for Architecture 2',
        1,
        3,
        2,
        3,
        2,
        'CADD 331',
      ),
      course(
        'AR 312',
        'Field Trips and Seminars for Architecture',
        2,
        0,
        2,
        3,
        2,
        'AR 212, AR 221',
      ),
      course('ARSC 323', 'Theory of Structures', 3, 0, 3, 3, 2, 'ARSC 313'),
      course('GEC 007', 'Science, Technology and Society', 3, 0, 3, 4, 1),
      course('AR 401', 'Architectural Design 7', 1, 12, 5, 4, 1, 'AR 302, AR 322, AR 351'),
      course('AR 441', 'Professional Practice 2', 3, 0, 3, 4, 1, 'AR 341'),
      course('AR 451', 'Planning 2', 3, 0, 3, 4, 1, 'AR 351'),
      course('AR 491', 'Research Methods for Architecture', 3, 0, 3, 4, 1, 'AR 202'),
      course('AR 421', 'Building Technology 5', 2, 3, 3, 4, 1, 'AR 321'),
      course('ARSC 433', 'Steel and Timber Design', 3, 0, 3, 4, 1, 'ARSC 323'),
      course('GEM 001', 'Life and Works of Rizal', 3, 0, 3, 4, 2),
      course('AR 402', 'Architectural Design 8', 1, 12, 5, 4, 2, 'AR 401, AR 451, ARSC 323'),
      course('AR 442', 'Professional Practice 3', 3, 0, 3, 4, 2, 'AR 441'),
      course('AR 452', 'Planning 3', 3, 0, 3, 4, 2, 'AR 451'),
      course('AR 492', 'Specialization 1', 3, 0, 3, 4, 2, 'AR 401', { isElective: true }),
      course(
        'AR 495',
        'Integration Course for Architecture 1',
        2,
        3,
        3,
        4,
        2,
        'AR 401, AR 441, AR 451, AR 421',
      ),
      course('ARSC 443', 'Architectural Structures', 3, 0, 3, 4, 2, 'ARSC 433'),
      course('AR 501', 'Architectural Design 9', 1, 12, 5, 5, 1, 'AR 402, AR 491'),
      course('AR 551', 'Housing', 2, 0, 2, 5, 1, 'AR 451'),
      course(
        'AR 541',
        'Business Management and Application for Architecture 1',
        3,
        0,
        3,
        5,
        1,
        'AR 442',
      ),
      course('AR 591', 'Specialization 2', 2, 3, 3, 5, 1, 'AR 492, ARSC 443', { isElective: true }),
      course(
        'AR 595',
        'Integration Course for Architecture 2',
        2,
        3,
        3,
        5,
        1,
        'AR 495, AR 402, AR 442, AR 452, ARSC 443',
      ),
      course('AR 502', 'Architectural Design 10', 1, 12, 5, 5, 2, 'AR 501'),
      course(
        'AR 542',
        'Business Management and Application for Architecture 2',
        3,
        0,
        3,
        5,
        2,
        'AR 541',
      ),
      course('AR 592', 'Specialization 3', 2, 3, 3, 5, 2, 'AR 591', { isElective: true }),
      course(
        'AR 596',
        'Architectural Internship (200 hours)',
        0,
        6,
        2,
        5,
        2,
        'AR 402, AR 421, CADD 332',
      ),
    ],
    tracks: shared2023Tracks,
  },
  {
    curriculumName: 'BSARCH Curriculum 2018',
    outputFile: 'bs_arch_curriculum_2018_import.csv',
    expectedUnits: {
      '1-1': 24,
      '1-2': 26,
      '2-1': 25,
      '2-2': 25,
      '3-1': 26,
      '3-2': 24,
      '4-1': 22,
      '4-2': 26,
      '5-1': 13,
      '5-2': 11,
    },
    courses: [
      course('GEC 004', 'Mathematics in the Modern World', 3, 0, 3, 1, 1),
      course('GEE 001B', 'GE Elective 1 - Gender and Society', 3, 0, 3, 1, 1),
      course('GEC 006', 'Art Appreciation', 3, 0, 3, 1, 1),
      course('AR 101', 'Architectural Design 1', 1, 3, 2, 1, 1),
      course('AR 111', 'Theory of Architecture 1', 2, 3, 3, 1, 1),
      course('AR 131', 'Architectural Visual Communication 1', 1, 6, 3, 1, 1),
      course('AR 132', 'Architectural Visual Communication 2', 1, 3, 2, 1, 1),
      course('PE 101', 'Physical Education 1', 2, 0, 2, 1, 1),
      course('NSTP 001', 'National Service Training Program 1', 3, 0, 3, 1, 1),
      course('MATH 016', 'Solid Mensuration', 2, 0, 2, 1, 2),
      course('GEE 002B', 'GE Elective 2 - Living in the IT Era', 3, 0, 3, 1, 2, 'GEE 001B'),
      course('AR 102', 'Architectural Design 2', 1, 3, 2, 1, 2, 'AR 101, AR 111'),
      course('AR 112', 'Theory of Architecture 2', 2, 3, 3, 1, 2, 'AR 111'),
      course('AR 114', 'History of Architecture 1', 3, 0, 3, 1, 2, 'AR 101'),
      course('AR 113', 'Architectural Interiors', 2, 3, 3, 1, 2, 'AR 111'),
      course('AR 135', 'Architectural Visual Communication 3', 1, 6, 3, 1, 2, 'AR 131'),
      course('AR 134', 'Architectural Visual Communication 4', 1, 3, 2, 1, 2, 'AR 132'),
      course('PE 102', 'Physical Education 2', 2, 0, 2, 1, 2, 'PE 101'),
      course('NSTP 002', 'National Service Training Program 2', 3, 0, 3, 1, 2, 'NSTP 001'),
      course('MATH 020', 'Differential and Integral Calculus', 3, 0, 3, 2, 1),
      course('GEE 007', 'GE Elective 3 - Indigenous Creative Crafts', 3, 0, 3, 2, 1, 'GEE 002B'),
      course('GEC 001', 'Understanding the Self', 3, 0, 3, 2, 1),
      course('AR 201', 'Architectural Design 3', 1, 6, 3, 2, 1, 'AR 102, AR 112, AR 113'),
      course('AR 221', 'Building Technology 1', 3, 0, 3, 2, 1, 'AR 102'),
      course('AR 225', 'Building Utilities 1', 2, 3, 3, 2, 1, 'AR 102'),
      course('AR 211', 'History of Architecture 2', 3, 0, 3, 2, 1, 'AR 114'),
      course('AR 235', 'Architectural Visual Communication 5', 1, 3, 2, 2, 1, 'AR 134'),
      course('PE 201', 'Physical Education 3', 2, 0, 2, 2, 1, 'PE 102'),
      course('GEC 002', 'Readings in Philippine History', 3, 0, 3, 2, 2),
      course('AR 202', 'Architectural Design 4', 1, 6, 3, 2, 2, 'AR 201, AR 221'),
      course('AR 222', 'Building Technology 2', 2, 3, 3, 2, 2, 'AR 221, AR 225'),
      course('AR 203', 'Tropical Design', 2, 0, 2, 2, 2, 'AR 201'),
      course('AR 212', 'History of Architecture 3', 3, 0, 3, 2, 2, 'AR 211'),
      course('AR 226', 'Building Utilities 2', 2, 3, 3, 2, 2, 'AR 225'),
      course('ARSC 223', 'Statics of Rigid Bodies', 3, 0, 3, 2, 2),
      course('SURV 002F1', 'Surveying', 2, 3, 3, 2, 2, 'MATH 016'),
      course('PE 202', 'Physical Education 4', 2, 0, 2, 2, 2, 'PE 201'),
      course('GEC 005', 'Purposive Communication', 3, 0, 3, 3, 1),
      course('GEC 003', 'The Contemporary World', 3, 0, 3, 3, 1),
      course('AR 301', 'Architectural Design 5', 1, 9, 4, 3, 1, 'AR 202, AR 222, AR 225'),
      course('AR 321', 'Building Technology 3', 2, 3, 3, 3, 1, 'AR 222, AR 226'),
      course(
        'AR 312',
        'Field Trips and Seminars for Architecture',
        2,
        0,
        2,
        3,
        1,
        'AR 212, AR 221',
      ),
      course('AR 311', 'History of Architecture 4', 3, 0, 3, 3, 1, 'AR 212'),
      course('AR 341', 'Professional Practice 1', 3, 0, 3, 3, 1, 'AR 202'),
      course(
        'CADD 331',
        'Computer-Aided Design and Drafting for Architecture 1',
        1,
        3,
        2,
        3,
        1,
        'AR 222, AR 235',
      ),
      course('ARSC 313', 'Strength of Materials', 3, 0, 3, 3, 1, 'ARSC 223'),
      course('GEC 008', 'Ethics', 3, 0, 3, 3, 2),
      course('AR 302', 'Architectural Design 6', 1, 9, 4, 3, 2, 'AR 301, AR 321, AR 341'),
      course('AR 322', 'Building Technology 4', 2, 3, 3, 3, 2, 'AR 321'),
      course('AR 324', 'Building Utilities 3', 2, 3, 3, 3, 2, 'AR 226'),
      course('AR 351', 'Planning 1', 3, 0, 3, 3, 2, 'AR 203, SURV 002F1'),
      course(
        'CADD 332',
        'Computer-Aided Design and Drafting for Architecture 2',
        1,
        3,
        2,
        3,
        2,
        'CADD 331',
      ),
      course(
        'AR 390',
        'Integration Course for Architecture 1',
        2,
        3,
        3,
        3,
        2,
        'AR 112, AR 113, AR 301, AR 311, AR 341',
      ),
      course('ARSC 323', 'Theory of Structures', 3, 0, 3, 3, 2, 'ARSC 313'),
      course('GEC 007', 'Science, Technology and Society', 3, 0, 3, 4, 1),
      course('AR 401', 'Architectural Design 7', 1, 12, 5, 4, 1, 'AR 302, AR 322, AR 351, AR 390'),
      course('AR 441', 'Professional Practice 2', 3, 0, 3, 4, 1, 'AR 341'),
      course('AR 451', 'Planning 2', 3, 0, 3, 4, 1, 'AR 351'),
      course('AR 421', 'Building Technology 5', 2, 3, 3, 4, 1, 'AR 321'),
      course(
        'AR 493',
        'Architectural Internship (200 hours)',
        0,
        6,
        2,
        4,
        1,
        'AR 302, AR 322, CADD 332',
      ),
      course('ARSC 433', 'Steel and Timber Design', 3, 0, 3, 4, 1, 'ARSC 323'),
      course('GEM 001', 'Life and Works of Rizal', 3, 0, 3, 4, 2),
      course('AR 402', 'Architectural Design 8', 1, 12, 5, 4, 2, 'AR 401, AR 451, ARSC 323'),
      course('AR 491', 'Research Methods for Architecture', 3, 0, 3, 4, 2, 'AR 202'),
      course('AR 442', 'Professional Practice 3', 3, 0, 3, 4, 2, 'AR 441'),
      course('AR 452', 'Planning 3', 3, 0, 3, 4, 2, 'AR 451'),
      course('AR 492', 'Specialization 1', 3, 0, 3, 4, 2, 'AR 401', { isElective: true }),
      course(
        'AR 490',
        'Integration Course for Architecture 2',
        2,
        3,
        3,
        4,
        2,
        'AR 324, AR 390, AR 421, AR 441',
      ),
      course('ARSC 443', 'Architectural Structures', 3, 0, 3, 4, 2, 'ARSC 433'),
      course('AR 501', 'Architectural Design 9', 1, 12, 5, 5, 1, 'AR 402, AR 490, AR 491, AR 493'),
      course('AR 551', 'Housing', 2, 0, 2, 5, 1, 'AR 451'),
      course(
        'AR 541',
        'Business Management and Application for Architecture 1',
        3,
        0,
        3,
        5,
        1,
        'AR 442',
      ),
      course('AR 591', 'Specialization 2', 2, 3, 3, 5, 1, 'AR 492, ARSC 443', { isElective: true }),
      course('AR 502', 'Architectural Design 10', 1, 12, 5, 5, 2, 'AR 501'),
      course(
        'AR 542',
        'Business Management and Application for Architecture 2',
        3,
        0,
        3,
        5,
        2,
        'AR 541',
      ),
      course('AR 592', 'Specialization 3', 2, 3, 3, 5, 2, 'AR 591', { isElective: true }),
    ],
    tracks: [
      ...shared2023Tracks.slice(0, 9).map((entry) => ({ ...entry, prerequisites: '' })),
      trackCourse(
        'Quantity Surveying',
        'QS 001',
        'Design Economics and Cost Planning',
        2,
        3,
        3,
        'AR 322, AR 401',
      ),
      trackCourse(
        'Quantity Surveying',
        'QS 003',
        'Procurement and Tendering in Construction',
        3,
        0,
        3,
        'QS 002, ARSC 443',
      ),
      trackCourse(
        'Quantity Surveying',
        'QS 004',
        'Contract Practice and Administration Including Cost Reporting',
        3,
        0,
        3,
        'QS 003',
      ),
    ],
  },
];

fs.mkdirSync(outputDir, { recursive: true });

const results = [];
let hasErrors = false;

for (const curriculum of curriculums) {
  const skippedPrerequisites = [];
  const rows = makeRows({ ...curriculum, skippedPrerequisites });
  writeCsv(curriculum.outputFile, rows);
  const validation = validateCurriculum(curriculum);
  if (validation.errors.length > 0) hasErrors = true;
  results.push({
    curriculumName: curriculum.curriculumName,
    outputFile: path.join(outputDir, curriculum.outputFile),
    structureCourses: curriculum.courses.length,
    electiveTracks: new Set(curriculum.tracks.map((entry) => entry.trackName)).size,
    electiveTrackCourses: curriculum.tracks.length,
    rows: rows.length,
    termUnits: validation.terms,
    validationErrors: validation.errors,
    skippedUnavailablePrerequisites: [...new Set(skippedPrerequisites)].sort(),
  });
}

console.log(JSON.stringify({ outputDir, results }, null, 2));
if (hasErrors) process.exitCode = 1;
