-- Supabase RLS policy baseline for future direct Data API usage (frontend/mobile).
--
-- Assumptions:
-- 1) JWT contains app user id in one of: app_user_id, user_id, uid, id, or sub (numeric).
-- 2) JWT contains app role in one of: app_role, user_role, or role.
-- 3) App roles are: admin, adviser, student.
--
-- NOTE:
-- - This migration is designed for Supabase SQL editor / psql execution.
-- - Backend Sequelize connections using elevated DB roles may bypass RLS.

begin;

-- -----------------------------------------------------------------------------
-- JWT helper functions
-- -----------------------------------------------------------------------------
create or replace function public.jwt_claim(claim_key text)
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select nullif(
    (coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb ->> claim_key),
    ''
  );
$$;

create or replace function public.current_app_user_id()
returns integer
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  raw_value text;
begin
  raw_value := coalesce(
    public.jwt_claim('app_user_id'),
    public.jwt_claim('user_id'),
    public.jwt_claim('uid'),
    public.jwt_claim('id'),
    public.jwt_claim('sub')
  );

  if raw_value is null then
    return null;
  end if;

  if raw_value ~ '^[0-9]+$' then
    return raw_value::integer;
  end if;

  return null;
end;
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select lower(
    coalesce(
      public.jwt_claim('app_role'),
      public.jwt_claim('user_role'),
      public.jwt_claim('role'),
      ''
    )
  );
$$;

create or replace function public.is_active_sar_owner(sar_id integer)
returns boolean
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  sar_user_id integer;
  sar_deleted_at timestamptz;
begin
  if sar_id is null then
    return false;
  end if;

  execute
    'select "userId", "deletedAt" from public.student_academic_records where id = $1'
    into sar_user_id, sar_deleted_at
    using sar_id;

  if sar_user_id is null then
    return false;
  end if;

  return sar_user_id = public.current_app_user_id() and sar_deleted_at is null;
end;
$$;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.current_app_role() = 'admin';
$$;

create or replace function public.is_app_staff()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.current_app_role() in ('admin', 'adviser');
$$;

-- -----------------------------------------------------------------------------
-- Ensure RLS is enabled on all linted tables
-- -----------------------------------------------------------------------------
alter table public."SequelizeMeta" enable row level security;
alter table public.academic_terms enable row level security;
alter table public.co_requisites enable row level security;
alter table public.course_equivalencies enable row level security;
alter table public.courses enable row level security;
alter table public.curriculum_courses enable row level security;
alter table public.curriculums enable row level security;
alter table public.elective_track_courses enable row level security;
alter table public.elective_tracks enable row level security;
alter table public.forecast_snapshots enable row level security;
alter table public.notifications enable row level security;
alter table public.prerequisites enable row level security;
alter table public.student_academic_records enable row level security;
alter table public.study_plan_courses enable row level security;
alter table public.study_plan_versions enable row level security;
alter table public.study_plans enable row level security;
alter table public.users enable row level security;

-- -----------------------------------------------------------------------------
-- Grant model (least privilege by default)
-- -----------------------------------------------------------------------------

-- Catalog tables: authenticated users can read.
revoke all on table public.academic_terms from anon, authenticated;
revoke all on table public.courses from anon, authenticated;
revoke all on table public.curriculums from anon, authenticated;
revoke all on table public.curriculum_courses from anon, authenticated;
revoke all on table public.prerequisites from anon, authenticated;
revoke all on table public.co_requisites from anon, authenticated;
revoke all on table public.course_equivalencies from anon, authenticated;
revoke all on table public.elective_tracks from anon, authenticated;
revoke all on table public.elective_track_courses from anon, authenticated;

grant select on table public.academic_terms to authenticated;
grant select on table public.courses to authenticated;
grant select on table public.curriculums to authenticated;
grant select on table public.curriculum_courses to authenticated;
grant select on table public.prerequisites to authenticated;
grant select on table public.co_requisites to authenticated;
grant select on table public.course_equivalencies to authenticated;
grant select on table public.elective_tracks to authenticated;
grant select on table public.elective_track_courses to authenticated;

-- User and workflow tables
revoke all on table public.users from anon, authenticated;
revoke all on table public.notifications from anon, authenticated;
revoke all on table public.student_academic_records from anon, authenticated;
revoke all on table public.study_plans from anon, authenticated;
revoke all on table public.study_plan_versions from anon, authenticated;
revoke all on table public.study_plan_courses from anon, authenticated;
revoke all on table public.forecast_snapshots from anon, authenticated;
revoke all on table public."SequelizeMeta" from anon, authenticated;

grant select on table public.users to authenticated;
grant select, insert, update, delete on table public.notifications to authenticated;
grant select, insert, update, delete on table public.student_academic_records to authenticated;
grant select, insert, update, delete on table public.study_plans to authenticated;
grant select, insert, update, delete on table public.study_plan_versions to authenticated;
grant select, insert, update, delete on table public.study_plan_courses to authenticated;
grant select, insert, update, delete on table public.forecast_snapshots to authenticated;
grant select on table public."SequelizeMeta" to authenticated;

