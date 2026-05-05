const PDFDocument = require('pdfkit');
const {
  StudentAcademicRecord,
  StudyPlan,
  StudyPlanVersion,
  StudyPlanCourse,
  Curriculum,
  Prerequisite,
  Course,
  ElectiveTrack,
  User,
} = require('../models');
const { renderStudyPlanPdf } = require('../utils/studyPlanPdfRenderer');

const normalizeEmail = (email) =>
  String(email || '')
    .trim()
    .toLowerCase();

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

const getAdviserName = (activeVersion) => {
  if (!activeVersion?.ValidatedByAdviser) {
    return 'N/A';
  }

  return `${activeVersion.ValidatedByAdviser.firstName} ${activeVersion.ValidatedByAdviser.lastName}`;
};

const getFilenameSafeStudentNumber = (studentNumber) =>
  String(studentNumber || 'unknown').replace(/[^a-z0-9-_]/gi, '_');

// @desc   Export SAR to PDF
// @route  GET /api/sars/:id/export/pdf
// @access student (own only), adviser, admin
exports.exportSARPDF = async (req, res, next) => {
  try {
    const sar = await StudentAcademicRecord.findByPk(req.params.id, {
      include: [
        { model: Curriculum, attributes: ['id', 'name'] },
        { model: ElectiveTrack, attributes: ['id', 'name'] },
        {
          model: StudyPlan,
          attributes: ['id'],
          include: [
            {
              model: StudyPlanVersion,
              where: { status: 'active' },
              required: false,
              include: [
                {
                  model: User,
                  as: 'ValidatedByAdviser',
                  attributes: ['id', 'firstName', 'lastName', 'email'],
                },
                {
                  model: StudyPlanCourse,
                  include: [
                    {
                      model: Course,
                      attributes: [
                        'id',
                        'code',
                        'name',
                        'units',
                        'lectureHours',
                        'laboratoryHours',
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
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

    if (req.user.role === 'student' && !activeVersion?.validatedAt) {
      return res.status(403).json({
        success: false,
        message: 'Study plan PDF can only be exported after adviser validation.',
      });
    }

    const prerequisites = sar.curriculumId
      ? await Prerequisite.findAll({
          where: { curriculumId: sar.curriculumId },
          include: [
            { model: Course, as: 'PrerequisiteCourse', attributes: ['id', 'code', 'name'] },
          ],
        })
      : [];

    const filenameSafeStudentNumber = getFilenameSafeStudentNumber(sar.studentNumber);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="SAR-${filenameSafeStudentNumber}.pdf"`,
    );

    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    doc.pipe(res);

    renderStudyPlanPdf({
      doc,
      sar,
      activeVersion,
      prerequisites,
      validatingAdviserName: getAdviserName(activeVersion),
    });

    doc.end();
  } catch (error) {
    next(error);
  }
};
