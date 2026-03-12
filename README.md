# Student Advising System
A full-stack academic advising portal for the Computer Engineering program. Supports role-based access for Program Chair (admin), Student Advisers, and Students, with curriculum management, study plan generation, grade tracking, demand forecasting, and PDF export.

> **Implementation in progress.** See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the phased development roadmap and current status.

---

## 📚 Documentation

- [README.md](README.md) — This file
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — Phased development plan with per-phase status
- [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) — Google OAuth configuration guide
- [REQUIRED_EXTENSIONS.md](REQUIRED_EXTENSIONS.md) — Recommended VS Code extensions

---

## Implementation Status

| Phase | Feature Area | Status |
|-------|-------------|--------|
| 1 | Database Schema & Core Models | ✅ Done |
| 2 | Curriculum Management — Backend APIs | ✅ Done |
| 3 | Curriculum Management — Frontend UI | ✅ Done |
| 4 | Academic Term Management | ✅ Done |
| 5 | Student Academic Record & Initial Study Plan | ✅ Done |
| 6 | Grade Entry & Study Plan Regeneration | ✅ Done |
| 7 | Study Plan Validation & Elective Track Enforcement | ✅ Done |
| 8 | Student-Facing Views & PDF Export | 🔲 Not started |
| 9 | Forecasting System | 🔲 Not started |
| 10 | Auth & Access Control Refinements | 🔲 Not started |

---

## Tech Stack

### Backend
- **Node.js** + **Express**
- **PostgreSQL** (via `DATABASE_URL` environment variable)
- **Sequelize ORM** — auto-syncs tables in development (`alter: { drop: false }`)
- **JWT** — access tokens + refresh tokens, stored in HTTP-only cookies
- **bcryptjs** — password hashing
- **Nodemailer** — email for verification codes and password reset
- **Multer** — profile picture and proof document uploads
- **Google OAuth 2.0** via `google-auth-library`
- **nodemon** (dev), **helmet**, **morgan**

### Frontend
- **React 18** + **React Router v6**
- **React Bootstrap** + **Bootstrap 5**
- **Axios** (via shared `api.js` utility — handles auth token automatically)
- **Context API** — auth state via `AuthContext`
- **@react-oauth/google** — Google sign-in button

---

## Project Structure

