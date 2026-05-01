'use strict';

const INDEX_NAME = 'users_single_active_superadmin_unique';

const indexExists = async (queryInterface, tableName, indexName) => {
  const indexes = await queryInterface.showIndex(tableName);
  return indexes.some((index) => index.name === indexName);
};

module.exports = {
  async up(queryInterface) {
    if (!(await indexExists(queryInterface, 'users', INDEX_NAME))) {
      await queryInterface.addIndex('users', ['role'], {
        name: INDEX_NAME,
        unique: true,
        where: {
          role: 'superadmin',
          isActive: true,
        },
      });
    }
  },

  async down(queryInterface) {
    if (await indexExists(queryInterface, 'users', INDEX_NAME)) {
      await queryInterface.removeIndex('users', INDEX_NAME);
    }
  },
};
