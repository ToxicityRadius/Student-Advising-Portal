const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const {
  StudentAcademicRecord,
  StudyPlan,
  StudyPlanVersion,
  StudyPlanCourse,
  Curriculum,
  CurriculumCourse,
  Prerequisite,
  AcademicTerm,
  Course,
  ElectiveTrack,
  User
} = require('../models');
const { computeSarAnalytics } = require('../utils/sarAnalytics');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const isSarOwnedByUser = (sar, user) => {
  if (!sar || !user) {
    return false;
  }

  const sarEmail = normalizeEmail(sar.email);
  const userEmail = normalizeEmail(user.email);

  return (
    String(sar.userId || '') === String(user.id || '') ||
    (sarEmail && userEmail && sarEmail === userEmail) ||
    (sar.studentNumber && user.studentId && String(sar.studentNumber) === String(user.studentId))
  );
};

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

const semesterLabel = (semester) => {
  if (Number(semester) === 1) return '1st Semester';
  if (Number(semester) === 2) return '2nd Semester';
  if (Number(semester) === 3) return 'Summer';
  return `Semester ${semester}`;
};

const ensureSpace = (doc, minHeight = 40) => {
  const maxY = doc.page.height - doc.page.margins.bottom;
  if (doc.y + minHeight > maxY) {
    doc.addPage();
  }
};

const drawSectionTitle = (doc, title, subtitle = '') => {
  ensureSpace(doc, 36);
  doc.moveDown(0.7);
  doc.fontSize(11.5).font('Helvetica-Bold').fillColor('#111111').text(title);
  if (subtitle) {
    doc.moveDown(0.1);
    doc.fontSize(9).font('Helvetica').fillColor('#4B5563').text(subtitle);
  }
  doc.moveDown(0.2);
  const lineY = doc.y;
  doc.moveTo(doc.page.margins.left, lineY)
    .lineTo(doc.page.width - doc.page.margins.right, lineY)
    .lineWidth(0.7)
    .strokeColor('#D1D5DB')
    .stroke();
  doc.moveDown(0.5);
  doc.fillColor('#111111').fontSize(9.5).font('Helvetica');
};

const drawTag = (doc, text, options = {}) => {
  const tagText = String(text || 'N/A');
  const x = options.x ?? doc.x;
  const y = options.y ?? doc.y;
  const paddingX = 6;
  const paddingY = 3;
  const width = doc.widthOfString(tagText, { font: 'Helvetica-Bold', size: 8.5 }) + paddingX * 2;
  const height = 16;

  doc.save();
  doc.roundedRect(x, y, width, height, 3).fillAndStroke(options.background || '#F3F4F6', options.border || '#D1D5DB');
  doc.fillColor(options.color || '#111111').font('Helvetica-Bold').fontSize(8.5).text(tagText, x + paddingX, y + paddingY + 0.5, {
    width: width - paddingX * 2,
    align: 'center'
  });
  doc.restore();

  return { width, height };
};

const drawKpiCards = (doc, cards) => {
  if (!Array.isArray(cards) || cards.length === 0) {
    return;
  }

  ensureSpace(doc, 78);
  const gap = 10;
  const totalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const cardWidth = (totalWidth - gap * (cards.length - 1)) / cards.length;
  const startX = doc.page.margins.left;
  const startY = doc.y;
  const cardHeight = 58;

  cards.forEach((card, index) => {
    const x = startX + index * (cardWidth + gap);
    doc.save();
    doc.roundedRect(x, startY, cardWidth, cardHeight, 6).fillAndStroke('#F9FAFB', '#E5E7EB');
    doc.fillColor('#6B7280').font('Helvetica').fontSize(8.5).text(card.label || 'Metric', x + 8, startY + 8, {
      width: cardWidth - 16
    });
    doc.fillColor('#111111').font('Helvetica-Bold').fontSize(14).text(card.value || 'N/A', x + 8, startY + 24, {
      width: cardWidth - 16
    });
    if (card.hint) {
      doc.fillColor('#4B5563').font('Helvetica').fontSize(8).text(card.hint, x + 8, startY + 43, {
        width: cardWidth - 16
      });
    }
    doc.restore();
  });

  doc.y = startY + cardHeight + 6;
};

