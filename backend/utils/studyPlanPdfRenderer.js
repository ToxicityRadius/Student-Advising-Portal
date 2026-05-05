const fs = require('fs');
const path = require('path');

const LOGO_PATH = path.resolve(__dirname, '../assets/tip-logo.png');

const COLORS = {
  black: '#111111',
  border: '#222222',
  lightGray: '#E6E6E6',
  midGray: '#F2F2F2',
  white: '#FFFFFF',
};

const PAGE_BOTTOM_PADDING = 30;
const CELL_PADDING_X = 2.5;
const CELL_PADDING_Y = 3;
const COMPLETED_COURSE_STATUSES = new Set(['passed', 'completed', 'credited']);

const COURSE_COLUMNS = [
  { key: 'code', label: 'COURSE CODE', width: 58, align: 'center', bold: true },
  { key: 'title', label: 'DESCRIPTIVE TITLE', width: 155, align: 'left' },
  { key: 'lectureHours', label: 'LEC', width: 31, align: 'center' },
  { key: 'laboratoryHours', label: 'LAB', width: 31, align: 'center' },
  { key: 'units', label: 'UNITS', width: 32, align: 'center' },
  { key: 'prerequisites', label: 'PREREQUISITE(S)', width: 174, align: 'left' },
  { key: 'grade', label: 'GRADE', width: 42, align: 'center' },
];

const safeText = (value, fallback = 'N/A') => {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
};

const blankIfMissing = (value) => {
  const normalized = String(value ?? '').trim();
  return normalized === 'null' || normalized === 'undefined' ? '' : normalized;
};

const normalizeStatus = (status) =>
  String(status || '')
    .trim()
    .toLowerCase();

const isCompletedCourse = (course) =>
  COMPLETED_COURSE_STATUSES.has(normalizeStatus(course?.status));

const formatTimestamp = (value) => {
  if (!value) {
    return 'N/A';
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return 'N/A';
  }

  return new Date(parsed).toLocaleString();
};

const formatVersionMetadata = (activeVersion) => {
  if (!activeVersion) {
    return 'No active version';
  }

  return `Version ${activeVersion.versionNumber || 'N/A'} - ${String(
    activeVersion.status || 'unknown',
  ).toUpperCase()}`;
};

const ordinalYearLabel = (yearLevel) => {
  const year = Number(yearLevel);
  if (year === 1) return 'FIRST YEAR';
  if (year === 2) return 'SECOND YEAR';
  if (year === 3) return 'THIRD YEAR';
  if (year === 4) return 'FOURTH YEAR';
  if (year === 5) return 'FIFTH YEAR';
  return `YEAR ${safeText(yearLevel)}`;
};

const semesterLabel = (semester) => {
  const sem = Number(semester);
  if (sem === 1) return 'FIRST SEMESTER';
  if (sem === 2) return 'SECOND SEMESTER';
  if (sem === 3) return 'SUMMER';
  return `SEMESTER ${safeText(semester)}`;
};

const contentBottom = (doc) => doc.page.height - doc.page.margins.bottom - PAGE_BOTTOM_PADDING;

const ensureSpace = (doc, y, requiredHeight) => {
  if (y + requiredHeight > contentBottom(doc)) {
    doc.addPage();
    return doc.page.margins.top;
  }

  return y;
};

const drawText = (doc, text, x, y, options = {}) => {
  doc
    .font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(options.size || 7)
    .fillColor(COLORS.black)
    .text(safeText(text, options.fallback || ''), x, y, {
      width: options.width,
      align: options.align || 'left',
      lineGap: options.lineGap || 0,
    });
};

const drawRule = (doc, y, x1, x2, width = 0.6) => {
  doc.moveTo(x1, y).lineTo(x2, y).lineWidth(width).strokeColor(COLORS.border).stroke();
};

