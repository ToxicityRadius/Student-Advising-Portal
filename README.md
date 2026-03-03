# Student Advising System

A comprehensive student advising system with user authentication, role-based access control, curriculum & prerequisite management, academic calendar, intelligent study-plan generation, grade tracking, and a secure faculty invitation workflow.

## 📚 Documentation

- **[README.md](README.md)** — Main documentation (you are here)
- **[GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md)** — Google OAuth configuration guide
- **[FACULTY_INVITATION_SYSTEM.md](FACULTY_INVITATION_SYSTEM.md)** — Complete faculty invitation system documentation
- **[FACULTY_INVITATION_QUICKSTART.md](FACULTY_INVITATION_QUICKSTART.md)** — Quick-start guide for admins and faculty
- **[REQUIRED_EXTENSIONS.md](REQUIRED_EXTENSIONS.md)** — VS Code extensions and project dependencies

## Features

### 1. User Authentication & Management (UC-01)
- ✅ Login / Register pages
- ✅ JWT-based authentication with refresh tokens
- ✅ Passwords hashed with bcrypt
- ✅ Google OAuth 2.0 (@tip.edu.ph domain restriction)
- ✅ Two-Factor Authentication (2FA) via email
- ✅ Password reset & email verification
- ✅ Student ID mandatory popup for Google OAuth students
- ✅ Admin "Manage Users" dashboard
- ✅ Role-based access control (Student, Adviser, Admin)
- ✅ Secure Faculty Invitation System (token-based, 48-hour expiry)

### 2. Curriculum & Subject Management (UC-02 / UC-03)
- ✅ CRUD for Curriculums and Subjects
- ✅ Prerequisite rules with **circular-dependency detection** (direct & transitive)
- ✅ Equivalency rules between old/new curriculum subjects (with cycle guard)
- ✅ Deep-include API — subjects return nested prerequisites & equivalencies
- ✅ Admin CurriculumManager UI with inline prerequisite/equivalency badges & removal

### 3. Grade Entry & Verification (UC-04)
- ✅ Students can encode grades per subject
- ✅ Proof-of-grade document upload
- ✅ Grade status workflow: pending → verified / rejected
- ✅ Adviser dashboard to review and verify grades

### 4. Bulk Import (UC-05)
- ✅ CSV upload endpoint (subjects, grades)
- ✅ Admin Bulk Import page

### 5. Academic Calendar / Term Management (UC-06)
- ✅ `AcademicTerm` model (term_name, start_date, end_date, is_active)
- ✅ Full CRUD + "Set Active" toggle (auto-deactivates all other terms)
- ✅ Admin Academic Calendar page with dropdown-based term creation (prevents typos)
- ✅ Seeded default active term

### 6. Intelligent Advising Engine — Study Plan Generation (UC-07)
- ✅ `POST /api/advising/generate` — generates a draft study plan for the logged-in student
  - Fetches active academic term & parses semester type
  - Gathers verified passed grades (grade ≤ 3.0 and > 0)
  - Loads student's curriculum subjects with prerequisites
  - **Filter 1 — Un-taken**: removes already-passed subjects
  - **Filter 2 — Prerequisites met**: keeps only subjects whose prereqs are all passed
  - **Filter 3 — Seasonality**: matches active semester (or "Both" / "Both Semesters")
  - **Unit cap**: fills up to 21 units
  - Saves `StudyPlan` (draft) + `PlanSubject` records
- ✅ `GET /api/advising/my-plan` — fetch latest plan with nested PlanSubjects → Subjects
- ✅ Student "My Study Plan" page: generate, view, table with Course Code / Title / Units / Target Term

## Tech Stack

### Backend
- **Node.js** & **Express**
- **Sequelize** ORM
- **SQLite** (local development via `sqlite3`)
- **JWT** for authentication (`jsonwebtoken`)
- **bcrypt.js** for password hashing
- **Nodemailer** for email (invitations, 2FA, password reset)
- **Multer** for file uploads (proof documents, CSV imports)
- **csv-parser** for bulk import parsing
- **Google OAuth 2.0** (`google-auth-library`)
- **nodemon** (dev)

### Frontend
- **React 18**
- **React Router v6**
- **React-Bootstrap** & **Bootstrap 5**
- **Axios** for API calls
- **Context API** for auth state management
- **@react-oauth/google** for Google sign-in
- **jwt-decode** for token parsing

## Project Structure

