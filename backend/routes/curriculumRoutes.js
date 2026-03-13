const express = require('express');
const multer = require('multer');
const { protect, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/curriculumController');

const router = express.Router();

const adminOnly = [protect, requireRole('admin')];
const adminOrAdviser = [protect, requireRole('admin', 'adviser')];
const csvUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 3 * 1024 * 1024 },
	fileFilter: (req, file, callback) => {
		const fileName = String(file.originalname || '').toLowerCase();
		if (fileName.endsWith('.csv') || file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
			callback(null, true);
			return;
		}
		callback(new Error('Only CSV files are allowed for import.'));
	}
});

// ─── Curriculums ──────────────────────────────────────────────────────────────
router.post('/curriculums', adminOnly, ctrl.createCurriculum);
router.get('/curriculums', adminOrAdviser, ctrl.getCurriculums);
router.get('/curriculums/:id', adminOrAdviser, ctrl.getCurriculumById);
router.put('/curriculums/:id', adminOnly, ctrl.updateCurriculum);
router.patch('/curriculums/:id/activate', adminOnly, ctrl.setActiveCurriculum);
router.get('/curriculums/:id/export/csv', adminOnly, ctrl.exportCurriculumCsv);
router.post('/curriculums/:id/import/csv/preview', adminOnly, csvUpload.single('file'), ctrl.previewCurriculumImportCsv);
router.post('/curriculums/:id/import/csv/apply', adminOnly, csvUpload.single('file'), ctrl.applyCurriculumImportCsv);

// ─── Courses ──────────────────────────────────────────────────────────────────
router.post('/courses', adminOnly, ctrl.createCourse);
router.get('/courses', adminOrAdviser, ctrl.getCourses);
router.put('/courses/:id', adminOnly, ctrl.updateCourse);
router.delete('/courses/:id', adminOnly, ctrl.deleteCourse);

// ─── Curriculum–Course Assignment ─────────────────────────────────────────────
router.post('/curriculums/:id/courses', adminOnly, ctrl.addCourseToCurriculum);
router.delete('/curriculums/:id/courses/:ccId', adminOnly, ctrl.removeCourseFromCurriculum);
router.get('/curriculums/:id/courses', adminOrAdviser, ctrl.getCurriculumCourses);

// ─── Prerequisites ────────────────────────────────────────────────────────────
router.post('/curriculums/:id/prerequisites', adminOnly, ctrl.addPrerequisite);
router.delete('/curriculums/:id/prerequisites/:prereqId', adminOnly, ctrl.removePrerequisite);
router.get('/curriculums/:id/prerequisites', adminOrAdviser, ctrl.getPrerequisites);

// ─── Co-Requisites ────────────────────────────────────────────────────────────
router.post('/curriculums/:id/corequisites', adminOnly, ctrl.addCoRequisite);
router.delete('/curriculums/:id/corequisites/:coreqId', adminOnly, ctrl.removeCoRequisite);
router.get('/curriculums/:id/corequisites', adminOrAdviser, ctrl.getCoRequisites);

// ─── Equivalencies ────────────────────────────────────────────────────────────
router.post('/equivalencies', adminOnly, ctrl.addEquivalency);
router.delete('/equivalencies/:id', adminOnly, ctrl.removeEquivalency);
router.get('/equivalencies', adminOrAdviser, ctrl.getEquivalencies);

// ─── Elective Tracks ──────────────────────────────────────────────────────────
router.post('/curriculums/:id/elective-tracks', adminOnly, ctrl.createElectiveTrack);
router.get('/curriculums/:id/elective-tracks', adminOrAdviser, ctrl.getElectiveTracks);
router.put('/elective-tracks/:id', adminOnly, ctrl.updateElectiveTrack);
router.delete('/elective-tracks/:id', adminOnly, ctrl.deleteElectiveTrack);
router.post('/elective-tracks/:id/courses', adminOnly, ctrl.addCourseToTrack);
router.delete('/elective-tracks/:id/courses/:etcId', adminOnly, ctrl.removeCourseFromTrack);

module.exports = router;
