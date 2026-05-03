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

const CPE_2018_SUMMER_COURSES = ['CPE 308', 'CPE 408', 'CPE 409', 'CPE 410'];

const updateCpe2018SummerPlacements = async (queryInterface, yearLevel) => {
  const replacements = CPE_2018_SUMMER_COURSES.reduce(
    (acc, code, index) => {
      acc[`code${index}`] = code;
      return acc;
    },
    { curriculumName: 'BS CPE Curriculum 2018', yearLevel },
  );
  const codePlaceholders = CPE_2018_SUMMER_COURSES.map((_, index) => `:code${index}`).join(', ');

  await queryInterface.sequelize.query(
    `
    UPDATE curriculum_courses cc
    SET "yearLevel" = :yearLevel
    FROM curriculums c
    JOIN courses co
      ON co.code IN (${codePlaceholders})
     AND (co."programId" = c."programId" OR co."programId" IS NULL)
    WHERE cc."curriculumId" = c.id
      AND cc."courseId" = co.id
      AND c.name = :curriculumName
      AND cc.semester = 3;
    `,
    { replacements },
  );
};

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await hasTable(queryInterface, 'inactive_curriculum_regeneration_requests'))) {
      await queryInterface.createTable('inactive_curriculum_regeneration_requests', {
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
        programId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'programs', key: 'id' },
          onDelete: 'SET NULL',
        },
        curriculumId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'curriculums', key: 'id' },
          onDelete: 'RESTRICT',
        },
        studyPlanVersionId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'study_plan_versions', key: 'id' },
          onDelete: 'CASCADE',
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

    await addIndexIfMissing(
      queryInterface,
      'inactive_curriculum_regeneration_requests',
      ['status'],
      {
        name: 'idx_inactive_regen_status',
      },
    );
    await addIndexIfMissing(
      queryInterface,
      'inactive_curriculum_regeneration_requests',
      ['programId'],
      {
        name: 'idx_inactive_regen_program',
      },
    );
    await addIndexIfMissing(
      queryInterface,
      'inactive_curriculum_regeneration_requests',
      ['studentAcademicRecordId'],
      {
        name: 'idx_inactive_regen_sar',
      },
    );
    await addIndexIfMissing(
      queryInterface,
      'inactive_curriculum_regeneration_requests',
      ['studyPlanVersionId'],
      {
        name: 'idx_inactive_regen_version',
      },
    );
    await addIndexIfMissing(
      queryInterface,
      'inactive_curriculum_regeneration_requests',
      ['studentAcademicRecordId', 'studyPlanVersionId', 'curriculumId', 'status'],
      {
        name: 'inactive_curriculum_regen_sar_version_status',
      },
    );

    await updateCpe2018SummerPlacements(queryInterface, 3);
  },

  async down(queryInterface) {
    await updateCpe2018SummerPlacements(queryInterface, 4);

    if (await hasTable(queryInterface, 'inactive_curriculum_regeneration_requests')) {
      await queryInterface.dropTable('inactive_curriculum_regeneration_requests');
    }
  },
};
