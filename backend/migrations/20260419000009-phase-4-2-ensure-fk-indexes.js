'use strict';

const { QueryTypes } = require('sequelize');

/**
 * Phase 4.2: Ensure FK-supporting indexes exist for key relationship columns.
 *
 * This migration is idempotent: it only creates an index when no existing
 * usable leading-column index is present.
 */
module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;

    const targets = [
      { table: 'academic_terms', column: 'closedById', name: 'idx_academic_terms_closed_by' },
      { table: 'co_requisites', column: 'coRequisiteCourseId', name: 'idx_co_requisites_coreq' },
      { table: 'co_requisites', column: 'courseId', name: 'idx_co_requisites_course' },
      { table: 'co_requisites', column: 'curriculumId', name: 'idx_co_requisites_curriculum' },
      { table: 'course_equivalencies', column: 'courseId', name: 'idx_course_equiv_course' },
      {
        table: 'course_equivalencies',
        column: 'equivalentCourseId',
        name: 'idx_course_equiv_equiv',
      },
      { table: 'curriculum_courses', column: 'courseId', name: 'idx_curriculum_courses_course' },
      { table: 'curriculums', column: 'createdById', name: 'idx_curriculums_created_by' },
      {
        table: 'elective_track_courses',
        column: 'courseId',
        name: 'idx_elective_track_courses_course',
      },
      {
        table: 'elective_track_courses',
        column: 'electiveTrackId',
        name: 'idx_elective_track_courses_track',
      },
      { table: 'elective_tracks', column: 'curriculumId', name: 'idx_elective_tracks_curriculum' },
      {
        table: 'forecast_snapshots',
        column: 'triggeredByUserId',
        name: 'idx_forecast_snapshots_user',
      },
      { table: 'notifications', column: 'actorId', name: 'idx_notifications_actor' },
      { table: 'prerequisites', column: 'courseId', name: 'idx_prerequisites_course' },
      { table: 'prerequisites', column: 'curriculumId', name: 'idx_prerequisites_curriculum' },
      {
        table: 'prerequisites',
        column: 'prerequisiteCourseId',
        name: 'idx_prerequisites_prereq',
      },
      {
        table: 'student_academic_records',
        column: 'createdByAdviserId',
        name: 'idx_sar_created_by',
      },
      { table: 'student_academic_records', column: 'curriculumId', name: 'idx_sar_curriculum' },
      {
        table: 'student_academic_records',
        column: 'electiveTrackId',
        name: 'idx_sar_elective_track',
      },
      { table: 'study_plan_courses', column: 'courseId', name: 'idx_study_plan_courses_course' },
      {
        table: 'study_plan_versions',
        column: 'generatedByAdviserId',
        name: 'idx_spv_generated_by',
      },
      {
        table: 'study_plan_versions',
        column: 'validatedByAdviserId',
        name: 'idx_spv_validated_by',
      },
      { table: 'users', column: 'curriculum_id', name: 'idx_users_curriculum' },
    ];

    const quote = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;

    for (const target of targets) {
      const sameName = await sequelize.query(
        `
          SELECT
            t.relname AS table_name,
            a.attname AS leading_column,
            ix.indisvalid AS is_valid,
            ix.indisready AS is_ready,
            (ix.indpred IS NULL) AS no_predicate,
            am.amname AS access_method
          FROM pg_class i
          JOIN pg_namespace n ON n.oid = i.relnamespace
          JOIN pg_index ix ON ix.indexrelid = i.oid
          JOIN pg_class t ON t.oid = ix.indrelid
          JOIN pg_am am ON am.oid = i.relam
          JOIN LATERAL unnest(ix.indkey::int2[]) WITH ORDINALITY k(attnum, ord) ON k.ord = 1
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
          WHERE n.nspname = 'public'
            AND i.relname = :indexName
          LIMIT 1;
        `,
        {
          replacements: { indexName: target.name },
          type: QueryTypes.SELECT,
        },
      );

      if (sameName.length > 0) {
        const row = sameName[0];
        const sameNameIsUsable =
          row.table_name === target.table &&
          row.leading_column === target.column &&
          row.is_valid === true &&
          row.is_ready === true &&
          row.no_predicate === true &&
          row.access_method === 'btree';

        if (sameNameIsUsable) {
          continue;
        }

        await sequelize.query(`DROP INDEX CONCURRENTLY IF EXISTS public.${quote(target.name)};`);
      }

      const existing = await sequelize.query(
        `
          SELECT i.relname AS index_name
          FROM pg_class t
          JOIN pg_namespace n ON n.oid = t.relnamespace
          JOIN pg_index ix ON ix.indrelid = t.oid
          JOIN pg_class i ON i.oid = ix.indexrelid
          JOIN pg_am am ON am.oid = i.relam
          JOIN LATERAL unnest(ix.indkey::int2[]) WITH ORDINALITY k(attnum, ord) ON k.ord = 1
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
          WHERE n.nspname = 'public'
            AND t.relname = :tableName
            AND a.attname = :columnName
            AND ix.indisvalid = true
            AND ix.indisready = true
            AND ix.indpred IS NULL
            AND am.amname = 'btree'
          LIMIT 1;
        `,
        {
          replacements: { tableName: target.table, columnName: target.column },
          type: QueryTypes.SELECT,
        },
      );

      if (existing.length > 0) {
        continue;
      }

      await sequelize.query(
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${quote(target.name)} ON public.${quote(target.table)} (${quote(target.column)});`,
      );
    }
  },

  async down() {
    // No-op rollback: these indexes are additive performance safeguards.
  },
};
