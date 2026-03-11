const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');

const inputFiles = [
  path.join(rootDir, 'bs_cpe_curriculum_2025_full.csv'),
  path.join(rootDir, 'bs_cpe_curriculum_2023_full.csv'),
  path.join(rootDir, 'bs_cpe_curriculum_2018_full.csv')
];

const outputDir = path.join(rootDir, 'data', 'curriculum_normalized');

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

const escapeCsvValue = (value) => {
  const stringValue = String(value ?? '');
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const normalizeCourseCode = (value) => String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();

const parseSemester = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === '1') return 1;
  if (normalized === '2') return 2;
  if (normalized === '3' || normalized === 'summer') return 3;
  return null;
};

const parseYear = (value) => {
  const numeric = Number(String(value || '').trim());
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 8) {
    return numeric;
  }
  return null;
};

const parsePrerequisiteTokens = (value) => {
  if (!value) return [];
  return String(value)
    .split(';')
    .map((token) => token.trim())
    .filter(Boolean);
};

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const writeCsv = (filePath, headers, rows) => {
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((header) => escapeCsvValue(row[header])).join(','));
  });
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
};

const parseRawRow = (cells) => {
  if (cells.length < 9) {
    return null;
  }

  const standard = {
    course_code: cells[0],
    course_title: cells[1],
    lecture_hours: cells[2],
    lab_hours: cells[3],
    credit_units: cells[4],
    prerequisites: cells[5],
    year: cells[6],
    semester: cells[7],
    category: cells[8]
  };

  if (cells.length === 10 && String(cells[6] || '').trim().toLowerCase() === 'elective') {
    return {
      ...standard,
      year: '',
      semester: '',
      category: 'elective-track',
      track_name: cells[9]
    };
  }

  return {
    ...standard,
    track_name: ''
  };
};

const buildCurriculumMeta = (filePath) => {
  const base = path.basename(filePath);
  const yearMatch = base.match(/(\d{4})/);
  const year = yearMatch ? yearMatch[1] : 'unknown';
  return {
    curriculum_code: `BS_CPE_${year}`,
    curriculum_year: Number(year),
    name: `BS CPE Curriculum ${year}`,
    description: `Imported from ${base}`,
    is_active: year === '2025' ? 'true' : 'false'
  };
};

const normalized = {
  curriculums: [],
  courses: new Map(),
  curriculumCourses: [],
  prerequisites: [],
  electiveTracks: new Map(),
  electiveTrackCourses: []
};

const tempRows = [];

inputFiles.forEach((filePath) => {
  const meta = buildCurriculumMeta(filePath);
  normalized.curriculums.push(meta);

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const dataLines = lines.slice(1);

  dataLines.forEach((line, index) => {
    const parsed = parseRawRow(parseCsvLine(line));
    if (!parsed) {
      return;
    }

    tempRows.push({
      ...parsed,
      curriculum_code: meta.curriculum_code,
      source_file: path.basename(filePath),
      source_row: index + 2
    });
  });
});

const courseCodeLookup = new Map();

// First pass: courses
for (const row of tempRows) {
  const code = normalizeCourseCode(row.course_code);
  const name = String(row.course_title || '').trim();
  const units = Number(row.credit_units);

  if (!code || !name || !Number.isFinite(units)) {
    continue;
  }

  if (!normalized.courses.has(code)) {
    normalized.courses.set(code, {
      course_code: code,
      course_title: name,
      credit_units: String(Math.round(units)),
      lecture_hours: String(Number(row.lecture_hours || 0) || 0),
      lab_hours: String(Number(row.lab_hours || 0) || 0)
    });
  }

  courseCodeLookup.set(code, code);
}

const prerequisiteDedup = new Set();
const curriculumCourseDedup = new Set();
const trackCourseDedup = new Set();

