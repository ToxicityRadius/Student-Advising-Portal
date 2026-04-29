const migration = require('../migrations/20260428000011-prerequisite-override-requests');

describe('prerequisite override request migration', () => {
  test('skips existing table and indexes when sync already created them', async () => {
    const queryInterface = {
      showAllTables: jest.fn().mockResolvedValue(['prerequisite_override_requests']),
      showIndex: jest
        .fn()
        .mockResolvedValue([
          { name: 'idx_prereq_override_status' },
          { name: 'idx_prereq_override_sar' },
          { name: 'idx_prereq_override_version' },
          { name: 'prereq_override_version_pair_slot' },
        ]),
      createTable: jest.fn(),
      addIndex: jest.fn(),
    };

    await migration.up(queryInterface, {});

    expect(queryInterface.createTable).not.toHaveBeenCalled();
    expect(queryInterface.addIndex).not.toHaveBeenCalled();
  });
});
