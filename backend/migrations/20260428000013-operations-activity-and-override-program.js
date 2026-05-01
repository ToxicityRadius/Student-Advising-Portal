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

async function addIndexIfMissing(queryInterface, tableName, fields, options) {
  const indexes = await queryInterface.showIndex(tableName);
  if (indexes.some((index) => index.name === options.name)) return;
  await queryInterface.addIndex(tableName, fields, options);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await hasTable(queryInterface, 'activity_logs'))) {
      await queryInterface.createTable('activity_logs', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        programId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'programs', key: 'id' },
          onDelete: 'SET NULL',
        },
        actorId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'SET NULL',
        },
        action: {
          type: Sequelize.STRING(80),
          allowNull: false,
        },
        resourceType: {
          type: Sequelize.STRING(80),
          allowNull: false,
        },
        resourceId: {
          type: Sequelize.STRING(80),
          allowNull: true,
        },
        resourceLabel: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        targetUserId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'SET NULL',
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.BIGINT,
          allowNull: false,
          defaultValue: Sequelize.literal('EXTRACT(EPOCH FROM NOW()) * 1000'),
        },
      });
    }

    if (!(await hasColumn(queryInterface, 'prerequisite_override_requests', 'programId'))) {
      await queryInterface.addColumn('prerequisite_override_requests', 'programId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'programs', key: 'id' },
        onDelete: 'SET NULL',
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE prerequisite_override_requests por
      SET "programId" = sar."programId"
      FROM student_academic_records sar
      WHERE por."studentAcademicRecordId" = sar.id
        AND por."programId" IS NULL;
    `);

    await addIndexIfMissing(queryInterface, 'activity_logs', ['programId'], {
      name: 'idx_activity_logs_program',
    });
    await addIndexIfMissing(queryInterface, 'activity_logs', ['actorId'], {
      name: 'idx_activity_logs_actor',
    });
    await addIndexIfMissing(queryInterface, 'activity_logs', ['targetUserId'], {
      name: 'idx_activity_logs_target_user',
    });
    await addIndexIfMissing(queryInterface, 'activity_logs', ['resourceType', 'resourceId'], {
      name: 'idx_activity_logs_resource',
    });
    await addIndexIfMissing(queryInterface, 'activity_logs', ['createdAt'], {
      name: 'idx_activity_logs_created_at',
    });
    await addIndexIfMissing(queryInterface, 'prerequisite_override_requests', ['programId'], {
      name: 'idx_prereq_override_program',
    });
  },

  async down(queryInterface) {
    await queryInterface
      .removeIndex('prerequisite_override_requests', 'idx_prereq_override_program')
      .catch(() => {});
    if (await hasColumn(queryInterface, 'prerequisite_override_requests', 'programId')) {
      await queryInterface.removeColumn('prerequisite_override_requests', 'programId');
    }

    if (await hasTable(queryInterface, 'activity_logs')) {
      await queryInterface.dropTable('activity_logs');
    }
  },
};
