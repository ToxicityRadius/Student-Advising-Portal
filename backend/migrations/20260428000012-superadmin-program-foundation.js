'use strict';

const { QueryTypes } = require('sequelize');
const { DEFAULT_PROGRAM } = require('../constants');

const quote = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;

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

async function addColumnIfMissing(queryInterface, tableName, columnName, definition, transaction) {
  if (await hasColumn(queryInterface, tableName, columnName)) return;
  await queryInterface.addColumn(tableName, columnName, definition, { transaction });
}

async function addIndexIfMissing(queryInterface, tableName, fields, options) {
  const { transaction, ...indexOptions } = options;
  const indexes = await queryInterface.showIndex(tableName, { transaction });
  if (indexes.some((index) => index.name === indexOptions.name)) return;
  await queryInterface.addIndex(tableName, fields, { ...indexOptions, transaction });
}

async function getDefaultProgramId(sequelize, transaction) {
  const now = Date.now();
  await sequelize.query(
    `
      INSERT INTO programs ("code", "name", "collegeName", "emailSuffix", "isActive", "createdAt", "updatedAt")
      VALUES (:code, :name, :collegeName, :emailSuffix, :isActive, :now, :now)
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "collegeName" = EXCLUDED."collegeName",
        "emailSuffix" = EXCLUDED."emailSuffix",
        "isActive" = EXCLUDED."isActive",
        "updatedAt" = EXCLUDED."updatedAt";
    `,
    {
      replacements: {
        ...DEFAULT_PROGRAM,
        now,
      },
      transaction,
    },
  );

  const rows = await sequelize.query('SELECT id FROM programs WHERE code = :code LIMIT 1;', {
    replacements: { code: DEFAULT_PROGRAM.code },
    type: QueryTypes.SELECT,
    transaction,
  });
  return rows[0].id;
}