```
Student-Advising-Portal/
├── IMPLEMENTATION_PLAN.md          # Phased development plan
├── GOOGLE_OAUTH_SETUP.md
├── REQUIRED_EXTENSIONS.md
│
├── data/
│   └── curriculum_normalized/       # Pre-built normalized CSVs consumed by seed script
│       ├── curriculums.csv
│       ├── courses.csv
│       ├── curriculum_courses.csv
│       ├── prerequisites.csv
│       ├── elective_tracks.csv
│       └── elective_track_courses.csv
│
├── backend/
│   ├── server.js                   # Express app entry point, route mounting, DB sync
│   ├── make-admin.js               # Utility: promote a user to admin by email
│   ├── package.json
│   │
│   ├── database/
│   │   └── db.js                   # Sequelize + PostgreSQL connection (reads DATABASE_URL)
│   │
│   ├── models/
│   │   ├── index.js                # All model imports + Sequelize associations
│   │   ├── User.js
│   │   ├── Curriculum.js
│   │   ├── Course.js
│   │   ├── CurriculumCourse.js     # Junction: curriculum ↔ course (yearLevel, semester)
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
│   │
│   ├── controllers/
│   │   ├── authController.js       # Register, login, logout, 2FA, password reset, Google OAuth
│   │   ├── userController.js       # Profile read/update, student ID
│   │   ├── curriculumController.js # Curricula, courses, prereqs, co-reqs, equivalencies, tracks
│   │   ├── termController.js       # Academic term create/list/current/activate/end actions
│   │   ├── sarController.js        # Student academic records + initial study plan generation/version listing
│   │   ├── gradeController.js      # Active-version grade entry + study plan regeneration
│   │   └── validationController.js # Draft validation + elective track selection enforcement
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── googleAuthRoutes.js
│   │   ├── userRoutes.js
│   │   ├── curriculumRoutes.js
│   │   ├── termRoutes.js
│   │   ├── sarRoutes.js
│   │   ├── gradeRoutes.js
│   │   └── validationRoutes.js
│   │
│   ├── middleware/
│   │   └── auth.js                 # protect (JWT guard) + requireRole(...roles)
│   │
│   ├── utils/
│   │   ├── email.js
│   │   └── jwt.js
│   │
│   ├── scripts/
│   │   ├── seed.js                 # Full DB reset + default users + all curricula
│   │   └── normalize_curricula_csv.js  # Re-normalizes raw curriculum CSVs → data/curriculum_normalized/
│   └── uploads/
│       ├── profiles/
│       └── proofs/
│
└── frontend/
  ├── package.json
  ├── public/
  │   └── index.html
  └── src/
    ├── App.js
    ├── index.js
    ├── index.css
    ├── assets/images/
    ├── components/
    │   ├── Navbar.js
    │   ├── PrivateRoute.js
    │   ├── StudentIdModal.js
    │   ├── ErrorBoundary.js
    │   └── adviser/
    │       ├── CreateSARModal.js
    │       └── ElectiveTrackSelector.js
    ├── context/
    │   └── AuthContext.js
    ├── pages/
    │   ├── Landing.js / .css
    │   ├── AboutUs.js / .css
    │   ├── Purpose.js / .css
    │   ├── Login.js
    │   ├── Register.js
    │   ├── VerifyCode.js
    │   ├── ActivateAccount.js
    │   ├── ForgotPassword.js
    │   ├── ResetPassword.js
    │   ├── Dashboard.js
    │   ├── CompleteProfile.js
    │   ├── Profile.js
    │   ├── adviser/
    │   │   ├── StudentList.js
    │   │   ├── StudentDetail.js
    │   │   ├── GradeEntry.js
    │   │   ├── RegenerationReview.js
    │   │   ├── ValidationFlow.js
    │   │   └── StudyPlanView.js
    │   └── admin/
    │       ├── CurriculumManagement.js
    │       ├── CurriculumDetail.js
    │       └── TermManagement.js
    └── utils/
      └── api.js
```

---

## Database Models

| Model | Table | Purpose |
|-------|-------|---------|
| `User` | `users` | All user accounts (admin / adviser / student) |
| `Curriculum` | `curriculums` | Degree program curriculum definitions |
| `Course` | `courses` | Individual courses (code, name, units) |
| `CurriculumCourse` | `curriculum_courses` | Course placement in curriculum (yearLevel, semester, isElective) |
| `Prerequisite` | `prerequisites` | Prerequisite rules between courses |
| `CoRequisite` | `co_requisites` | Co-requisite rules between courses |
| `CourseEquivalency` | `course_equivalencies` | Cross-curriculum equivalencies |
| `ElectiveTrack` | `elective_tracks` | Named elective specialisation tracks |
| `ElectiveTrackCourse` | `elective_track_courses` | Courses assigned to each elective track |
| `AcademicTerm` | `academic_terms` | School year + semester; one is current at a time |
| `StudentAcademicRecord` | `student_academic_records` | Core per-student advising record |
| `StudyPlan` | `study_plans` | One per SAR; container for versions |
| `StudyPlanVersion` | `study_plan_versions` | Versioned plan (draft / active / archived) |
| `StudyPlanCourse` | `study_plan_courses` | Per-course row in a version with grade and status |
| `ForecastSnapshot` | `forecast_snapshots` | Archived demand data per term |

---

## API Endpoints (Implemented)

### Authentication — `/api/auth`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/register` | Public | Register new user |
| POST | `/login` | Public | Login (JWT + cookie) |
| POST | `/logout` | Auth | Logout, clear cookie |
| POST | `/verify-code` | Public | Submit 2FA code |
| POST | `/resend-code` | Public | Resend 2FA code |
| POST | `/forgot-password` | Public | Request password reset email |
| PUT | `/reset-password/:token` | Public | Reset password |
| GET | `/activate/:token` | Public | Activate account via email link |
| GET | `/me` | Auth | Get current user |
| POST | `/refresh-token` | Public | Refresh access token |
| POST | `/google` | Public | Google OAuth sign-in |

