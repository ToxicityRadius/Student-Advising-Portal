# System Reference

This document restores the detailed technical reference sections that were previously removed from the main README.

## Project Structure

```text
Student-Advising-Portal/
├── IMPLEMENTATION_PLAN.md
├── SYSTEM_REFERENCE.md
├── README.md
├── GOOGLE_OAUTH_SETUP.md
├── REQUIRED_EXTENSIONS.md
├── data/
│   └── curriculum_normalized/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── database/
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── scripts/
│   ├── utils/
│   └── uploads/
└── frontend/
    ├── package.json
    ├── public/
    └── src/
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
