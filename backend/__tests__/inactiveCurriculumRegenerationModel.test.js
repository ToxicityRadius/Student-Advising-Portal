process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/test';

const { InactiveCurriculumRegenerationRequest } = require('../models');

describe('InactiveCurriculumRegenerationRequest model', () => {
  test('uses explicit index names that match the migration', () => {
    const indexNames = InactiveCurriculumRegenerationRequest.options.indexes.map(
      (index) => index.name,
    );

    expect(indexNames).toEqual(
      expect.arrayContaining([
        'idx_inactive_regen_status',
        'idx_inactive_regen_program',
        'idx_inactive_regen_sar',
        'idx_inactive_regen_version',
        'inactive_curriculum_regen_sar_version_status',
      ]),
    );
    expect(indexNames).not.toContain(undefined);
  });
});
