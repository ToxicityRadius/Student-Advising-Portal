# System Reference

This document is the technical reference for the Student Advising System.

## Architecture

| Area | Technology |
|---|---|
| Backend | Node.js, Express, Sequelize |
| Database | PostgreSQL |
| Frontend | React, React Router, React Bootstrap |
| Authentication | JWT access/refresh tokens, Google OAuth, email verification |
| Uploads | Local uploads by default, S3-compatible profile-photo storage optional |
| Reports | PDFKit SAR export |

## Runtime Entry Points

| Path | Purpose |
|---|---|
| `backend/server.js` | Express app, security middleware, health endpoint, startup migration/sync behavior |
| `backend/database/db.js` | Sequelize connection |
| `backend/migrations` | Ordered schema migrations |
| `backend/scripts/seed.js` | Full seed, including curriculum imports and default accounts |
| `backend/scripts/seed_users_only.js` | User-only seed/reset |
| `frontend/src/App.js` | React route tree |
| `frontend/src/context/AuthContext.js` | Auth state, current user, login/logout |
| `frontend/src/utils/api.js` | Axios instance and API base URL |

## Role Model

| Role Value | Role Name | Scope |
|---|---|---|
| `superadmin` | Super Admin | Only global account. Can manage all programs, program assignments, global user account controls, and transfer ownership. |
| `admin` | Program Chair | Program-bound. Can manage assigned-program curriculum, terms, forecasting, adviser assignment, SAR/study-plan workflows, and academic operations. |
| `adviser` | Student Adviser | Program/student-bound. Can manage assigned SAR, grade, study-plan, prerequisite override, and elective override workflows. |
| `student` | Student | Own-record visibility and own profile update flow. |

Program Chair remains stored as `admin` internally. Backend access must be enforced by role plus program assignment through `UserProgramAssignment`; frontend filters should match that backend truth.

## Permission Matrix

| Capability | Super Admin | Program Chair | Adviser | Student |
|---|---|---|---|---|
| Global program management | Yes | No | No | No |
| Program assignment management | Yes | No | No | No |
| Transfer Ownership | Yes | No | No | No |
| Edit user account details | Yes | No | No | No |
| Activate/deactivate users | Yes | No | No | No |
| Manage adviser assignments | All programs | Assigned programs | No | No |
| Manage curriculum and courses | All programs | Assigned programs | No | No |
| Manage terms and forecasting | All programs | Assigned programs | Read/use where assigned | No |
| SAR and study-plan workflows | All programs | Assigned programs | Assigned students/programs | Own record read |
| Prerequisite/elective override workflows | All programs | Assigned programs | Assigned students/programs | Own record read |
| View/manage Super Admin accounts | Yes | No | No | No |

Cross-program access by Program Chair, Adviser, or Student should return `403`.

## Core Models

| Model | Purpose |
|---|---|
| `User` | Users, roles, profile fields, status, first-login flags |
| `Program` | Academic program definitions |
| `UserProgramAssignment` | Program access assignments for Program Chair and Adviser scope |
| `Course` | Course catalog entries |
| `Curriculum` | Curriculum definition and active state |
| `CurriculumCourse` | Curriculum-to-course placement |
| `Prerequisite` | Prerequisite rules |
| `CoRequisite` | Co-requisite rules |
| `CourseEquivalency` | Cross-curriculum equivalency mappings |
| `ElectiveTrack` | Elective track definitions |
| `ElectiveTrackCourse` | Elective-track course placement defaults |
| `AcademicTerm` | Academic year/semester and current-term state |
| `StudentAcademicRecord` | SAR root record |
| `StudyPlan` | Study-plan container per SAR |
| `StudyPlanVersion` | Draft/active/archived plan versions |
| `StudyPlanCourse` | Course rows inside a plan version |
| `ForecastSnapshot` | Saved forecast snapshots |
| `ActivityLog` | Auditable high-risk and workflow events |

## API Endpoint Summary

### Authentication (`/api/auth`)

- `POST /register`: public registration with domain and role checks.
- `POST /login`: returns user/session data and first-login flags.
- `POST /logout`
- `POST /verify-code`, `POST /resend-code`
- `POST /forgot-password`, `PUT /reset-password/:token`
- `GET /activate/:token`
- `GET /me`
- `PUT /change-password`
- `PATCH /transfer-ownership`: Super Admin-only transfer flow.
- `POST /refresh-token`
- `POST /google`
- `POST /initiate-email-change`
- `POST /verify-email-change`
- `POST /resend-email-change-code`

### Users (`/api/users`)