### Users — `/api/users`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/:id` | Auth | Get user profile |
| PUT | `/:id/profile` | Auth | Update profile (name, contact, picture) |
| PATCH | `/update-student-id` | Auth | Set own student ID |
| PATCH | `/:userId/update-student-id` | Public | Set student ID post-Google OAuth |

### Curriculum Management — `/api`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/curriculums` | admin | Create curriculum |
| GET | `/curriculums` | admin, adviser | List curricula |
| GET | `/curriculums/:id` | admin, adviser | Get curriculum detail |
| PUT | `/curriculums/:id` | admin | Update curriculum |
| PATCH | `/curriculums/:id/activate` | admin | Set as active curriculum |
| POST | `/courses` | admin | Create course |
| GET | `/courses` | admin, adviser | List all courses |
| PUT | `/courses/:id` | admin | Update course |
| DELETE | `/courses/:id` | admin | Delete course (blocked if in use) |
| POST | `/curriculums/:id/courses` | admin | Assign course to curriculum |
| DELETE | `/curriculums/:id/courses/:ccId` | admin | Remove course from curriculum |
| GET | `/curriculums/:id/courses` | admin, adviser | List curriculum courses |
| POST | `/curriculums/:id/prerequisites` | admin | Add prerequisite rule |
| DELETE | `/curriculums/:id/prerequisites/:prereqId` | admin | Remove prerequisite rule |
| GET | `/curriculums/:id/prerequisites` | admin, adviser | List prerequisite rules |
| POST | `/curriculums/:id/corequisites` | admin | Add co-requisite rule |
| DELETE | `/curriculums/:id/corequisites/:coreqId` | admin | Remove co-requisite rule |
| GET | `/curriculums/:id/corequisites` | admin, adviser | List co-requisite rules |
| POST | `/equivalencies` | admin | Add course equivalency |
| DELETE | `/equivalencies/:id` | admin | Remove equivalency |
| GET | `/equivalencies` | admin, adviser | List equivalencies |
| POST | `/curriculums/:id/elective-tracks` | admin | Create elective track |
| GET | `/curriculums/:id/elective-tracks` | admin, adviser | List elective tracks |
| PUT | `/elective-tracks/:id` | admin | Update elective track |
| DELETE | `/elective-tracks/:id` | admin | Delete elective track |
| POST | `/elective-tracks/:id/courses` | admin | Assign course to track |
| DELETE | `/elective-tracks/:id/courses/:etcId` | admin | Remove course from track |

### Academic Term Management — `/api/terms`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/` | admin | Create a new academic term (inactive by default) |
| GET | `/` | admin, adviser | List all terms |
| GET | `/current` | admin, adviser, student | Get current active term |
| PATCH | `/:id/activate` | admin | Activate a term and flag active plans for revalidation |
| PATCH | `/current/end` | admin | End current term and store forecast snapshot placeholder |

### Student Academic Records — `/api/sars`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/` | adviser, admin | Create student academic record |
| GET | `/` | adviser, admin, student (own only) | List SARs (students receive only owned SAR) |
| GET | `/:id` | adviser, admin, student (own only) | Get SAR details and study plan summary |
| PUT | `/:id` | adviser, admin | Update SAR year level and curriculum |
| POST | `/:id/study-plan/generate` | adviser, admin | Generate initial study plan (version 1, draft) |
| GET | `/:id/study-plan/versions` | adviser, admin, student (own only) | List study plan versions with courses |

### Grade Entry, Regeneration & Validation — `/api`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| PUT | `/sars/:id/study-plan/active-version/grades` | adviser, admin | Enter/update grades on active version courses |
| POST | `/sars/:id/study-plan/regenerate` | adviser, admin | Create next draft study plan version from unresolved courses |
| PATCH | `/sars/:id/study-plan/versions/:versionId/validate` | adviser, admin | Validate a draft study plan version and archive prior active version |
| PATCH | `/sars/:id/elective-track` | adviser, admin | Select immutable elective track for SAR |

