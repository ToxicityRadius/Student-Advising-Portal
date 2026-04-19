'use strict';

/**
 * Removes users.role dependency from RLS update policy so dev schema alter
 * does not fail when Sequelize emits ALTER COLUMN TYPE for users.role.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF to_regclass('public.users') IS NULL THEN
          RETURN;
        END IF;

        EXECUTE 'DROP POLICY IF EXISTS users_update_self_or_staff ON public.users';

        IF to_regprocedure('public.is_app_staff()') IS NOT NULL
           AND to_regprocedure('public.current_app_user_id()') IS NOT NULL THEN
          EXECUTE 'CREATE POLICY users_update_self_or_staff ON public.users
            FOR UPDATE TO authenticated
            USING (public.is_app_staff() OR id = public.current_app_user_id())
            WITH CHECK (public.is_app_staff() OR id = public.current_app_user_id())';
        END IF;
      END
      $$;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF to_regclass('public.users') IS NULL THEN
          RETURN;
        END IF;

        EXECUTE 'DROP POLICY IF EXISTS users_update_self_or_staff ON public.users';

        IF to_regprocedure('public.is_app_staff()') IS NOT NULL
           AND to_regprocedure('public.current_app_user_id()') IS NOT NULL
           AND to_regprocedure('public.current_app_role()') IS NOT NULL THEN
          EXECUTE 'CREATE POLICY users_update_self_or_staff ON public.users
            FOR UPDATE TO authenticated
            USING (public.is_app_staff() OR id = public.current_app_user_id())
            WITH CHECK (
              public.is_app_staff()
              OR (id = public.current_app_user_id() AND role = public.current_app_role())
            )';
        END IF;
      END
      $$;
    `);
  },
};
