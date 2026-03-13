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

const drawSectionTitle = (doc, title) => {
  doc.moveDown(0.8);
  doc.fontSize(13).font('Helvetica-Bold').text(title);
  doc.moveDown(0.2);
  doc.fontSize(10).font('Helvetica');
};

const drawInfoRow = (doc, label, value) => {
  doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
  doc.font('Helvetica').text(value || 'N/A');
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

const drawStudyPlanRows = (doc, courses) => {
  if (!Array.isArray(courses) || courses.length === 0) {
    doc.text('No courses in active study plan version.');
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

  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('Year/Sem', 50, doc.y, { width: 85 });
  doc.text('Code', 135, doc.y - 10, { width: 65 });
  doc.text('Course Name', 200, doc.y - 10, { width: 200 });
  doc.text('Units', 400, doc.y - 10, { width: 40, align: 'right' });
  doc.text('Grade', 445, doc.y - 10, { width: 45, align: 'right' });
  doc.text('Status', 495, doc.y - 10, { width: 65, align: 'right' });
  doc.moveDown(0.2);

  doc.font('Helvetica').fontSize(9);

  sortedCourses.forEach((course) => {
    if (doc.y > 730) {
      doc.addPage();
    }

    const rowY = doc.y;
    const yearSem = `Y${course.yearLevel} ${semesterLabel(course.semester)}`;

    doc.text(yearSem, 50, rowY, { width: 85 });
    doc.text(course.Course?.code || 'N/A', 135, rowY, { width: 65 });
    doc.text(course.Course?.name || 'N/A', 200, rowY, { width: 200 });
    doc.text(String(course.Course?.units ?? ''), 400, rowY, { width: 40, align: 'right' });
    doc.text(course.grade || 'Pending', 445, rowY, { width: 45, align: 'right' });
    doc.text((course.status || 'pending').toUpperCase(), 495, rowY, { width: 65, align: 'right' });
    doc.moveDown(0.4);
  });
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

    doc.fontSize(16).font('Helvetica-Bold').text('Technological Institute of the Philippines', { align: 'center' });
    doc.fontSize(15).font('Helvetica-Bold').text('Student Academic Record', { align: 'center' });

    drawSectionTitle(doc, 'Section 1: Student Information');
    drawInfoRow(doc, 'Name', sar.studentName);
    drawInfoRow(doc, 'Student Number', sar.studentNumber);
    drawInfoRow(doc, 'Email', sar.email);
    drawInfoRow(doc, 'Year Level', `Year ${sar.yearLevel}`);

    drawSectionTitle(doc, 'Section 2: Curriculum Information');
    drawInfoRow(doc, 'Curriculum', sar.Curriculum?.name || 'N/A');
    drawInfoRow(doc, 'Program Completion', `${analytics.progress?.completionPercentage ?? 0}%`);
    drawInfoRow(doc, 'Units Completed / Total', analytics.progress?.unitsCompletedVsTotal || 'N/A');
    drawInfoRow(doc, 'Remaining Units', String(analytics.progress?.remainingUnits ?? 'N/A'));

    drawSectionTitle(doc, 'Section 2A: Academic Intelligence');
    drawInfoRow(doc, 'GWA', analytics.gpaMonitoring?.gwa != null ? String(analytics.gpaMonitoring.gwa) : 'N/A');
    drawInfoRow(
      doc,
      'Subjects Taken (Passed / Failed)',
      `${analytics.subjectsTakenSummary?.passed ?? 0} / ${analytics.subjectsTakenSummary?.failed ?? 0}`
    );
    drawInfoRow(
      doc,
      'Prerequisite Eligibility (Met / Unmet)',
      `${analytics.prerequisiteChecking?.metSubjects ?? 0} / ${analytics.prerequisiteChecking?.unmetSubjects ?? 0}`
    );
    drawInfoRow(
      doc,
      'Estimated Remaining Semesters',
      String(analytics.remainingSemestersTracking?.estimatedRemainingSemesters ?? 0)
    );
    drawInfoRow(
      doc,
      'Estimated Graduation',
      analytics.estimatedGraduationDate?.label || 'N/A'
    );

    drawSectionTitle(doc, 'Section 3: Selected Elective Track');
    drawInfoRow(doc, 'Track', sar.ElectiveTrack?.name || 'Not selected');

    drawSectionTitle(doc, 'Section 4: Study Plan');
    drawStudyPlanRows(doc, activeVersion?.StudyPlanCourses || []);

    drawSectionTitle(doc, 'Section 5: Validation Information');
    drawInfoRow(doc, 'Validating Adviser', validatingAdviserName);
    drawInfoRow(doc, 'Validated At', formatTimestamp(activeVersion?.validatedAt));
    drawInfoRow(doc, 'Review Workflow Status', analytics.adviserReviewWorkflow?.reviewStatus || 'N/A');

    doc.moveDown(1.2);
    doc.fontSize(9).font('Helvetica').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'left' });

    doc.end();
  } catch (error) {
    next(error);
  }
};