-- Allow direct profile updates only on non-auth-control columns.
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
      'grant update (%s) on table public.users to authenticated',
      safe_profile_update_cols
    );
  end if;
end;
$$;

-- Optional hardening: block direct reads/updates of sensitive auth columns from client roles.
do $$
declare
  selectable_cols text;
  updatable_cols text;
begin
  select string_agg(format('%I', c.column_name), ', ')
    into selectable_cols
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'users'
    and c.column_name in (
      'password',
      'activationToken',
      'activationTokenExpires',
      'resetPasswordToken',
      'resetPasswordExpires',
      'verificationCode',
      'verificationCodeExpires',
      'refreshToken',
      'refreshTokenExpires',
      'emailChangeCode',
      'emailChangeCodeExpires',
      'pendingEmail'
    );

  if selectable_cols is not null then
    execute format(
      'revoke select (%s) on table public.users from anon, authenticated',
      selectable_cols
    );
  end if;

  select string_agg(format('%I', c.column_name), ', ')
    into updatable_cols
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'users'
    and c.column_name in (
      'role',
      'isActive',
      'isVerified',
      'mustChangePassword',
      'refreshToken',
      'refreshTokenExpires',
      'failedLoginAttempts',
      'lockedUntil'
    );

  if updatable_cols is not null then
    execute format(
      'revoke update (%s) on table public.users from authenticated',
      updatable_cols
    );
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Catalog policies (read-only)
-- -----------------------------------------------------------------------------

drop policy if exists catalog_read_authenticated on public.academic_terms;
create policy catalog_read_authenticated on public.academic_terms
for select
to authenticated
using (true);

drop policy if exists catalog_read_authenticated on public.courses;
create policy catalog_read_authenticated on public.courses
for select
to authenticated
using (true);

drop policy if exists catalog_read_authenticated on public.curriculums;
create policy catalog_read_authenticated on public.curriculums
for select
to authenticated
using (true);

drop policy if exists catalog_read_authenticated on public.curriculum_courses;
create policy catalog_read_authenticated on public.curriculum_courses
for select
to authenticated
using (true);

drop policy if exists catalog_read_authenticated on public.prerequisites;
create policy catalog_read_authenticated on public.prerequisites
for select
to authenticated
using (true);

drop policy if exists catalog_read_authenticated on public.co_requisites;
create policy catalog_read_authenticated on public.co_requisites
for select
to authenticated
using (true);

drop policy if exists catalog_read_authenticated on public.course_equivalencies;
create policy catalog_read_authenticated on public.course_equivalencies
for select
to authenticated
using (true);

drop policy if exists catalog_read_authenticated on public.elective_tracks;
create policy catalog_read_authenticated on public.elective_tracks
for select
to authenticated
using (true);

drop policy if exists catalog_read_authenticated on public.elective_track_courses;
create policy catalog_read_authenticated on public.elective_track_courses
for select
to authenticated
using (true);

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------

drop policy if exists users_select_self_or_staff on public.users;
create policy users_select_self_or_staff on public.users
for select
to authenticated
using (
  public.is_app_staff()
  or id = public.current_app_user_id()
);

drop policy if exists users_update_self_or_staff on public.users;
create policy users_update_self_or_staff on public.users
for update
to authenticated
using (
  public.is_app_staff()
  or id = public.current_app_user_id()
)
with check (
  public.is_app_staff()
  or id = public.current_app_user_id()
);

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------

drop policy if exists notifications_select_owner_or_staff on public.notifications;
create policy notifications_select_owner_or_staff on public.notifications
for select
to authenticated
using (
  public.is_app_staff()
  or "recipientId" = public.current_app_user_id()
);

drop policy if exists notifications_update_owner_or_staff on public.notifications;
create policy notifications_update_owner_or_staff on public.notifications
for update
to authenticated
using (
  public.is_app_staff()
  or "recipientId" = public.current_app_user_id()
)
with check (
  public.is_app_staff()
  or "recipientId" = public.current_app_user_id()
);

drop policy if exists notifications_delete_owner_or_staff on public.notifications;
create policy notifications_delete_owner_or_staff on public.notifications
for delete
to authenticated
using (
  public.is_app_staff()
  or "recipientId" = public.current_app_user_id()
);

drop policy if exists notifications_insert_staff_only on public.notifications;
create policy notifications_insert_staff_only on public.notifications
for insert
to authenticated
with check (
  public.is_app_staff()
);

-- -----------------------------------------------------------------------------
-- student_academic_records
-- -----------------------------------------------------------------------------

drop policy if exists sar_select_owner_or_staff on public.student_academic_records;
create policy sar_select_owner_or_staff on public.student_academic_records
for select
to authenticated
using (
  public.is_app_staff()
  or "userId" = public.current_app_user_id()
);

drop policy if exists sar_insert_staff_only on public.student_academic_records;
create policy sar_insert_staff_only on public.student_academic_records
for insert
to authenticated
with check (
  public.is_app_staff()
);

