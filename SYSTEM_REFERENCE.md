# System Reference

This document is the detailed technical reference for the Student Advising System.

## Project Structure

```text
Student-Advising-Portal/
├── IMPLEMENTATION_PLAN.md
├── SYSTEM_REFERENCE.md
├── SYSTEM_WORKFLOW.puml
├── README.md
├── USER_MANUAL.md
├── GOOGLE_OAUTH_SETUP.md
├── REQUIRED_EXTENSIONS.md
├── bs_cpe_curriculum_2018_full.csv
├── bs_cpe_curriculum_2023_full.csv
├── bs_cpe_curriculum_2025_full.csv
├── data/
│   ├── curriculum_normalized/
│   │   ├── courses.csv
│   │   ├── curriculum_courses.csv
│   │   ├── curriculums.csv
│   │   ├── elective_track_courses.csv
│   │   ├── elective_tracks.csv
│   │   └── prerequisites.csv
│   └── curriculum_import_ready/
│       ├── bs_cpe_curriculum_2018_import.csv
│       ├── bs_cpe_curriculum_2023_import.csv
│       └── bs_cpe_curriculum_2025_import.csv
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── make-admin.js
│   ├── database/
│   │   └── db.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── index.js
│   │   ├── AcademicTerm.js
│   │   ├── CoRequisite.js
│   │   ├── Course.js
│   │   ├── CourseEquivalency.js
│   │   ├── Curriculum.js
│   │   ├── CurriculumCourse.js
│   │   ├── ElectiveTrack.js
│   │   ├── ElectiveTrackCourse.js
│   │   ├── ForecastSnapshot.js
│   │   ├── Prerequisite.js
│   │   ├── StudentAcademicRecord.js
│   │   ├── StudyPlan.js
│   │   ├── StudyPlanCourse.js
│   │   ├── StudyPlanVersion.js
│   │   └── User.js
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
│   │   ├── curriculumRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── exportRoutes.js
│   │   ├── forecastRoutes.js
│   │   ├── googleAuthRoutes.js
│   │   ├── gradeRoutes.js
│   │   ├── sarRoutes.js
│   │   ├── termRoutes.js
│   │   ├── userRoutes.js
│   │   └── validationRoutes.js
│   ├── scripts/
│   │   ├── seed.js
│   │   ├── seed_users_only.js
│   │   ├── phase7_populate.js
│   │   ├── generate_import_csvs.js
│   │   └── normalize_curricula_csv.js
│   ├── utils/
│   │   ├── email.js
│   │   ├── featureFlags.js
│   │   ├── jwt.js
│   │   ├── pagination.js
│   │   ├── sarAnalytics.js
│   │   ├── sarLinking.js
│   │   └── studyPlan.js
│   └── uploads/
│       ├── profiles/
│       └── proofs/
└── frontend/
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js
        ├── index.js
        ├── index.css
        ├── assets/
        │   └── images/
        ├── context/
        │   └── AuthContext.js
        ├── components/
        │   ├── ErrorBoundary.js
        │   ├── PaginationControls.js
        │   ├── PrivateRoute.js
        │   ├── StudentIdModal.js
        │   ├── admin/
        │   │   └── CoursePickerModal.js
        │   ├── adviser/
        │   │   ├── CreateSARModal.js
        │   │   ├── EditSARModal.js
        │   │   └── ElectiveTrackSelector.js
        │   └── sar/
        │       └── SARLayout.js
        ├── pages/
        │   ├── ActivateAccount.js
        │   ├── ChangeEmail.js
        │   ├── ChangePassword.js
        │   ├── Dashboard.js
        │   ├── ForgotPassword.js
        │   ├── Login.js
        │   ├── Profile.js
        │   ├── Register.js
        │   ├── ResetPassword.js
        │   ├── VerifyCode.js
        │   ├── admin/
        │   │   ├── CurriculumDetail.js
        │   │   ├── CurriculumManagement.js
        │   │   ├── ForecastDashboard.js
        │   │   ├── TermManagement.js
        │   │   └── TransferOwnership.js
        │   ├── adviser/
        │   │   ├── GradeEntry.js
        │   │   ├── RegenerationReview.js
        │   │   ├── StudentDetail.js
        │   │   ├── StudentList.js
        │   │   ├── StudyPlanView.js
        │   │   └── ValidationFlow.js
        │   └── student/
        │       └── MyRecord.js
        └── utils/
            ├── api.js
            ├── curriculumsCache.js
            ├── profileImage.js
            └── useDebouncedValue.js
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
- `POST /register` — public registration (student/adviser domain check enforced)
- `POST /login` — includes first-login `mustChangePassword` / `mustChangeEmail` flags
- `POST /logout`
- `POST /verify-code` — email verification after registration
- `POST /resend-code`
- `POST /forgot-password`
- `PUT /reset-password/:token`
- `GET /activate/:token`
- `GET /me`
- `PUT /change-password` — changes password (supports forced first-login rotation)
- `PATCH /transfer-ownership` (admin only) — transfers Program Chair role to an adviser
- `POST /refresh-token`
- `POST /google` — Google OAuth sign-in
- `POST /initiate-email-change` — begins email change, sends OTP to new address
- `POST /verify-email-change` — confirms OTP and commits new email
- `POST /resend-email-change-code` — resends OTP for pending email change

### Users (`/api/users`)
- `GET /` (admin) — paginated, searchable list of users; supports `role` filter
- `GET /:id` — get user profile by ID
- `PUT /:id/profile` (multipart) — update user profile with optional profile picture
- `PATCH /update-student-id` (protected) — student updates their own student ID
- `PATCH /:userId/update-student-id` (public) — used by Google OAuth flow to set student ID
- `GET /curriculum-options` — returns curricula available for the student's profile page

### Curriculum Management (`/api`)
- `POST /curriculums` (admin)
- `GET /curriculums` (admin, adviser) — paginated + searchable
- `GET /curriculums-map` (admin, adviser) — lightweight id→name map for dropdowns
- `GET /curriculums/:id` (admin, adviser) — supports `?compact=true`
- `PUT /curriculums/:id` (admin)
- `PATCH /curriculums/:id/activate` (admin)
- `GET /curriculums/:id/export/csv` (admin) — download curriculum as CSV
- `POST /curriculums/:id/import/csv/preview` (admin) — dry-run CSV import, returns row-level validation
- `POST /curriculums/:id/import/csv/apply` (admin) — transactional CSV import after preview
- `POST /courses` (admin)
- `GET /courses` (admin, adviser) — paginated + searchable
- `PUT /courses/:id` (admin)
- `DELETE /courses/:id` (admin) — blocked if referenced in any curriculum, plan, or track
- `POST /curriculums/:id/courses` (admin)
- `DELETE /curriculums/:id/courses/:ccId` (admin)
- `GET /curriculums/:id/courses` (admin, adviser)
- `POST /curriculums/:id/prerequisites` (admin)
- `DELETE /curriculums/:id/prerequisites/:prereqId` (admin)
- `GET /curriculums/:id/prerequisites` (admin, adviser)
- `POST /curriculums/:id/corequisites` (admin)
- `DELETE /curriculums/:id/corequisites/:coreqId` (admin)
- `GET /curriculums/:id/corequisites` (admin, adviser)
- `POST /equivalencies` (admin)
- `DELETE /equivalencies/:id` (admin)
- `GET /equivalencies` (admin, adviser)
- `POST /curriculums/:id/elective-tracks` (admin)
- `GET /curriculums/:id/elective-tracks` (admin, adviser)
- `PUT /elective-tracks/:id` (admin)
- `DELETE /elective-tracks/:id` (admin)
- `POST /elective-tracks/:id/courses` (admin)
- `PUT /elective-tracks/:id/courses/:etcId` (admin) — update slot placement of an existing track course
- `DELETE /elective-tracks/:id/courses/:etcId` (admin)

### Academic Terms (`/api/terms`)
- `POST /` (admin)
- `GET /` (admin, adviser) — paginated + searchable
- `GET /current` (admin, adviser, student)
- `PATCH /:id/activate` (admin) — marks all active study plan versions for revalidation
- `PATCH /current/end` (admin) — saves forecast snapshot, closes current term

### Forecasting (`/api/forecast`)
- `GET /current` (admin, adviser)
- `GET /next` (admin, adviser)
- `GET /comparison` (admin, adviser)
- `GET /history` (admin, adviser)

### Dashboard (`/api/dashboard`)
- `GET /summary` (admin, adviser, student) — role-specific dashboard summary with KPIs and current term

### Student Academic Records (`/api/sars`)
- `POST /` (adviser, admin)
- `GET /` (adviser, admin, student — student sees own only)
- `GET /autofill` (adviser, admin) — returns profile data by email for SAR creation prefill
- `GET /:id` (adviser, admin, student — student sees own only)
- `PUT /:id` (adviser, admin) — multipart; supports profile picture upload/remove
- `POST /:id/study-plan/generate` (adviser, admin)
- `GET /:id/study-plan/versions` (adviser, admin, student — student sees own only)

### Grades, Validation, and Study Plan Flow (`/api`)
- `PUT /sars/:id/study-plan/active-version/grades` (adviser, admin)
- `POST /sars/:id/study-plan/regenerate` (adviser, admin)
- `PATCH /sars/:id/study-plan/versions/:versionId/validate` (adviser, admin)
- `PUT /sars/:id/study-plan/versions/:versionId/courses` (adviser, admin) — edit courses in a draft version
- `PATCH /sars/:id/elective-track` (adviser, admin)

### Export (`/api`)
- `GET /sars/:id/export/pdf` (admin, adviser, student)

### Utility
- `GET /api/health`

## Role Model

| Role Value | Role Name | Scope |
|---|---|---|
| `admin` | Program Chair | curriculum governance, term management, forecasting, ownership transfer |
| `adviser` | Student Adviser | SAR management, grade entry, study plan actions, forecast read |
| `student` | Student | own-record visibility and PDF export |

## Frontend Pages & Components

### Public/Auth Pages (no auth required)
| Page | Route | Description |
|---|---|---|
| `Login.js` | `/login` | Unified login with role selection (default public entry) |
| `Register.js` | `/register` | Student self-registration |
| `ForgotPassword.js` | `/forgot-password` | Password reset request |
| `ResetPassword.js` | `/reset-password/:token` | Password reset form |
| `ActivateAccount.js` | `/activate/:token` | Email activation via link |
| `VerifyCode.js` | `/verify-code` | OTP verification after registration |
| `ChangePassword.js` | `/change-password` | Forced or voluntary password change |
| `ChangeEmail.js` | `/change-email` | Verify and commit email change via OTP |

### Authenticated Pages (all roles)
| Page | Route | Description |
|---|---|---|
| `Dashboard.js` | `/dashboard` | Role-specific summary dashboard with KPIs and quicklinks |
| `Profile.js` | `/profile` | Extended profile editor with photo, contact, academic fields |

### Admin Pages
| Page | Route | Description |
|---|---|---|
| `CurriculumManagement.js` | `/admin/curriculum` | Curricula, global course library, equivalencies |
| `CurriculumDetail.js` | `/admin/curriculum/:id` | Structure, prerequisites, co-reqs, elective tracks, CSV import/export |
| `TermManagement.js` | `/admin/terms` | Academic term lifecycle (create, activate, end) |
| `ForecastDashboard.js` | `/admin/forecast` | Current demand, next forecast, comparison, history tabs + charts |
| `TransferOwnership.js` | `/admin/transfer-ownership` | Search advisers and transfer Program Chair role |

### Adviser Pages (also accessible to admin)
| Page | Route | Description |
|---|---|---|
| `StudentList.js` | `/adviser/students` | Paginated, searchable list of all SARs; create new SAR |
| `StudentDetail.js` | `/adviser/students/:sarId` | Full SAR view via shared SARLayout; study plan versions list |
| `StudyPlanView.js` | `/adviser/students/:sarId/plan/:versionId` | Read-only view of a specific study plan version |
| `GradeEntry.js` | `/adviser/students/:sarId/grades` | Enter/update grades for active plan version |
| `RegenerationReview.js` | `/adviser/students/:sarId/plan/:versionId/review` | Review and edit regenerated draft plan before validation |
| `ValidationFlow.js` | `/adviser/students/:sarId/plan/:versionId/validate` | Validate selected draft version as the new active plan |

### Student Pages
| Page | Route | Description |
|---|---|---|
| `MyRecord.js` | `/my-record` | Read-only view of student's own SAR via shared SARLayout; PDF export |

### Shared Components
| Component | Description |
|---|---|
| `PrivateRoute.js` | Route guard supporting `roles` prop for role-based access control |
| `PaginationControls.js` | Reusable pagination with page size selector |
| `ErrorBoundary.js` | React error boundary to catch unhandled render errors |
| `StudentIdModal.js` | Modal prompt for Google OAuth users to supply their student ID |
| `admin/CoursePickerModal.js` | Searchable course picker modal for curriculum structure, prereqs, co-reqs, and tracks |
| `adviser/CreateSARModal.js` | Email-first SAR creation modal with autofill support |
| `adviser/EditSARModal.js` | SAR edit modal with profile sync (name, academic fields, profile photo) |
| `adviser/ElectiveTrackSelector.js` | Inline elective track selection component used in SAR and ValidationFlow |
| `sar/SARLayout.js` | Shared tabbed SAR detail layout (profile, progress, checklist, prerequisites, grades, study plan) used by both StudentDetail and MyRecord |

### Frontend Utilities
| Utility | Description |
|---|---|
| `utils/api.js` | Pre-configured Axios instance with auth token injection |
| `utils/curriculumsCache.js` | In-memory cache for curriculum list to avoid redundant fetches |
| `utils/profileImage.js` | Helpers for building profile image URLs and generating initials fallbacks |
| `utils/useDebouncedValue.js` | React hook: debounced value for search input fields |
| `context/AuthContext.js` | Provides `user`, `login`, `logout`, and role info across the app |

## Backend Utilities

| Utility | Description |
|---|---|
| `utils/email.js` | Nodemailer-based email helpers (verification, OTP, reset links) |
| `utils/featureFlags.js` | Environment-driven feature flags (e.g., `DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT`) |
| `utils/jwt.js` | JWT signing, verification, and refresh token helpers |
| `utils/pagination.js` | Reusable Sequelize pagination/sorting helper |
| `utils/sarAnalytics.js` | Computes SAR analytics (GWA, completion %, prerequisite risks, unit counts) |
| `utils/sarLinking.js` | Helpers for linking a SAR to a registered User account |
| `utils/studyPlan.js` | Study plan generation and regeneration logic |

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

- JWT-based protected routes with role guards.
- Password hashing via bcryptjs.
- Email-driven verification and recovery workflows.
- Google OAuth supported with domain policy controls.
- Forecast and SAR routes enforce role-safe access.
- In development, Sequelize sync uses additive-safe behavior (`alter: { drop: false }`).

## Development Notes

- Backend default port: `5000`
- Frontend default port: `3000`
- Root-level run scripts are not guaranteed; run commands from `backend` or `frontend`.
- Seed script resets and repopulates baseline curriculum and default users.
