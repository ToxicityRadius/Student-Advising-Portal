const fs = require('fs');
const path = require('path');

jest.mock('../models', () => ({
  sequelize: {},
  Curriculum: {},
  Course: {},
  CurriculumCourse: {},
  Prerequisite: {},
  CoRequisite: {},
  CourseEquivalency: {},
  ElectiveTrack: {},
  ElectiveTrackCourse: {},
  StudyPlanCourse: {},
  User: {},
  Program: {},
  ActivityLog: { create: jest.fn() },
}));

const { __testables } = require('../controllers/curriculumController');

const importDir = path.join(__dirname, '..', '..', 'data', 'curriculum_import_ready');

const parseCsvLine = (line) => {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  cells.push(current);
  return cells;
};

const readCsvRows = (fileName) => {
  const lines = fs.readFileSync(path.join(importDir, fileName), 'utf8').trim().split(/\r?\n/);
  return lines.map(parseCsvLine);
};

const readRows = (fileName) => {
  const csvRows = readCsvRows(fileName);
  const headers = csvRows[0];
  return csvRows.slice(1).map((cells) => {
    return headers.reduce((row, header, index) => {
      row[header] = cells[index] || '';
      return row;
    }, {});
  });
};

const expectPlacements = (fileName, expectedPlacements) => {
  const rows = readRows(fileName).filter((row) => row.rowType === 'elective_track_course');
  const placements = new Map(
    rows.map((row) => [`${row.trackName}|${row.courseCode}`, `${row.yearLevel}-${row.semester}`]),
  );

  for (const [trackName, courseCode, yearLevel, semester] of expectedPlacements) {
    expect(placements.get(`${trackName}|${courseCode}`)).toBe(`${yearLevel}-${semester}`);
  }
};

describe('seeded elective track default placements', () => {
  test('import CSVs pass hardened preview validation', () => {
    const imports = [
      ['bs_cpe_curriculum_2018_import.csv', 'BS CPE Curriculum 2018'],
      ['bs_cpe_curriculum_2023_import.csv', 'BS CPE Curriculum 2023'],
      ['bs_cpe_curriculum_2025_import.csv', 'BS CPE Curriculum 2025'],
    ];

    for (const [fileName, curriculumName] of imports) {
      const result = __testables.validateAndNormalizeCsvRows({
        csvRows: readCsvRows(fileName),
        expectedCurriculumId: 1,
        expectedCurriculumName: curriculumName,
      });
      expect(result.errors).toEqual([]);
    }
  });

  test('CPE 2018 import CSV has expected elective placements', () => {
    expectPlacements('bs_cpe_curriculum_2018_import.csv', [
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
    ]);
  });

  test('CPE 2023 import CSV has expected elective placements', () => {
    expectPlacements('bs_cpe_curriculum_2023_import.csv', [
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
    ]);
  });

  test('CPE 2025 import CSV has expected elective placements', () => {
    expectPlacements('bs_cpe_curriculum_2025_import.csv', [
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
    ]);
  });
});