drop policy if exists sar_update_staff_only on public.student_academic_records;
create policy sar_update_staff_only on public.student_academic_records
for update
to authenticated
using (
  public.is_app_staff()
)
with check (
  public.is_app_staff()
);

drop policy if exists sar_delete_staff_only on public.student_academic_records;
create policy sar_delete_staff_only on public.student_academic_records
for delete
to authenticated
using (
  public.is_app_staff()
);

-- -----------------------------------------------------------------------------
-- study_plans
-- -----------------------------------------------------------------------------

drop policy if exists study_plans_select_owner_or_staff on public.study_plans;
create policy study_plans_select_owner_or_staff on public.study_plans
for select
to authenticated
using (
  public.is_app_staff()
  or public.is_active_sar_owner("studentAcademicRecordId")
);

drop policy if exists study_plans_insert_staff_only on public.study_plans;
create policy study_plans_insert_staff_only on public.study_plans
for insert
to authenticated
with check (
  public.is_app_staff()
);

drop policy if exists study_plans_update_staff_only on public.study_plans;
create policy study_plans_update_staff_only on public.study_plans
for update
to authenticated
using (
  public.is_app_staff()
)
with check (
  public.is_app_staff()
);

drop policy if exists study_plans_delete_staff_only on public.study_plans;
create policy study_plans_delete_staff_only on public.study_plans
for delete
to authenticated
using (
  public.is_app_staff()
);

-- -----------------------------------------------------------------------------
-- study_plan_versions
-- -----------------------------------------------------------------------------

drop policy if exists spv_select_owner_or_staff on public.study_plan_versions;
create policy spv_select_owner_or_staff on public.study_plan_versions
for select
to authenticated
using (
  public.is_app_staff()
  or exists (
    select 1
    from public.study_plans sp
    where sp.id = "studyPlanId"
      and public.is_active_sar_owner(sp."studentAcademicRecordId")
  )
);

drop policy if exists spv_insert_staff_only on public.study_plan_versions;
create policy spv_insert_staff_only on public.study_plan_versions
for insert
to authenticated
with check (
  public.is_app_staff()
);

drop policy if exists spv_update_staff_only on public.study_plan_versions;
create policy spv_update_staff_only on public.study_plan_versions
for update
to authenticated
using (
  public.is_app_staff()
)
with check (
  public.is_app_staff()
);

drop policy if exists spv_delete_staff_only on public.study_plan_versions;
create policy spv_delete_staff_only on public.study_plan_versions
for delete
to authenticated
using (
  public.is_app_staff()
);

-- -----------------------------------------------------------------------------
-- study_plan_courses
-- -----------------------------------------------------------------------------

drop policy if exists spc_select_owner_or_staff on public.study_plan_courses;
create policy spc_select_owner_or_staff on public.study_plan_courses
for select
to authenticated
using (
  public.is_app_staff()
  or exists (
    select 1
    from public.study_plan_versions spv
    join public.study_plans sp on sp.id = spv."studyPlanId"
    where spv.id = "studyPlanVersionId"
      and public.is_active_sar_owner(sp."studentAcademicRecordId")
  )
);

drop policy if exists spc_insert_staff_only on public.study_plan_courses;
create policy spc_insert_staff_only on public.study_plan_courses
for insert
to authenticated
with check (
  public.is_app_staff()
);

drop policy if exists spc_update_staff_only on public.study_plan_courses;
create policy spc_update_staff_only on public.study_plan_courses
for update
to authenticated
using (
  public.is_app_staff()
)
with check (
  public.is_app_staff()
);

drop policy if exists spc_delete_staff_only on public.study_plan_courses;
create policy spc_delete_staff_only on public.study_plan_courses
for delete
to authenticated
using (
  public.is_app_staff()
);

-- -----------------------------------------------------------------------------
-- forecast_snapshots (staff-only)
-- -----------------------------------------------------------------------------

drop policy if exists forecast_select_staff_only on public.forecast_snapshots;
create policy forecast_select_staff_only on public.forecast_snapshots
for select
to authenticated
using (
  public.is_app_staff()
);

drop policy if exists forecast_insert_staff_only on public.forecast_snapshots;
create policy forecast_insert_staff_only on public.forecast_snapshots
for insert
to authenticated
with check (
  public.is_app_staff()
);

drop policy if exists forecast_update_staff_only on public.forecast_snapshots;
create policy forecast_update_staff_only on public.forecast_snapshots
for update
to authenticated
using (
  public.is_app_staff()
)
with check (
  public.is_app_staff()
);

drop policy if exists forecast_delete_staff_only on public.forecast_snapshots;
create policy forecast_delete_staff_only on public.forecast_snapshots
for delete
to authenticated
using (
  public.is_app_staff()
);

-- -----------------------------------------------------------------------------
-- SequelizeMeta (admin-only read)
-- -----------------------------------------------------------------------------

drop policy if exists sequelize_meta_select_admin_only on public."SequelizeMeta";
create policy sequelize_meta_select_admin_only on public."SequelizeMeta"
for select
to authenticated
using (
  public.is_app_admin()
);

commit;
