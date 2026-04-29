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
});
