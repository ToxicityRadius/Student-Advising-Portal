# System Reference

This document provides the detailed technical reference for the Student Advising Portal.

## Project Structure

```text
Student-Advising-Portal/
├── README.md
├── SYSTEM_REFERENCE.md
├── USER_MANUAL.md
├── GOOGLE_OAUTH_SETUP.md
├── REQUIRED_EXTENSIONS.md
├── SYSTEM_WORKFLOW.puml
├── package.json
├── data/
│   ├── curriculum_import_ready/
│   └── curriculum_normalized/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── make-admin.js
│   ├── database/
│   │   ├── config.js
│   │   └── db.js
│   ├── models/
│   │   ├── index.js
│   │   ├── User.js
│   │   ├── Curriculum.js
│   │   ├── Course.js
│   │   ├── CurriculumCourse.js
│   │   ├── Prerequisite.js
│   │   ├── CoRequisite.js
│   │   ├── CourseEquivalency.js
│   │   ├── ElectiveTrack.js
│   │   ├── ElectiveTrackCourse.js
│   │   ├── AcademicTerm.js
│   │   ├── StudentAcademicRecord.js
│   │   ├── StudyPlan.js
│   │   ├── StudyPlanVersion.js
│   │   ├── StudyPlanCourse.js
│   │   └── ForecastSnapshot.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── curriculumController.js
│   │   ├── dashboardController.js
│   │   ├── exportController.js
│   │   ├── forecastController.js
│   │   ├── gradeController.js
│   │   ├── sarController.js
│   │   ├── termController.js
│   │   ├── userController.js
│   │   └── validationController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── googleAuthRoutes.js
│   │   ├── userRoutes.js
│   │   ├── curriculumRoutes.js
│   │   ├── termRoutes.js
│   │   ├── sarRoutes.js
│   │   ├── gradeRoutes.js
│   │   ├── validationRoutes.js
│   │   ├── exportRoutes.js
│   │   ├── forecastRoutes.js
│   │   └── dashboardRoutes.js
│   ├── middleware/
│   │   └── auth.js
│   ├── migrations/
│   │   └── 20260315000000-baseline.js
│   ├── scripts/
│   │   ├── seed.js
│   │   ├── seed_users_only.js
│   │   ├── phase7_populate.js
│   │   ├── generate_import_csvs.js
│   │   └── normalize_curricula_csv.js
│   ├── utils/
│   │   ├── email.js
│   │   ├── featureFlags.js
│   │   ├── gradeValidation.js
│   │   ├── jwt.js
│   │   ├── logger.js
│   │   ├── pagination.js
│   │   ├── profileStorage.js
│   │   ├── sarAnalytics.js
│   │   └── sarLinking.js
│   ├── uploads/
│   │   ├── profiles/
│   │   └── proofs/
│   └── __tests__/
│       ├── auth.test.js
│       └── gradeValidation.test.js
└── frontend/
    ├── package.json
    ├── public/
    ├── build/
    └── src/
        ├── App.js
        ├── index.js
        ├── index.css
        ├── assets/images/
        ├── context/
        │   └── AuthContext.js
        ├── utils/
        │   ├── api.js
        │   ├── profileImage.js
        │   ├── roleRedirect.js
        │   └── useNotifications.js
        ├── components/
        │   ├── Navbar.js
        │   ├── PrivateRoute.js
        │   ├── ConfirmModal.js
        │   ├── ErrorBoundary.js
        │   ├── LogoutConfirmModal.js
        │   ├── PaginationControls.js
        │   ├── StudentIdModal.js
        │   ├── admin/ (AdminLayout, CoursePickerModal)
        │   ├── adviser/ (AdviserLayout, CreateSARModal, EditSARModal, ElectiveTrackSelector)
        │   ├── sar/ (SARLayout)
        │   ├── shared/ (SidebarLayout)
        │   └── student/ (StudentLayout)
        └── pages/
            ├── Landing.js, Login.js, Register.js, Dashboard.js, Profile.js
            ├── VerifyCode.js, ForgotPassword.js, ResetPassword.js, ActivateAccount.js
            ├── ChangePassword.js, ChangeEmail.js, CompleteProfile.js
            ├── ViewGrades.js, Checklist.js, PlanOfStudy.js, AvailableSubjects.js
            ├── Settings.js, Help.js, AboutUs.js, Purpose.js, NotFound.js
            ├── admin/ (CurriculumManagement, CurriculumDetail, ForecastDashboard, TermManagement, TransferOwnership)
            ├── adviser/ (StudentList, StudentDetail, GradeEntry, StudyPlanView, RegenerationReview, ValidationFlow)
            └── student/ (MyRecord)
```

## Database Models