const drawHeader = (doc, sar, activeVersion, generatedAt, logoPath = LOGO_PATH) => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const center = doc.page.width / 2;
  const top = doc.page.margins.top - 2;
  const logoWidth = 42;
  const logoHeight = 28;
  const logoX = center - 150;

  if (logoPath && fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, logoX, top, { fit: [logoWidth, logoHeight] });
    } catch {
      drawText(doc, 'T.I.P.', logoX, top + 4, { width: logoWidth, size: 11, bold: true });
    }
  } else {
    drawText(doc, 'T.I.P.', logoX, top + 4, { width: logoWidth, size: 11, bold: true });
  }

  drawText(doc, 'TECHNOLOGICAL INSTITUTE OF THE PHILIPPINES', logoX + 50, top + 2, {
    width: 250,
    size: 10,
    bold: true,
    align: 'left',
  });
  drawText(doc, 'Student Advising Portal', logoX + 50, top + 15, {
    width: 250,
    size: 7,
    align: 'left',
  });

  drawText(doc, `Generated: ${generatedAt.toLocaleString()}`, right - 148, top + 3, {
    width: 148,
    size: 6.5,
    align: 'right',
  });
  drawText(doc, formatVersionMetadata(activeVersion), right - 148, top + 14, {
    width: 148,
    size: 6.5,
    align: 'right',
  });

  const titleY = top + 36;
  drawText(doc, 'STUDY PLAN', left, titleY, {
    width: right - left,
    size: 10.5,
    bold: true,
    align: 'center',
  });

  const curriculumLine = `${safeText(sar.Curriculum?.name, 'Curriculum N/A')}${
    sar.ElectiveTrack?.name ? ` - ${sar.ElectiveTrack.name}` : ''
  }`;
  drawText(doc, curriculumLine, left, titleY + 13, {
    width: right - left,
    size: 7.5,
    align: 'center',
  });

  drawRule(doc, titleY + 28, left, right, 0.7);

  const identityY = titleY + 35;
  drawText(doc, `FULL NAME: ${safeText(sar.studentName)}`, left, identityY, {
    width: (right - left) * 0.6,
    size: 7.5,
    bold: true,
  });
  drawText(
    doc,
    `STUDENT NUMBER: ${safeText(sar.studentNumber)}`,
    left + (right - left) * 0.62,
    identityY,
    {
      width: (right - left) * 0.38,
      size: 7.5,
      bold: true,
      align: 'right',
    },
  );

  drawText(
    doc,
    'IMPORTANT: Study plan approval remains subject to prerequisite, sequence, and adviser validation rules.',
    left,
    identityY + 13,
    {
      width: right - left,
      size: 6.3,
      bold: true,
    },
  );

  drawRule(doc, identityY + 25, left, right, 0.6);

  return identityY + 33;
};

const buildPrerequisiteMap = (prerequisites) => {
  const map = new Map();

  (prerequisites || []).forEach((entry) => {
    const courseId = String(entry.courseId || '');
    const code = safeText(entry.PrerequisiteCourse?.code, '');
    if (!courseId || !code) {
      return;
    }

    if (!map.has(courseId)) {
      map.set(courseId, []);
    }
    map.get(courseId).push(`${code} (P)`);
  });

  return map;
};

