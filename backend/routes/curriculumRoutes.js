const express = require('express');
const multer = require('multer');
const { protect, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/curriculumController');
const validate = require('../middleware/validate');
const {
  createCurriculumValidation,
  updateCurriculumValidation,
  createCourseValidation,
  updateCourseValidation,
  addCourseToCurriculumValidation,
  addPrerequisiteValidation,
  addCoRequisiteValidation,
  addEquivalencyValidation,
  createElectiveTrackValidation,
  curriculumIdParamValidation,
  courseIdParamValidation,
  electiveTrackIdParamValidation,
} = require('../middleware/curriculumValidation');

const router = express.Router();

const adminOnly = [protect, requireRole('admin')];
const adminOrAdviser = [protect, requireRole('admin', 'adviser')];
const anyRole = [protect, requireRole('admin', 'adviser', 'student')];
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const fileName = String(file.originalname || '').toLowerCase();
    if (
      fileName.endsWith('.csv') ||
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      callback(null, true);
      return;
    }
    callback(new Error('Only CSV files are allowed for import.'));
  },
});

// ─── Curriculums ──────────────────────────────────────────────────────────────
router.post('/curriculums', adminOnly, validate(createCurriculumValidation), ctrl.createCurriculum);
router.get('/curriculums', anyRole, ctrl.getCurriculums);
router.get('/curriculums-map', adminOrAdviser, ctrl.getCurriculumsMap);
router.get(
  '/curriculums/:id',
  adminOrAdviser,
  validate(curriculumIdParamValidation),
  ctrl.getCurriculumById,
);
router.put(
  '/curriculums/:id',
  adminOnly,
  validate(updateCurriculumValidation),
  ctrl.updateCurriculum,
);
router.patch(
  '/curriculums/:id/activate',
  adminOnly,
  validate(curriculumIdParamValidation),
  ctrl.setActiveCurriculum,
);
router.get(
  '/curriculums/:id/export/csv',
  adminOnly,
  validate(curriculumIdParamValidation),
  ctrl.exportCurriculumCsv,
);
router.post(
  '/curriculums/:id/import/csv/preview',
  adminOnly,
  validate(curriculumIdParamValidation),
  csvUpload.single('file'),
  ctrl.previewCurriculumImportCsv,
);
router.post(
  '/curriculums/:id/import/csv/apply',
  adminOnly,
  validate(curriculumIdParamValidation),
  csvUpload.single('file'),
  ctrl.applyCurriculumImportCsv,
);

// ─── Courses ──────────────────────────────────────────────────────────────────
router.post('/courses', adminOnly, validate(createCourseValidation), ctrl.createCourse);
router.get('/courses', adminOrAdviser, ctrl.getCourses);
router.put('/courses/:id', adminOnly, validate(updateCourseValidation), ctrl.updateCourse);
router.delete('/courses/:id', adminOnly, validate(courseIdParamValidation), ctrl.deleteCourse);

// ─── Curriculum–Course Assignment ─────────────────────────────────────────────
router.post(
  '/curriculums/:id/courses',
  adminOnly,
  validate(addCourseToCurriculumValidation),
  ctrl.addCourseToCurriculum,
);
router.delete(
  '/curriculums/:id/courses/:ccId',
  adminOnly,
  validate(curriculumIdParamValidation),
  ctrl.removeCourseFromCurriculum,
);
router.get(
  '/curriculums/:id/courses',
  adminOrAdviser,
  validate(curriculumIdParamValidation),
  ctrl.getCurriculumCourses,
);

// ─── Prerequisites ────────────────────────────────────────────────────────────
router.post(
  '/curriculums/:id/prerequisites',
  adminOnly,
  validate(addPrerequisiteValidation),
  ctrl.addPrerequisite,
);
router.delete(
  '/curriculums/:id/prerequisites/:prereqId',
  adminOnly,
  validate(curriculumIdParamValidation),
  ctrl.removePrerequisite,
);
router.get(
  '/curriculums/:id/prerequisites',
  adminOrAdviser,
  validate(curriculumIdParamValidation),
  ctrl.getPrerequisites,
);

// ─── Co-Requisites ────────────────────────────────────────────────────────────
router.post(
  '/curriculums/:id/corequisites',
  adminOnly,
  validate(addCoRequisiteValidation),
  ctrl.addCoRequisite,
);
router.delete(
  '/curriculums/:id/corequisites/:coreqId',
  adminOnly,
  validate(curriculumIdParamValidation),
  ctrl.removeCoRequisite,
);
router.get(
  '/curriculums/:id/corequisites',
  adminOrAdviser,
  validate(curriculumIdParamValidation),
  ctrl.getCoRequisites,
);

// ─── Equivalencies ────────────────────────────────────────────────────────────
router.post('/equivalencies', adminOnly, validate(addEquivalencyValidation), ctrl.addEquivalency);
router.delete(
  '/equivalencies/:id',
  adminOnly,
  validate(courseIdParamValidation),
  ctrl.removeEquivalency,
);
router.get('/equivalencies', adminOrAdviser, ctrl.getEquivalencies);

// ─── Elective Tracks ──────────────────────────────────────────────────────────
router.post(
  '/curriculums/:id/elective-tracks',
  adminOnly,
  validate(createElectiveTrackValidation),
  ctrl.createElectiveTrack,
);
router.get(
  '/curriculums/:id/elective-tracks',
  adminOrAdviser,
  validate(curriculumIdParamValidation),
  ctrl.getElectiveTracks,
);
router.put(
  '/elective-tracks/:id',
  adminOnly,
  validate(electiveTrackIdParamValidation),
  ctrl.updateElectiveTrack,
);
router.delete(
  '/elective-tracks/:id',
  adminOnly,
  validate(electiveTrackIdParamValidation),
  ctrl.deleteElectiveTrack,
);
router.post(
  '/elective-tracks/:id/courses',
  adminOnly,
  validate(electiveTrackIdParamValidation),
  ctrl.addCourseToTrack,
);
router.put(
  '/elective-tracks/:id/courses/:etcId',
  adminOnly,
  validate(electiveTrackIdParamValidation),
  ctrl.updateTrackCourse,
);
router.delete(
  '/elective-tracks/:id/courses/:etcId',
  adminOnly,
  validate(electiveTrackIdParamValidation),
  ctrl.removeCourseFromTrack,
);

module.exports = router;