const drawKeyValueGrid = (doc, rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  const leftX = doc.page.margins.left;
  const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columnGap = 16;
  const columnWidth = (availableWidth - columnGap) / 2;

  for (let index = 0; index < rows.length; index += 2) {
    const leftItem = rows[index];
    const rightItem = rows[index + 1] || null;

    ensureSpace(doc, 30);
    const rowY = doc.y;
    const leftHeight = drawKeyValueItem(doc, leftX, rowY, columnWidth, leftItem);
    const rightHeight = rightItem
      ? drawKeyValueItem(doc, leftX + columnWidth + columnGap, rowY, columnWidth, rightItem)
      : 0;

    doc.y = rowY + Math.max(leftHeight, rightHeight, 24) + 2;
  }
};

const drawKeyValueItem = (doc, x, y, width, item) => {
  const label = item?.label || 'Field';
  const value = item?.value || 'N/A';

  doc.font('Helvetica-Bold').fontSize(8.3).fillColor('#4B5563').text(label.toUpperCase(), x, y, {
    width
  });

  const valueY = y + 11;
  doc.font('Helvetica').fontSize(9.5).fillColor('#111111').text(value, x, valueY, {
    width,
    lineGap: 1
  });

  const valueHeight = doc.heightOfString(value, {
    width,
    lineGap: 1
  });

  return valueHeight + 14;
};