async function dropSingleColumnUniqueConstraints(sequelize, tableName, columnName, transaction) {
  const constraints = await sequelize.query(
    `
      SELECT c.conname AS constraint_name
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN LATERAL unnest(c.conkey) WITH ORDINALITY x(attnum, ord) ON true
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = x.attnum
      WHERE n.nspname = 'public'
        AND t.relname = :tableName
        AND c.contype = 'u'
      GROUP BY c.oid, c.conname
      HAVING COUNT(*) = 1 AND MAX(a.attname) = :columnName;
    `,
    {
      replacements: { tableName, columnName },
      type: QueryTypes.SELECT,
      transaction,
    },
  );

  for (const row of constraints) {
    await sequelize.query(
      `ALTER TABLE public.${quote(tableName)} DROP CONSTRAINT IF EXISTS ${quote(row.constraint_name)};`,
      { transaction },
    );
  }

  const indexes = await sequelize.query(
    `
      SELECT i.relname AS index_name
      FROM pg_class t
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_index ix ON ix.indrelid = t.oid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN LATERAL unnest(ix.indkey::int2[]) WITH ORDINALITY k(attnum, ord) ON true
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      WHERE n.nspname = 'public'
        AND t.relname = :tableName
        AND ix.indisunique = true
      GROUP BY i.relname
      HAVING COUNT(*) = 1 AND MAX(a.attname) = :columnName;
    `,
    {
      replacements: { tableName, columnName },
      type: QueryTypes.SELECT,
      transaction,
    },
  );

  for (const row of indexes) {
    await sequelize.query(`DROP INDEX IF EXISTS public.${quote(row.index_name)};`, { transaction });
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    const transaction = await sequelize.transaction();
    let committed = false;

    try {
      if (!(await hasTable(queryInterface, 'programs'))) {
        await queryInterface.createTable(
          'programs',
          {
            id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
            },
            code: {
              type: Sequelize.STRING(20),
              allowNull: false,
              unique: true,
            },
            name: {
              type: Sequelize.STRING,
              allowNull: false,
            },
            collegeName: {
              type: Sequelize.STRING,
              allowNull: true,
            },
            emailSuffix: {
              type: Sequelize.STRING,
              allowNull: true,
            },
            isActive: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: true,
            },
            createdAt: {
              type: Sequelize.BIGINT,
              allowNull: false,
            },
            updatedAt: {
              type: Sequelize.BIGINT,
              allowNull: false,
            },
          },
          { transaction },
        );
      }

      const defaultProgramId = await getDefaultProgramId(sequelize, transaction);

      if (!(await hasTable(queryInterface, 'user_program_assignments'))) {
        await queryInterface.createTable(
          'user_program_assignments',
          {
            id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
            },
            userId: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: { model: 'users', key: 'id' },
              onDelete: 'CASCADE',
            },
            programId: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: { model: 'programs', key: 'id' },
              onDelete: 'CASCADE',
            },
            createdAt: {
              type: Sequelize.BIGINT,
              allowNull: false,
            },
            updatedAt: {
              type: Sequelize.BIGINT,
              allowNull: false,
            },
          },
          { transaction },
        );
      }

      await addIndexIfMissing(queryInterface, 'user_program_assignments', ['userId', 'programId'], {
        name: 'user_program_assignments_user_program_unique',
        unique: true,
        transaction,
      });

      const programReference = {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'programs', key: 'id' },
      };

      await addColumnIfMissing(
        queryInterface,
        'curriculums',
        'programId',
        programReference,
        transaction,
      );
      await addColumnIfMissing(
        queryInterface,
        'courses',
        'programId',
        programReference,
        transaction,
      );
      await addColumnIfMissing(
        queryInterface,
        'academic_terms',
        'programId',
        programReference,
        transaction,
      );
      await addColumnIfMissing(
        queryInterface,
        'student_academic_records',
        'programId',
        programReference,
        transaction,
      );
      await addColumnIfMissing(
        queryInterface,
        'forecast_snapshots',
        'programId',
        programReference,
        transaction,
      );
      await addColumnIfMissing(
        queryInterface,
        'course_equivalencies',
        'ownerProgramId',
        {
          ...programReference,
          onDelete: 'SET NULL',
        },
        transaction,
      );

      const now = Date.now();
      await sequelize.query(
        `
          UPDATE curriculums SET "programId" = :programId WHERE "programId" IS NULL;
          UPDATE courses SET "programId" = :programId WHERE "programId" IS NULL;
          UPDATE academic_terms SET "programId" = :programId WHERE "programId" IS NULL;
          UPDATE student_academic_records sar
          SET "programId" = COALESCE(c."programId", :programId)
          FROM curriculums c
          WHERE sar."curriculumId" = c.id AND sar."programId" IS NULL;
          UPDATE student_academic_records SET "programId" = :programId WHERE "programId" IS NULL;
          UPDATE forecast_snapshots fs
          SET "programId" = COALESCE(t."programId", :programId)
          FROM academic_terms t
          WHERE fs."academicTermId" = t.id AND fs."programId" IS NULL;
          UPDATE forecast_snapshots SET "programId" = :programId WHERE "programId" IS NULL;
          UPDATE course_equivalencies SET "ownerProgramId" = :programId WHERE "ownerProgramId" IS NULL;
        `,
        {
          replacements: { programId: defaultProgramId },
          transaction,
        },
      );

      await sequelize.query(
        `
          INSERT INTO user_program_assignments ("userId", "programId", "createdAt", "updatedAt")
          SELECT u.id, :programId, :now, :now
          FROM users u
          WHERE u.role IN ('admin', 'adviser')
          ON CONFLICT ("userId", "programId") DO NOTHING;
        `,
        {
          replacements: { programId: defaultProgramId, now },
          transaction,
        },
      );

      await dropSingleColumnUniqueConstraints(sequelize, 'courses', 'code', transaction);
      await sequelize.query(
        'ALTER TABLE public.academic_terms DROP CONSTRAINT IF EXISTS academic_terms_school_year_semester;',
        { transaction },
      );

      await transaction.commit();
      committed = true;

      await addIndexIfMissing(queryInterface, 'programs', ['code'], {
        name: 'programs_code_unique',
        unique: true,
      });
      await addIndexIfMissing(queryInterface, 'user_program_assignments', ['programId'], {
        name: 'idx_user_program_assignments_program',
      });
      await addIndexIfMissing(queryInterface, 'curriculums', ['programId'], {
        name: 'idx_curriculums_program',
      });
      await addIndexIfMissing(queryInterface, 'courses', ['programId'], {
        name: 'idx_courses_program',
      });
      await addIndexIfMissing(queryInterface, 'courses', ['programId', 'code'], {
        name: 'courses_program_code_unique',
        unique: true,
      });
      await addIndexIfMissing(
        queryInterface,
        'academic_terms',
        ['programId', 'schoolYear', 'semester'],
        {
          name: 'academic_terms_program_school_year_semester',
          unique: true,
        },
      );
      await addIndexIfMissing(queryInterface, 'academic_terms', ['programId', 'isCurrent'], {
        name: 'idx_academic_terms_program_current',
      });
      await addIndexIfMissing(queryInterface, 'student_academic_records', ['programId'], {
        name: 'idx_sar_program',
      });
      await addIndexIfMissing(queryInterface, 'forecast_snapshots', ['programId'], {
        name: 'idx_forecast_snapshots_program',
      });
      await addIndexIfMissing(queryInterface, 'course_equivalencies', ['ownerProgramId'], {
        name: 'idx_course_equiv_owner_program',
      });
      await addIndexIfMissing(
        queryInterface,
        'course_equivalencies',
        ['courseId', 'equivalentCourseId', 'ownerProgramId'],
        {
          name: 'course_equiv_owner_pair_unique',
          unique: true,
        },
      );
    } catch (error) {
      if (!committed) {
        await transaction.rollback();
      }
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface
      .removeIndex('course_equivalencies', 'course_equiv_owner_pair_unique')
      .catch(() => {});
    await queryInterface
      .removeIndex('course_equivalencies', 'idx_course_equiv_owner_program')
      .catch(() => {});
    await queryInterface
      .removeIndex('forecast_snapshots', 'idx_forecast_snapshots_program')
      .catch(() => {});
    await queryInterface.removeIndex('student_academic_records', 'idx_sar_program').catch(() => {});
    await queryInterface
      .removeIndex('academic_terms', 'idx_academic_terms_program_current')
      .catch(() => {});
    await queryInterface
      .removeIndex('academic_terms', 'academic_terms_program_school_year_semester')
      .catch(() => {});
    await queryInterface.removeIndex('courses', 'courses_program_code_unique').catch(() => {});
    await queryInterface.removeIndex('courses', 'idx_courses_program').catch(() => {});
    await queryInterface.removeIndex('curriculums', 'idx_curriculums_program').catch(() => {});

    if (await hasColumn(queryInterface, 'course_equivalencies', 'ownerProgramId')) {
      await queryInterface.removeColumn('course_equivalencies', 'ownerProgramId');
    }
    for (const tableName of [
      'forecast_snapshots',
      'student_academic_records',
      'academic_terms',
      'courses',
      'curriculums',
    ]) {
      if (await hasColumn(queryInterface, tableName, 'programId')) {
        await queryInterface.removeColumn(tableName, 'programId');
      }
    }

    if (await hasTable(queryInterface, 'user_program_assignments')) {
      await queryInterface.dropTable('user_program_assignments');
    }
    if (await hasTable(queryInterface, 'programs')) {
      await queryInterface.dropTable('programs');
    }
  },
};