const groupCourses = (courses) => {
  const groups = new Map();

  [...(courses || [])]
    .sort((left, right) => {
      if (Number(left.yearLevel) !== Number(right.yearLevel)) {
        return Number(left.yearLevel) - Number(right.yearLevel);
      }

      if (Number(left.semester) !== Number(right.semester)) {
        return Number(left.semester) - Number(right.semester);
      }

      return String(left.Course?.code || '').localeCompare(String(right.Course?.code || ''));
    })
    .forEach((course) => {
      const key = `${Number(course.yearLevel) || 0}-${Number(course.semester) || 0}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(course);
    });

  return [...groups.entries()].sort((left, right) => {
    const [leftYear, leftSemester] = left[0].split('-').map(Number);
    const [rightYear, rightSemester] = right[0].split('-').map(Number);
    if (leftYear !== rightYear) {
      return leftYear - rightYear;
    }
    return leftSemester - rightSemester;
  });
};

const tableGeometry = (doc) => {
  const left = doc.page.margins.left;
  let cursorX = left;
  const columns = COURSE_COLUMNS.map((column) => {
    const next = { ...column, x: cursorX };
    cursorX += column.width;
    return next;
  });

  return {
    left,
    width: cursorX - left,
    columns,
  };
};

const drawTermBand = (doc, y, label, table) => {
  doc.save();
  doc.rect(table.left, y, table.width, 14).fillAndStroke(COLORS.lightGray, COLORS.border);
  doc.restore();
  drawText(doc, label, table.left + 3, y + 3.2, {
    width: table.width - 6,
    size: 6.8,
    bold: true,
    align: 'center',
  });
};

const drawCourseHeader = (doc, y, table) => {
  doc.save();
  doc.rect(table.left, y, table.width, 22).fillAndStroke(COLORS.white, COLORS.border);
  doc.restore();

  table.columns.forEach((column) => {
    doc.rect(column.x, y, column.width, 22).lineWidth(0.45).strokeColor(COLORS.border).stroke();
    drawText(doc, column.label, column.x + CELL_PADDING_X, y + 7, {
      width: column.width - CELL_PADDING_X * 2,
      size: 5.9,
      bold: true,
      align: 'center',
    });
  });
};

const rowHeightFor = (doc, row, table) => {
  doc.font('Helvetica').fontSize(6.3);
  const heights = table.columns.map((column) =>
    doc.heightOfString(safeText(row[column.key], ''), {
      width: column.width - CELL_PADDING_X * 2,
      lineGap: 0,
    }),
  );

  return Math.max(16, Math.max(...heights) + CELL_PADDING_Y * 2);
};

const drawCourseRow = (doc, y, row, rowHeight, table) => {
  doc.save();
  doc.rect(table.left, y, table.width, rowHeight).fill(COLORS.white);
  doc.restore();

  table.columns.forEach((column) => {
    doc
      .rect(column.x, y, column.width, rowHeight)
      .lineWidth(0.35)
      .strokeColor(COLORS.border)
      .stroke();
    drawText(doc, row[column.key], column.x + CELL_PADDING_X, y + CELL_PADDING_Y, {
      width: column.width - CELL_PADDING_X * 2,
      size: 6.3,
      bold: column.bold,
      align: column.align,
      fallback: '',
    });
  });
};

const courseToRow = (course, prerequisiteMap) => ({
  code: safeText(course.Course?.code, ''),
  title: safeText(course.Course?.name, ''),
  lectureHours: blankIfMissing(course.Course?.lectureHours),
  laboratoryHours: blankIfMissing(course.Course?.laboratoryHours),
  units: blankIfMissing(course.Course?.units),
  prerequisites: (
    prerequisiteMap.get(String(course.courseId || course.Course?.id || '')) || []
  ).join(', '),
  grade: blankIfMissing(course.grade),
});

const drawNoCourses = (
  doc,
  y,
  table,
  message = 'No courses found in the active study plan version.',
) => {
  y = ensureSpace(doc, y, 24);
  doc.rect(table.left, y, table.width, 20).lineWidth(0.5).strokeColor(COLORS.border).stroke();
  drawText(doc, message, table.left + 4, y + 6, {
    width: table.width - 8,
    size: 7,
    align: 'center',
  });
  return y + 24;
};

const drawCourseTable = (doc, startY, courses, prerequisites) => {
  const table = tableGeometry(doc);
  const prerequisiteMap = buildPrerequisiteMap(prerequisites);
  const remainingCourses = (courses || []).filter((course) => !isCompletedCourse(course));
  let y = startY;

  if (!Array.isArray(courses) || courses.length === 0) {
    drawCourseHeader(doc, y, table);
    return drawNoCourses(doc, y + 22, table);
  }

  if (remainingCourses.length === 0) {
    drawCourseHeader(doc, y, table);
    return drawNoCourses(
      doc,
      y + 22,
      table,
      'No remaining courses found in the active study plan version.',
    );
  }

  groupCourses(remainingCourses).forEach(([groupKey, groupCoursesForTerm]) => {
    const [yearLevel, semester] = groupKey.split('-').map(Number);
    const totalUnits = groupCoursesForTerm.reduce(
      (sum, course) => sum + (Number(course.Course?.units) || 0),
      0,
    );
    const termLabel = `${ordinalYearLabel(yearLevel)}, ${semesterLabel(semester)} (${totalUnits} UNITS)`;

    y = ensureSpace(doc, y, 52);
    drawTermBand(doc, y, termLabel, table);
    y += 14;
    drawCourseHeader(doc, y, table);
    y += 22;

    groupCoursesForTerm.forEach((course) => {
      const row = courseToRow(course, prerequisiteMap);
      const rowHeight = rowHeightFor(doc, row, table);

      if (y + rowHeight > contentBottom(doc)) {
        doc.addPage();
        y = doc.page.margins.top;
        drawTermBand(doc, y, `${termLabel} (CONTINUED)`, table);
        y += 14;
        drawCourseHeader(doc, y, table);
        y += 22;
      }

      drawCourseRow(doc, y, row, rowHeight, table);
      y += rowHeight;
    });
  });

  return y + 8;
};

const drawValidationFooter = (doc, startY, activeVersion, validatingAdviserName) => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  let y = ensureSpace(doc, startY, 84);

  drawRule(doc, y, left, right, 0.7);
  y += 8;

  drawText(doc, `Validating Adviser: ${validatingAdviserName}`, left, y, {
    width: (right - left) / 2,
    size: 7,
    bold: true,
  });
  drawText(
    doc,
    `Validated At: ${formatTimestamp(activeVersion?.validatedAt)}`,
    left + (right - left) / 2,
    y,
    {
      width: (right - left) / 2,
      size: 7,
      bold: true,
      align: 'right',
    },
  );

  y += 18;
  const columnWidth = (right - left - 26) / 2;
  drawText(doc, 'Evaluated by:', left, y, { width: 70, size: 7, bold: true });
  drawRule(doc, y + 9, left + 72, left + columnWidth, 0.5);
  drawText(doc, 'Date:', left, y + 15, { width: 70, size: 7, bold: true });
  drawRule(doc, y + 24, left + 72, left + columnWidth, 0.5);

  const receivedX = left + columnWidth + 26;
  drawText(doc, 'Received by:', receivedX, y, { width: 70, size: 7, bold: true });
  drawRule(doc, y + 9, receivedX + 72, right, 0.5);
  drawText(doc, 'Date:', receivedX, y + 15, { width: 70, size: 7, bold: true });
  drawRule(doc, y + 24, receivedX + 72, right, 0.5);

  return y + 34;
};

const renderStudyPlanPdf = ({
  doc,
  sar,
  activeVersion,
  prerequisites = [],
  validatingAdviserName = 'N/A',
  generatedAt = new Date(),
  logoPath = LOGO_PATH,
}) => {
  let y = drawHeader(doc, sar, activeVersion, generatedAt, logoPath);
  y = drawCourseTable(doc, y, activeVersion?.StudyPlanCourses || [], prerequisites);
  drawValidationFooter(doc, y, activeVersion, validatingAdviserName);
};

module.exports = {
  renderStudyPlanPdf,
  LOGO_PATH,
};
