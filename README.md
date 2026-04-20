# Student Advising System

The Student Advising System is a full-stack academic advising platform for the Computer Engineering program. It supports Program Chair (`admin`), Student Adviser (`adviser`), and Student (`student`) workflows across curriculum governance, student records, study plan lifecycle, and forecasting.

This system helps academic teams manage the full advising pipeline in one place:
- define and maintain curriculum structures,
- create and monitor Student Academic Records (SAR),
- generate, regenerate, and validate study plans,
- monitor grades, prerequisites, and academic progress,
- forecast course demand by academic term,
- export professional SAR PDF reports.

## 📘 User Manual (Start Here)

If you want a simple, role-based walkthrough of the system, read:
- [USER_MANUAL.md](USER_MANUAL.md)

It includes step-by-step guides for:
- 👔 Program Chair (`admin`)
- 🧑‍🏫 Student Adviser (`adviser`)
- 🎓 Student (`student`)

It also includes common troubleshooting and a recommended routine for each role.

## 🧭 System Overview

### User Roles
- 👔 **Program Chair (`admin`)**: manages curricula, terms, forecasting, and high-level academic operations.
- 🧑‍🏫 **Student Adviser (`adviser`)**: manages SAR workflows, grades, and study plan decision points.
- 🎓 **Student (`student`)**: views own academic record and progress outputs.

### Main Functional Areas
- 🔐 **Authentication & Role Access** — JWT + Google OAuth, role-guarded routes, email verification, OTP-based email change, forced first-login credential rotation
- 🗂️ **Curriculum Management** — curricula, course library, prerequisites, co-requisites, elective tracks, equivalencies, CSV import/export
- 📄 **Student Academic Records (SAR)** — email-first creation with profile autofill, bi-directional SAR↔profile sync, analytics and KPIs
- 🧩 **Study Plan & Validation Workflow** — generate, edit, regenerate, and validate versioned study plans with prerequisite and load enforcement
- 📈 **Academic Term & Forecasting** — term lifecycle management, current/next/comparison/history demand charts
- 🧾 **PDF Export & Reporting** — professional SAR PDF export for all roles
- 🏠 **Role-Specific Dashboards** — KPI summaries and quicklinks tailored to Program Chair, Adviser, and Student
- 🔑 **Public Auth Entry** — unauthenticated users are routed directly to sign in (`/login`)

### High-Level Architecture
- **Backend:** Node.js, Express, Sequelize, PostgreSQL
- **Frontend:** React, React Router, React Bootstrap
- **Security model:** JWT-based auth + role-guarded APIs/routes

## 🛠️ Tech Stack

### Backend
- Node.js + Express
- PostgreSQL (via `DATABASE_URL`)
- Sequelize ORM
- JWT auth (access + refresh token flow)
- bcryptjs (password hashing)
- Nodemailer (verification/reset email workflows)
- Multer (file uploads)
- Google OAuth (`google-auth-library`)
- PDFKit (SAR PDF generation)
- helmet + morgan + nodemon (security/logging/dev)

### Frontend
- React 18 + React Router v6
- React Bootstrap + Bootstrap 5
- Recharts (demand/forecast bar and line charts)
- Axios (shared API utility)
- Context API (authentication state)
- `@react-oauth/google` (Google sign-in)

## 🗺️ Implementation Plans

Planned implementations are divided into phases and are documented here:
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)

Status summary:
- ✅ **Core build phases (1–10):** Done
- ✅ **Revamp phases (0–15):** Done

## 📚 Documentation

- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — Consolidated implementation roadmap and phase status
- [USER_MANUAL.md](USER_MANUAL.md) — Step-by-step user guide for Program Chair, Adviser, and Student
- [SYSTEM_REFERENCE.md](SYSTEM_REFERENCE.md) — Detailed technical reference (project structure, database models, API endpoints, setup, security, development notes)
- [SYSTEM_WORKFLOW.puml](SYSTEM_WORKFLOW.puml) — PlantUML activity workflow for current system behavior
- [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) — Google OAuth setup guide
- [REQUIRED_EXTENSIONS.md](REQUIRED_EXTENSIONS.md) — Recommended VS Code extensions

## 🚀 Quick Start

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

### Seed Database (from repository root)
```bash
node backend/scripts/seed.js
```

### Reset Database (users only, no curriculum/SAR data)
```bash
node backend/scripts/seed_users_only.js
```

### Optional Admin Access Bypass for Local Development
If you want to access the seeded Program Chair account without the forced first-login password/email rotation, set this in `backend/.env`:

```env
DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT=true
```

Set it back to `false` when you want the normal security flow again.

## 🔑 Default User Credentials

These are recreated by both seed scripts (`seed.js` and `seed_users_only.js`):

| Role | Email | Password |
|---|---|---|
| Program Chair (`admin`) | admin.cpe@tip.edu.ph | Password123! |
| Student Adviser (`adviser`) | adviser.cpe@tip.edu.ph | Password123! |
| Student (`student`) | student@tip.edu.ph | Password123! |

Notes:
- 👔 Program Chair account is seeded with first-login security rotation enabled (`mustChangePassword` and `mustChangeEmail`).
- 🧭 Use the correct login portal selection by role in the frontend (faculty for admin/adviser, student for student).
- 🛠️ For local development only, you can temporarily bypass the seeded Program Chair first-login enforcement with `DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT=true` in `backend/.env`.

## ✅ Pre-Deploy Verification

Run the repository-level pre-deploy gate from the project root:

```bash
npm run verify:predeploy
```

If npm audit endpoint availability is temporarily unstable, use:

```bash
npm run verify:predeploy:soft
```

Use the soft variant only for transient registry outages. The strict command remains the default release gate.

This command runs:
- Backend lint (`backend/**`)
- Frontend production build
- Frontend test suite (CI mode)
- Backend unit tests
- Backend integration tests
- Backend production dependency audit (`high` threshold)

Optional E2E gate (after core checks):

```bash
npm run verify:predeploy:e2e
```

E2E defaults to local targets:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api`

You can run E2E against deployed services using:

```bash
npm run test:e2e:prod
```

By default, the production command runs public auth-page smoke tests only.
This avoids requiring seeded login credentials on live environments.

To run additional specs explicitly, pass the target file path:

```bash
npm run test:e2e:prod -- tests/student.spec.js
```

Override targets when needed with:
- `E2E_BASE_URL`
- `E2E_API_URL`

## 🔒 Frontend Vulnerability Strategy (react-scripts)

The frontend currently uses `react-scripts` 5.x. `npm audit` may report transitive vulnerabilities that cannot be safely removed without a tooling migration.

Current policy:
- Block release on backend high-severity production vulnerabilities.
- Track frontend audit findings separately and review them each release.
- Plan migration away from CRA/react-scripts to reduce persistent transitive risk.
