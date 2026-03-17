const sequelize = require('../database/db');
const User = require('./User');
const Curriculum = require('./Curriculum');
const Course = require('./Course');
const CurriculumCourse = require('./CurriculumCourse');
const Prerequisite = require('./Prerequisite');
const CoRequisite = require('./CoRequisite');
const CourseEquivalency = require('./CourseEquivalency');
const ElectiveTrack = require('./ElectiveTrack');
const ElectiveTrackCourse = require('./ElectiveTrackCourse');
const AcademicTerm = require('./AcademicTerm');
const StudentAcademicRecord = require('./StudentAcademicRecord');
const StudyPlan = require('./StudyPlan');
const StudyPlanVersion = require('./StudyPlanVersion');
const StudyPlanCourse = require('./StudyPlanCourse');
const ForecastSnapshot = require('./ForecastSnapshot');

// Self-referential adviser relationship (still used by profile fields)
User.hasMany(User, { as: 'Advisees', foreignKey: 'adviserId', onDelete: 'SET NULL' });
User.belongsTo(User, { as: 'Adviser', foreignKey: 'adviserId', onDelete: 'SET NULL' });

// User's selected curriculum (profile canonical reference)
User.belongsTo(Curriculum, { as: 'CurriculumRef', foreignKey: 'curriculum_id', onDelete: 'SET NULL' });
Curriculum.hasMany(User, { as: 'EnrolledStudents', foreignKey: 'curriculum_id', onDelete: 'SET NULL' });

// Curriculum <-> CurriculumCourse <-> Course
Curriculum.hasMany(CurriculumCourse, { foreignKey: 'curriculumId' });
CurriculumCourse.belongsTo(Curriculum, { foreignKey: 'curriculumId' });
CurriculumCourse.belongsTo(Course, { foreignKey: 'courseId' });
Course.hasMany(CurriculumCourse, { foreignKey: 'courseId' });

// Curriculum <-> Prerequisite
Curriculum.hasMany(Prerequisite, { foreignKey: 'curriculumId' });
Prerequisite.belongsTo(Curriculum, { foreignKey: 'curriculumId' });
Prerequisite.belongsTo(Course, { as: 'Course', foreignKey: 'courseId' });
Prerequisite.belongsTo(Course, { as: 'PrerequisiteCourse', foreignKey: 'prerequisiteCourseId' });

// Curriculum <-> CoRequisite
Curriculum.hasMany(CoRequisite, { foreignKey: 'curriculumId' });
CoRequisite.belongsTo(Curriculum, { foreignKey: 'curriculumId' });
CoRequisite.belongsTo(Course, { as: 'Course', foreignKey: 'courseId' });
CoRequisite.belongsTo(Course, { as: 'CoRequisiteCourse', foreignKey: 'coRequisiteCourseId' });

// CourseEquivalency
Course.hasMany(CourseEquivalency, { foreignKey: 'courseId' });
Course.hasMany(CourseEquivalency, { as: 'EquivalentFor', foreignKey: 'equivalentCourseId' });
CourseEquivalency.belongsTo(Course, { as: 'Course', foreignKey: 'courseId' });
CourseEquivalency.belongsTo(Course, { as: 'EquivalentCourse', foreignKey: 'equivalentCourseId' });

// Curriculum <-> ElectiveTrack <-> ElectiveTrackCourse <-> Course
Curriculum.hasMany(ElectiveTrack, { foreignKey: 'curriculumId' });
ElectiveTrack.belongsTo(Curriculum, { foreignKey: 'curriculumId' });
ElectiveTrack.hasMany(ElectiveTrackCourse, { foreignKey: 'electiveTrackId' });
ElectiveTrackCourse.belongsTo(ElectiveTrack, { foreignKey: 'electiveTrackId' });
ElectiveTrackCourse.belongsTo(Course, { foreignKey: 'courseId' });

// StudentAcademicRecord associations
StudentAcademicRecord.belongsTo(User, { as: 'Student', foreignKey: 'userId' });
StudentAcademicRecord.belongsTo(User, { as: 'CreatedByAdviser', foreignKey: 'createdByAdviserId' });
StudentAcademicRecord.belongsTo(Curriculum, { foreignKey: 'curriculumId' });
StudentAcademicRecord.belongsTo(ElectiveTrack, { foreignKey: 'electiveTrackId' });
StudentAcademicRecord.hasOne(StudyPlan, { foreignKey: 'studentAcademicRecordId' });

// StudyPlan associations
StudyPlan.belongsTo(StudentAcademicRecord, { foreignKey: 'studentAcademicRecordId' });
StudyPlan.hasMany(StudyPlanVersion, { foreignKey: 'studyPlanId' });

// StudyPlanVersion associations
StudyPlanVersion.belongsTo(StudyPlan, { foreignKey: 'studyPlanId' });
StudyPlanVersion.belongsTo(User, { as: 'GeneratedByAdviser', foreignKey: 'generatedByAdviserId' });
StudyPlanVersion.belongsTo(User, { as: 'ValidatedByAdviser', foreignKey: 'validatedByAdviserId' });
StudyPlanVersion.hasMany(StudyPlanCourse, { foreignKey: 'studyPlanVersionId' });

// StudyPlanCourse associations
StudyPlanCourse.belongsTo(StudyPlanVersion, { foreignKey: 'studyPlanVersionId' });
StudyPlanCourse.belongsTo(Course, { foreignKey: 'courseId' });

// ForecastSnapshot associations
ForecastSnapshot.belongsTo(AcademicTerm, { foreignKey: 'academicTermId' });
ForecastSnapshot.belongsTo(User, { as: 'TriggeredBy', foreignKey: 'triggeredByUserId' });
AcademicTerm.hasMany(ForecastSnapshot, { foreignKey: 'academicTermId' });

// AcademicTerm <-> User (closedBy)
AcademicTerm.belongsTo(User, { as: 'ClosedBy', foreignKey: 'closedById' });

// Curriculum <-> User (createdBy)
Curriculum.belongsTo(User, { as: 'CreatedBy', foreignKey: 'createdById' });

module.exports = {
  sequelize,
  User,
  Curriculum,
  Course,
  CurriculumCourse,
  Prerequisite,
  CoRequisite,
  CourseEquivalency,
  ElectiveTrack,
  ElectiveTrackCourse,
  AcademicTerm,
  StudentAcademicRecord,
  StudyPlan,
  StudyPlanVersion,
  StudyPlanCourse,
  ForecastSnapshot
};