```
Student-Advising-Portal/
├── README.md
├── GOOGLE_OAUTH_SETUP.md
├── FACULTY_INVITATION_SYSTEM.md
├── FACULTY_INVITATION_QUICKSTART.md
├── REQUIRED_EXTENSIONS.md
│
├── backend/
│   ├── server.js                        # Express app, route mounting, DB sync
│   ├── seed.js                          # Seed script (curriculums, subjects, prereqs, users, term)
│   ├── package.json
│   ├── database/
│   │   └── db.js                        # Sequelize SQLite connection
│   ├── models/
│   │   ├── index.js                     # Centralised associations
│   │   ├── User.js
│   │   ├── Invitation.js
│   │   ├── Curriculum.js
│   │   ├── Subject.js
│   │   ├── Prerequisite.js
│   │   ├── EquivalencyRule.js
│   │   ├── Grade.js
│   │   ├── ProofDocument.js
│   │   ├── StudyPlan.js
│   │   ├── PlanSubject.js
│   │   └── AcademicTerm.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── invitationController.js
│   │   ├── curriculumController.js       # Subjects, prereqs, equivalencies (+ cycle detection)
│   │   ├── gradeController.js
│   │   ├── importController.js
│   │   ├── termController.js             # AcademicTerm CRUD + set-active
│   │   └── advisingController.js         # Intelligent study-plan generation
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── googleAuthRoutes.js
│   │   ├── userRoutes.js
│   │   ├── invitationRoutes.js
│   │   ├── curriculumRoutes.js
│   │   ├── gradeRoutes.js
│   │   ├── importRoutes.js
│   │   ├── termRoutes.js
│   │   └── advisingRoutes.js
│   ├── middleware/
│   │   └── auth.js                       # JWT protect + role authorize
│   ├── utils/
│   │   ├── email.js
│   │   └── jwt.js
│   └── uploads/
│       └── proofs/                       # Uploaded proof-of-grade files
│
└── frontend/
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js
        ├── index.js
        ├── index.css
        ├── components/
        │   ├── Navbar.js
        │   ├── PrivateRoute.js
        │   ├── InviteFaculty.js
        │   ├── PendingInvitations.js
        │   └── StudentIdModal.js
        ├── context/
        │   └── AuthContext.js
        ├── pages/
        │   ├── Login.js
        │   ├── Register.js
        │   ├── Dashboard.js
        │   ├── ManageUsers.js
        │   ├── ActivateAccount.js
        │   ├── VerifyCode.js
        │   ├── ForgotPassword.js
        │   ├── ResetPassword.js
        │   ├── FacultyRegister.js
        │   ├── GradeEntry.js
        │   ├── CurrentSemester.js
        │   ├── AdviserDashboard.js
        │   ├── AcademicCalendar.js
        │   ├── StudyPlan.js
        │   └── Admin/
        │       ├── CurriculumManager.js
        │       └── BulkImport.js
        └── utils/
            └── api.js
```

## Database Models & Associations

| Model | Table | Key Fields |
|-------|-------|------------|
| **User** | `users` | id, studentId, firstName, lastName, email, password, role, isActive, isVerified, CurriculumId |
| **Invitation** | `faculty_invitations` | id, email, role, invitationToken, invitationExpires, invitedBy, isUsed |
| **Curriculum** | `curricula` | id, version_year, active_status |
| **Subject** | `subjects` | id, course_code, title, units, seasonal_term, CurriculumId |
| **Prerequisite** | `prerequisites` | id, subject_id, required_subj_id |
| **EquivalencyRule** | `equivalency_rules` | id, source_subject_id, target_subject_id |
| **Grade** | `grades` | id, grade_value, term_taken, status (pending/verified/rejected), UserId, SubjectId |
| **ProofDocument** | `proof_documents` | id, GradeId, … |
| **StudyPlan** | `study_plans` | id, status (draft/approved), UserId |
| **PlanSubject** | `plan_subjects` | id, target_term, StudyPlanId, SubjectId |
| **AcademicTerm** | `academic_terms` | id, term_name, start_date, end_date, is_active |

### Key Associations
```
Curriculum  ─┬─ hasMany ──▸ Subject
             └─ hasMany ──▸ User (student assigned to curriculum)
Subject     ─┬─ hasMany ──▸ Prerequisite   (as 'prerequisites')
             ├─ hasMany ──▸ EquivalencyRule (as 'equivalencies')
             ├─ hasMany ──▸ Grade
             └─ hasMany ──▸ PlanSubject
Prerequisite ── belongsTo ▸ Subject (as 'RequiredSubject')
EquivalencyRule ─ belongsTo ▸ Subject (as 'TargetSubject')
User        ─┬─ hasMany ──▸ Grade
             └─ hasMany ──▸ StudyPlan
StudyPlan   ── hasMany ──▸ PlanSubject
Grade       ── hasOne  ──▸ ProofDocument
```

## Setup Instructions

### Prerequisites
- Node.js v14 or higher
- npm

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file (see `.env.example`):
```env
JWT_SECRET=your-secret-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@tip.edu.ph
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="Student Advising System <noreply@tip.edu.ph>"
CLIENT_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
```

Seed the database (optional — creates sample curriculums, subjects, prereqs, users, and a default active term):
```bash
node seed.js
```