for (const row of tempRows) {
  const courseCode = normalizeCourseCode(row.course_code);
  if (!courseCodeLookup.has(courseCode)) {
    continue;
  }

  const yearLevel = parseYear(row.year);
  const semester = parseSemester(row.semester);
  const category = String(row.category || '').trim().toLowerCase();

  const isElectivePlaceholder = /see\s*track/i.test(String(row.prerequisites || '')) || /^CPEC\b/i.test(courseCode);

  if (yearLevel && semester) {
    const ccKey = `${row.curriculum_code}|${courseCode}|${yearLevel}|${semester}`;
    if (!curriculumCourseDedup.has(ccKey)) {
      curriculumCourseDedup.add(ccKey);
      normalized.curriculumCourses.push({
        curriculum_code: row.curriculum_code,
        course_code: courseCode,
        year_level: String(yearLevel),
        semester: String(semester),
        is_elective: isElectivePlaceholder ? 'true' : 'false'
      });
    }
  }

  // Track courses
  const inferredTrackName = row.track_name || (category === 'elective-track' ? String(row.category || '') : '');
  const isTrackRow = category === 'elective-track' || String(row.year || '').trim().toLowerCase() === 'elective';

  if (isTrackRow) {
    const trackName = String(row.track_name || row.category || '').trim();
    if (trackName) {
      const trackKey = `${row.curriculum_code}|${trackName}`;
      if (!normalized.electiveTracks.has(trackKey)) {
        normalized.electiveTracks.set(trackKey, {
          curriculum_code: row.curriculum_code,
          track_name: trackName,
          description: ''
        });
      }

      const etcKey = `${row.curriculum_code}|${trackName}|${courseCode}`;
      if (!trackCourseDedup.has(etcKey)) {
        trackCourseDedup.add(etcKey);
        normalized.electiveTrackCourses.push({
          curriculum_code: row.curriculum_code,
          track_name: trackName,
          course_code: courseCode,
          year_level: '',
          semester: ''
        });
      }
    }
  }

  const prerequisiteTokens = parsePrerequisiteTokens(row.prerequisites);
  prerequisiteTokens.forEach((token) => {
    const prereqCode = normalizeCourseCode(token);
    if (!prereqCode || !courseCodeLookup.has(prereqCode)) {
      return;
    }

    const key = `${row.curriculum_code}|${courseCode}|${prereqCode}`;
    if (prerequisiteDedup.has(key)) {
      return;
    }

    prerequisiteDedup.add(key);
    normalized.prerequisites.push({
      curriculum_code: row.curriculum_code,
      course_code: courseCode,
      prerequisite_course_code: prereqCode
    });
  });
}

const coursesArray = Array.from(normalized.courses.values()).sort((a, b) => a.course_code.localeCompare(b.course_code));
const curriculumsArray = normalized.curriculums.sort((a, b) => a.curriculum_year - b.curriculum_year);
const curriculumCoursesArray = normalized.curriculumCourses.sort((a, b) => (
  a.curriculum_code.localeCompare(b.curriculum_code)
  || Number(a.year_level) - Number(b.year_level)
  || Number(a.semester) - Number(b.semester)
  || a.course_code.localeCompare(b.course_code)
));
const prerequisitesArray = normalized.prerequisites.sort((a, b) => (
  a.curriculum_code.localeCompare(b.curriculum_code)
  || a.course_code.localeCompare(b.course_code)
  || a.prerequisite_course_code.localeCompare(b.prerequisite_course_code)
));
const electiveTracksArray = Array.from(normalized.electiveTracks.values()).sort((a, b) => (
  a.curriculum_code.localeCompare(b.curriculum_code) || a.track_name.localeCompare(b.track_name)
));
const electiveTrackCoursesArray = normalized.electiveTrackCourses.sort((a, b) => (
  a.curriculum_code.localeCompare(b.curriculum_code)
  || a.track_name.localeCompare(b.track_name)
  || a.course_code.localeCompare(b.course_code)
));

ensureDir(outputDir);

writeCsv(path.join(outputDir, 'curriculums.csv'), ['curriculum_code', 'name', 'description', 'is_active'], curriculumsArray);
writeCsv(path.join(outputDir, 'courses.csv'), ['course_code', 'course_title', 'credit_units', 'lecture_hours', 'lab_hours'], coursesArray);
writeCsv(path.join(outputDir, 'curriculum_courses.csv'), ['curriculum_code', 'course_code', 'year_level', 'semester', 'is_elective'], curriculumCoursesArray);
writeCsv(path.join(outputDir, 'prerequisites.csv'), ['curriculum_code', 'course_code', 'prerequisite_course_code'], prerequisitesArray);
writeCsv(path.join(outputDir, 'elective_tracks.csv'), ['curriculum_code', 'track_name', 'description'], electiveTracksArray);
writeCsv(path.join(outputDir, 'elective_track_courses.csv'), ['curriculum_code', 'track_name', 'course_code', 'year_level', 'semester'], electiveTrackCoursesArray);

console.log(JSON.stringify({
  outputDir,
  files: [
    'curriculums.csv',
    'courses.csv',
    'curriculum_courses.csv',
    'prerequisites.csv',
    'elective_tracks.csv',
    'elective_track_courses.csv'
  ],
  counts: {
    curriculums: curriculumsArray.length,
    courses: coursesArray.length,
    curriculumCourses: curriculumCoursesArray.length,
    prerequisites: prerequisitesArray.length,
    electiveTracks: electiveTracksArray.length,
    electiveTrackCourses: electiveTrackCoursesArray.length
  }
}, null, 2));