const resolveUploadPathFromPublicPath = (publicPath) => {
  if (!publicPath || !String(publicPath).startsWith('/uploads/')) {
    return null;
  }

  const normalized = String(publicPath).replace(/\\/g, '/');
  const relative = normalized.replace(/^\/uploads\//, '');
  return path.join(__dirname, '../uploads', relative);
};

const drawProfilePhoto = (doc, profilePicturePath) => {
  const localImagePath = resolveUploadPathFromPublicPath(profilePicturePath);

  if (!localImagePath || !fs.existsSync(localImagePath)) {
    return;
  }

  try {
    const photoSize = 72;
    doc.image(localImagePath, doc.page.width - doc.page.margins.right - photoSize, 45, {
      fit: [photoSize, photoSize],
      align: 'center',
      valign: 'center'
    });
  } catch {
    // Skip photo rendering if PDFKit cannot parse the image.
  }
};

const drawTableHeader = (doc, columns, y) => {
  doc.save();
  doc.roundedRect(doc.page.margins.left, y, doc.page.width - doc.page.margins.left - doc.page.margins.right, 18, 4)
    .fillAndStroke('#F3F4F6', '#E5E7EB');

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#111111');
  columns.forEach((column) => {
    doc.text(column.label, column.x, y + 5, {
      width: column.width,
      align: column.align || 'left'
    });
  });
  doc.restore();
};

const drawStudyPlanRows = (doc, courses) => {
  if (!Array.isArray(courses) || courses.length === 0) {
    doc.fontSize(9.5).font('Helvetica').fillColor('#4B5563').text('No courses found in the active study plan version.');
    return;
  }

  const sortedCourses = [...courses].sort((left, right) => {
    if (Number(left.yearLevel) !== Number(right.yearLevel)) {
      return Number(left.yearLevel) - Number(right.yearLevel);
    }

    if (Number(left.semester) !== Number(right.semester)) {
      return Number(left.semester) - Number(right.semester);
    }

    return String(left.Course?.code || '').localeCompare(String(right.Course?.code || ''));
  });

  const columns = [
    { label: 'Year / Sem', x: 52, width: 90 },
    { label: 'Code', x: 142, width: 70 },
    { label: 'Course Name', x: 212, width: 170 },
    { label: 'Units', x: 382, width: 45, align: 'right' },
    { label: 'Grade', x: 427, width: 50, align: 'right' },
    { label: 'Status', x: 477, width: 78, align: 'right' }
  ];

  ensureSpace(doc, 44);
  let currentY = doc.y;
  drawTableHeader(doc, columns, currentY);
  currentY += 22;

  sortedCourses.forEach((course) => {
    if (currentY > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      currentY = doc.page.margins.top;
      drawTableHeader(doc, columns, currentY);
      currentY += 22;
    }

    const rowY = currentY;
    const yearSem = `Y${course.yearLevel} ${semesterLabel(course.semester)}`;
    const isFailStatus = String(course.status || '').toLowerCase() === 'failed';
    const rowHeight = 17;

    doc.save();
    if (isFailStatus) {
      doc.roundedRect(doc.page.margins.left, rowY - 1, doc.page.width - doc.page.margins.left - doc.page.margins.right, rowHeight, 3)
        .fill('#FEF2F2');
    }
    doc.restore();

    doc.font('Helvetica').fontSize(8.9).fillColor('#111111').text(yearSem, 52, rowY + 3, { width: 90 });
    doc.text(course.Course?.code || 'N/A', 142, rowY + 3, { width: 70 });
    doc.text(course.Course?.name || 'N/A', 212, rowY + 3, { width: 170, ellipsis: true });
    doc.text(String(course.Course?.units ?? ''), 382, rowY + 3, { width: 45, align: 'right' });
    doc.text(course.grade || 'Pending', 427, rowY + 3, { width: 50, align: 'right' });
    doc.font('Helvetica-Bold').text((course.status || 'pending').toUpperCase(), 477, rowY + 3, {
      width: 78,
      align: 'right'
    });

    currentY += rowHeight;
  });

  doc.y = currentY + 2;
};

const drawPrerequisiteHighlights = (doc, analytics) => {
  const unmetSubjects = Array.isArray(analytics?.prerequisiteChecking?.subjects)
    ? analytics.prerequisiteChecking.subjects.filter((subject) => Array.isArray(subject.unmetPrerequisites) && subject.unmetPrerequisites.length > 0)
    : [];

  const total = Array.isArray(analytics?.prerequisiteChecking?.subjects)
    ? analytics.prerequisiteChecking.subjects.length
    : 0;

  const met = analytics?.prerequisiteChecking?.metSubjects ?? Math.max(total - unmetSubjects.length, 0);

  drawKeyValueGrid(doc, [
    { label: 'Prerequisite Coverage', value: `${met} met / ${total} evaluated` },
    { label: 'Subjects With Unmet Prerequisites', value: String(unmetSubjects.length) }
  ]);

  if (unmetSubjects.length === 0) {
    doc.moveDown(0.1);
    doc.font('Helvetica').fontSize(9.2).fillColor('#065F46').text('No unmet prerequisite risks detected in the current active plan.');
    return;
  }

  doc.moveDown(0.2);
  doc.font('Helvetica-Bold').fontSize(9.3).fillColor('#111111').text('Top prerequisite risk subjects');
  doc.moveDown(0.2);

  unmetSubjects.slice(0, 8).forEach((subject) => {
    ensureSpace(doc, 24);
    const unmetCodes = subject.unmetPrerequisites
      .map((item) => item.prerequisiteCode)
      .filter(Boolean)
      .join(', ');

    doc.font('Helvetica-Bold').fontSize(8.9).fillColor('#111111').text(`${subject.courseCode || 'N/A'} — ${subject.courseName || 'Untitled Subject'}`);
    doc.font('Helvetica').fontSize(8.7).fillColor('#4B5563').text(`Unmet prerequisites: ${unmetCodes || 'N/A'}`);
    doc.moveDown(0.2);
  });
};

const formatVersionMetadata = (activeVersion) => {
  if (!activeVersion) {
    return 'No active version';
  }

  return `Version ${activeVersion.versionNumber || 'N/A'} · ${String(activeVersion.status || 'unknown').toUpperCase()}`;
};

// @desc   Export SAR to PDF
// @route  GET /api/sars/:id/export/pdf
// @access student (own only), adviser, admin
exports.exportSARPDF = async (req, res, next) => {
  try {
    const sar = await StudentAcademicRecord.findByPk(req.params.id, {
      include: [
        { model: Curriculum, attributes: ['id', 'name'] },
        { model: ElectiveTrack, attributes: ['id', 'name'] },
        { model: User, as: 'Student', attributes: ['id', 'profile_picture'] },
        { model: User, as: 'CreatedByAdviser', attributes: ['id', 'firstName', 'lastName', 'email'] },
        {
          model: StudyPlan,
          attributes: ['id'],
          include: [
            {
              model: StudyPlanVersion,
              where: { status: 'active' },
              required: false,
              include: [
                { model: User, as: 'ValidatedByAdviser', attributes: ['id', 'firstName', 'lastName', 'email'] },
                {
                  model: StudyPlanCourse,
                  include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }]
                }
              ]
            }
          ]
        }
      ]
    });

    if (!sar) {
      return res.status(404).json({ success: false, message: 'Student academic record not found' });
    }

    if (req.user.role === 'student' && !isSarOwnedByUser(sar, req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const activeVersion = Array.isArray(sar.StudyPlan?.StudyPlanVersions)
      ? sar.StudyPlan.StudyPlanVersions[0] || null
      : null;

    const allVersions = sar.StudyPlan?.id
      ? await StudyPlanVersion.findAll({
        where: { studyPlanId: sar.StudyPlan.id },
        include: [
          { model: User, as: 'GeneratedByAdviser', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'ValidatedByAdviser', attributes: ['id', 'firstName', 'lastName', 'email'] },
          {
            model: StudyPlanCourse,
            include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }]
          }
        ],
        order: [['versionNumber', 'DESC'], ['createdAt', 'DESC']]
      })
      : [];

    const [curriculumCourses, prerequisites, currentTerm] = await Promise.all([
      CurriculumCourse.findAll({
        where: { curriculumId: sar.curriculumId },
        include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
        order: [['yearLevel', 'ASC'], ['semester', 'ASC'], [Course, 'code', 'ASC']]
      }),
      Prerequisite.findAll({
        where: { curriculumId: sar.curriculumId },
        include: [{ model: Course, as: 'PrerequisiteCourse', attributes: ['id', 'code', 'name'] }]
      }),
      AcademicTerm.findOne({ where: { isCurrent: true }, attributes: ['id', 'schoolYear', 'semester'] })
    ]);

    const analytics = computeSarAnalytics({
      sar,
      studyPlanVersions: allVersions,
      activeStudyPlanVersion: activeVersion,
      curriculumCourses,
      prerequisites,
      currentTerm
    });

    const validatingAdviserName = activeVersion?.ValidatedByAdviser
      ? `${activeVersion.ValidatedByAdviser.firstName} ${activeVersion.ValidatedByAdviser.lastName}`
      : 'N/A';

    const filenameSafeStudentNumber = String(sar.studentNumber || 'unknown').replace(/[^a-z0-9-_]/gi, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="SAR-${filenameSafeStudentNumber}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    drawProfilePhoto(doc, sar.Student?.profile_picture);

    doc.fontSize(17).font('Helvetica-Bold').fillColor('#111111').text('Technological Institute of the Philippines', {
      align: 'center'
    });
    doc.fontSize(13.5).font('Helvetica-Bold').fillColor('#1F2937').text('Student Academic Record Summary Report', {
      align: 'center'
    });
    doc.moveDown(0.2);

    const tagStartX = doc.page.margins.left;
    const tagY = doc.y;
    const roleTag = drawTag(doc, req.user.role === 'admin' ? 'Program Chair Access' : `${req.user.role} Access`, {
      x: tagStartX,
      y: tagY,
      background: '#FEF3C7',
      border: '#FCD34D'
    });
    const versionTag = drawTag(doc, formatVersionMetadata(activeVersion), {
      x: tagStartX + roleTag.width + 8,
      y: tagY,
      background: '#DBEAFE',
      border: '#93C5FD'
    });
    drawTag(doc, `Generated ${new Date().toLocaleString()}`, {
      x: tagStartX + roleTag.width + versionTag.width + 16,
      y: tagY,
      background: '#F3F4F6',
      border: '#D1D5DB'
    });

    doc.y = tagY + 20;

    drawSectionTitle(doc, 'Student Profile', 'Identity and account-linked record information');
    drawKeyValueGrid(doc, [
      { label: 'Full Name', value: sar.studentName },
      { label: 'Student Number', value: sar.studentNumber },
      { label: 'Email', value: sar.email },
      { label: 'Year Level', value: `Year ${sar.yearLevel || 'N/A'}` },
      { label: 'Curriculum', value: sar.Curriculum?.name || 'N/A' },
      { label: 'Elective Track', value: sar.ElectiveTrack?.name || 'Not selected' }
    ]);

    drawSectionTitle(doc, 'Progress Snapshot', 'Core completion and performance indicators');
    drawKpiCards(doc, [
      {
        label: 'Completion',
        value: `${Number(analytics.progress?.completionPercentage || 0).toFixed(2)}%`,
        hint: analytics.progress?.unitsCompletedVsTotal || 'Units summary unavailable'
      },
      {
        label: 'Remaining Units',
        value: String(analytics.progress?.remainingUnits ?? 'N/A'),
        hint: `Remaining semesters: ${analytics.remainingSemestersTracking?.estimatedRemainingSemesters ?? 'N/A'}`
      },
      {
        label: 'Current GWA',
        value: analytics.gpaMonitoring?.gwa != null ? String(analytics.gpaMonitoring.gwa) : 'N/A',
        hint: `${analytics.subjectsTakenSummary?.passed ?? 0} passed / ${analytics.subjectsTakenSummary?.failed ?? 0} failed`
      }
    ]);

    drawSectionTitle(doc, 'Academic Intelligence', 'Eligibility, risk, and projected graduation timeline');
    drawKeyValueGrid(doc, [
      {
        label: 'Estimated Graduation',
        value: analytics.estimatedGraduationDate?.label || 'N/A'
      },
      {
        label: 'Review Workflow',
        value: analytics.adviserReviewWorkflow?.reviewStatus || 'N/A'
      }
    ]);
    drawPrerequisiteHighlights(doc, analytics);

    drawSectionTitle(doc, 'Active Study Plan', 'Current version coursework and status');
    drawStudyPlanRows(doc, activeVersion?.StudyPlanCourses || []);

    drawSectionTitle(doc, 'Validation & Metadata', 'Adviser validation and generation context');
    drawKeyValueGrid(doc, [
      { label: 'Validating Adviser', value: validatingAdviserName },
      { label: 'Validated At', value: formatTimestamp(activeVersion?.validatedAt) },
      { label: 'Record ID', value: String(sar.id || 'N/A') },
      { label: 'Version Metadata', value: formatVersionMetadata(activeVersion) }
    ]);

    doc.moveDown(0.8);
    doc.fontSize(8.3).fillColor('#6B7280').font('Helvetica').text(
      `Generated by Student Advising Portal • ${new Date().toLocaleString()} • Curriculum: ${sar.Curriculum?.name || 'N/A'}`,
      { align: 'left' }
    );

    doc.end();
  } catch (error) {
    next(error);
  }
};