Start the server:
```bash
npm run dev          # development (nodemon)
npm start            # production
```
Server runs on **http://localhost:5000**.

### Frontend Setup

```bash
cd frontend
npm install
npm start
```
App runs on **http://localhost:3000**.

### Default Seed Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@tip.edu.ph | admin123 |
| Student | student@tip.edu.ph | admin123 |
| Adviser | adviser@tip.edu.ph | admin123 |

## API Endpoints

### Authentication (`/api/auth`)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/register` | Register new student |
| POST | `/register-faculty/:token` | Register faculty via invitation |
| GET | `/validate-invitation/:token` | Validate invitation token |
| POST | `/login` | Login (supports 2FA) |
| POST | `/google` | Google OAuth sign-in |
| POST | `/logout` | Logout |
| POST | `/verify-code` | Verify 2FA code |
| POST | `/resend-code` | Resend 2FA code |
| POST | `/forgot-password` | Request password reset |
| POST | `/reset-password` | Reset password with token |
| GET | `/activate/:token` | Activate account |
| GET | `/me` | Get current user |

### User Management — Admin (`/api/users`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | List all users |
| GET | `/:id` | Get user by ID |
| PUT | `/:id` | Update user |
| DELETE | `/:id` | Delete user |
| PATCH | `/:id/toggle-status` | Toggle active status |

### Faculty Invitations — Admin (`/api/admin`)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/invite-faculty` | Send invitation email |
| GET | `/invitations` | List all invitations |
| GET | `/invitations/pending` | List pending invitations |
| DELETE | `/invitations/:id` | Delete invitation |
| POST | `/invitations/:id/resend` | Resend invitation |

### Curriculum & Subjects (`/api/curriculum`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/` | Any | List curriculums (deep: subjects → prereqs, equivalencies) |
| POST | `/` | Admin | Create curriculum |
| PUT | `/:id` | Admin | Update curriculum |
| DELETE | `/:id` | Admin | Delete curriculum |
| GET | `/:curriculumId/subjects` | Any | List subjects for a curriculum |
| POST | `/subjects` | Admin | Create subject |
| PUT | `/subjects/:id` | Admin | Update subject |
| DELETE | `/subjects/:id` | Admin | Delete subject |
| POST | `/prerequisites` | Admin | Add prerequisite (circular-dep guard) |
| DELETE | `/prerequisites/:id` | Admin | Remove prerequisite |
| POST | `/equivalencies` | Admin | Add equivalency (circular-dep guard) |
| DELETE | `/equivalencies/:id` | Admin | Remove equivalency |

### Grades (`/api/grades`)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/` | Submit grade (student) |
| GET | `/my` | Get student's own grades |
| PATCH | `/:id/verify` | Verify/reject grade (adviser/admin) |

### Bulk Import — Admin (`/api/import`)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/subjects` | Import subjects from CSV |
| POST | `/grades` | Import grades from CSV |

### Academic Terms (`/api/terms`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/` | Any | List all terms |
| GET | `/active` | Any | Get active term |
| POST | `/` | Admin | Create term |
| PUT | `/:id` | Admin | Update term |
| DELETE | `/:id` | Admin | Delete term |
| PATCH | `/:id/activate` | Admin | Set term as active (deactivates others) |

### Advising Engine (`/api/advising`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/generate` | Student | Generate draft study plan |
| GET | `/my-plan` | Student | Fetch latest study plan with subjects |

### Utility
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Health check |

## User Roles

### Student (default)
- Grade entry & proof upload
- Current-semester view
- **My Study Plan** — generate & view AI-recommended study plan
- Assigned to a curriculum by admin

### Adviser
- Adviser dashboard — review & verify student grades
- Access advisee records

### Admin (Program Chair)
- Everything above, plus:
- Manage Users, toggle status, delete accounts
- Invite Faculty (secure token-based)
- Curriculum Manager (subjects, prereqs, equivalencies)
- Bulk Import (CSV)
- Academic Calendar (create/edit terms, toggle active)

## Security Features

- bcrypt password hashing (10 rounds)
- JWT access tokens + refresh tokens
- HTTP-only cookies
- Role-based authorization middleware (`protect`, `authorize`)
- Google OAuth 2.0 with @tip.edu.ph domain restriction
- Two-Factor Authentication (2FA) via email codes
- Password reset with secure expiring tokens
- Faculty invitation tokens (64-char hex, 48-hour expiry)
- Circular-dependency prevention on prerequisite/equivalency creation
- Protected frontend routes via `<PrivateRoute>` component

## Development Notes

- **Backend** — port 5000 (configurable via `PORT` env var)
- **Frontend** — port 3000 (CRA dev server proxies `/api` to backend)
- **Database** — SQLite file (`backend/database.sqlite`), auto-created on first run
- **Seeds** — `node seed.js` wipes and re-seeds all tables with sample data

## License

ISC
