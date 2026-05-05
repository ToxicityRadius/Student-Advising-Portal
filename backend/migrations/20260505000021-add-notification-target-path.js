'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('notifications');
    if (!table.targetPath) {
      await queryInterface.addColumn('notifications', 'targetPath', {
        type: Sequelize.STRING(512),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('notifications');
    if (table.targetPath) {
      await queryInterface.removeColumn('notifications', 'targetPath');
    }
  },
};
