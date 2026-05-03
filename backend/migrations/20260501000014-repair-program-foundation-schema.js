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
  if (!(await hasTable(queryInterface, tableName))) return;
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
    await sequelize.query(`DROP INDEX IF EXISTS public.${quote(row.index_name)};`, {
      transaction,
    });
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    const transaction = await sequelize.transaction();

    try {
      const programReference = {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'programs', key: 'id' },
      };

      const nullableSetNullProgramReference = {
        ...programReference,
        onDelete: 'SET NULL',
      };

      const defaultProgramId = await getDefaultProgramId(sequelize, transaction);

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
        nullableSetNullProgramReference,
        transaction,
      );
      await addColumnIfMissing(
        queryInterface,
        'prerequisite_override_requests',
        'programId',
        nullableSetNullProgramReference,
        transaction,
      );

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
          UPDATE prerequisite_override_requests por
          SET "programId" = sar."programId"
          FROM student_academic_records sar
          WHERE por."studentAcademicRecordId" = sar.id AND por."programId" IS NULL;
          UPDATE prerequisite_override_requests SET "programId" = :programId WHERE "programId" IS NULL;
        `,
        {
          replacements: { programId: defaultProgramId },
          transaction,
        },
      );

      await dropSingleColumnUniqueConstraints(sequelize, 'courses', 'code', transaction);
      await sequelize.query(
        'ALTER TABLE public.academic_terms DROP CONSTRAINT IF EXISTS academic_terms_school_year_semester;',
        { transaction },
      );

      await addIndexIfMissing(queryInterface, 'curriculums', ['programId'], {
        name: 'curriculums_program_id',
        transaction,
      });
      await addIndexIfMissing(queryInterface, 'curriculums', ['programId', 'isActive'], {
        name: 'curriculums_program_id_is_active',
        transaction,
      });
      await addIndexIfMissing(queryInterface, 'courses', ['programId'], {
        name: 'courses_program_id',
        transaction,
      });
      await addIndexIfMissing(queryInterface, 'courses', ['programId', 'code'], {
        name: 'courses_program_code_unique',
        unique: true,
        transaction,
      });
      await addIndexIfMissing(
        queryInterface,
        'academic_terms',
        ['programId', 'schoolYear', 'semester'],
        {
          name: 'academic_terms_program_school_year_semester',
          unique: true,
          transaction,
        },
      );
      await addIndexIfMissing(queryInterface, 'academic_terms', ['programId', 'isCurrent'], {
        name: 'academic_terms_program_current',
        transaction,
      });
      await addIndexIfMissing(queryInterface, 'student_academic_records', ['programId'], {
        name: 'student_academic_records_program_id',
        transaction,
      });
      await addIndexIfMissing(queryInterface, 'forecast_snapshots', ['programId'], {
        name: 'forecast_snapshots_program_id',
        transaction,
      });
      await addIndexIfMissing(queryInterface, 'course_equivalencies', ['ownerProgramId'], {
        name: 'course_equivalencies_owner_program_id',
        transaction,
      });
      await addIndexIfMissing(
        queryInterface,
        'course_equivalencies',
        ['courseId', 'equivalentCourseId', 'ownerProgramId'],
        {
          name: 'course_equiv_owner_pair_unique',
          unique: true,
          transaction,
        },
      );
      await addIndexIfMissing(queryInterface, 'prerequisite_override_requests', ['programId'], {
        name: 'prerequisite_override_requests_program_id',
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface
      .removeIndex('prerequisite_override_requests', 'prerequisite_override_requests_program_id')
      .catch(() => {});
    await queryInterface
      .removeIndex('course_equivalencies', 'course_equiv_owner_pair_unique')
      .catch(() => {});
    await queryInterface
      .removeIndex('course_equivalencies', 'course_equivalencies_owner_program_id')
      .catch(() => {});
    await queryInterface
      .removeIndex('forecast_snapshots', 'forecast_snapshots_program_id')
      .catch(() => {});
    await queryInterface
      .removeIndex('student_academic_records', 'student_academic_records_program_id')
      .catch(() => {});
    await queryInterface
      .removeIndex('academic_terms', 'academic_terms_program_current')
      .catch(() => {});
    await queryInterface
      .removeIndex('academic_terms', 'academic_terms_program_school_year_semester')
      .catch(() => {});
    await queryInterface.removeIndex('courses', 'courses_program_code_unique').catch(() => {});
    await queryInterface.removeIndex('courses', 'courses_program_id').catch(() => {});
    await queryInterface
      .removeIndex('curriculums', 'curriculums_program_id_is_active')
      .catch(() => {});
    await queryInterface.removeIndex('curriculums', 'curriculums_program_id').catch(() => {});

    if (await hasColumn(queryInterface, 'prerequisite_override_requests', 'programId')) {
      await queryInterface.removeColumn('prerequisite_override_requests', 'programId');
    }
    if (await hasColumn(queryInterface, 'course_equivalencies', 'ownerProgramId')) {
      await queryInterface.removeColumn('course_equivalencies', 'ownerProgramId');
    }
    if (await hasColumn(queryInterface, 'forecast_snapshots', 'programId')) {
      await queryInterface.removeColumn('forecast_snapshots', 'programId');
    }
    if (await hasColumn(queryInterface, 'student_academic_records', 'programId')) {
      await queryInterface.removeColumn('student_academic_records', 'programId');
    }
    if (await hasColumn(queryInterface, 'academic_terms', 'programId')) {
      await queryInterface.removeColumn('academic_terms', 'programId');
    }
    if (await hasColumn(queryInterface, 'courses', 'programId')) {
      await queryInterface.removeColumn('courses', 'programId');
    }
    if (await hasColumn(queryInterface, 'curriculums', 'programId')) {
      await queryInterface.removeColumn('curriculums', 'programId');
    }
  },
};
