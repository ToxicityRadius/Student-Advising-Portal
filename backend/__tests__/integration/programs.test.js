const request = require('supertest');
const { app, models, helpers } = require('./support/helpers');

const { Program, UserProgramAssignment } = models;
const { syncDB, closeDB, createUser, authToken } = helpers;

let superadmin;
let programChair;
let adviser;
let student;
let bscpe;
let _bscs;
let superadminToken;
let chairToken;
let adviserToken;
let studentToken;

beforeAll(async () => {
  await syncDB();

  [bscpe, _bscs] = await Promise.all([
    Program.create({
      code: 'BSCPE',
      name: 'Bachelor of Science in Computer Engineering',
      departmentName: 'Computer Engineering',
      emailSuffix: '.cpe@tip.edu.ph',
      isActive: true,
    }),
    Program.create({
      code: 'BSCS',
      name: 'Bachelor of Science in Computer Science',
      departmentName: 'Computer Science',
      emailSuffix: '.cs@tip.edu.ph',
      isActive: true,
    }),
  ]);

  superadmin = await createUser({ role: 'superadmin', email: 'dev.super.cpe@tip.edu.ph' });
  programChair = await createUser({ role: 'admin', email: 'chair.cpe@tip.edu.ph' });
  adviser = await createUser({ role: 'adviser', email: 'adviser.cpe@tip.edu.ph' });
  student = await createUser({ role: 'student', email: 'student.programs@tip.edu.ph' });

  await UserProgramAssignment.bulkCreate([
    { userId: programChair.id, programId: bscpe.id },
    { userId: adviser.id, programId: bscpe.id },
  ]);

  superadminToken = authToken(superadmin);
  chairToken = authToken(programChair);
  adviserToken = authToken(adviser);
  studentToken = authToken(student);
}, 120000);

afterAll(async () => {
  await closeDB();
});

describe('GET /api/programs', () => {
  test('superadmin can list all programs', async () => {
    const res = await request(app)
      .get('/api/programs')
      .set('Authorization', `Bearer ${superadminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.map((program) => program.code).sort()).toEqual(['BSCPE', 'BSCS']);
  });

  test('program chair sees only assigned programs', async () => {
    const res = await request(app)
      .get('/api/programs')
      .set('Authorization', `Bearer ${chairToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.map((program) => program.code)).toEqual(['BSCPE']);
  });

  test('adviser sees assigned programs as read-only options', async () => {
    const res = await request(app)
      .get('/api/programs')
      .set('Authorization', `Bearer ${adviserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.map((program) => program.code)).toEqual(['BSCPE']);
  });

  test('student cannot list program management options', async () => {
    const res = await request(app)
      .get('/api/programs')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/programs', () => {
  test('superadmin can create a program', async () => {
    const res = await request(app)
      .post('/api/programs')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({
        code: 'BSIT',
        name: 'Bachelor of Science in Information Technology',
        departmentName: 'Information Technology',
        emailSuffix: '.it@tip.edu.ph',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('BSIT');
  });

  test('program chair cannot create programs', async () => {
    const res = await request(app)
      .post('/api/programs')
      .set('Authorization', `Bearer ${chairToken}`)
      .send({
        code: 'BSECE',
        name: 'Bachelor of Science in Electronics Engineering',
      });

    expect(res.status).toBe(403);
  });
});
