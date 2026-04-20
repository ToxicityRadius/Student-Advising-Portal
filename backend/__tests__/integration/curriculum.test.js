/**
 * Integration tests — Curriculum CRUD routes.
 *
 * Covers: create curriculum, list, get by ID, update, activate,
 *         create course, add course to curriculum, add prerequisite,
 *         and role-based access checks.
 */

const request = require('supertest');
const { app, models, helpers } = require('./support/helpers');

const { Curriculum, Course, CurriculumCourse } = models;
const { syncDB, closeDB, createUser, authToken } = helpers;

let admin, adviser, student;
let adminToken, adviserToken, studentToken;

beforeAll(async () => {
  await syncDB();

  admin = await createUser({ role: 'admin', email: 'cur.admin.cpe@tip.edu.ph' });
  adviser = await createUser({ role: 'adviser', email: 'cur.adviser.cpe@tip.edu.ph' });
  student = await createUser({ role: 'student', email: 'cur.student@tip.edu.ph' });

  adminToken = authToken(admin);
  adviserToken = authToken(adviser);
  studentToken = authToken(student);
}, 120000);

afterAll(async () => {
  await closeDB();
});

// ─── Create Curriculum ──────────────────────────────────────────────────────

describe('POST /api/curriculums', () => {
  test('admin can create a curriculum', async () => {
    const res = await request(app)
      .post('/api/curriculums')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'BS CpE 2025', description: 'Latest curriculum' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('BS CpE 2025');
  });

  test('adviser cannot create a curriculum', async () => {
    const res = await request(app)
      .post('/api/curriculums')
      .set('Authorization', `Bearer ${adviserToken}`)
      .send({ name: 'Forbidden Curriculum' });

    expect(res.status).toBe(403);
  });

  test('student cannot create a curriculum', async () => {
    const res = await request(app)
      .post('/api/curriculums')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ name: 'Forbidden Curriculum' });

    expect(res.status).toBe(403);
  });

  test('rejects missing name', async () => {
    const res = await request(app)
      .post('/api/curriculums')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'No name' });

    expect(res.status).toBe(400);
  });
});

// ─── List Curricula ─────────────────────────────────────────────────────────

describe('GET /api/curriculums', () => {
  test('admin can list curricula', async () => {
    const res = await request(app)
      .get('/api/curriculums')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('adviser can list curricula', async () => {
    const res = await request(app)
      .get('/api/curriculums')
      .set('Authorization', `Bearer ${adviserToken}`);

    expect(res.status).toBe(200);
  });

  test('student cannot list curricula', async () => {
    const res = await request(app)
      .get('/api/curriculums')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });
});

// ─── Get Curriculum by ID ───────────────────────────────────────────────────

describe('GET /api/curriculums/:id', () => {
  let curriculumId;

  beforeAll(async () => {
    const c = await Curriculum.findOne({ where: { name: 'BS CpE 2025' } });
    curriculumId = c.id;
  });

  test('admin can fetch curriculum by id', async () => {
    const res = await request(app)
      .get(`/api/curriculums/${curriculumId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .get('/api/curriculums/99999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

// ─── Update Curriculum ──────────────────────────────────────────────────────

describe('PUT /api/curriculums/:id', () => {
  let curriculumId;

  beforeAll(async () => {
    const c = await Curriculum.findOne({ where: { name: 'BS CpE 2025' } });
    curriculumId = c.id;
  });

  test('admin can update curriculum name', async () => {
    const res = await request(app)
      .put(`/api/curriculums/${curriculumId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'BS CpE 2025 (Updated)' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('adviser cannot update curriculum', async () => {
    const res = await request(app)
      .put(`/api/curriculums/${curriculumId}`)
      .set('Authorization', `Bearer ${adviserToken}`)
      .send({ name: 'Forbidden Update' });

    expect(res.status).toBe(403);
  });
});

// ─── Activate Curriculum ────────────────────────────────────────────────────

describe('PATCH /api/curriculums/:id/activate', () => {
  let curriculumId;

  beforeAll(async () => {
    const c = await Curriculum.findOne({ where: { name: 'BS CpE 2025 (Updated)' } });
    curriculumId = c.id;
  });

  test('admin can activate a curriculum', async () => {
    const res = await request(app)
      .patch(`/api/curriculums/${curriculumId}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── Create Course ──────────────────────────────────────────────────────────

describe('POST /api/courses', () => {
  test('admin can create a course', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'CPE 101', name: 'Introduction to CpE', units: 3 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('CPE 101');
  });

  test('adviser cannot create a course', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adviserToken}`)
      .send({ code: 'CPE 999', name: 'Forbidden Course', units: 3 });

    expect(res.status).toBe(403);
  });

  test('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'CPE 102' }); // missing name and units

    expect(res.status).toBe(400);
  });
});

// ─── Add Course to Curriculum ───────────────────────────────────────────────

describe('POST /api/curriculums/:id/courses', () => {
  let curriculumId, courseId;

  beforeAll(async () => {
    const c = await Curriculum.findOne({ where: { name: 'BS CpE 2025 (Updated)' } });
    curriculumId = c.id;
    const course = await Course.findOne({ where: { code: 'CPE 101' } });
    courseId = course.id;
  });

  test('admin can add course to curriculum', async () => {
    const res = await request(app)
      .post(`/api/curriculums/${curriculumId}/courses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ courseId, yearLevel: 1, semester: 1 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('rejects duplicate course assignment', async () => {
    const res = await request(app)
      .post(`/api/curriculums/${curriculumId}/courses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ courseId, yearLevel: 1, semester: 1 });

    // Should conflict or bad request
    expect([400, 409]).toContain(res.status);
  });

  test('rejects non-existent course id', async () => {
    const res = await request(app)
      .post(`/api/curriculums/${curriculumId}/courses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ courseId: 99999, yearLevel: 1, semester: 1 });

    expect([400, 404]).toContain(res.status);
  });
});

// ─── Add Prerequisite ───────────────────────────────────────────────────────

describe('POST /api/curriculums/:id/prerequisites', () => {
  let curriculumId, courseId, prereqCourseId;

  beforeAll(async () => {
    const c = await Curriculum.findOne({ where: { name: 'BS CpE 2025 (Updated)' } });
    curriculumId = c.id;

    // Create a second course for prerequisite
    const course2 = await Course.create({
      code: 'CPE 102',
      name: 'Digital Logic Design',
      units: 3,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await CurriculumCourse.create({
      curriculumId,
      courseId: course2.id,
      yearLevel: 1,
      semester: 2,
    });

    const course1 = await Course.findOne({ where: { code: 'CPE 101' } });
    courseId = course2.id;
    prereqCourseId = course1.id;
  });

  test('admin can add a prerequisite', async () => {
    const res = await request(app)
      .post(`/api/curriculums/${curriculumId}/prerequisites`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ courseId, prerequisiteCourseId: prereqCourseId });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('adviser cannot add prerequisites', async () => {
    const res = await request(app)
      .post(`/api/curriculums/${curriculumId}/prerequisites`)
      .set('Authorization', `Bearer ${adviserToken}`)
      .send({ courseId, prerequisiteCourseId: prereqCourseId });

    expect(res.status).toBe(403);
  });
});

// ─── Delete Course ──────────────────────────────────────────────────────────

describe('DELETE /api/courses/:id', () => {
  test('admin cannot delete course with curriculum references', async () => {
    const course = await Course.findOne({ where: { code: 'CPE 101' } });

    const res = await request(app)
      .delete(`/api/courses/${course.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Should fail due to foreign key constraint (RESTRICT)
    expect([400, 409, 500]).toContain(res.status);
  });
});
