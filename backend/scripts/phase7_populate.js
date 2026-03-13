require('dotenv').config();
const {
  sequelize,
  User,
  Curriculum,
  StudentAcademicRecord,
  AcademicTerm,
  ForecastSnapshot
} = require('../models');

(async () => {
  const now = Date.now();
  const curriculum = await Curriculum.findOne({ where: { isActive: true } }) || await Curriculum.findOne();
  const admin = await User.findOne({ where: { email: 'adviser.cpe@tip.edu.ph' } });

  for (let index = 1; index <= 20; index += 1) {
    const email = `bulk.adviser${index}@tip.edu.ph`;
    const existingAdviser = await User.findOne({ where: { email } });

    if (!existingAdviser) {
      await User.create({
        firstName: 'Bulk',
        lastName: `Adviser${index}`,
        email,
        password: '$2a$10$W8WfQ9zY4f9v7hQxM8mI6uWvLhT5m1W1lVf7w6zKxgN5z5N7nYF3m',
        role: 'adviser',
        isActive: true,
        isVerified: true,
        createdAt: now,
        updatedAt: now
      });
    }
  }

  for (let index = 1; index <= 30; index += 1) {
    const studentNumber = `8800${String(index).padStart(4, '0')}`;
    const existingSar = await StudentAcademicRecord.findOne({ where: { studentNumber } });

    if (!existingSar) {
      await StudentAcademicRecord.create({
        userId: null,
        curriculumId: curriculum.id,
        studentName: `Pagination Student ${index}`,
        studentNumber,
        email: `pagination.student${index}@tip.edu.ph`,
        yearLevel: ((index - 1) % 4) + 1,
        createdByAdviserId: admin.id,
        createdAt: now,
        updatedAt: now
      });
    }
  }

  for (let index = 1; index <= 18; index += 1) {
    const start = 2030 + index;
    const schoolYear = `${start}-${start + 1}`;
    const semester = ((index - 1) % 3) + 1;
    const existingTerm = await AcademicTerm.findOne({ where: { schoolYear, semester } });

    if (!existingTerm) {
      await AcademicTerm.create({ schoolYear, semester, isCurrent: false });
    }
  }

  const recentTerms = await AcademicTerm.findAll({ order: [['id', 'DESC']], limit: 15 });
  for (const term of recentTerms) {
    const existingSnapshot = await ForecastSnapshot.findOne({ where: { academicTermId: term.id } });

    if (!existingSnapshot) {
      await ForecastSnapshot.create({
        academicTermId: term.id,
        schoolYear: term.schoolYear,
        semester: term.semester,
        snapshotData: {
          currentDemand: [{ courseId: 1, courseCode: 'CPE101', courseName: 'Intro', units: 3, studentCount: 12 }],
          nextSemesterForecast: [{ courseId: 2, courseCode: 'CPE102', courseName: 'Math', units: 3, studentCount: 10 }],
          generatedAt: now
        },
        triggeredByUserId: admin.id,
        createdAt: now
      });
    }
  }

  console.log('phase7 bulk data ready');
  await sequelize.close();
})().catch(async (error) => {
  console.error(error);
  await sequelize.close();
  process.exit(1);
});
