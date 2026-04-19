'use strict';

/**
 * Reworks study plan ownership policies to avoid direct policy dependency on
 * student_academic_records.deletedAt, which can block dev schema alter flows.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [[guards]] = await queryInterface.sequelize.query(
        `
          SELECT
            to_regprocedure('public.current_app_user_id()') IS NOT NULL AS has_current_app_user_id,
            to_regprocedure('public.is_app_staff()') IS NOT NULL AS has_is_app_staff,
            to_regclass('public.student_academic_records') IS NOT NULL AS has_sar,
            to_regclass('public.study_plans') IS NOT NULL AS has_study_plans,
            to_regclass('public.study_plan_versions') IS NOT NULL AS has_study_plan_versions,
            to_regclass('public.study_plan_courses') IS NOT NULL AS has_study_plan_courses
        `,
        { transaction },
      );

      if (
        !guards.has_current_app_user_id ||
        !guards.has_is_app_staff ||
        !guards.has_sar ||
        !guards.has_study_plans ||
        !guards.has_study_plan_versions ||
        !guards.has_study_plan_courses
      ) {
        return;
      }

      await queryInterface.sequelize.query(
        `
          CREATE OR REPLACE FUNCTION public.is_active_sar_owner(sar_id integer)
          RETURNS boolean
          LANGUAGE plpgsql
          STABLE
          SET search_path = public, pg_temp
          AS $$
          DECLARE
            sar_user_id integer;
            sar_deleted_at timestamptz;
          BEGIN
            IF sar_id IS NULL THEN
              RETURN FALSE;
            END IF;

            EXECUTE
              'select "userId", "deletedAt" from public.student_academic_records where id = $1'
              INTO sar_user_id, sar_deleted_at
              USING sar_id;

            IF sar_user_id IS NULL THEN
              RETURN FALSE;
            END IF;

            RETURN sar_user_id = public.current_app_user_id() AND sar_deleted_at IS NULL;
          END;
          $$;
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
          DROP POLICY IF EXISTS study_plans_select_owner_or_staff ON public.study_plans;
          CREATE POLICY study_plans_select_owner_or_staff ON public.study_plans
          FOR SELECT
          TO authenticated
          USING (
            public.is_app_staff()
            OR public.is_active_sar_owner("studentAcademicRecordId")
          );
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
          DROP POLICY IF EXISTS spv_select_owner_or_staff ON public.study_plan_versions;
          CREATE POLICY spv_select_owner_or_staff ON public.study_plan_versions
          FOR SELECT
          TO authenticated
          USING (
            public.is_app_staff()
            OR EXISTS (
              SELECT 1
              FROM public.study_plans sp
              WHERE sp.id = "studyPlanId"
                AND public.is_active_sar_owner(sp."studentAcademicRecordId")
            )
          );
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
          DROP POLICY IF EXISTS spc_select_owner_or_staff ON public.study_plan_courses;
          CREATE POLICY spc_select_owner_or_staff ON public.study_plan_courses
          FOR SELECT
          TO authenticated
          USING (
            public.is_app_staff()
            OR EXISTS (
              SELECT 1
              FROM public.study_plan_versions spv
              JOIN public.study_plans sp ON sp.id = spv."studyPlanId"
              WHERE spv.id = "studyPlanVersionId"
                AND public.is_active_sar_owner(sp."studentAcademicRecordId")
            )
          );
        `,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [[guards]] = await queryInterface.sequelize.query(
        `
          SELECT
            to_regprocedure('public.current_app_user_id()') IS NOT NULL AS has_current_app_user_id,
            to_regprocedure('public.is_app_staff()') IS NOT NULL AS has_is_app_staff,
            to_regclass('public.student_academic_records') IS NOT NULL AS has_sar,
            to_regclass('public.study_plans') IS NOT NULL AS has_study_plans,
            to_regclass('public.study_plan_versions') IS NOT NULL AS has_study_plan_versions,
            to_regclass('public.study_plan_courses') IS NOT NULL AS has_study_plan_courses
        `,
        { transaction },
      );

      if (
        guards.has_current_app_user_id &&
        guards.has_is_app_staff &&
        guards.has_sar &&
        guards.has_study_plans &&
        guards.has_study_plan_versions &&
        guards.has_study_plan_courses
      ) {
        await queryInterface.sequelize.query(
          `
            DROP POLICY IF EXISTS study_plans_select_owner_or_staff ON public.study_plans;
            CREATE POLICY study_plans_select_owner_or_staff ON public.study_plans
            FOR SELECT
            TO authenticated
            USING (
              public.is_app_staff()
              OR EXISTS (
                SELECT 1
                FROM public.student_academic_records sar
                WHERE sar.id = "studentAcademicRecordId"
                  AND sar."userId" = public.current_app_user_id()
                  AND sar."deletedAt" IS NULL
              )
            );
          `,
          { transaction },
        );

        await queryInterface.sequelize.query(
          `
            DROP POLICY IF EXISTS spv_select_owner_or_staff ON public.study_plan_versions;
            CREATE POLICY spv_select_owner_or_staff ON public.study_plan_versions
            FOR SELECT
            TO authenticated
            USING (
              public.is_app_staff()
              OR EXISTS (
                SELECT 1
                FROM public.study_plans sp
                JOIN public.student_academic_records sar ON sar.id = sp."studentAcademicRecordId"
                WHERE sp.id = "studyPlanId"
                  AND sar."userId" = public.current_app_user_id()
                  AND sar."deletedAt" IS NULL
              )
            );
          `,
          { transaction },
        );

        await queryInterface.sequelize.query(
          `
            DROP POLICY IF EXISTS spc_select_owner_or_staff ON public.study_plan_courses;
            CREATE POLICY spc_select_owner_or_staff ON public.study_plan_courses
            FOR SELECT
            TO authenticated
            USING (
              public.is_app_staff()
              OR EXISTS (
                SELECT 1
                FROM public.study_plan_versions spv
                JOIN public.study_plans sp ON sp.id = spv."studyPlanId"
                JOIN public.student_academic_records sar ON sar.id = sp."studentAcademicRecordId"
                WHERE spv.id = "studyPlanVersionId"
                  AND sar."userId" = public.current_app_user_id()
                  AND sar."deletedAt" IS NULL
              )
            );
          `,
          { transaction },
        );
      }

      await queryInterface.sequelize.query(
        'DROP FUNCTION IF EXISTS public.is_active_sar_owner(integer);',
        { transaction },
      );
    });
  },
};
