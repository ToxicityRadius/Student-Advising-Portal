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
const Notification = require('./Notification');

// Self-referential adviser relationship (still used by profile fields)
User.hasMany(User, { as: 'Advisees', foreignKey: 'adviserId', onDelete: 'SET NULL' });
User.belongsTo(User, { as: 'Adviser', foreignKey: 'adviserId', onDelete: 'SET NULL' });

// User's selected curriculum (profile canonical reference)
User.belongsTo(Curriculum, {
  as: 'CurriculumRef',
  foreignKey: 'curriculum_id',
  onDelete: 'SET NULL',
});
Curriculum.hasMany(User, {
  as: 'EnrolledStudents',
  foreignKey: 'curriculum_id',
  onDelete: 'SET NULL',
});

// Curriculum <-> CurriculumCourse <-> Course
Curriculum.hasMany(CurriculumCourse, { foreignKey: 'curriculumId', onDelete: 'CASCADE' });
CurriculumCourse.belongsTo(Curriculum, { foreignKey: 'curriculumId', onDelete: 'CASCADE' });
CurriculumCourse.belongsTo(Course, { foreignKey: 'courseId', onDelete: 'RESTRICT' });
Course.hasMany(CurriculumCourse, { foreignKey: 'courseId', onDelete: 'RESTRICT' });

// Curriculum <-> Prerequisite
Curriculum.hasMany(Prerequisite, { foreignKey: 'curriculumId', onDelete: 'CASCADE' });
Prerequisite.belongsTo(Curriculum, { foreignKey: 'curriculumId', onDelete: 'CASCADE' });
Prerequisite.belongsTo(Course, { as: 'Course', foreignKey: 'courseId', onDelete: 'RESTRICT' });
Prerequisite.belongsTo(Course, {
  as: 'PrerequisiteCourse',
  foreignKey: 'prerequisiteCourseId',
  onDelete: 'RESTRICT',
});

// Curriculum <-> CoRequisite
Curriculum.hasMany(CoRequisite, { foreignKey: 'curriculumId', onDelete: 'CASCADE' });
CoRequisite.belongsTo(Curriculum, { foreignKey: 'curriculumId', onDelete: 'CASCADE' });
CoRequisite.belongsTo(Course, { as: 'Course', foreignKey: 'courseId', onDelete: 'RESTRICT' });
CoRequisite.belongsTo(Course, {
  as: 'CoRequisiteCourse',
  foreignKey: 'coRequisiteCourseId',
  onDelete: 'RESTRICT',
});

// CourseEquivalency
Course.hasMany(CourseEquivalency, { foreignKey: 'courseId', onDelete: 'CASCADE' });
Course.hasMany(CourseEquivalency, {
  as: 'EquivalentFor',
  foreignKey: 'equivalentCourseId',
  onDelete: 'CASCADE',
});
CourseEquivalency.belongsTo(Course, { as: 'Course', foreignKey: 'courseId', onDelete: 'CASCADE' });
CourseEquivalency.belongsTo(Course, {
  as: 'EquivalentCourse',
  foreignKey: 'equivalentCourseId',
  onDelete: 'CASCADE',
});

// Curriculum <-> ElectiveTrack <-> ElectiveTrackCourse <-> Course
Curriculum.hasMany(ElectiveTrack, { foreignKey: 'curriculumId', onDelete: 'CASCADE' });
ElectiveTrack.belongsTo(Curriculum, { foreignKey: 'curriculumId', onDelete: 'CASCADE' });
ElectiveTrack.hasMany(ElectiveTrackCourse, { foreignKey: 'electiveTrackId', onDelete: 'CASCADE' });
ElectiveTrackCourse.belongsTo(ElectiveTrack, {
  foreignKey: 'electiveTrackId',
  onDelete: 'CASCADE',
});
ElectiveTrackCourse.belongsTo(Course, { foreignKey: 'courseId', onDelete: 'RESTRICT' });

// StudentAcademicRecord associations
StudentAcademicRecord.belongsTo(User, { as: 'Student', foreignKey: 'userId' });
StudentAcademicRecord.belongsTo(User, { as: 'CreatedByAdviser', foreignKey: 'createdByAdviserId' });
StudentAcademicRecord.belongsTo(Curriculum, { foreignKey: 'curriculumId' });
StudentAcademicRecord.belongsTo(ElectiveTrack, { foreignKey: 'electiveTrackId' });
StudentAcademicRecord.hasOne(StudyPlan, {
  foreignKey: 'studentAcademicRecordId',
  onDelete: 'CASCADE',
});

// StudyPlan associations
StudyPlan.belongsTo(StudentAcademicRecord, {
  foreignKey: 'studentAcademicRecordId',
  onDelete: 'CASCADE',
});
StudyPlan.hasMany(StudyPlanVersion, { foreignKey: 'studyPlanId', onDelete: 'CASCADE' });

// StudyPlanVersion associations
StudyPlanVersion.belongsTo(StudyPlan, { foreignKey: 'studyPlanId', onDelete: 'CASCADE' });
StudyPlanVersion.belongsTo(User, {
  as: 'GeneratedByAdviser',
  foreignKey: 'generatedByAdviserId',
  onDelete: 'SET NULL',
});
StudyPlanVersion.belongsTo(User, {
  as: 'ValidatedByAdviser',
  foreignKey: 'validatedByAdviserId',
  onDelete: 'SET NULL',
});
StudyPlanVersion.hasMany(StudyPlanCourse, {
  foreignKey: 'studyPlanVersionId',
  onDelete: 'CASCADE',
});

// StudyPlanCourse associations
StudyPlanCourse.belongsTo(StudyPlanVersion, {
  foreignKey: 'studyPlanVersionId',
  onDelete: 'CASCADE',
});
StudyPlanCourse.belongsTo(Course, { foreignKey: 'courseId', onDelete: 'RESTRICT' });

// ForecastSnapshot associations
ForecastSnapshot.belongsTo(AcademicTerm, { foreignKey: 'academicTermId', onDelete: 'CASCADE' });
ForecastSnapshot.belongsTo(User, {
  as: 'TriggeredBy',
  foreignKey: 'triggeredByUserId',
  onDelete: 'SET NULL',
});
AcademicTerm.hasMany(ForecastSnapshot, { foreignKey: 'academicTermId', onDelete: 'CASCADE' });

// AcademicTerm <-> User (closedBy)
AcademicTerm.belongsTo(User, { as: 'ClosedBy', foreignKey: 'closedById' });

// Curriculum <-> User (createdBy)
Curriculum.belongsTo(User, { as: 'CreatedBy', foreignKey: 'createdById' });

// Notification associations
Notification.belongsTo(User, { as: 'Recipient', foreignKey: 'recipientId', onDelete: 'CASCADE' });
Notification.belongsTo(User, { as: 'Actor', foreignKey: 'actorId', onDelete: 'SET NULL' });
User.hasMany(Notification, { as: 'Notifications', foreignKey: 'recipientId', onDelete: 'CASCADE' });

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
  ForecastSnapshot,
  Notification,
};
