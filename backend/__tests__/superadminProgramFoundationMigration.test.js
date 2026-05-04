const fs = require('fs');
const path = require('path');

describe('superadmin program foundation migration', () => {
  test('creates user-program unique index before using ON CONFLICT on that pair', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'migrations', '20260428000012-superadmin-program-foundation.js'),
      'utf8',
    );

    const uniqueIndexPosition = source.indexOf(
      "name: 'user_program_assignments_user_program_unique'",
    );
    const conflictPosition = source.indexOf('ON CONFLICT ("userId", "programId") DO NOTHING');

    expect(uniqueIndexPosition).toBeGreaterThanOrEqual(0);
    expect(conflictPosition).toBeGreaterThanOrEqual(0);
    expect(uniqueIndexPosition).toBeLessThan(conflictPosition);
  });

  test('includes an idempotent repair migration for program-scoped schema drift', () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '..',
        'migrations',
        '20260501000014-repair-program-foundation-schema.js',
      ),
      'utf8',
    );

    expect(source).toContain('addColumnIfMissing');
    expect(source).toContain("'curriculums', 'programId'");
    expect(source).toContain("'courses', 'programId'");
    expect(source).toContain("'student_academic_records', 'programId'");
    expect(source).toContain("'prerequisite_override_requests', 'programId'");

    const addCurriculumColumnPosition = source.indexOf('addColumnIfMissing');
    const addCurriculumIndexPosition = source.indexOf('addIndexIfMissing');

    expect(addCurriculumColumnPosition).toBeGreaterThanOrEqual(0);
    expect(addCurriculumIndexPosition).toBeGreaterThanOrEqual(0);
    expect(addCurriculumColumnPosition).toBeLessThan(addCurriculumIndexPosition);
  });

  test('adds a partial unique index for one active superadmin account', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'migrations', '20260501000018-single-active-superadmin.js'),
      'utf8',
    );

    expect(source).toContain("const INDEX_NAME = 'users_single_active_superadmin_unique'");
    expect(source).toContain('unique: true');
    expect(source).toContain("role: 'superadmin'");
    expect(source).toContain('isActive: true');
  });
});
