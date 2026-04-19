'use strict';

const { QueryTypes } = require('sequelize');

/**
 * Phase 4.1: Remove duplicate unique constraints that accumulated on
 * high-traffic identity columns.
 */
module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;

    const targets = [
      { table: 'courses', columns: ['code'], preferredConstraint: 'courses_code_key' },
      { table: 'users', columns: ['email'], preferredConstraint: 'users_email_key' },
      { table: 'users', columns: ['studentId'], preferredConstraint: 'users_studentId_key' },
      {
        table: 'student_academic_records',
        columns: ['studentNumber'],
        preferredConstraint: 'student_academic_records_studentNumber_key',
      },
    ];

    const quote = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;
    const sameColumns = (a, b) =>
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((value, index) => value === b[index]);

    await sequelize.transaction(async (transaction) => {
      await sequelize.query("SET LOCAL lock_timeout = '5s';", { transaction });
      await sequelize.query("SET LOCAL statement_timeout = '60s';", { transaction });

      for (const target of targets) {
        const tableName = target.table;
        const tableRef = `public.${quote(tableName)}`;

        const constraints = await sequelize.query(
          `
            SELECT
              c.conname AS constraint_name,
              ARRAY_AGG(a.attname::text ORDER BY x.ord) AS columns
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            JOIN LATERAL unnest(c.conkey) WITH ORDINALITY x(attnum, ord) ON true
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = x.attnum
            WHERE n.nspname = 'public'
              AND c.contype = 'u'
              AND t.relname = :tableName
            GROUP BY c.oid, c.conname
            ORDER BY c.conname;
          `,
          {
            replacements: { tableName },
            type: QueryTypes.SELECT,
            transaction,
          },
        );

        const matchingConstraints = constraints.filter((row) =>
          sameColumns(row.columns, target.columns),
        );

        if (matchingConstraints.length > 1) {
          const preferred = matchingConstraints.find(
            (row) => row.constraint_name === target.preferredConstraint,
          );

          const keep = (preferred || matchingConstraints[0]).constraint_name;

          for (const row of matchingConstraints) {
            if (row.constraint_name === keep) {
              continue;
            }

            await sequelize.query(
              `ALTER TABLE ${tableRef} DROP CONSTRAINT IF EXISTS ${quote(row.constraint_name)};`,
              { transaction },
            );
          }
        }
      }
    });
  },

  async down() {
    throw new Error(
      'Irreversible migration: duplicate unique constraints were removed in Phase 4.1 cleanup.',
    );
  },
};