| Model | Purpose |
|---|---|
| User | Accounts for program chair, adviser, and student users |
| Curriculum | Curriculum definitions |
| Course | Course catalog entries |
| CurriculumCourse | Curriculum-to-course placement (year/semester/elective flag) |
| Prerequisite | Prerequisite rules |
| CoRequisite | Co-requisite rules |
| CourseEquivalency | Cross-curriculum equivalency mappings |
| ElectiveTrack | Elective track definitions |
| ElectiveTrackCourse | Elective-track-to-course mappings |
| AcademicTerm | Academic year/semester with current-term tracking |
| StudentAcademicRecord | Student Academic Record (SAR) root record |
| StudyPlan | One-per-SAR study plan container |
| StudyPlanVersion | Versioned study plans (draft/active/archived) |
| StudyPlanCourse | Course rows inside study plan versions |
| ForecastSnapshot | Stored forecasting snapshots at term checkpoints |

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register`
- `POST /login`
- `POST /logout`
- `POST /verify-code`
- `POST /resend-code`
- `POST /forgot-password`
- `PUT /reset-password/:token`
- `GET /activate/:token`
- `GET /me`
- `PUT /change-password`
- `PATCH /transfer-ownership` (admin)
- `POST /refresh-token`
- `POST /google`

### Users (`/api/users`)
- `GET /` (admin)
- `GET /:id`
- `PUT /:id/profile`
- `PATCH /update-student-id`
- `PATCH /:userId/update-student-id`

### Curriculum Management (`/api`)
- `POST /curriculums`
- `GET /curriculums`
- `GET /curriculums/:id`
- `PUT /curriculums/:id`
- `PATCH /curriculums/:id/activate`
- `POST /courses`
- `GET /courses`
- `PUT /courses/:id`
- `DELETE /courses/:id`
- `POST /curriculums/:id/courses`
- `DELETE /curriculums/:id/courses/:ccId`
- `GET /curriculums/:id/courses`
- `POST /curriculums/:id/prerequisites`
- `DELETE /curriculums/:id/prerequisites/:prereqId`
- `GET /curriculums/:id/prerequisites`
- `POST /curriculums/:id/corequisites`
- `DELETE /curriculums/:id/corequisites/:coreqId`
- `GET /curriculums/:id/corequisites`
- `POST /equivalencies`
- `DELETE /equivalencies/:id`
- `GET /equivalencies`
- `POST /curriculums/:id/elective-tracks`
- `GET /curriculums/:id/elective-tracks`
- `PUT /elective-tracks/:id`
- `DELETE /elective-tracks/:id`
- `POST /elective-tracks/:id/courses`
- `DELETE /elective-tracks/:id/courses/:etcId`

### Academic Terms (`/api/terms`)
- `POST /`
- `GET /`
- `GET /current`
- `PATCH /:id/activate`
- `PATCH /current/end`

### Forecasting (`/api/forecast`)
- `GET /current`
- `GET /next`
- `GET /comparison`
- `GET /history`

### Student Academic Records (`/api/sars`)
- `POST /`
- `GET /`
- `GET /autofill`
- `GET /:id`
- `PUT /:id`
- `POST /:id/study-plan/generate`
- `GET /:id/study-plan/versions`
- `GET /:id/export/pdf`

### Grades, Validation, and Study Plan Flow (`/api`)
- `PUT /sars/:id/study-plan/active-version/grades`
- `POST /sars/:id/study-plan/regenerate`
- `PATCH /sars/:id/study-plan/versions/:versionId/validate`
- `PATCH /sars/:id/elective-track`

### Utility
- `GET /api/health`

### Dashboard (`/api/dashboard`)
- `GET /summary` (role-adaptive: returns admin/adviser/student-specific data)

## Role Model

| Role Value | Role Name | Scope |
|---|---|---|
| `admin` | Program Chair | governance, curriculum, terms, forecasting, ownership transfer |
| `adviser` | Student Adviser | SAR management, grades, study plan actions |
| `student` | Student | own-record visibility and export |

## Setup and Run

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

### Seed Data
```bash
node backend/scripts/seed.js
```

### Users-Only Reset
```bash
node backend/scripts/seed_users_only.js
```

### Development Feature Flag
To temporarily bypass the seeded Program Chair first-login password/email rotation in local development:

```env
DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT=true
```

## Security and Operational Notes

- JWT-based protected routes with role guards (`protect` + `requireRole` middleware).
- Access tokens expire in 30 minutes; refresh tokens in 30 days with rotation.
- JWT payloads contain only `id`, `role`, and `is_verified` — no PII.
- Password hashing via bcryptjs with complexity enforcement.
- Per-account brute-force lockout (5 failed attempts → 15 minute lock).
- IP-based rate limiting on auth endpoints via express-rate-limit.
- Email-driven verification and recovery workflows.
- Google OAuth supported with domain policy controls (`@tip.edu.ph`).
- Structured logging via Pino.
- Uploads: profile images served publicly; proof documents served behind auth.
- Path traversal and SSRF protections on PDF export image handling.
- Forecast and SAR routes enforce role-safe access.
- In development, Sequelize sync uses additive-safe behavior (`alter: { drop: false }`).
- In production, `sequelize.authenticate()` only — schema changes via migrations.

## Development Notes

- Backend default port: `5000`
- Frontend default port: `3000`
- Database: PostgreSQL via Supabase (`DATABASE_URL` in `.env`)
- Backend dev command: `npm run dev` (from `backend/`)
- Frontend dev command: `npm start` (from `frontend/`)
- Frontend test command: `npm test` (from `frontend/`)
- Backend test command: `npm test` (from `backend/`)
- Seed script resets and repopulates baseline curriculum and default users.
- All page components use `React.lazy()` with `Suspense` for code splitting.
- Frontend API utility includes automatic token refresh with request queuing.
