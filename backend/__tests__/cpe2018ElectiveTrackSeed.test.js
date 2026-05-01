const fs = require('fs');
const path = require('path');

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

const readImportRows = (fileName) => {
  const filePath = path.resolve(__dirname, '..', '..', 'data', 'curriculum_import_ready', fileName);
  const lines = fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = cells[index] || '';
      return row;
    }, {});
  });
};

describe('CPE 2018 elective track seed placements', () => {
  test('sets default year and semester placement for every CPE 2018 track course', () => {
    const rows = readImportRows('bs_cpe_curriculum_2018_import.csv').filter(
      (row) => row.rowType === 'elective_track_course',
    );

    const placementByTrackAndCourse = new Map(
      rows.map((row) => [
        `${row.trackName}|${row.courseCode}`,
        { yearLevel: row.yearLevel, semester: row.semester },
      ]),
    );

    const expectedPlacements = {
      'Cybersecurity|CPE 209': { yearLevel: '2', semester: '2' },
      'Cybersecurity|CPE 320': { yearLevel: '3', semester: '1' },
      'Cybersecurity|CPE 315': { yearLevel: '3', semester: '2' },
      'Data Science|COE 003': { yearLevel: '2', semester: '2' },
      'Data Science|COE 004': { yearLevel: '3', semester: '1' },
      'Data Science|COE 005': { yearLevel: '3', semester: '2' },
      'Railway Engineering|RWE 001': { yearLevel: '2', semester: '2' },
      'Railway Engineering|RWE 002A': { yearLevel: '3', semester: '1' },
      'Railway Engineering|RWE 003A': { yearLevel: '3', semester: '2' },
      'Robotics|CPE 331A': { yearLevel: '2', semester: '2' },
      'Robotics|CPE 332': { yearLevel: '3', semester: '1' },
      'Robotics|CPE 343': { yearLevel: '3', semester: '2' },
      'Systems Administration|CPE 207': { yearLevel: '2', semester: '2' },
      'Systems Administration|CPE 307': { yearLevel: '3', semester: '1' },
      'Systems Administration|CPE 312': { yearLevel: '3', semester: '2' },
      'Technopreneurship|TECH 102': { yearLevel: '2', semester: '2' },
      'Technopreneurship|TECH 103': { yearLevel: '3', semester: '1' },
      'Technopreneurship|TECH 104': { yearLevel: '3', semester: '2' },
    };

    expect(Object.fromEntries(placementByTrackAndCourse)).toEqual(expectedPlacements);
  });
});
