'use strict';

async function hasTable(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    const name = typeof table === 'string' ? table : table.tableName || table.name;
    return name === tableName;
  });
}

async function addIndexIfMissing(queryInterface, tableName, fields, options) {
  const indexes = await queryInterface.showIndex(tableName);
  if (indexes.some((index) => index.name === options.name)) return;
  await queryInterface.addIndex(tableName, fields, options);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await hasTable(queryInterface, 'prerequisite_override_requests'))) {
      await queryInterface.createTable('prerequisite_override_requests', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        studentAcademicRecordId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'student_academic_records', key: 'id' },
          onDelete: 'CASCADE',
        },
        studyPlanVersionId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'study_plan_versions', key: 'id' },
          onDelete: 'CASCADE',
        },
        prerequisiteCourseId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'courses', key: 'id' },
          onDelete: 'RESTRICT',
        },
        dependentCourseId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'courses', key: 'id' },
          onDelete: 'RESTRICT',
        },
        yearLevel: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        semester: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        status: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'pending',
        },
        reason: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        decisionNotes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        requestedByAdviserId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'RESTRICT',
        },
        decidedByAdminId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'SET NULL',
        },
        decidedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
    }

    await addIndexIfMissing(queryInterface, 'prerequisite_override_requests', ['status'], {
      name: 'idx_prereq_override_status',
    });
    await addIndexIfMissing(
      queryInterface,
      'prerequisite_override_requests',
      ['studentAcademicRecordId'],
      {
        name: 'idx_prereq_override_sar',
      },
    );
    await addIndexIfMissing(
      queryInterface,
      'prerequisite_override_requests',
      ['studyPlanVersionId'],
      {
        name: 'idx_prereq_override_version',
      },
    );
    await addIndexIfMissing(
      queryInterface,
      'prerequisite_override_requests',
      ['studyPlanVersionId', 'prerequisiteCourseId', 'dependentCourseId', 'yearLevel', 'semester'],
      { name: 'prereq_override_version_pair_slot' },
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('prerequisite_override_requests');
  },
};
