/**
 * Integration tests — SAR (Student Academic Record) routes.
 *
 * Covers: create SAR, list SARs, get by id, update, role-based access,
 *         and study plan generation.
 */

const request = require('supertest');
const { app, models, helpers } = require('./support/helpers');

const { StudentAcademicRecord } = models;
const { syncDB, closeDB, createUser, authToken, createCurriculum } = helpers;

let adviser, admin, student;
let adviserToken, adminToken, studentToken;
let curriculum;
let assignedStudentSarId;

beforeAll(async () => {
  await syncDB();

  // Seed users
  admin = await createUser({ role: 'admin', email: 'sar.admin.cpe@tip.edu.ph' });
  adviser = await createUser({ role: 'adviser', email: 'sar.adviser.cpe@tip.edu.ph' });
  student = await createUser({
    role: 'student',
    email: 'sar.student@tip.edu.ph',
    studentId: '2100100',
  });

  adminToken = authToken(admin);
  adviserToken = authToken(adviser);
  studentToken = authToken(student);

  // Seed curriculum with courses
  ({ curriculum } = await createCurriculum(admin, 5));
}, 120000);

afterAll(async () => {
  await closeDB();
});

// ─── Create SAR ─────────────────────────────────────────────────────────────

describe('POST /api/sars', () => {
  test('adviser can create a SAR', async () => {
    const res = await request(app)
      .post('/api/sars')
      .set('Authorization', `Bearer ${adviserToken}`)
      .send({
        studentName: 'Maria Santos',
        studentNumber: '2100200',
        email: 'msantos@tip.edu.ph',
        yearLevel: 2,
        curriculumId: curriculum.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.studentNumber).toBe('2100200');
  });

  test('admin can create a SAR', async () => {
    const res = await request(app)
      .post('/api/sars')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentName: 'Pedro Reyes',
        studentNumber: '2100201',
        email: 'preyes@tip.edu.ph',
        yearLevel: 1,
        curriculumId: curriculum.id,
      });

    expect(res.status).toBe(201);
  });

  test('student cannot create a SAR', async () => {
    const res = await request(app)
      .post('/api/sars')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        studentName: 'Hacker Student',
        studentNumber: '2100299',
        email: 'hacker@tip.edu.ph',
        yearLevel: 1,
        curriculumId: curriculum.id,
      });

    expect(res.status).toBe(403);
  });

  test('rejects duplicate student number', async () => {
    const res = await request(app)
      .post('/api/sars')
      .set('Authorization', `Bearer ${adviserToken}`)
      .send({
        studentName: 'Duplicate Number',
        studentNumber: '2100200', // already used
        email: 'dup.num@tip.edu.ph',
        yearLevel: 1,
        curriculumId: curriculum.id,
      });

    expect(res.status).toBe(409);
  });

  test('rejects non-TIP email', async () => {
    const res = await request(app)
      .post('/api/sars')
      .set('Authorization', `Bearer ${adviserToken}`)
      .send({
        studentName: 'External Email',
        studentNumber: '2100300',
        email: 'external@gmail.com',
        yearLevel: 1,
        curriculumId: curriculum.id,
      });

    expect(res.status).toBe(400);
  });

  test('rejects invalid year level', async () => {
    const res = await request(app)
      .post('/api/sars')
      .set('Authorization', `Bearer ${adviserToken}`)
      .send({
        studentName: 'Bad Year',
        studentNumber: '2100301',
        email: 'badyear@tip.edu.ph',
        yearLevel: 0,
        curriculumId: curriculum.id,
      });

    expect(res.status).toBe(400);
  });

  test('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/sars')
      .set('Authorization', `Bearer ${adviserToken}`)
      .send({ yearLevel: 1 });

    expect(res.status).toBe(400);
  });

  test('rejects unauthenticated request', async () => {
    const res = await request(app).post('/api/sars').send({
      studentName: 'Anon',
      studentNumber: '2100302',
      email: 'anon@tip.edu.ph',
      yearLevel: 1,
    });

    expect(res.status).toBe(401);
  });
});

