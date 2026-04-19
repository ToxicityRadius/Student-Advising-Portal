-- Rollback companion for 20260419000004-supabase-rls-policies.sql
--
-- Behavior:
-- 1) Drops all policies created by the forward migration.
-- 2) Revokes table and column privileges granted to anon/authenticated roles.
-- 3) Drops helper JWT/RLS functions introduced by the forward migration.
--
-- This rollback intentionally keeps RLS enabled on tables to preserve a
-- deny-by-default stance for direct Supabase Data API access.

begin;

-- -----------------------------------------------------------------------------
-- Drop policies introduced by the forward migration
-- -----------------------------------------------------------------------------

drop policy if exists catalog_read_authenticated on public.academic_terms;
drop policy if exists catalog_read_authenticated on public.courses;
drop policy if exists catalog_read_authenticated on public.curriculums;
drop policy if exists catalog_read_authenticated on public.curriculum_courses;
drop policy if exists catalog_read_authenticated on public.prerequisites;
drop policy if exists catalog_read_authenticated on public.co_requisites;
drop policy if exists catalog_read_authenticated on public.course_equivalencies;
drop policy if exists catalog_read_authenticated on public.elective_tracks;
drop policy if exists catalog_read_authenticated on public.elective_track_courses;

drop policy if exists users_select_self_or_staff on public.users;
drop policy if exists users_update_self_or_staff on public.users;

drop policy if exists notifications_select_owner_or_staff on public.notifications;
drop policy if exists notifications_update_owner_or_staff on public.notifications;
drop policy if exists notifications_delete_owner_or_staff on public.notifications;
drop policy if exists notifications_insert_staff_only on public.notifications;

drop policy if exists sar_select_owner_or_staff on public.student_academic_records;
drop policy if exists sar_insert_staff_only on public.student_academic_records;
drop policy if exists sar_update_staff_only on public.student_academic_records;
drop policy if exists sar_delete_staff_only on public.student_academic_records;

drop policy if exists study_plans_select_owner_or_staff on public.study_plans;
drop policy if exists study_plans_insert_staff_only on public.study_plans;
drop policy if exists study_plans_update_staff_only on public.study_plans;
drop policy if exists study_plans_delete_staff_only on public.study_plans;

drop policy if exists spv_select_owner_or_staff on public.study_plan_versions;
drop policy if exists spv_insert_staff_only on public.study_plan_versions;
drop policy if exists spv_update_staff_only on public.study_plan_versions;
drop policy if exists spv_delete_staff_only on public.study_plan_versions;

drop policy if exists spc_select_owner_or_staff on public.study_plan_courses;
drop policy if exists spc_insert_staff_only on public.study_plan_courses;
drop policy if exists spc_update_staff_only on public.study_plan_courses;
drop policy if exists spc_delete_staff_only on public.study_plan_courses;

drop policy if exists forecast_select_staff_only on public.forecast_snapshots;
drop policy if exists forecast_insert_staff_only on public.forecast_snapshots;
drop policy if exists forecast_update_staff_only on public.forecast_snapshots;
drop policy if exists forecast_delete_staff_only on public.forecast_snapshots;

drop policy if exists sequelize_meta_select_admin_only on public."SequelizeMeta";

-- -----------------------------------------------------------------------------
-- Revoke client-facing table privileges from anon/authenticated
-- -----------------------------------------------------------------------------
do $$
declare
  table_name text;
  target_tables text[] := array[
    'academic_terms',
    'co_requisites',
    'course_equivalencies',
    'courses',
    'curriculum_courses',
    'curriculums',
    'elective_track_courses',
    'elective_tracks',
    'forecast_snapshots',
    'notifications',
    'prerequisites',
    'student_academic_records',
    'study_plan_courses',
    'study_plan_versions',
    'study_plans',
    'users',
    'SequelizeMeta'
  ];
begin
  foreach table_name in array target_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('revoke all on table public.%I from anon, authenticated', table_name);
    end if;
  end loop;
end;
$$;

-- Remove explicit column grants from the forward migration.
do $$
declare
  safe_profile_update_cols text;
begin
  select string_agg(format('%I', c.column_name), ', ')
    into safe_profile_update_cols
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'users'
    and c.column_name in (
      'firstName',
      'lastName',
      'first_name',
      'middle_name',
      'last_name',
      'preferred_name',
      'contact_number',
      'alternate_email',
      'address',
      'program',
      'citizenship',
      'sex',
      'profile_picture',
      'notifInapp',
      'notifEmail',
      'notifReminders',
      'compactMode',
      'current_year_level',
      'curriculum_id',
      'student_type',
      'emergency_contact_name',
      'emergency_contact_relationship',
      'emergency_contact_number',
      'profile_updated_at',
      'profile_last_submitted_term_key',
      'profile_submission_locked_at'
    );

  if safe_profile_update_cols is not null then
    execute format(
      'revoke update (%s) on table public.users from authenticated',
      safe_profile_update_cols
    );
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Drop helper functions introduced by the forward migration
-- -----------------------------------------------------------------------------

drop function if exists public.is_app_staff();
drop function if exists public.is_app_admin();
drop function if exists public.is_active_sar_owner(integer);
drop function if exists public.current_app_role();
drop function if exists public.current_app_user_id();
drop function if exists public.jwt_claim(text);

commit;