- `GET /`: role-aware list. Super Admin can see global users; Program Chair/Adviser are scoped.
- `GET /:id`: role-aware user profile lookup.
- `PUT /:id`: Super Admin-only account-detail edit.
- `PATCH /:id/toggle-status`: Super Admin-only activation/deactivation.
- `PUT /:id/profile`: own/scoped profile update with optional profile picture.
- `PATCH /update-student-id`: protected student self-update.
- `PATCH /:userId/update-student-id`: public Google OAuth completion path.
- `GET /curriculum-options`: profile curriculum options.

### Programs (`/api/programs`)

Program management and global program assignment controls are Super Admin-only.

### Curriculum (`/api`)

- Curriculum, course, prerequisite, co-requisite, equivalency, and elective-track mutation routes require Super Admin or assigned Program Chair scope.
- Curriculum read routes are available to scoped Program Chair/Adviser workflows.
- CSV import preview/apply must validate row shape, referenced courses, duplicate rows, curriculum name, prerequisite/corequisite availability, and elective track structure before apply.
- Elective track course year/semester values are defaults. Authorized Program Chair/Adviser workflows may override placements per student without changing the curriculum default.

### Terms (`/api/terms`)

- Term create/activate/end routes require Super Admin or assigned Program Chair scope.
- Current-term read supports role-aware access.
- Term activation can flag active study plans for revalidation.
- Ending a term can create forecast snapshots.

### Forecast (`/api/forecast`)

Forecast read routes are role-aware. Super Admin can view all programs; Program Chair and Adviser are scoped to assigned programs.

### SAR, Grades, Validation, and Study Plans

- SAR create/update/read routes enforce role and program/student scope.
- Grade entry, regeneration, validation, draft editing, prerequisite overrides, and elective-track overrides enforce the same scope.
- Student access is own-record only.

### Export

- `GET /sars/:id/export/pdf`: role-aware SAR PDF export.

### Health

- `GET /api/health`: dependency-aware service health endpoint for deployment probes.

## Frontend Route Ownership

| Route Area | Expected Access |
|---|---|
| `/login`, `/register`, password/email verification routes | Public/auth flow |
| `/dashboard`, `/profile` | Authenticated, role-aware |
| `/admin/programs` | Super Admin-only |
| `/admin/user-management` | Super Admin for account lifecycle; scoped operational views only where implemented |
| `/admin/transfer-ownership` | Super Admin-only |
| `/admin/curriculum`, `/admin/terms`, `/admin/forecast` | Super Admin all programs; Program Chair assigned programs |
| `/adviser/students` and SAR/study-plan routes | Super Admin all programs; Program Chair assigned programs; Adviser assigned students/programs |
| `/my-record` | Student own record |

Non-superadmin views should not show "All Programs" or unassigned program options. When an action is hidden or blocked due to role/scope, the UI copy should say `Insufficient Permission`.

## Seed And Bootstrap

Seed scripts should use one consistent Super Admin bootstrap path.

Required production environment variables:

- `SUPERADMIN_EMAIL`
- `SUPERADMIN_PASSWORD`

Local development may fall back to the default Super Admin account only with `mustChangePassword` and `mustChangeEmail` enabled. Production must fail clearly if Super Admin credentials are missing.

Only one active `superadmin` account should exist.

## Startup And Migrations

- Migrations own production schema changes.
- Production and CI startup must fail if pending migrations fail.
- Development may keep additive `sequelize.sync()` convenience behavior for missing baseline tables only.
- Production must not rely on `sequelize.sync()` for schema changes.

## Verification Commands

Use these commands from the repository root unless noted:

```bash
npm run lint:backend
npm run test:backend:ci
npm run test:frontend:ci
npm run test:backend:integration
npm run verify:ci
```

On Windows, run the same scripts through `npm.cmd` when invoking commands directly from PowerShell.

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Main PostgreSQL connection |
| `TEST_DATABASE_URL` | Integration-test PostgreSQL connection |
| `JWT_SECRET` | Access token signing |
| `JWT_REFRESH_SECRET` | Refresh token signing |
| `SUPERADMIN_EMAIL` | Production Super Admin bootstrap email |
| `SUPERADMIN_PASSWORD` | Production Super Admin bootstrap password |
| `DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT` | Local-only bypass for seeded Program Chair first-login rotation |
| `E2E_BASE_URL` | Playwright frontend target |
| `E2E_API_URL` | Playwright backend API target |
| `REACT_APP_API_URL` | Frontend API base URL |

## Security And Operational Notes

- Backend authorization is the source of truth; frontend route guards are convenience and UX only.
- High-risk actions should write activity logs: role changes, status changes, transfer ownership, program assignment changes, curriculum import/apply, and term activation/end-term.
- Proof documents are not currently a public static feature. If restored later, they must be served through an authorized metadata-backed route, not broad static middleware.
- Use `/api/health` for deployment health checks.