// ─── List SARs ──────────────────────────────────────────────────────────────

describe('GET /api/sars', () => {
  test('adviser can list SARs', async () => {
    const res = await request(app).get('/api/sars').set('Authorization', `Bearer ${adviserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('student can list their own SARs', async () => {
    const res = await request(app).get('/api/sars').set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('adviser can list assigned student SARs created by another owner', async () => {
    await student.update({
      adviserId: adviser.id,
      current_year_level: 2,
      curriculum_id: curriculum.id,
      updatedAt: Date.now(),
    });

    const createRes = await request(app)
      .post('/api/sars')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentName: 'Assigned Student',
        studentNumber: student.studentId,
        email: student.email,
        yearLevel: 2,
        curriculumId: curriculum.id,
      });

    expect(createRes.status).toBe(201);
    assignedStudentSarId = createRes.body.data.id;

    const res = await request(app).get('/api/sars').set('Authorization', `Bearer ${adviserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((sar) => sar.id === assignedStudentSarId)).toBe(true);
  });
});

// ─── Get SAR by ID ──────────────────────────────────────────────────────────

describe('GET /api/sars/:id', () => {
  let sarId;

  beforeAll(async () => {
    const sar = await StudentAcademicRecord.findOne({ where: { studentNumber: '2100200' } });
    sarId = sar.id;
  });

  test('adviser can fetch SAR by id', async () => {
    const res = await request(app)
      .get(`/api/sars/${sarId}`)
      .set('Authorization', `Bearer ${adviserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(sarId);
  });

  test('returns 404 for non-existent SAR', async () => {
    const res = await request(app)
      .get('/api/sars/99999')
      .set('Authorization', `Bearer ${adviserToken}`);

    expect(res.status).toBe(404);
  });

  test('adviser can fetch assigned student SAR by id even when created by another owner', async () => {
    const res = await request(app)
      .get(`/api/sars/${assignedStudentSarId}`)
      .set('Authorization', `Bearer ${adviserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(assignedStudentSarId);
  });
});

// ─── Update SAR ─────────────────────────────────────────────────────────────

describe('PUT /api/sars/:id', () => {
  let sarId;

  beforeAll(async () => {
    const sar = await StudentAcademicRecord.findOne({ where: { studentNumber: '2100200' } });
    sarId = sar.id;
  });

  test('adviser can update SAR year level', async () => {
    const res = await request(app)
      .put(`/api/sars/${sarId}`)
      .set('Authorization', `Bearer ${adviserToken}`)
      .send({ yearLevel: 3 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('student cannot update SAR', async () => {
    const res = await request(app)
      .put(`/api/sars/${sarId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ yearLevel: 4 });

    expect(res.status).toBe(403);
  });
});

// ─── Study Plan Generation ──────────────────────────────────────────────────

describe('POST /api/sars/:id/study-plan/generate', () => {
  let sarId;

  beforeAll(async () => {
    const sar = await StudentAcademicRecord.findOne({ where: { studentNumber: '2100200' } });
    sarId = sar.id;
  });

  test('adviser can generate a study plan for a SAR', async () => {
    const res = await request(app)
      .post(`/api/sars/${sarId}/study-plan/generate`)
      .set('Authorization', `Bearer ${adviserToken}`)
      .send({});

    // 201 on first generation, 200 on regeneration
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
  });

  test('student cannot generate study plan', async () => {
    const res = await request(app)
      .post(`/api/sars/${sarId}/study-plan/generate`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});

    expect(res.status).toBe(403);
  });
});

// ─── Study Plan Versions ────────────────────────────────────────────────────

describe('GET /api/sars/:id/study-plan/versions', () => {
  let sarId;

  beforeAll(async () => {
    const sar = await StudentAcademicRecord.findOne({ where: { studentNumber: '2100200' } });
    sarId = sar.id;
  });

  test('returns study plan versions for a SAR', async () => {
    const res = await request(app)
      .get(`/api/sars/${sarId}/study-plan/versions`)
      .set('Authorization', `Bearer ${adviserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
