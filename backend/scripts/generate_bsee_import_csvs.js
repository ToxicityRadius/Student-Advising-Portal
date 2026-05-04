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

const ELECTIVE_PLACEMENTS = [
  { year: 3, semester: 1 },
  { year: 3, semester: 2 },
  { year: 4, semester: 1 },
];

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
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase();

const extractStanding = (value) => {
  const text = String(value || '').toUpperCase();
  if (/\bGRADUATING\b/.test(text)) return 5;
  const match = text.match(/\b([1-4])(?:ST|ND|RD|TH)\s+YEAR\s+STANDING\b/);
  return match ? Number(match[1]) : null;
};

const parseRequisites = (value) => {
  const text = String(value || '');
  if (!text || /see\s+track/i.test(text)) return [];
  const pattern =
    /\b(CHM|MATH|EE|PE|NSTP|PHYS|GEC|GEE|CE|ME|CPE|ECE|IE|GEM|TECH|BOSH|PSE|PSA|PWE|RWE|CADD)\s*(\d+[A-Z0-9]*)\s*(?:\((P|C)\))?/gi;
  const result = [];
  const seen = new Set();
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const code = normalizeCode(`${match[1]} ${match[2]}`);
    const type = String(match[3] || 'P').toUpperCase() === 'C' ? 'corequisite' : 'prerequisite';
    const key = `${type}|${code}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ code, type });
    }
  }
  return result;
};

const writeCsv = (fileName, rows) => {
  const content = [HEADERS.join(',')]
    .concat(rows.map((entry) => HEADERS.map((header) => escapeCsvValue(entry[header])).join(',')))
    .join('\n');
  fs.writeFileSync(path.join(outputDir, fileName), `${content}\n`, 'utf8');
};

const makeRows = ({ curriculumName, courses, tracks, skippedUnavailableRequisites }) => {
  const structureCodes = new Set(courses.map((entry) => normalizeCode(entry.code)));
  const trackCodes = new Set(tracks.map((entry) => normalizeCode(entry.code)));
  const availableCodes = new Set([...structureCodes, ...trackCodes]);
  const relationRows = [];
  const seenRelations = new Set();
  const outputRows = [
    row(curriculumName, 'metadata', { notes: `source=BSEE PDF;generatedAt=${Date.now()}` }),
  ];

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
        minYearStandingRequired: extractStanding(entry.prerequisites) || '',
      }),
    );
  }

  for (const trackName of [...new Set(tracks.map((entry) => entry.trackName))]) {
    outputRows.push(row(curriculumName, 'elective_track', { trackName }));
  }

  const trackSequenceByName = new Map();
  for (const entry of tracks) {
    const index = trackSequenceByName.get(entry.trackName) || 0;
    trackSequenceByName.set(entry.trackName, index + 1);
    const placement = ELECTIVE_PLACEMENTS[index] || {};
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

  const addRelations = (entry) => {
    const courseCode = normalizeCode(entry.code);
    for (const requisite of parseRequisites(entry.prerequisites)) {
      if (!availableCodes.has(requisite.code)) {
        skippedUnavailableRequisites.push(`${courseCode}->${requisite.code}`);
        continue;
      }
      const key = `${requisite.type}|${courseCode}|${requisite.code}`;
      if (seenRelations.has(key)) continue;
      seenRelations.add(key);
      relationRows.push(
        row(curriculumName, requisite.type, {
          courseCode,
          courseName: entry.name,
          units: entry.units,
          relatedCourseCode: requisite.code,
        }),
      );
    }
  };

  courses.forEach(addRelations);
  tracks.forEach(addRelations);

  return [...outputRows, ...relationRows];
};

const validateCurriculum = ({ curriculumName, courses, expectedUnits }) => {
  const errors = [];
  const codes = new Set();
  const terms = new Map();

  for (const entry of courses) {
    const code = normalizeCode(entry.code);
    if (codes.has(code)) errors.push(`${curriculumName}: duplicate structure ${code}`);
    codes.add(code);
    if (entry.year < 1 || entry.year > 5)
      errors.push(`${curriculumName}: invalid year for ${code}`);
    if (![1, 2, 3].includes(entry.semester)) {
      errors.push(`${curriculumName}: invalid semester for ${code}`);
    }
    const termKey = `${entry.year}-${entry.semester}`;
    terms.set(termKey, (terms.get(termKey) || 0) + Number(entry.units));
  }

  for (const [termKey, expected] of Object.entries(expectedUnits)) {
    if (terms.get(termKey) !== expected) {
      errors.push(
        `${curriculumName}: ${termKey} has ${terms.get(termKey) || 0} units, expected ${expected}`,
      );
    }
  }

  return { errors, terms: Object.fromEntries([...terms.entries()].sort()) };
};

const tracks2023 = [
  trackCourse(
    'Power System Economics',
    'PSE 420',
    'Power System Reliability and Planning',
    3,
    0,
    3,
    'MATH 027C (P), EE 202 (P)',
  ),
  trackCourse(
    'Power System Economics',
    'PSE 421',
    'Power Quality and Demand Side Management',
    3,
    0,
    3,
    'PSE 420 (P)',
  ),
  trackCourse(
    'Power System Economics',
    'PSE 422',
    'Power System Market Operation',
    3,
    0,
    3,
    'PSE 421 (P)',
  ),
  trackCourse(
    'Power System Automation and Renewable Energy',
    'PSA 422',
    'Renewable Energy Systems Integration',
    3,
    0,
    3,
    'EE 304 (C)',
  ),
  trackCourse(
    'Power System Automation and Renewable Energy',
    'PSA 423',
    'Smart Grid Application in Power System',
    3,
    0,
    3,
    'PSA 422 (P)',
  ),
  trackCourse(
    'Power System Automation and Renewable Energy',
    'PSA 424',
    'Advanced Automation in Distribution System',
    3,
    0,
    3,
    'PSA 423 (P)',
  ),
  trackCourse(
    'Railway Engineering',
    'RWE 001',
    'Introduction to Railway Systems and Engineering',
    3,
    0,
    3,
  ),
  trackCourse(
    'Railway Engineering',
    'RWE 002A',
    'Railway Management and Governance and Operations',
    3,
    0,
    3,
    'RWE 001 (P)',
  ),
  trackCourse(
    'Railway Engineering',
    'RWE 003',
    'Railway Power System and Protection',
    3,
    0,
    3,
    'RWE 002A (P)',
  ),
];

const curriculums = [
  {
    curriculumName: 'BSEE Curriculum 2023',
    outputFile: 'bs_ee_curriculum_2023_import.csv',
    expectedUnits: {
      '1-1': 20,
      '1-2': 22,
      '2-1': 28,
      '2-2': 28,
      '3-1': 26,
      '3-2': 26,
      '3-3': 9,
      '4-1': 27,
      '4-2': 17,
    },
    courses: [
      course('CHM 001', 'Chemistry for Engineers', 3, 3, 4, 1, 1),
      course('MATH 141', 'Calculus 1', 4, 0, 4, 1, 1),
      course('MATH 025', 'Discrete Mathematics', 3, 0, 3, 1, 1),
      course('EE 111', 'Introduction to Electrical Engineering', 1, 0, 1, 1, 1),
      course('MATH 131', 'Engineering Mathematics', 3, 0, 3, 1, 1),
      course(
        'PE 001',
        'Physical Activities Toward Health and Fitness 1 (PATHFit 1)',
        2,
        0,
        2,
        1,
        1,
      ),
      course('NSTP 001', 'National Service Training Program 1', 3, 0, 3, 1, 1),
      course('PHYS 111', 'Calculus-Based Physics', 3, 3, 4, 1, 2, 'MATH 141 (P)'),
      course('MATH 242', 'Calculus 2', 4, 0, 4, 1, 2, 'MATH 141 (P), MATH 131 (P)'),
      course('GEC 004', 'Mathematics in the Modern World', 3, 0, 3, 1, 2),
      course('CHM 008', 'Environmental Science and Engineering', 3, 0, 3, 1, 2),
      course('GEE 001B', 'GE Elective 1 - Gender and Society', 3, 0, 3, 1, 2),
      course(
        'PE 002',
        'Physical Activities Toward Health and Fitness 2 (PATHFit 2)',
        2,
        0,
        2,
        1,
        2,
        'PE 001 (P)',
      ),
      course('NSTP 002', 'National Service Training Program 2', 3, 0, 3, 1, 2, 'NSTP 001 (P)'),
      course('EE 200', 'Electrical Circuits 1', 3, 3, 4, 2, 1, 'PHYS 111 (P)'),
      course('MATH 021', 'Differential Equations', 3, 0, 3, 2, 1, 'MATH 242 (P)'),
      course('GEC 003', 'The Contemporary World', 3, 0, 3, 2, 1),
      course('CE 201B', 'Engineering Mechanics', 3, 0, 3, 2, 1, 'PHYS 111 (P)'),
      course('GEE 003C', 'GE Elective 3 - Entrepreneurial Mind', 3, 0, 3, 2, 1),
      course('ME 201A', 'Thermodynamics', 3, 0, 3, 2, 1, 'CHM 001 (P), PHYS 111 (P)'),
      course('GEE 002B', 'G.E. Elective 2 - Living in the IT Era', 3, 0, 3, 2, 1),
      course(
        'PE 003',
        'Physical Activities Toward Health and Fitness 3 (PATHFit 3)',
        2,
        0,
        2,
        2,
        1,
        'PE 002 (P)',
      ),
      course(
        'MATH 022B',
        'Linear Algebra with MATLAB',
        2,
        3,
        3,
        2,
        1,
        'MATH 242 (P), MATH 025 (P)',
      ),
      course('CPE 102A', 'Computer Programming', 0, 3, 1, 2, 1),
      course('EE 202', 'Electrical Circuits 2', 3, 3, 4, 2, 2, 'EE 200 (P), MATH 021 (P)'),
      course('EE 201', 'Electromagnetics for EE', 3, 0, 2, 2, 2, 'EE 200 (P)'),
      course(
        'MATH 024D',
        'Engineering Mathematics for EE',
        3,
        0,
        3,
        2,
        2,
        'CPE 102A (P), MATH 021 (P), MATH 022B (P)',
      ),
      course('ECE 200A', 'Electronic Circuits: Devices and Analysis', 3, 3, 4, 2, 2, 'EE 200 (P)'),
      course('CE 205A', 'Fundamentals of Deformable Bodies', 2, 0, 2, 2, 2, 'CE 201B (P)'),
      course('CE 309A', 'Fluid Mechanics', 2, 0, 2, 2, 2, 'PHYS 111 (P)'),
      course('GEC 008', 'Ethics', 3, 0, 3, 2, 2),
      course('MATH 026A', 'Numerical Methods and Analysis', 2, 3, 3, 2, 2, 'MATH 022B (P)'),
      course('MATH 027C', 'Engineering Data Analysis 1', 3, 0, 3, 2, 2, 'MATH 141 (P)'),
      course(
        'PE 004',
        'Physical Activities Toward Health and Fitness 4 (PATHFit 4)',
        2,
        0,
        2,
        2,
        2,
        'PE 003 (P)',
      ),
      course('EE 304', 'Electrical Machines 1', 2, 0, 2, 3, 1, 'EE 202 (P), EE 201 (P)'),
      course('EE 340', 'Industrial Power Electronics', 3, 3, 4, 3, 1, 'ECE 200A (P), EE 202 (P)'),
      course('CPE 203', 'Logic Circuits and Switching Theory', 3, 3, 4, 3, 1, 'ECE 200A (P)'),
      course('ME 304', 'Engineering Economics', 3, 0, 3, 3, 1, 'MATH 027C (P)'),
      course('IE 321', 'Engineering Data Analysis 2', 0, 3, 1, 3, 1, 'MATH 027C (P)'),
      course('CHM 007', 'Materials Science and Engineering', 3, 0, 3, 3, 1, 'CHM 001 (P)'),
      course('GEM 001', 'Life and Works of Rizal', 3, 0, 3, 3, 1),
      course('GEC 002', 'Readings in Philippine History', 3, 0, 3, 3, 1),
      course('EE ELEC 1', 'EE Elective 1', 3, 0, 3, 3, 1, 'See track for pre-requisite(s)', {
        isElective: true,
      }),
      course(
        'EE 310',
        'Control Systems Analysis',
        2,
        0,
        2,
        3,
        2,
        'EE 202 (P), MATH 024D (P), MATH 026A (P)',
      ),
      course('EE 303', 'Integration Course in Mathematics', 2, 0, 2, 3, 2, 'MATH 024D (P)'),
      course('EE 305', 'Electrical Machines 2', 3, 3, 4, 3, 2, 'EE 304 (P)'),
      course(
        'EE 306',
        'Electrical Apparatus and Devices',
        2,
        3,
        3,
        3,
        2,
        'EE 202 (P), MATH 027C (P)',
      ),
      course('EE 308', 'Research Methods', 0, 3, 1, 3, 2, 'IE 321 (P)'),
      course('COE 312', 'Fundamentals of Intellectual Property', 0, 3, 1, 3, 2, 'EE 308 (C)'),
      course('GEC 001', 'Understanding the Self', 3, 0, 3, 3, 2),
      course('EE 309', 'EE Law, Codes and Professional Ethics', 2, 0, 2, 3, 2, 'GEC 008 (P)'),
      course('CPE 405A', 'Microprocessor Systems', 3, 3, 4, 3, 2, 'CPE 203 (P)'),
      course('CADD 001A', 'Computer-Aided Drafting', 0, 3, 1, 3, 2, '3rd Year Standing'),
      course('EE ELEC 2', 'EE Elective 2', 3, 0, 3, 3, 2, 'See track for pre-requisite(s)', {
        isElective: true,
      }),
      course('EE 400', 'Electrical Standards and Practices', 0, 3, 1, 3, 3, 'EE 309 (P)'),
      course('EE 430', 'Management of EE Projects', 2, 0, 2, 3, 3, 'ME 304 (P)'),
      course('BOSH 101', 'Basic Occupational Safety and Health', 3, 0, 3, 3, 3),
      course('ECE 204A', 'Principles of Electronic Communications', 3, 0, 3, 3, 3, 'ECE 200A (P)'),
      course(
        'EE 410',
        'Electrical Systems and Illumination Engineering Design',
        3,
        6,
        5,
        4,
        1,
        'EE 306 (P)',
      ),
      course('EE 431', 'EE Design Project 1', 2, 3, 3, 4, 1, 'EE 305 (P), EE 306 (P), EE 308 (P)'),
      course('EE 432', 'Instrumentation and Control', 2, 3, 3, 4, 1, 'EE 310 (P)'),
      course('EE 407', 'Integration Course in Engineering Sciences', 2, 0, 2, 4, 1, 'EE 303 (P)'),
      course('EE 415', 'Power System Analysis', 3, 3, 4, 4, 1, 'EE 305 (P), EE 306 (P)'),
      course(
        'EE 416',
        'Power Plant Engineering and Generating Substation Design',
        0,
        3,
        1,
        4,
        1,
        'EE 415 (C)',
      ),
      course('GEC 005', 'Purposive Communication', 3, 0, 3, 4, 1),
      course(
        'EE 417A',
        'Transmission and Distribution Systems with Substation',
        2,
        3,
        3,
        4,
        1,
        'EE 415 (C)',
      ),
      course('EE ELEC 3', 'EE Elective 3', 3, 0, 3, 4, 1, 'See track for pre-requisite(s)', {
        isElective: true,
      }),
      course('EE 312', 'On-the-Job-Training for EE', 0, 240, 2, 4, 2, 'Graduating (P)'),
      course('GEC 007', 'Science, Technology and Society', 3, 0, 3, 4, 2),
      course('TECH 101A', 'Technology Entrepreneurship', 3, 0, 3, 4, 2, 'Graduating (P)'),
      course('GEC 006', 'Art Appreciation', 3, 0, 3, 4, 2),
      course('EE 414', 'EE Design Project 2', 1, 6, 3, 4, 2, 'Graduating (P), EE 431 (P)'),
      course('EE 418', 'Seminars/Colloquia', 0, 3, 1, 4, 2, 'Graduating (P)'),
      course(
        'EE 419',
        'Integration Course in Electrical Engineering',
        2,
        0,
        2,
        4,
        2,
        'Graduating (P), EE 407 (P)',
      ),
    ],
    tracks: tracks2023,
  },
  {
    curriculumName: 'BSEE Curriculum 2018',
    outputFile: 'bs_ee_curriculum_2018_import.csv',
    expectedUnits: {
      '1-1': 21,
      '1-2': 21,
      '2-1': 25,
      '2-2': 26,
      '3-1': 27,
      '3-2': 25,
      '3-3': 2,
      '4-1': 26,
      '4-2': 23,
    },
    courses: [
      course('CHM 001', 'Chemistry for Engineers', 3, 3, 4, 1, 1),
      course('MATH 018', 'Calculus 1', 3, 0, 3, 1, 1),
      course('MATH 025', 'Discrete Mathematics', 3, 0, 3, 1, 1),
      course('GEC 004', 'Mathematics in the Modern World', 3, 0, 3, 1, 1),
      course('GEC 005', 'Purposive Communication', 3, 0, 3, 1, 1),
      course('PE 101', 'Physical Education 1', 2, 0, 2, 1, 1),
      course('NSTP 001', 'National Service Training Program 1', 3, 0, 3, 1, 1),
      course('PHYS 111', 'Calculus-Based Physics', 3, 3, 4, 1, 2, 'MATH 018'),
      course('MATH 019', 'Calculus 2', 3, 0, 3, 1, 2, 'MATH 018'),
      course('GEC 008', 'Ethics', 3, 0, 3, 1, 2),
      course('CHM 008', 'Environmental Science and Engineering', 3, 0, 3, 1, 2),
      course('GEE 001B', 'GE Elective 1 - Gender and Society', 3, 0, 3, 1, 2),
      course('PE 102', 'Physical Education 2', 2, 0, 2, 1, 2, 'PE 101'),
      course('NSTP 002', 'National Service Training Program 2', 3, 0, 3, 1, 2, 'NSTP 001'),
      course('EE 200', 'Electrical Circuits 1', 3, 3, 4, 2, 1, 'PHYS 111'),
      course('MATH 021', 'Differential Equations', 3, 0, 3, 2, 1, 'MATH 019'),
      course('CE 201B', 'Engineering Mechanics', 3, 0, 3, 2, 1, 'PHYS 111'),
      course(
        'TECH 101',
        'Introduction to Engineering Entrepreneurship',
        3,
        0,
        3,
        2,
        1,
        '2nd Year Standing',
      ),
      course('ME 201A', 'Thermodynamics', 3, 0, 3, 2, 1, 'CHM 001, PHYS 111'),
      course('GEE 002B', 'GE Elective 2 - Living in the IT Era', 3, 0, 3, 2, 1, 'GEE 001B'),
      course('PE 201', 'Physical Education 3', 2, 0, 2, 2, 1, 'PE 102'),
      course('MATH 022B', 'Linear Algebra with MATLAB', 2, 0, 3, 2, 1, 'MATH 019, MATH 025'),
      course('CPE 102A', 'Computer Programming', 0, 3, 1, 2, 1),
      course('EE 202', 'Electrical Circuits 2', 3, 3, 4, 2, 2, 'EE 200, MATH 021'),
      course('EE 201', 'Electromagnetics for EE', 3, 0, 2, 2, 2, 'EE 200'),
      course(
        'MATH 024D',
        'Engineering Mathematics for EE',
        3,
        0,
        3,
        2,
        2,
        'CPE 102A, MATH 021, MATH 022B',
      ),
      course('ECE 200A', 'Electronic Circuit Devices and Analysis', 3, 3, 4, 2, 2, 'EE 200'),
      course('CE 205A', 'Fundamentals of Deformable Bodies', 2, 0, 2, 2, 2, 'CE 201B'),
      course('CE 309A', 'Fluid Mechanics', 2, 0, 2, 2, 2, 'PHYS 111'),
      course('MATH 026A', 'Numerical Methods and Analysis', 2, 3, 3, 2, 2, 'MATH 022B'),
      course('MATH 027A', 'Engineering Data Analysis', 3, 3, 4, 2, 2, 'MATH 018'),
      course('PE 202', 'Physical Education 4', 2, 0, 2, 2, 2, 'PE 201'),
      course('EE 303', 'Integration Course in Mathematics', 2, 0, 2, 3, 1, 'MATH 024D'),
      course('EE 304', 'Electrical Machines 1', 2, 0, 2, 3, 1, 'EE 201, EE 202'),
      course('EE 340', 'Industrial Power Electronics', 3, 3, 4, 3, 1, 'ECE 200A, EE 202'),
      course('CPE 203', 'Logic Circuits and Switching Theory', 3, 3, 4, 3, 1, 'ECE 200A'),
      course('ME 304', 'Engineering Economics', 3, 0, 3, 3, 1, 'MATH 027A'),
      course('CHM 007A', 'Materials Science and Engineering', 3, 0, 3, 3, 1, 'CHM 001'),
      course('GEM 001', 'Life and Works of Rizal', 3, 0, 3, 3, 1),
      course('GEC 002', 'Readings in Philippine History', 3, 0, 3, 3, 1),
      course('EE ELEC 1', 'EE Elective 1', 3, 0, 3, 3, 1, 'See track for pre-requisite(s)', {
        isElective: true,
      }),
      course('EE 310', 'Control Systems Analysis', 2, 0, 2, 3, 2, 'EE 202, MATH 024D, MATH 026A'),
      course('EE 305', 'Electrical Machines 2', 3, 3, 4, 3, 2, 'EE 304'),
      course('EE 306', 'Electrical Apparatus and Devices', 2, 3, 3, 3, 2, 'EE 202, MATH 027A'),
      course(
        'EE 307',
        'Integration Course in Engineering Sciences',
        2,
        0,
        2,
        3,
        2,
        '3rd Year Standing, EE 303',
      ),
      course('EE 308', 'Research Methods', 0, 3, 1, 3, 2, 'MATH 027A'),
      course('EE 309', 'EE Laws, Codes and Professional Ethics', 2, 0, 2, 3, 2, 'GEC 008'),
      course('CPE 405A', 'Microprocessor Systems', 3, 3, 4, 3, 2, 'CPE 203'),
      course('CADD 001A', 'Computer-Aided Drafting and Design', 0, 3, 1, 3, 2, '3rd Year Standing'),
      course('ECE 204A', 'Principles of Electronic Communications', 3, 0, 3, 3, 2, 'ECE 200A'),
      course('EE ELEC 2', 'EE Elective 2', 3, 0, 3, 3, 2, 'See track for pre-requisite(s)', {
        isElective: true,
      }),
      course('EE 312', 'On-the-Job Training for EE', 0, 240, 2, 3, 3, '4th Year Standing'),
      course('EE 400', 'Electrical Standards and Practices', 0, 3, 1, 4, 1, 'EE 309'),
      course(
        'EE 410',
        'Electrical Systems and Illumination Engineering Design',
        3,
        6,
        5,
        4,
        1,
        'EE 306',
      ),
      course('EE 431', 'EE Design Project 1', 2, 3, 3, 4, 1, 'EE 305, EE 306'),
      course('EE 432', 'Instrumentation and Control', 2, 3, 3, 4, 1, 'EE 310'),
      course(
        'GEE 003B',
        "GE Elective 3 - People and the Earth's Ecosystem",
        3,
        0,
        3,
        4,
        1,
        'GEE 002B',
      ),
      course('EE 415', 'Power Systems Analysis', 3, 3, 4, 4, 1, 'EE 305, EE 306'),
      course(
        'EE 416',
        'Power Plant Engineering and Generating Substation Design',
        0,
        3,
        1,
        4,
        1,
        'EE 415 (C)',
      ),
      course('EE 417', 'Distribution Systems and Substation Design', 2, 3, 3, 4, 1, 'EE 415 (C)'),
      course('EE ELEC 3', 'EE Elective 3', 3, 0, 3, 4, 1, 'See track for pre-requisite(s)', {
        isElective: true,
      }),
      course('EE 430', 'Management of EE Projects', 2, 0, 2, 4, 2, 'ME 304'),
      course('GEC 007', 'Science, Technology and Society', 3, 0, 3, 4, 2),
      course('GEC 006', 'Art Appreciation', 3, 0, 3, 4, 2),
      course('GEC 001', 'Understanding the Self', 3, 0, 3, 4, 2),
      course('EE 414', 'EE Design Project 2', 1, 6, 3, 4, 2, 'Graduating, EE 431'),
      course('GEC 003', 'The Contemporary World', 3, 0, 3, 4, 2),
      course('EE 418', 'Seminars/Colloquia', 0, 3, 1, 4, 2, '4th Year Standing'),
      course('EE 419', 'Integration Course in Electrical Engineering', 2, 0, 2, 4, 2, 'Graduating'),
      course('BOSH 101', 'Basic Occupational Safety and Health', 3, 0, 3, 4, 2),
    ],
    tracks: [
      trackCourse(
        'Power System Economics',
        'PSE 420',
        'Power System Reliability and Planning',
        3,
        0,
        3,
        'EE 202, MATH 027A',
      ),
      trackCourse(
        'Power System Economics',
        'PSE 421',
        'Power Quality and Demand Side Management',
        3,
        0,
        3,
        'PSE 420',
      ),
      trackCourse(
        'Power System Economics',
        'PSE 422',
        'Power System Market Operation',
        3,
        0,
        3,
        'PSE 421',
      ),
      trackCourse(
        'Power System Automation and Renewable Energy',
        'PSA 422',
        'Renewable Energy Systems Integration',
        3,
        0,
        3,
        'EE 304 (C)',
      ),
      trackCourse(
        'Power System Automation and Renewable Energy',
        'PSA 423',
        'Smart Grid Application in Power System',
        3,
        0,
        3,
        'PSA 422',
      ),
      trackCourse(
        'Power System Automation and Renewable Energy',
        'PSA 424',
        'Advanced Automation in Distribution System',
        3,
        0,
        3,
        'PSA 423',
      ),
      trackCourse(
        'Power Electronics',
        'PWE 424',
        'DC and AC Power Drives',
        3,
        0,
        3,
        'EE 202, EE 201',
      ),
      trackCourse(
        'Power Electronics',
        'PWE 425',
        'Magnetics Circuits for Power Converters',
        3,
        0,
        3,
        'EE 304, PWE 424',
      ),
      trackCourse('Power Electronics', 'PWE 426', 'Power Converters in HVDC', 3, 0, 3, 'PWE 425'),
      trackCourse('Technopreneurship', 'TECH 102', 'Technopreneurship 2', 3, 0, 3, 'TECH 101'),
      trackCourse('Technopreneurship', 'TECH 103', 'Technopreneurship 3', 3, 0, 3, 'TECH 102'),
      trackCourse('Technopreneurship', 'TECH 104', 'Technopreneurship 4', 3, 0, 3, 'TECH 103'),
      trackCourse(
        'Railway Engineering',
        'RWE 001',
        'Introduction to Railway Systems and Engineering',
        3,
        0,
        3,
      ),
      trackCourse(
        'Railway Engineering',
        'RWE 002A',
        'Railway Management and Governance and Operations',
        3,
        0,
        3,
        'RWE 001',
      ),
      trackCourse(
        'Railway Engineering',
        'RWE 003',
        'Railway Power System and Protection',
        3,
        0,
        3,
        'RWE 002A',
      ),
    ],
  },
];

fs.mkdirSync(outputDir, { recursive: true });

const results = [];
let hasErrors = false;

for (const curriculum of curriculums) {
  const skippedUnavailableRequisites = [];
  const rows = makeRows({ ...curriculum, skippedUnavailableRequisites });
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
    skippedUnavailableRequisites: [...new Set(skippedUnavailableRequisites)].sort(),
  });
}

console.log(JSON.stringify({ outputDir, results }, null, 2));
if (hasErrors) process.exitCode = 1;
