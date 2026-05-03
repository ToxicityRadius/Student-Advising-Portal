'use strict';

async function hasTable(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    const name = typeof table === 'string' ? table : table.tableName || table.name;
    return name === tableName;
  });
}

async function hasColumn(queryInterface, tableName, columnName) {
  if (!(await hasTable(queryInterface, tableName))) return false;
  const columns = await queryInterface.describeTable(tableName);
  return Boolean(columns[columnName]);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await hasTable(queryInterface, 'programs'))) return;

    const hasDepartmentName = await hasColumn(queryInterface, 'programs', 'departmentName');
    const hasCollegeName = await hasColumn(queryInterface, 'programs', 'collegeName');

    if (hasDepartmentName && !hasCollegeName) {
      await queryInterface.renameColumn('programs', 'departmentName', 'collegeName');
      return;
    }

    if (!hasCollegeName) {
      await queryInterface.addColumn('programs', 'collegeName', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (hasDepartmentName) {
      await queryInterface.sequelize.query(
        'UPDATE programs SET "collegeName" = COALESCE("collegeName", "departmentName");',
      );
      await queryInterface.removeColumn('programs', 'departmentName');
    }
  },

  async down(queryInterface, Sequelize) {
    if (!(await hasTable(queryInterface, 'programs'))) return;

    const hasDepartmentName = await hasColumn(queryInterface, 'programs', 'departmentName');
    const hasCollegeName = await hasColumn(queryInterface, 'programs', 'collegeName');

    if (hasCollegeName && !hasDepartmentName) {
      await queryInterface.renameColumn('programs', 'collegeName', 'departmentName');
      return;
    }

    if (!hasDepartmentName) {
      await queryInterface.addColumn('programs', 'departmentName', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (hasCollegeName) {
      await queryInterface.sequelize.query(
        'UPDATE programs SET "departmentName" = COALESCE("departmentName", "collegeName");',
      );
      await queryInterface.removeColumn('programs', 'collegeName');
    }
  },
};
