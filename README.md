# Student Advising System

The Student Advising System is a full-stack academic advising platform for Computer Engineering programs. It supports a global Super Admin (`superadmin`), program-bound Program Chair (`admin`), Student Adviser (`adviser`), and Student (`student`) workflows across curriculum governance, student records, study plan lifecycle, and forecasting.

This system helps academic teams manage the full advising pipeline in one place:

- Define and maintain curriculum structures.
- Create and monitor Student Academic Records (SAR).
- Generate, regenerate, and validate study plans.
- Monitor grades, prerequisites, and academic progress.
- Forecast course demand by academic term.
- Export professional SAR PDF reports.

## User Manual

Read [USER_MANUAL.md](USER_MANUAL.md) for a role-based walkthrough of the system.

It includes step-by-step guides for:

- Super Admin (`superadmin`)
- Program Chair (`admin`)
- Student Adviser (`adviser`)
- Student (`student`)

## System Overview

### User Roles

- **Super Admin (`superadmin`)**: the only global account. Manages programs, transfer ownership, user account lifecycle controls, and program assignments.
- **Program Chair (`admin`)**: manages curricula, terms, forecasting, adviser assignments, SAR/study-plan operations, and high-level academic work only for assigned programs.
- **Student Adviser (`adviser`)**: manages SAR workflows, grades, and study plan decision points for assigned students/programs.
- **Student (`student`)**: views own academic record and progress outputs.

### Permission Matrix

| Capability | Super Admin | Program Chair | Adviser | Student |
|---|---|---|---|---|
| Global program management and program assignments | Yes | No | No | No |
| Transfer Ownership | Yes | No | No | No |
| Edit user account details | Yes | No | No | No |
| Activate or deactivate users | Yes | No | No | No |
| Manage adviser assignments | All programs | Assigned programs | No | No |
| Manage curriculum, terms, forecasting, and academic rules | All programs | Assigned programs | No | No |
| SAR, study-plan, prerequisite override, and elective override workflows | All programs | Assigned programs | Assigned students/programs | Own records only |
| View superadmin accounts | Yes | No | No | No |

### Main Functional Areas

- **Authentication and role access**: JWT, Google OAuth, role-guarded routes, email verification, OTP-based email change, and forced first-login credential rotation.
- **Curriculum management**: curricula, course library, prerequisites, co-requisites, elective tracks, equivalencies, and CSV import/export.
- **Student Academic Records**: email-first creation with profile autofill, profile sync, analytics, and KPIs.
- **Study plan and validation workflow**: generate, edit, regenerate, and validate versioned study plans with prerequisite and load enforcement.
- **Academic term and forecasting**: term lifecycle management, demand charts, and historical comparisons.
- **PDF export and reporting**: professional SAR PDF export for all roles.
- **Role-specific dashboards**: KPI summaries and quicklinks tailored to Super Admin, Program Chair, Adviser, and Student.

### High-Level Architecture

- Backend: Node.js, Express, Sequelize, PostgreSQL
- Frontend: React, React Router, React Bootstrap
- Security model: JWT-based auth plus backend role/program-scope enforcement

## Tech Stack

### Backend

- Node.js and Express
- PostgreSQL through `DATABASE_URL`
- Sequelize ORM
- JWT access and refresh token flow
- bcryptjs password hashing
- Nodemailer verification/reset email workflows
- Multer file uploads
- Google OAuth through `google-auth-library`
- PDFKit SAR PDF generation
- helmet, morgan, and nodemon

### Frontend

- React 18 and React Router v6
- React Bootstrap and Bootstrap 5
- Recharts
- Axios shared API utility
- Context API authentication state
- `@react-oauth/google`

## Documentation

- [USER_MANUAL.md](USER_MANUAL.md): role-based user guide for Super Admin, Program Chair, Adviser, and Student.
- [SYSTEM_REFERENCE.md](SYSTEM_REFERENCE.md): technical reference for structure, models, API endpoints, setup, security, and development notes.
- [SOFTWARE_DESIGN.md](SOFTWARE_DESIGN.md): system design, scope, actors, use cases, and architecture notes.
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md): consolidated implementation roadmap and phase status.
- [SYSTEM_WORKFLOW.puml](SYSTEM_WORKFLOW.puml): PlantUML activity workflow for current behavior.
- [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md): Google OAuth setup guide.
- [REQUIRED_EXTENSIONS.md](REQUIRED_EXTENSIONS.md): recommended VS Code extensions.

## Quick Start

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

### Seed Database

Run from the repository root:

```bash
node backend/scripts/seed.js
```

### Reset Database Users Only

Run from the repository root:

```bash
node backend/scripts/seed_users_only.js
```

### Optional Local First-Login Bypass

If you want to access seeded Program Chair accounts without forced first-login password/email rotation, set this in `backend/.env`:

```env
DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT=true
```

Set it back to `false` when you want the normal security flow.

## Superadmin Bootstrap

Production seed/bootstrap requires:

```env
SUPERADMIN_EMAIL=superadmin@example.edu
SUPERADMIN_PASSWORD=replace-with-a-strong-password
```

Production startup must not rely on fallback superadmin credentials. Local development can create the fallback Super Admin account, but it is flagged with `mustChangePassword` and `mustChangeEmail`.

## Default User Credentials

These development accounts are recreated by both seed scripts (`seed.js` and `seed_users_only.js`):

| Role | Email | Password |
|---|---|---|
| Super Admin (`superadmin`) | `superadmin.cpe@tip.edu.ph` | `Password123!` |
| Program Chair (`admin`) | `admin.cpe@tip.edu.ph` | `Password123!` |
| Student Adviser (`adviser`) | `adviser.cpe@tip.edu.ph` | `Password123!` |
| Student (`student`) | `student@tip.edu.ph` | `Password123!` |

Notes:

- Default credentials are for local development only.
- The fallback Super Admin account is local-only and must rotate email/password.
- Program Chair accounts are program-bound through `UserProgramAssignment`.
- Use the correct frontend login portal selection by role: faculty for Super Admin, Program Chair, and Adviser; student for Student.

## Verification

Run the repository-level release gate from the project root:

```bash
npm run verify:predeploy
```

If npm audit endpoint availability is temporarily unstable, use:

```bash
npm run verify:predeploy:soft
```

Use the soft variant only for transient registry outages. The strict command remains the default release gate.

This command runs:

- Backend lint
- Frontend production build
- Frontend test suite in CI mode
- Backend unit tests
- Backend integration tests
- Backend production dependency audit at the `high` threshold

Optional E2E gate after core checks:

```bash
npm run verify:predeploy:e2e
```

E2E defaults to local targets:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api`

Override targets when needed with:

- `E2E_BASE_URL`
- `E2E_API_URL`
- `REACT_APP_API_URL`

## Frontend Vulnerability Strategy

The frontend currently uses `react-scripts` 5.x. `npm audit` may report transitive vulnerabilities that cannot be safely removed without a focused tooling migration.

Current policy:

- Block release on backend high-severity production vulnerabilities.
- Track frontend audit findings separately and review them each release.
- Defer migration from CRA/react-scripts to Vite until release hardening, CI, permissions, and E2E smoke tests are green.