### Utility
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Server health check |

---

## User Roles

| Role value | System name | Permissions |
|------------|-------------|-------------|
| `admin` | Program Chair | Curriculum config, term management, forecasting, ownership transfer |
| `adviser` | Student Adviser | Create SARs, enter grades, generate/validate study plans |
| `student` | Student | Read-only own academic record, PDF export |

---

## Setup & Running

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Backend
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@tip.edu.ph
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="Student Advising System <noreply@tip.edu.ph>"
CLIENT_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
NODE_ENV=development
```

```bash
npm run dev    # nodemon, port 5000
```

### Frontend
```bash
cd frontend
npm install
npm start      # port 3000
```

Create `frontend/.env`:
```env
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
REACT_APP_API_URL=http://localhost:5000/api
```

---

## Phase Implementation Context

Use this section as quick context when implementing phases in new chat sessions.

### Correct Commands From Repo Root

This monorepo does **not** have a root `package.json`. Running `npm run ...` at repository root will fail with `ENOENT`.

Use one of these patterns:

```bash
# Backend
npm --prefix /home/charmoree/Desktop/Student-Advising-Portal/backend run dev

# Frontend dev server
npm --prefix /home/charmoree/Desktop/Student-Advising-Portal/frontend start

# Frontend production build
npm --prefix /home/charmoree/Desktop/Student-Advising-Portal/frontend run build
```

or `cd` into `backend/` or `frontend/` first.

### Default Credentials (Current Seed)

After reset, these accounts are expected to exist:

| Role | Email | Password |
|------|-------|----------|
| Admin / Program Chair | `admin.cpe@tip.edu.ph` | `password123` |
| Adviser | `adviser.cpe@tip.edu.ph` | `password123` |
| Student | `student@tip.edu.ph` | `password123` |

Login portal selection must match role:
- Admin/Adviser: use `selectedRole = faculty`
- Student: use `selectedRole = student`

### Database Reset + Re-seed (All Tables)

When a clean state is needed for manual phase testing, run the seed script from the repo root:

```bash
node backend/scripts/seed.js
```

Or from `backend/`:

```bash
node scripts/seed.js
```

What the seed script does:
1. Truncates **all** tables in the `public` schema (except `SequelizeMeta`), resetting identity sequences.
2. Creates the three default user accounts (admin, adviser, student).
3. Imports all three BS CPE curricula (2018, 2023, 2025) from `data/curriculum_normalized/`.

Expected output after a clean seed:

```json
{
  "users": 3,
  "curriculums": 3,
  "courses": 132,
  "curriculumCourses": 214,
  "prerequisites": 177,
  "electiveTracks": 16,
  "electiveTrackCourses": 48
}
```

> **Curriculum source files:** The normalized CSVs used by the seed script live in `data/curriculum_normalized/`. If the raw curriculum spreadsheets change, re-run `node backend/scripts/normalize_curricula_csv.js` first to regenerate them, then re-run the seed.

---

## Security

- bcryptjs password hashing (10 rounds)
- JWT access tokens (short-lived) + refresh tokens (HTTP-only cookie)
- `protect` middleware verifies JWT on every protected route
- `requireRole(...roles)` enforces role-based access per route
- Google OAuth restricted to `@tip.edu.ph` domain
- 2FA via email verification codes
- Password reset via secure expiring tokens
- 30-minute inactivity auto-logout on frontend
- Rate limiting on auth endpoints (15 req / 15 min; 5 req / 15 min on sensitive routes)
- Request body size limit (1 MB)

---

## Development Notes

- Backend port: **5000** (`PORT` env var)
- Frontend port: **3000** (CRA dev server)
- Tables auto-sync on startup in development — adding columns is safe; do not rename or drop via sync
- All timestamps stored as Unix milliseconds (BIGINT), consistent across all models
- Upload directories (`uploads/profiles/`, `uploads/proofs/`) are created automatically if missing
- Use `make-admin.js` to promote an existing user to admin: `node make-admin.js user@tip.edu.ph`

---

## License

ISC
