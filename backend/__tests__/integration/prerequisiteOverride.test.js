const request = require('supertest');
const { app, models, helpers } = require('./support/helpers');

const { StudentAcademicRecord, Curriculum, Course, CurriculumCourse, Prerequisite, AcademicTerm } =
  models;
const { syncDB, closeDB, createUser, authToken } = helpers;

const slotIndex = (course) => (Number(course.yearLevel) - 1) * 3 + (Number(course.semester) - 1);

const findCourse = (version, code) =>
  (version.StudyPlanCourses || []).find((entry) => entry.Course?.code === code);

async function createPrerequisiteScenario() {
  const admin = await createUser({ role: 'admin', email: `admin-${Date.now()}@tip.edu.ph` });
  const adviser = await createUser({
    role: 'adviser',
    email: `adviser-${Date.now()}@tip.edu.ph`,
  });
  const student = await createUser({
    role: 'student',
    email: `student-${Date.now()}@tip.edu.ph`,
    studentId: `S${Date.now()}`,
  });

  await AcademicTerm.create({
    schoolYear: '2025-2026',
    semester: 1,
    isCurrent: true,
    startedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const curriculum = await Curriculum.create({
    name: `Override Curriculum ${Date.now()}`,
    description: 'Prerequisite override test curriculum',
    isActive: true,
    createdById: admin.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const calculus1 = await Course.create({
    code: 'CALC101',
    name: 'Calculus 1',
    units: 3,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  const calculus2 = await Course.create({
    code: 'CALC102',
    name: 'Calculus 2',
    units: 3,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  const unrelated = await Course.create({
    code: 'CPE104',
    name: 'Computer Engineering 104',
    units: 3,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  await CurriculumCourse.bulkCreate([
    {
      curriculumId: curriculum.id,
      courseId: calculus1.id,
      yearLevel: 1,
      semester: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      curriculumId: curriculum.id,
      courseId: calculus2.id,
      yearLevel: 1,
      semester: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      curriculumId: curriculum.id,
      courseId: unrelated.id,
      yearLevel: 1,
      semester: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]);

  await Prerequisite.create({
    curriculumId: curriculum.id,
    courseId: calculus2.id,
    prerequisiteCourseId: calculus1.id,
  });

  const sar = await StudentAcademicRecord.create({
    userId: student.id,
    curriculumId: curriculum.id,
    studentName: 'Override Student',
    studentNumber: student.studentId,
    email: student.email,
    yearLevel: 1,
    createdByAdviserId: adviser.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const adviserToken = authToken(adviser);
  const adminToken = authToken(admin);

  const generateRes = await request(app)
    .post(`/api/sars/${sar.id}/study-plan/generate`)
    .set('Authorization', `Bearer ${adviserToken}`)
    .send({});
  expect(generateRes.status).toBe(201);

  const validateRes = await request(app)
    .patch(`/api/sars/${sar.id}/study-plan/versions/${generateRes.body.data.id}/validate`)
    .set('Authorization', `Bearer ${adviserToken}`)
    .send({});
  expect(validateRes.status).toBe(200);

  const versionsRes = await request(app)
    .get(`/api/sars/${sar.id}/study-plan/versions`)
    .set('Authorization', `Bearer ${adviserToken}`);
  const activeVersion = versionsRes.body.data.find((version) => version.status === 'active');
  const calc1Row = findCourse(activeVersion, 'CALC101');

  const gradeRes = await request(app)
    .put(`/api/sars/${sar.id}/study-plan/active-version/grades`)
    .set('Authorization', `Bearer ${adviserToken}`)
    .send({
      grades: [{ studyPlanCourseId: calc1Row.id, grade: '5.00', status: 'failed' }],
    });
  expect(gradeRes.status).toBe(200);

  return {
    adminToken,
    adviserToken,
    sar,
    calculus1,
    calculus2,
    activeVersion,
    calc1Row,
  };
}

describe('prerequisite override regeneration flow', () => {
  beforeEach(async () => {
    await syncDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  test('requires retake placement for failed prerequisite courses before regeneration', async () => {
    const { adviserToken, sar } = await createPrerequisiteScenario();

    const res = await request(app)
      .post(`/api/sars/${sar.id}/study-plan/regenerate`)
      .set('Authorization', `Bearer ${adviserToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MISSING_RETAKE_PLACEMENT');
  });

  test('honors failed-course retake placement, keeps unrelated courses, and delays dependent courses by default', async () => {
    const { adviserToken, sar, calc1Row } = await createPrerequisiteScenario();

    const res = await request(app)
      .post(`/api/sars/${sar.id}/study-plan/regenerate`)
      .set('Authorization', `Bearer ${adviserToken}`)
      .send({
        retakePlacements: [
          {
            studyPlanCourseId: calc1Row.id,
            yearLevel: 1,
            semester: 2,
          },
        ],
      });

    expect(res.status).toBe(201);
    const regenerated = res.body.data;
    const calc1 = findCourse(regenerated, 'CALC101');
    const calc2 = findCourse(regenerated, 'CALC102');
    const unrelated = findCourse(regenerated, 'CPE104');

    expect(calc1).toMatchObject({ yearLevel: 1, semester: 2, status: 'pending' });
    expect(unrelated).toMatchObject({ yearLevel: 1, semester: 2 });
    expect(slotIndex(calc2)).toBeGreaterThan(slotIndex(calc1));
  });

  test('requires admin approval before validating same-term prerequisite override requests', async () => {
    const { adviserToken, adminToken, sar, calculus1, calculus2, calc1Row } =
      await createPrerequisiteScenario();

    const regenerateRes = await request(app)
      .post(`/api/sars/${sar.id}/study-plan/regenerate`)
      .set('Authorization', `Bearer ${adviserToken}`)
      .send({
        retakePlacements: [
          {
            studyPlanCourseId: calc1Row.id,
            yearLevel: 1,
            semester: 2,
          },
        ],
        prerequisiteOverrideRequests: [
          {
            prerequisiteCourseId: calculus1.id,
            dependentCourseId: calculus2.id,
            yearLevel: 1,
            semester: 2,
            reason: 'Student is behind and needs concurrent enrollment approval.',
          },
        ],
      });

    expect(regenerateRes.status).toBe(201);
    const regenerated = regenerateRes.body.data;
    expect(findCourse(regenerated, 'CALC101')).toMatchObject({ yearLevel: 1, semester: 2 });
    expect(findCourse(regenerated, 'CALC102')).toMatchObject({ yearLevel: 1, semester: 2 });

    const pendingRes = await request(app)
      .get('/api/prerequisite-overrides?status=pending')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.data).toHaveLength(1);

    const pendingOverride = pendingRes.body.data[0];

    const pendingValidateRes = await request(app)
      .patch(`/api/sars/${sar.id}/study-plan/versions/${regenerated.id}/validate`)
      .set('Authorization', `Bearer ${adviserToken}`)
      .send({});
    expect(pendingValidateRes.status).toBe(400);
    expect(pendingValidateRes.body.code).toBe('PREREQUISITE_OVERRIDE_PENDING');

    const approveRes = await request(app)
      .patch(`/api/prerequisite-overrides/${pendingOverride.id}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved', decisionNotes: 'Approved for catch-up plan.' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('approved');

    const approvedValidateRes = await request(app)
      .patch(`/api/sars/${sar.id}/study-plan/versions/${regenerated.id}/validate`)
      .set('Authorization', `Bearer ${adviserToken}`)
      .send({});
    expect(approvedValidateRes.status).toBe(200);
  });
});
