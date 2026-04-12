const semesterLabel = (yearLevel, semester) => {
  const ordinals = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th' };
  const semesterNames = {
    1: '1st Semester',
    2: '2nd Semester',
    3: 'Summer',
  };

  const yearText = ordinals[yearLevel] ? `${ordinals[yearLevel]} Year` : `Year ${yearLevel}`;
  const semText = semesterNames[semester] || `Semester ${semester}`;
  return `${yearText}, ${semText}`;
};

const normalizeStatus = (course) => {
  const raw = String(course.status || '').toLowerCase();

  if (raw === 'completed' || raw === 'passed') return 'Passed';
  if (raw === 'credited') return 'Passed';
  if (raw === 'failed') return 'Failed';
  if (raw === 'ongoing') return 'In Progress';
  if (raw === 'incomplete') return 'INC';
  if (raw === 'dropped' || raw === 'drop') return 'DRP';
  if (raw === 'not yet taken') return 'Not Yet Taken';

  const gradeNumber = Number.parseFloat(course.grade);
  if (Number.isFinite(gradeNumber)) {
    return gradeNumber <= 3 ? 'Passed' : 'Failed';
  }

  return 'In Progress';
};

const semesterGwa = (courses) => {
  const weighted = courses
    .map((course) => {
      const grade = Number.parseFloat(course.grade);
      const units = Number(course.units);
      if (!Number.isFinite(grade) || units <= 0) return null;
      return { gradePoints: grade * units, units };
    })
    .filter(Boolean);

  if (!weighted.length) return '-';
  const totalUnits = weighted.reduce((sum, item) => sum + item.units, 0);
  const totalGradePoints = weighted.reduce((sum, item) => sum + item.gradePoints, 0);
  return (totalGradePoints / totalUnits).toFixed(2);
};

/**
 * Format a GWA/GPA value for display, always showing exactly 2 decimal places.
 * Returns 'N/A' for null/undefined/non-finite values.
 */
const formatGwa = (value) => {
  if (value === null || value === undefined) return 'N/A';
  const num = Number(value);
  if (!Number.isFinite(num)) return 'N/A';
  return num.toFixed(2);
};

const getSemesterTone = (gpaValue) => {
  if (gpaValue === '-') return 'pending';

  const parsed = Number.parseFloat(gpaValue);
  if (!Number.isFinite(parsed)) return 'pending';

  return parsed > 3 ? 'failed' : 'passed';
};

export { semesterLabel, normalizeStatus, semesterGwa, getSemesterTone, formatGwa };
