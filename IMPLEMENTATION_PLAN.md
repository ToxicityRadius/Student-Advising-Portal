# Study Plan Management & Forecasting System — Implementation Plan

> **How to use this file across sessions:**
> - At the start of a session, read this file to determine which phase to work on.
> - When a phase is fully complete, mark it with `[DONE]` and update the status table.
> - Each phase is self-contained. Never skip prerequisites — each phase lists its dependencies.
> - For the next major revamp (profiles, SAR UX, pagination, dashboards, PDF redesign), continue with [IMPLEMENTATION_PLAN_PART2.md](IMPLEMENTATION_PLAN_PART2.md).

---

## Status Overview

| Phase | Title | Status |
|-------|-------|--------|
| 1 | Database Schema & Core Models | `[DONE]` |
| 2 | Curriculum Management — Backend APIs | `[DONE]` |
| 3 | Curriculum Management — Frontend UI | `[DONE]` |
| 4 | Academic Term Management | `[DONE]` |
| 5 | Student Academic Record & Initial Study Plan | `[DONE]` |
| 6 | Grade Entry & Study Plan Regeneration | `[DONE]` |
| 7 | Study Plan Validation & Elective Track Enforcement | `[DONE]` |
| 8 | Student-Facing Views & PDF Export | `[DONE]` |
| 9 | Forecasting System | `[DONE]` |
| 10 | Auth & Access Control Refinements | `[DONE]` |

---

## Codebase Context (Read Before Starting Any Phase)

### Existing Stack
- **Backend:** Node.js + Express, PostgreSQL, Sequelize ORM (`{ alter: { drop: false } }` in dev, auto-syncs)
- **Frontend:** React 18, React Bootstrap, React Router v6, Context API for auth
- **Auth:** JWT (access + refresh tokens), HTTP-only cookies, bcryptjs, Google OAuth
- **Database connection:** `backend/database/db.js` — reads `DATABASE_URL` from `.env`
- **Model registry:** `backend/models/index.js` — exports all models and defines associations

### Existing Roles (map to system roles)
| Existing `role` value | System Role |
|---|---|
| `admin` | Program Chair |
| `adviser` | Student Adviser |
| `student` | Student |

### Key Existing Files
- `backend/models/User.js` — existing user model, already has role, email, firstName, lastName
- `backend/middleware/auth.js` — exports `protect` middleware (JWT guard)
- `backend/server.js` — registers routes, auto-syncs DB
- `frontend/src/context/AuthContext.js` — provides `user` with role info
- `frontend/src/components/PrivateRoute.js` — wraps protected routes
- `frontend/src/utils/api.js` — pre-configured Axios instance

### Middleware Notes
- Add a `requireRole(...roles)` middleware in `backend/middleware/auth.js` for role-based access control
- Example: `router.get('/curriculum', protect, requireRole('admin'), ...)`

### Data Seeding
- **Seed script:** `backend/scripts/seed.js` — resets all tables, creates default users, and imports all curricula from pre-built normalized CSVs.
- **Run from repo root:** `node backend/scripts/seed.js`
- **Normalized CSV source:** `data/curriculum_normalized/` — six CSVs covering all three BS CPE curricula (2018, 2023, 2025). These are the stable source of truth for curriculum data.
- **Re-normalization:** If the upstream spreadsheet CSVs change, re-run `node backend/scripts/normalize_curricula_csv.js` to regenerate the normalized files, then re-run the seed.
- **Active curriculum after seed:** BS CPE Curriculum 2025 (`isActive = true`). 

---

## Phase 1 — Database Schema & Core Models

**Depends on:** Nothing (foundation phase)  
**Scope:** Backend only — create all Sequelize models and register associations

### Goal
Create all the database tables needed by the system. No APIs yet — just the data layer.

### Files to Create (Backend)
All new model files go in `backend/models/`.

#### 1. `backend/models/Curriculum.js`
Fields:
- `id` — INTEGER, PK, autoIncrement
- `name` — STRING, not null (e.g., "CPE Curriculum 2022")
- `description` — TEXT, nullable
- `isActive` — BOOLEAN, default false (only one can be true at a time)
- `createdById` — INTEGER, FK → users.id (who created it, the Program Chair)
- `createdAt`, `updatedAt` — BIGINT (Unix ms), consistent with existing User model

#### 2. `backend/models/Course.js`
Fields:
- `id` — INTEGER, PK, autoIncrement
- `code` — STRING, not null, unique (e.g., "CPE411")
- `name` — STRING, not null (e.g., "Digital Electronics")
- `units` — INTEGER, not null (1–9)
- `createdAt`, `updatedAt` — BIGINT

#### 3. `backend/models/CurriculumCourse.js`
Junction table — assigns courses to a curriculum at a specific year level and semester.
Fields:
- `id` — INTEGER, PK, autoIncrement
- `curriculumId` — INTEGER, FK → curriculums.id
- `courseId` — INTEGER, FK → courses.id
- `yearLevel` — INTEGER, not null (1–4)
- `semester` — INTEGER, not null (1=First, 2=Second, 3=Summer)
- `isElective` — BOOLEAN, default false

#### 4. `backend/models/Prerequisite.js`
Fields:
- `id` — INTEGER, PK, autoIncrement
- `curriculumId` — INTEGER, FK → curriculums.id
- `courseId` — INTEGER, FK → courses.id (the course that has the prerequisite)
- `prerequisiteCourseId` — INTEGER, FK → courses.id (the required course)

#### 5. `backend/models/CoRequisite.js`
Fields:
- `id` — INTEGER, PK, autoIncrement
- `curriculumId` — INTEGER, FK → curriculums.id
- `courseId` — INTEGER, FK → courses.id
- `coRequisiteCourseId` — INTEGER, FK → courses.id

#### 6. `backend/models/CourseEquivalency.js`
Fields:
- `id` — INTEGER, PK, autoIncrement
- `courseId` — INTEGER, FK → courses.id (original)
- `equivalentCourseId` — INTEGER, FK → courses.id (equivalent, from another curriculum)
- `notes` — TEXT, nullable

#### 7. `backend/models/ElectiveTrack.js`
Fields:
- `id` — INTEGER, PK, autoIncrement
- `curriculumId` — INTEGER, FK → curriculums.id
- `name` — STRING, not null (e.g., "Data Science", "Robotics", "Cybersecurity")
- `description` — TEXT, nullable

#### 8. `backend/models/ElectiveTrackCourse.js`
Junction — which courses belong to which elective track (and at which year/semester sequence).
Fields:
- `id` — INTEGER, PK, autoIncrement
- `electiveTrackId` — INTEGER, FK → elective_tracks.id
- `courseId` — INTEGER, FK → courses.id
- `yearLevel` — INTEGER (suggested placement)
- `semester` — INTEGER (suggested placement)

#### 9. `backend/models/AcademicTerm.js`
Fields:
- `id` — INTEGER, PK, autoIncrement
- `schoolYear` — STRING, not null (e.g., "2025-2026")
- `semester` — INTEGER, not null (1, 2, or 3)
- `isCurrent` — BOOLEAN, default false (only one can be true)
- `startedAt` — BIGINT (when the Program Chair activated this term)
- `endedAt` — BIGINT, nullable (when the term was closed)
- `closedById` — INTEGER, FK → users.id

#### 10. `backend/models/StudentAcademicRecord.js`
Fields:
- `id` — INTEGER, PK, autoIncrement
- `userId` — INTEGER, FK → users.id (the student — nullable if student not yet registered)
- `curriculumId` — INTEGER, FK → curriculums.id
- `electiveTrackId` — INTEGER, FK → elective_tracks.id, nullable (set when selected)
- `studentName` — STRING, not null
- `studentNumber` — STRING, not null, unique
- `email` — STRING, not null
- `yearLevel` — INTEGER, not null
- `createdByAdviserId` — INTEGER, FK → users.id (the adviser who created it)
- `createdAt`, `updatedAt` — BIGINT

#### 11. `backend/models/StudyPlan.js`
One per StudentAcademicRecord. Acts as a container for versions.
Fields:
- `id` — INTEGER, PK, autoIncrement
- `studentAcademicRecordId` — INTEGER, FK → student_academic_records.id, unique
- `createdAt`, `updatedAt` — BIGINT

#### 12. `backend/models/StudyPlanVersion.js`
Fields:
- `id` — INTEGER, PK, autoIncrement  
- `studyPlanId` — INTEGER, FK → study_plans.id
- `versionNumber` — INTEGER, not null (sequential, e.g., 1, 2, 3)
- `status` — ENUM('draft', 'active', 'archived'), default 'draft'
- `generatedByAdviserId` — INTEGER, FK → users.id
- `validatedByAdviserId` — INTEGER, FK → users.id, nullable
- `validatedAt` — BIGINT, nullable
- `notes` — TEXT, nullable
- `createdAt`, `updatedAt` — BIGINT

#### 13. `backend/models/StudyPlanCourse.js`
One row per course in a StudyPlanVersion.
Fields:
- `id` — INTEGER, PK, autoIncrement
- `studyPlanVersionId` — INTEGER, FK → study_plan_versions.id
- `courseId` — INTEGER, FK → courses.id
- `yearLevel` — INTEGER (scheduled year level)
- `semester` — INTEGER (scheduled semester, 1/2/3)
- `grade` — STRING(10), nullable (e.g., "1.00", "2.50", "INC", "5.00", "4.00", "Pending")
- `status` — ENUM('pending', 'passed', 'failed', 'dropped', 'incomplete'), default 'pending'
- `createdAt`, `updatedAt` — BIGINT

#### 14. `backend/models/ForecastSnapshot.js`
Stores a point-in-time demand forecast taken when a term ends.
Fields:
- `id` — INTEGER, PK, autoIncrement
- `academicTermId` — INTEGER, FK → academic_terms.id
- `schoolYear` — STRING
- `semester` — INTEGER
- `snapshotData` — JSONB (stores the full demand data array at time of snapshot)
- `triggeredByUserId` — INTEGER, FK → users.id
- `createdAt` — BIGINT

### Files to Modify (Backend)

#### `backend/models/index.js`
Import all new models and define all associations:

```
Associations to define:
- Curriculum.hasMany(CurriculumCourse)
- CurriculumCourse.belongsTo(Curriculum)
- CurriculumCourse.belongsTo(Course)
- Course.hasMany(CurriculumCourse)

- Curriculum.hasMany(Prerequisite)
- Prerequisite.belongsTo(Curriculum)
- Prerequisite.belongsTo(Course, { as: 'Course', foreignKey: 'courseId' })
- Prerequisite.belongsTo(Course, { as: 'PrerequisiteCourse', foreignKey: 'prerequisiteCourseId' })

- Curriculum.hasMany(CoRequisite)
- CoRequisite.belongsTo(Curriculum)
- CoRequisite.belongsTo(Course, { as: 'Course', foreignKey: 'courseId' })
- CoRequisite.belongsTo(Course, { as: 'CoRequisiteCourse', foreignKey: 'coRequisiteCourseId' })

- Course.hasMany(CourseEquivalency, { foreignKey: 'courseId' })
- Course.hasMany(CourseEquivalency, { as: 'EquivalentFor', foreignKey: 'equivalentCourseId' })

- Curriculum.hasMany(ElectiveTrack)
- ElectiveTrack.belongsTo(Curriculum)
- ElectiveTrack.hasMany(ElectiveTrackCourse)
- ElectiveTrackCourse.belongsTo(ElectiveTrack)
- ElectiveTrackCourse.belongsTo(Course)

- StudentAcademicRecord.belongsTo(User, { as: 'Student', foreignKey: 'userId' })
- StudentAcademicRecord.belongsTo(User, { as: 'CreatedByAdviser', foreignKey: 'createdByAdviserId' })
- StudentAcademicRecord.belongsTo(Curriculum)
- StudentAcademicRecord.belongsTo(ElectiveTrack)
- StudentAcademicRecord.hasOne(StudyPlan)

- StudyPlan.belongsTo(StudentAcademicRecord)
- StudyPlan.hasMany(StudyPlanVersion)

- StudyPlanVersion.belongsTo(StudyPlan)
- StudyPlanVersion.belongsTo(User, { as: 'GeneratedByAdviser', foreignKey: 'generatedByAdviserId' })
- StudyPlanVersion.belongsTo(User, { as: 'ValidatedByAdviser', foreignKey: 'validatedByAdviserId' })
- StudyPlanVersion.hasMany(StudyPlanCourse)

- StudyPlanCourse.belongsTo(StudyPlanVersion)
- StudyPlanCourse.belongsTo(Course)

- ForecastSnapshot.belongsTo(AcademicTerm)
- ForecastSnapshot.belongsTo(User, { as: 'TriggeredBy', foreignKey: 'triggeredByUserId' })
- AcademicTerm.hasMany(ForecastSnapshot)
```

### Verification Checklist
- [x] All 14 model files created in `backend/models/`  
- [x] `backend/models/index.js` imports all models and defines all associations
- [x] Dev server starts without Sequelize sync errors (`npm run dev` in backend)
- [x] All tables visible in the PostgreSQL database

---

## Phase 2 — Curriculum Management Backend APIs

**Depends on:** Phase 1  
**Scope:** Backend only — REST API for all curriculum configuration

### Goal
Build all the backend routes and controllers that the Program Chair will use to configure curricula, courses, prerequisites, co-requisites, equivalencies, and elective tracks.

### Files to Create (Backend)

#### `backend/controllers/curriculumController.js`
Exports the following handler functions:

**Curriculum**
- `createCurriculum(req, res)` — POST, creates new curriculum, validates `admin` role
- `getCurriculums(req, res)` — GET, returns all curricula, accessible to `admin` and `adviser`
- `getCurriculumById(req, res)` — GET, returns one curriculum with full course/track structure
- `updateCurriculum(req, res)` — PUT, update name/description
- `setActiveCurriculum(req, res)` — PATCH `/curriculum/:id/activate` — sets `isActive=true`, sets all others to `false`

**Course**
- `createCourse(req, res)` — POST
- `getCourses(req, res)` — GET, returns all courses
- `updateCourse(req, res)` — PUT
- `deleteCourse(req, res)` — DELETE (only if not used in any curriculum)

**Curriculum–Course assignment**
- `addCourseToCurriculum(req, res)` — POST `/curriculum/:id/courses`
- `removeCourseFromCurriculum(req, res)` — DELETE `/curriculum/:id/courses/:ccId`
- `getCurriculumCourses(req, res)` — GET `/curriculum/:id/courses`

**Prerequisites**
- `addPrerequisite(req, res)` — POST `/curriculum/:id/prerequisites`
- `removePrerequisite(req, res)` — DELETE `/curriculum/:id/prerequisites/:prereqId`
- `getPrerequisites(req, res)` — GET `/curriculum/:id/prerequisites`

**Co-Requisites**
- `addCoRequisite(req, res)` — POST `/curriculum/:id/corequisites`
- `removeCoRequisite(req, res)` — DELETE `/curriculum/:id/corequisites/:coreqId`
- `getCoRequisites(req, res)` — GET `/curriculum/:id/corequisites`

**Equivalencies**
- `addEquivalency(req, res)` — POST `/equivalencies`
- `removeEquivalency(req, res)` — DELETE `/equivalencies/:id`
- `getEquivalencies(req, res)` — GET `/equivalencies`

**Elective Tracks**
- `createElectiveTrack(req, res)` — POST `/curriculum/:id/elective-tracks`
- `getElectiveTracks(req, res)` — GET `/curriculum/:id/elective-tracks`
- `updateElectiveTrack(req, res)` — PUT `/elective-tracks/:id`
- `deleteElectiveTrack(req, res)` — DELETE `/elective-tracks/:id`
- `addCourseToTrack(req, res)` — POST `/elective-tracks/:id/courses`
- `removeCourseFromTrack(req, res)` — DELETE `/elective-tracks/:id/courses/:etcId`

#### `backend/routes/curriculumRoutes.js`
Registers all curriculum routes. All routes require `protect + requireRole('admin')` except read routes which also allow `adviser`.

### Files to Modify (Backend)

#### `backend/middleware/auth.js`
Add `requireRole(...roles)` middleware:
```js
exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
};
```

#### `backend/server.js`
Register the new router:
```js
const curriculumRoutes = require('./routes/curriculumRoutes');
app.use('/api', curriculumRoutes);
```

### API Endpoint Summary

| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/curriculums` | admin |
| GET | `/api/curriculums` | admin, adviser |
| GET | `/api/curriculums/:id` | admin, adviser |
| PUT | `/api/curriculums/:id` | admin |
| PATCH | `/api/curriculums/:id/activate` | admin |
| POST | `/api/courses` | admin |
| GET | `/api/courses` | admin, adviser |
| PUT | `/api/courses/:id` | admin |
| DELETE | `/api/courses/:id` | admin |
| POST | `/api/curriculums/:id/courses` | admin |
| DELETE | `/api/curriculums/:id/courses/:csId` | admin |
| GET | `/api/curriculums/:id/courses` | admin, adviser |
| POST | `/api/curriculums/:id/prerequisites` | admin |
| DELETE | `/api/curriculums/:id/prerequisites/:prereqId` | admin |
| GET | `/api/curriculums/:id/prerequisites` | admin, adviser |
| POST | `/api/curriculums/:id/corequisites` | admin |
| DELETE | `/api/curriculums/:id/corequisites/:coreqId` | admin |
| GET | `/api/curriculums/:id/corequisites` | admin, adviser |
| POST | `/api/equivalencies` | admin |
| DELETE | `/api/equivalencies/:id` | admin |
| GET | `/api/equivalencies` | admin, adviser |
| POST | `/api/curriculums/:id/elective-tracks` | admin |
| GET | `/api/curriculums/:id/elective-tracks` | admin, adviser |
| PUT | `/api/elective-tracks/:id` | admin |
| DELETE | `/api/elective-tracks/:id` | admin |
| POST | `/api/elective-tracks/:id/courses` | admin |
| DELETE | `/api/elective-tracks/:id/courses/:etsId` | admin |

### Verification Checklist
- [x] `requireRole` middleware added and exported from `backend/middleware/auth.js`
- [x] All curriculum endpoints return correct status codes (201 for creates, 200 for reads/updates, 204 for deletes)
- [x] Only one curriculum can be active at a time (`setActiveCurriculum` deactivates others)
- [x] Course deletion blocked if referenced in any `CurriculumCourse`, `Prerequisite`, `CoRequisite`, `ElectiveTrackCourse`, or `StudyPlanCourse`
- [x] All routes registered in `server.js`

### Implementation Notes
- Added `CourseEquivalency.belongsTo(Course, ...)` associations (both `Course` and `EquivalentCourse` aliases) to `backend/models/index.js` — required for eager loading in equivalency endpoints
- `deleteCourse` also blocks if the course is referenced in `ElectiveTrackCourse` or `StudyPlanCourse`
- Route param for curriculum-course removal is `:ccId`; for elective track course removal is `:etcId`

---

## Phase 3 — Curriculum Management Frontend UI

**Depends on:** Phase 2  
**Scope:** Frontend only — Program Chair curriculum configuration pages

### Goal
Build the React pages and components for the Program Chair to manage curricula, courses, prerequisites, co-requisites, equivalencies, and elective tracks.

### Files to Create (Frontend)

#### `frontend/src/pages/admin/CurriculumManagement.js`
Main page for Program Chair. Tabbed layout with tabs:
1. **Curricula** — list all curricula, create new, set active, click to open
2. **Courses** — global course library (create, edit, delete)
3. **Equivalencies** — define course equivalencies across curricula

#### `frontend/src/pages/admin/CurriculumDetail.js`
Opened when a specific curriculum is selected. Tabs:
1. **Structure** — table of courses organized by Year Level + Semester; add/remove courses
2. **Prerequisites** — list and manage prerequisite relationships
3. **Co-Requisites** — list and manage co-requisite relationships
4. **Elective Tracks** — list tracks, create new track, assign courses to tracks

#### `frontend/src/components/admin/CoursePickerModal.js`
Reusable modal — shows a searchable list of all courses; used when assigning courses to:
- Curriculum structure
- Prerequisites
- Co-Requisites
- Elective Track courses

### Files to Modify (Frontend)

#### `frontend/src/App.js`
Add new admin routes:
```jsx
<Route path="/admin/curriculum" element={<PrivateRoute roles={['admin']}><CurriculumManagement /></PrivateRoute>} />
<Route path="/admin/curriculum/:id" element={<PrivateRoute roles={['admin']}><CurriculumDetail /></PrivateRoute>} />
```
> Note: Update `PrivateRoute.js` if needed to accept a `roles` prop for role-based guards.

#### `frontend/src/components/PrivateRoute.js`
If not already done, add `roles` prop support:
```jsx
if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
```

#### `frontend/src/pages/Dashboard.js`
Add a "Curriculum Management" card/link visible only to `admin` role users.

### UI/UX Notes
- Use React Bootstrap `Table`, `Modal`, `Tabs`, `Button`, `Form` components
- Show loading spinners during API calls
- Show success/error toasts (use React Bootstrap `Toast` or a simple alert state)
- The curriculum structure view should be a grid table: rows = Year Level, columns = Semester 1 / Semester 2 / Summer
- Courses in the structure table should be clickable chips/badges

### Manual Testing Steps
1. Log in as `admin` and open `/dashboard`; verify a visible "Curriculum Management" entry point.
2. Open `/admin/curriculum`; verify tabs for Curricula, Courses, and Equivalencies render without errors.
3. Create a curriculum, set it active, refresh the page, and verify active badge/state persists.
4. Add at least 3 courses, then open one curriculum detail page and place courses in different year/semester slots.
5. Create one prerequisite and one co-requisite rule, then reload and verify both are still listed.
6. Create one elective track and assign courses to it; verify the assigned list updates immediately.
7. Open `/admin/curriculum` using a non-admin account and confirm redirect/blocked access.
8. In browser network tab, verify each action maps to the expected endpoint and returns 2xx.

### Verification Checklist
- [x] Admin can create a new curriculum and set it as active
- [x] Admin can add courses to curriculum at specific year/semester slots
- [x] Admin can define prerequisites (A requires B)
- [x] Admin can define co-requisites (A and B must be taken together)
- [x] Admin can create elective tracks and assign courses to them
- [x] Admin can define course equivalencies across curricula
- [x] Non-admin users cannot access `/admin/curriculum`
- [x] Dashboard shows Curriculum Management link for admin only

### Implementation Notes
- `PrivateRoute` already supported role-based guarding via `roles` prop, so no additional changes were needed there.
- Implemented Phase 3 feedback UX with in-page `Alert` messages and loading indicators (`Spinner`) using React Bootstrap.
- Verified role guard behavior by confirming non-admin navigation to `/admin/curriculum` is redirected to `/dashboard`.

---

## Phase 4 — Academic Term Management

**Depends on:** Phase 1  
**Scope:** Backend + Frontend — managing the current academic term

### Goal
Allow the Program Chair to set and manage the current academic term (school year + semester). Advancing the term triggers system events (mark versions for revalidation, store forecast snapshot — the snapshot storage will be a placeholder until Phase 9).

### Files to Create (Backend)

#### `backend/controllers/termController.js`
- `createTerm(req, res)` — POST, creates a new term (does not activate it yet)
- `getCurrentTerm(req, res)` — GET, returns the term where `isCurrent = true`
- `getAllTerms(req, res)` — GET, returns all terms ordered by schoolYear + semester
- `activateTerm(req, res)` — PATCH `/:id/activate` — sets `isCurrent=true`, deactivates previous term, marks all `active` StudyPlanVersions as needing revalidation (set a `needsRevalidation` flag — add this boolean field to `StudyPlanVersion`)
- `endCurrentTerm(req, res)` — PATCH `/current/end` — sets `endedAt`, stores a forecast snapshot placeholder (actual snapshot filled in Phase 9)

#### `backend/routes/termRoutes.js`
All POST/PATCH routes are `admin` only. GET routes allow `admin` and `adviser`.

### Files to Create (Frontend)

#### `frontend/src/pages/admin/TermManagement.js`
- Displays current active term prominently
- Lists all past terms
- Form to create a new term (schoolYear string + semester select 1/2/3)
- "Activate Term" button (with confirmation modal — this ends the current advising cycle)
- "End Current Term" button (with confirmation modal — triggers revalidation flags)

### Files to Modify (Backend)

#### `backend/models/StudyPlanVersion.js`
Add field:
- `needsRevalidation` — BOOLEAN, default false

#### `backend/server.js`
```js
const termRoutes = require('./routes/termRoutes');
app.use('/api/terms', termRoutes);
```

#### `frontend/src/App.js`
```jsx
<Route path="/admin/terms" element={<PrivateRoute roles={['admin']}><TermManagement /></PrivateRoute>} />
```

#### `frontend/src/pages/Dashboard.js`
- Show current active term for all logged-in users
- Add "Term Management" card/link for admin only

### API Endpoint Summary

| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/terms` | admin |
| GET | `/api/terms` | admin, adviser |
| GET | `/api/terms/current` | admin, adviser, student |
| PATCH | `/api/terms/:id/activate` | admin |
| PATCH | `/api/terms/current/end` | admin |

### Manual Testing Steps
1. Log in as `admin` and open `/admin/terms`; verify current term panel and historical list render.
2. Create a new term (for example `2026-2027`, semester `1`) and verify it appears in the list.
3. Activate the new term and confirm the modal appears before the action is committed.
4. Refresh `/admin/terms` and `/dashboard`; verify the current term reflects the newly activated term.
5. End the current term and confirm the confirmation modal appears and action succeeds.
6. Attempt `/admin/terms` as `adviser` and `student`; verify page access is blocked by role guard.
7. Check network tab for `POST /api/terms`, `PATCH /api/terms/:id/activate`, and `PATCH /api/terms/current/end` status codes.

### Verification Checklist
- [x] Only one term can have `isCurrent = true` at a time
- [x] Activating a new term marks all active `StudyPlanVersion` rows with `needsRevalidation = true`
- [x] Current term is visible in the dashboard for all users
- [x] Admin sees Term Management page with create/activate/end controls
- [x] Confirmation modals shown before activate/end operations

### Implementation Notes
- `backend/models/StudyPlanVersion.js` already contained `needsRevalidation`, so no model schema edit was needed in this phase.
- `endCurrentTerm` sets `isCurrent=false` when ending the active term so no closed term remains flagged as current.
- A forecast snapshot placeholder row is stored in `forecast_snapshots` with `snapshotData.placeholder=true`; full forecast computation remains in Phase 9.
- Verified API behavior with role-scoped JWT checks (`admin`, `adviser`, `student`) and 2xx/403 status codes on `/api/terms` endpoints.

---

## Phase 5 — Student Academic Record & Initial Study Plan

**Depends on:** Phases 1, 2, 4  
**Scope:** Backend + Frontend — adviser creates academic records and generates initial study plans

### Goal
Student Advisers can search for students, create Student Academic Records (SAR), and automatically generate the first Study Plan Version from the active curriculum.

### Files to Create (Backend)

#### `backend/controllers/sarController.js`
- `createSAR(req, res)` — POST `/sars` — adviser creates a new Student Academic Record (name, studentNumber, email, yearLevel, curriculumId defaults to active curriculum)
- `getSARs(req, res)` — GET `/sars` — adviser/admin sees all SARs; student sees only their own
- `getSARById(req, res)` — GET `/sars/:id` — returns SAR with current active StudyPlanVersion details
- `updateSAR(req, res)` — PUT `/sars/:id` — adviser can update year level, curriculum assignment
- `generateInitialStudyPlan(req, res)` — POST `/sars/:id/study-plan/generate` — copies from the active curriculum structure, creates StudyPlan + first StudyPlanVersion (status: 'draft')
- `getStudyPlanVersions(req, res)` — GET `/sars/:id/study-plan/versions` — list all versions with status, version number, created date

**Initial Study Plan Generation Logic (inside `generateInitialStudyPlan`):**
1. Fetch the SAR's assigned curriculum
2. Fetch all `CurriculumCourse` rows for that curriculum
3. Create a `StudyPlan` record linked to the SAR
4. Create a `StudyPlanVersion` with `versionNumber=1`, `status='draft'`
5. For each `CurriculumCourse`, create a `StudyPlanCourse` with the assigned `yearLevel` and `semester`, `status='pending'`, `grade=null`
6. Return the created version

#### `backend/routes/sarRoutes.js`
Register routes. Students can only read their own SAR (enforce ownership check in controller).

### Files to Create (Frontend)

#### `frontend/src/pages/adviser/StudentList.js`
- Lists all Student Academic Records (paginated, searchable by name or student number)
- "Create New Record" button → opens `CreateSARModal`
- Each row links to `StudentDetail` page

#### `frontend/src/pages/adviser/StudentDetail.js`
- Displays SAR info: name, student number, email, year level, assigned curriculum, elective track
- Shows Study Plan Versions list (version number, status, date)
- "Generate Initial Study Plan" button (if no study plan exists yet)
- "View Active Plan" button → navigates to `StudyPlanView`
- Accessible by adviser (any SAR) and student (only their own SAR via a separate `/my-record` route)

#### `frontend/src/pages/adviser/StudyPlanView.js`
- Displays StudyPlanVersion as a table grid: rows = semester slot (Year 1 Sem 1, Year 1 Sem 2, etc.), columns = courses
- Shows course code, name, units, grade, status for each entry
- Used in read-only mode for now (editing comes in Phase 6)

#### `frontend/src/components/adviser/CreateSARModal.js`
Form modal:
- Student Name, Student Number, Email (validated to end in `@tip.edu.ph`)
- Year Level (1–4 select)
- Curriculum (auto-filled with active curriculum, but can be changed by adviser)
- Submit calls `POST /api/sars`

### Files to Modify (Backend)

#### `backend/server.js`
```js
const sarRoutes = require('./routes/sarRoutes');
app.use('/api/sars', sarRoutes);
```

### Files to Modify (Frontend)

#### `frontend/src/App.js`
```jsx
<Route path="/adviser/students" element={<PrivateRoute roles={['adviser', 'admin']}><StudentList /></PrivateRoute>} />
<Route path="/adviser/students/:sarId" element={<PrivateRoute roles={['adviser', 'admin']}><StudentDetail /></PrivateRoute>} />
<Route path="/adviser/students/:sarId/plan/:versionId" element={<PrivateRoute roles={['adviser', 'admin']}><StudyPlanView /></PrivateRoute>} />
<Route path="/my-record" element={<PrivateRoute roles={['student']}><StudentDetail /></PrivateRoute>} />
```

#### `frontend/src/pages/Dashboard.js`
- Adviser/admin: Show "Student Records" card → links to `/adviser/students`
- Student: Show "My Academic Record" card → links to `/my-record`

### API Endpoint Summary

| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/sars` | adviser, admin |
| GET | `/api/sars` | adviser, admin |
| GET | `/api/sars/:id` | adviser, admin, student (own only) |
| PUT | `/api/sars/:id` | adviser, admin |
| POST | `/api/sars/:id/study-plan/generate` | adviser, admin |
| GET | `/api/sars/:id/study-plan/versions` | adviser, admin, student (own) |

### Manual Testing Steps
1. Log in as `adviser` and open `/adviser/students`; verify list loads and search works.
2. Create a SAR using valid `@tip.edu.ph` email and verify new record appears in the table.
3. Attempt SAR creation with invalid student email domain and verify server-side validation message.
4. Open the new student's detail page and click "Generate Initial Study Plan".
5. Open plan view and verify courses are grouped by year/semester and match active curriculum structure.
6. Log in as `student` mapped to that SAR and open `/my-record`; verify read-only visibility.
7. As that same student, manually open another SAR URL and verify access is denied.

### Verification Checklist
- [x] Adviser can create a new SAR with valid `@tip.edu.ph` student email
- [x] SAR email is validated server-side
- [x] Adviser can generate initial study plan from active curriculum
- [x] Generated study plan courses match the curriculum structure exactly
- [x] Student can view their own SAR but cannot access other students'
- [x] StudyPlanView displays courses grouped by year level and semester

### Implementation Notes
- Added defensive SAR ownership checks using linked `userId`, plus email and student number fallback matching so existing student accounts can access `/my-record` when not yet linked.
- During verification, fixed study plan generation row-locking by removing lock usage from the `StudyPlan` existence query path that can conflict with joined reads in PostgreSQL.
- Kept `StudyPlanView` read-only per scope; no editing/regeneration UI from Phase 6 was started.

---

## Phase 6 — Grade Entry & Study Plan Regeneration

**Depends on:** Phase 5  
**Scope:** Backend + Frontend — entering transcript grades and regenerating the study plan

### Goal
Advisers enter grades into the active StudyPlanVersion. If any courses are unresolved (failed/dropped/incomplete), the system generates a new Study Plan Version that reschedules those courses while following all rules.

### Files to Create (Backend)

#### `backend/controllers/gradeController.js`
- `enterGrades(req, res)` — PUT `/sars/:id/study-plan/active-version/grades` — accepts an array of `{ studyPlanCourseId, grade, status }`, updates each `StudyPlanCourse` row. Only works if version is not archived or locked.
- `triggerRegeneration(req, res)` — POST `/sars/:id/study-plan/regenerate` — runs the regeneration algorithm, creates a new StudyPlanVersion (status: 'draft') with the optimally rescheduled courses. Returns the new version.

**Study Plan Regeneration Algorithm (inside `triggerRegeneration`):**
1. Fetch current active StudyPlanVersion with all StudyPlanCourses + Course details
2. Classify each course:
   - `passed`: grade 1.00–3.00
   - `dropped`: grade 4.00
   - `failed`: grade 5.00
   - `incomplete`: grade INC
   - `pending`: not yet taken / no grade
3. Fetch the curriculum's prerequisites and co-requisites
4. Build the new schedule using a slot-filling algorithm:
   - Passed courses are retained at their original year/semester (completed, no re-scheduling needed)
   - Unresolved courses (dropped, failed, incomplete) are re-queued for rescheduling
   - Pending courses that haven't been taken yet are also re-queued
   - Sort re-queued courses by year/semester order from the original curriculum
   - Assign each course to the earliest semester slot where:
     a. All prerequisites are in earlier semesters
     b. All co-requisites are in the same semester
     c. Total units for the semester does not exceed 25
   - Elective courses must come from the student's chosen Elective Track
5. Increment `versionNumber`, set `status='draft'`, link to `generatedByAdviserId`
6. Create all `StudyPlanCourse` rows for the new version
7. Return the new version with full course detail

#### `backend/routes/gradeRoutes.js`
Register grade entry and regeneration routes. Only `adviser` and `admin` access.

### Files to Create (Frontend)

#### `frontend/src/pages/adviser/GradeEntry.js`
- Opened for a specific SAR's active StudyPlanVersion
- Displays courses in a table with input fields for grade
- Grade input: number input (1.00–5.00 in 0.25 steps) OR select dropdown for INC / 4.00 / Pending
- "Save Grades" button calls `PUT .../active-version/grades`
- After saving, shows a summary: how many passed, failed, incomplete
- "Regenerate Study Plan" button (shown if any unresolved courses exist)

#### `frontend/src/pages/adviser/RegenerationReview.js`
- Accepts the new (draft) StudyPlanVersion returned by `triggerRegeneration`
- Displays the new plan as a semester-grid table (same layout as StudyPlanView)
- Shows diff indicators: courses that moved semester (rescheduled) are highlighted
- "Proceed to Validation" button → navigates to Phase 7 validation flow

### Files to Modify (Backend)

#### `backend/server.js`
```js
const gradeRoutes = require('./routes/gradeRoutes');
app.use('/api', gradeRoutes);
```

### Files to Modify (Frontend)

#### `frontend/src/pages/adviser/StudentDetail.js`
Add "Enter Grades" button → navigates to `GradeEntry` page for the active version.

#### `frontend/src/App.js`
```jsx
<Route path="/adviser/students/:sarId/grades" element={<PrivateRoute roles={['adviser', 'admin']}><GradeEntry /></PrivateRoute>} />
<Route path="/adviser/students/:sarId/plan/:versionId/review" element={<PrivateRoute roles={['adviser', 'admin']}><RegenerationReview /></PrivateRoute>} />
```

### API Endpoint Summary

| Method | Endpoint | Access |
|--------|----------|--------|
| PUT | `/api/sars/:id/study-plan/active-version/grades` | adviser, admin |
| POST | `/api/sars/:id/study-plan/regenerate` | adviser, admin |

### Algorithm Constraints (Enforced Server-Side)
1. Passed courses are never rescheduled
2. Unresolved courses are re-queued and moved to earliest valid slot
3. Prerequisites must appear in an earlier semester than the dependent course
4. Co-requisites must appear in the same semester
5. Max 25 units per semester
6. If a student's Elective Track is set, elective courses must come from that track

### Manual Testing Steps
1. Open `/adviser/students/:sarId/grades` for a student with an active plan and verify all plan courses are editable.
2. Enter a mixed set of grades (`2.00`, `5.00`, `INC`, `Pending`) and save; verify success and persisted values after reload.
3. Confirm unresolved courses trigger visibility of "Regenerate Study Plan" button.
4. Click regenerate and verify a new draft version is created and review page opens.
5. On review page, confirm moved courses are visually highlighted and unchanged courses are not.
6. Validate with a heavy test case that no semester exceeds 25 units.
7. Confirm prerequisite-dependent courses are not scheduled before their prerequisites in regenerated output.

### Verification Checklist
- [x] Adviser can enter grades for each course in the active version
- [x] Grade values are validated (only valid grade formats accepted)
- [x] If all courses passed, no regeneration is needed (UI shows "All courses passed" message)
- [x] If unresolved courses exist, regeneration produces a new draft version
- [x] Regenerated plan respects all algorithm constraints (prerequisites, co-reqs, 25-unit cap)
- [x] Regeneration review shows the new plan clearly before validation

### Implementation Notes
- Added `backend/controllers/gradeController.js` and `backend/routes/gradeRoutes.js` with two protected endpoints for adviser/admin: grade entry and study plan regeneration.
- Regeneration uses slot-filling with prerequisite ordering, co-requisite grouping, 25-unit cap per semester slot, passed-course retention, and elective-track filtering for elective courses.
- Since there is no explicit lock flag on `StudyPlanVersion` in the current schema, server-side edit blocking is enforced via archived-status checks.
- During verification, fixed PostgreSQL row-locking failures by removing `FOR UPDATE` locking on joined include queries (same issue pattern encountered in earlier phases).
- Frontend implementation added adviser-only Grade Entry and Regeneration Review pages, wired routes, and “Enter Grades” navigation from `StudentDetail`.
- Added bidirectional SAR ↔ student account auto-linking via `backend/utils/sarLinking.js` and controller hooks:
  - on student registration (`authController.register`)
  - on student login self-healing pass (`authController.login`)
  - on student number updates (`userController.updateStudentId` and `userController.updateUserStudentId`)
- Added SAR link visibility for adviser/admin workflows by exposing `isLinkedToAccount` and `linkStatus` in SAR responses and rendering link-status badges in:
  - `frontend/src/pages/adviser/StudentList.js`
  - `frontend/src/pages/adviser/StudentDetail.js`
- Adjusted `GradeEntry` post-save behavior so passed/failed/incomplete summary badges remain visible after data reload.

---

## Phase 7 — Study Plan Validation & Elective Track Enforcement

**Depends on:** Phase 6  
**Scope:** Backend + Frontend — advisers validate draft versions; elective track selection at 2nd year 2nd semester

### Goal
The adviser formally validates a draft StudyPlanVersion, making it the new active version. The previous active version is archived. If the student is at 2nd Year 2nd Semester and no Elective Track is selected, the adviser must select one before validation is allowed.

### Files to Create (Backend)

#### `backend/controllers/validationController.js`
- `validateVersion(req, res)` — PATCH `/sars/:id/study-plan/versions/:versionId/validate`
  1. Check `versionId` is in 'draft' status
  2. Check the SAR's year level — if 2nd year and current term is 2nd sem, check that `electiveTrackId` is set on the SAR
  3. If no track selected, return 400 with `{ code: 'ELECTIVE_TRACK_REQUIRED' }`
  4. Set the version `status='active'`, `validatedByAdviserId=req.user.id`, `validatedAt=Date.now()`, `needsRevalidation=false`
  5. Archive all previous 'active' versions for this study plan (set to 'archived')
  6. Return the updated version

- `selectElectiveTrack(req, res)` — PATCH `/sars/:id/elective-track`
  1. Validate that `electiveTrackId` exists and belongs to the SAR's curriculum
  2. Check that SAR does not already have an elective track (once set, it cannot be changed)
  3. Update `StudentAcademicRecord.electiveTrackId`
  4. Return the updated SAR

#### `backend/routes/validationRoutes.js`
Register routes. Only `adviser` and `admin`.

### Files to Create (Frontend)

#### `frontend/src/pages/adviser/ValidationFlow.js`
- Displayed before confirming validation of a draft version
- Shows the full draft plan (semester grid, same layout as StudyPlanView)
- If Elective Track is required and not yet set, shows `ElectiveTrackSelector` component
- "Validate Plan" button — calls `PATCH .../validate`
- On success, shows a success message and redirects to `StudentDetail`

#### `frontend/src/components/adviser/ElectiveTrackSelector.js`
- Dropdown list of available Elective Tracks from the SAR's curriculum
- Fetches from `GET /api/curriculums/:id/elective-tracks`
- On confirm, calls `PATCH /api/sars/:id/elective-track`
- Shows a warning: "Once selected, the elective track cannot be changed."

### Files to Modify (Backend)

#### `backend/server.js`
```js
const validationRoutes = require('./routes/validationRoutes');
app.use('/api', validationRoutes);
```

### Files to Modify (Frontend)

#### `frontend/src/pages/adviser/RegenerationReview.js`
"Proceed to Validation" navigates to `ValidationFlow`.

#### `frontend/src/pages/adviser/StudentDetail.js`
Show "Validate Draft" button if a draft version exists.

#### `frontend/src/App.js`
```jsx
<Route path="/adviser/students/:sarId/plan/:versionId/validate" element={<PrivateRoute roles={['adviser', 'admin']}><ValidationFlow /></PrivateRoute>} />
```

### API Endpoint Summary

| Method | Endpoint | Access |
|--------|----------|--------|
| PATCH | `/api/sars/:id/study-plan/versions/:versionId/validate` | adviser, admin |
| PATCH | `/api/sars/:id/elective-track` | adviser, admin |

### Business Rules (Enforced)
- Only one version can be 'active' at a time per StudyPlan — validation archives the previous one
- Elective Track is immutable once set
- Elective courses in future semesters (in the plan) must belong to the selected track (enforce in regeneration Phase 6, double-check here)
- A draft version must exist to validate — cannot validate an 'archived' or already 'active' version

### Manual Testing Steps
1. Open a student with a draft plan and go to the validation flow page.
2. Validate a draft plan and verify success redirect to student detail.
3. Refresh versions list and verify new version is `active` and prior active version is `archived`.
4. Use a 2nd year, 2nd semester student with no elective track and attempt validation; verify blocked with required-track message.
5. Select elective track, validate again, and verify success.
6. Attempt to change elective track after it is set; verify request is rejected.
7. Confirm track-constrained elective courses in the validated plan all belong to selected track.

### Verification Checklist
- [x] Adviser can validate a draft version
- [x] On validation, the previous active version becomes archived
- [x] If student is at 2nd Year 2nd Sem and no elective track selected, validation is blocked
- [x] Elective track selection is permanent (attempting to change returns 400)
- [x] After validation, the new version is shown as active in StudentDetail
- [x] Elective courses in the validated plan belong to the selected track

### Implementation Notes
- Added `backend/controllers/validationController.js` and `backend/routes/validationRoutes.js` for validation and elective-track selection workflows, mounted in `backend/server.js` under `/api`.
- During verification, fixed PostgreSQL row-locking issues by removing `FOR UPDATE` locking on nullable include joins in validation queries.
- Validation now enforces track membership for **future** elective courses only, and only for elective courses that are explicitly mapped in curriculum track definitions.
- Added frontend validation flow via `frontend/src/pages/adviser/ValidationFlow.js` and `frontend/src/components/adviser/ElectiveTrackSelector.js`, with route wiring in `frontend/src/App.js` and navigation updates in adviser pages.
- UX fix (browser walk): "Validate Plan" button now switches to `variant="secondary"` (gray) when disabled so its locked state is visually distinct from its enabled primary (blue) state.

---

## Phase 8 — Student-Facing Views & PDF Export

**Depends on:** Phase 7  
**Scope:** Backend + Frontend — student read-only access and PDF export

### Goal
Students can view their Student Academic Record and current Study Plan. Both students and advisers can export the SAR as a PDF. The PDF includes all required information per the spec.

### Files to Create (Backend)

#### `backend/controllers/exportController.js`
- `exportSARPDF(req, res)` — GET `/sars/:id/export/pdf`
  1. Verify requester is the student (ownership) or an adviser/admin
  2. Fetch full SAR: student info, curriculum, active StudyPlanVersion with all courses and grades, Elective Track, validating adviser, validation timestamp
  3. Generate PDF using `pdfkit` npm package
  4. Stream the PDF response with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="SAR-{studentNumber}.pdf"`
  
  PDF layout:
  - Header: School name / "Student Academic Record"
  - Section 1: Student Information (name, student number, email, year level)
  - Section 2: Curriculum Information (curriculum name)
  - Section 3: Selected Elective Track (if applicable)
  - Section 4: Study Plan table (Year/Semester grid, course code, name, units, grade, status)
  - Section 5: Validation info (validating adviser name, validation timestamp)
  - Footer: "Generated on: [timestamp]"

#### `backend/routes/exportRoutes.js`
Register the export route. Access: adviser, admin (any SAR), student (own SAR only).

### Files to Create (Frontend)

#### `frontend/src/pages/student/MyRecord.js`
- Student's read-only SAR view
- Displays: personal info, curriculum, elective track, active study plan as semester grid
- Shows grade and status for each course
- "Export as PDF" button → calls `GET /api/sars/:id/export/pdf` and triggers browser download

### Files to Modify (Backend)

#### Install `pdfkit`:
```bash
cd backend && npm install pdfkit
```

#### `backend/server.js`
```js
const exportRoutes = require('./routes/exportRoutes');
app.use('/api', exportRoutes);
```

### Files to Modify (Frontend)

#### `frontend/src/pages/adviser/StudentDetail.js`
Add "Export PDF" button for advisers — calls the pdf export endpoint.

#### `frontend/src/App.js`
```jsx
<Route path="/my-record" element={<PrivateRoute roles={['student']}><MyRecord /></PrivateRoute>} />
```

#### `frontend/src/pages/Dashboard.js`
Student role: "My Academic Record" card → `/my-record`

### API Endpoint Summary

| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/sars/:id/export/pdf` | student (own), adviser, admin |

### PDF Content Requirements (from spec)
- Student information
- Curriculum information
- Current Study Plan Version (courses, grades, statuses)
- Selected Elective Track
- Validating Student Adviser name
- Validation timestamp

### Manual Testing Steps
1. Log in as `student` and open `/my-record`; verify page is read-only and all sections render.
2. Click "Export as PDF" and verify browser downloads a PDF file with expected filename pattern.
3. Open PDF and confirm it contains student info, curriculum, active plan, grades/statuses, elective track, and validation metadata.
4. Log in as `adviser`, open a student detail page, and export PDF from adviser side.
5. Compare student-exported and adviser-exported PDF content for consistency.
6. Try exporting another student's record while logged in as student and verify access is denied.

### Verification Checklist
- [x] Student can view their academic record (read-only, no edit controls)
- [x] Student cannot see other students' records
- [x] PDF export includes all required sections per the spec
- [x] PDF downloads correctly in the browser
- [x] Adviser can also export the PDF from StudentDetail
- [x] PDF generation is tested with a populated SAR (at least one validated version)
- [x] `pdfkit` installed in backend dependencies

### Implementation Notes
- Added `backend/controllers/exportController.js` and `backend/routes/exportRoutes.js`, mounted via `backend/server.js`, with ownership enforcement for student exports and adviser/admin access for any SAR.
- Added student-only `frontend/src/pages/student/MyRecord.js` and wired `/my-record` in `frontend/src/App.js` to use the dedicated read-only record page.
- Added adviser/admin SAR export action in `frontend/src/pages/adviser/StudentDetail.js`.
- Verification used both browser checks (`/my-record`, adviser student detail export) and API checks (student own export = 200, student exporting another SAR = 403, PDF headers/content type/disposition validated).
- Populated-SAR PDF content verification was executed against an existing validated active SAR and inspected via `pdftotext` to confirm required sections and validation metadata.

---

## Phase 9 — Forecasting System

**Depends on:** Phase 4, Phase 7  
**Scope:** Backend + Frontend — course demand forecasting and semester transition

### Goal
The system analyzes active validated Study Plan Versions to count how many students will take each course in the current semester (actual demand) and the next semester (forecasted demand). When a term ends, a snapshot is stored. The Program Chair can view current and historical forecasts.

### Files to Create (Backend)

#### `backend/controllers/forecastController.js`
- `getCurrentDemand(req, res)` — GET `/forecast/current`
  1. Get the current academic term
  2. For all active StudyPlanVersions, find StudyPlanCourses scheduled at the current term's yearLevel equivalent semester
  3. Group by courseId, count students per course
  4. Return: `[{ courseId, courseCode, courseName, units, studentCount }]`
  
- `getNextSemesterForecast(req, res)` — GET `/forecast/next`
  1. Same logic, but for the next semester's slot (increment current semester, handle year rollover)
  2. Return demand predictions

- `getComparisonReport(req, res)` — GET `/forecast/comparison`
  1. Get current actual demand
  2. Get the most recent `ForecastSnapshot` for the previous term
  3. For each course, compute: `{ courseCode, courseName, forecastedDemand, actualDemand, difference }`
  4. Return the comparison array

- `getForecastHistory(req, res)` — GET `/forecast/history`
  1. Return all `ForecastSnapshot` records ordered by date descending
  2. Include triggering user name and school year/semester

- `storeForecastSnapshot(termId, userId)` — Internal utility function (not a route handler)
  1. Calls `getCurrentDemand` logic
  2. Stores result as a new `ForecastSnapshot` row
  3. Called by `termController.endCurrentTerm` and `termController.activateTerm`

#### `backend/routes/forecastRoutes.js`
All routes: `admin` and `adviser` access.

> **Update `termController.js`:** In `endCurrentTerm`, after setting `endedAt`, call `storeForecastSnapshot(termId, req.user.id)` to persist the snapshot before term closes.

### Files to Create (Frontend)

#### `frontend/src/pages/admin/ForecastDashboard.js`
Tabbed layout:
1. **Current Demand** — table listing all courses with student count for the current semester
2. **Next Semester Forecast** — table of predicted demand for the upcoming semester
3. **Comparison Report** — table with columns: Course Code | Course Name | Forecasted | Actual | Difference (with color coding: positive diff = green, negative = red)
4. **Forecast History** — timeline/list of past snapshots with click-to-expand detail

### Files to Modify (Backend)

#### `backend/server.js`
```js
const forecastRoutes = require('./routes/forecastRoutes');
app.use('/api/forecast', forecastRoutes);
```

#### `backend/controllers/termController.js`
In `endCurrentTerm`, import and call `storeForecastSnapshot`.

### Files to Modify (Frontend)

#### `frontend/src/App.js`
```jsx
<Route path="/admin/forecast" element={<PrivateRoute roles={['admin']}><ForecastDashboard /></PrivateRoute>} />
```

#### `frontend/src/pages/Dashboard.js`
Add "Forecasting" card/link for admin role.

### API Endpoint Summary

| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/forecast/current` | admin, adviser |
| GET | `/api/forecast/next` | admin, adviser |
| GET | `/api/forecast/comparison` | admin, adviser |
| GET | `/api/forecast/history` | admin, adviser |

### Demand Calculation Logic
- "Current semester demand" = count of students whose active StudyPlanVersion has a course scheduled at the semester corresponding to the current academic term, with status `pending` (meaning they are supposed to take it this term)
- "Next semester demand" = same, but for next semester slot
- Semester slot mapping: Identify courses by their `yearLevel` + `semester` in the student's plan, then figure out which absolute semester in the student's journey corresponds to the current term (this requires knowing the student's starting year and term, which may need to be added to SAR in a future iteration; for now, use the `yearLevel` field on the SAR + the course's assigned semester in the plan)

### Manual Testing Steps
1. Seed or prepare at least 3 students with active validated plans that share some overlapping courses.
2. Open `/admin/forecast` and verify all four tabs load: Current Demand, Next Forecast, Comparison, History.
3. In Current Demand tab, spot-check at least two courses by manually counting matching students from SAR plans.
4. End current term via Term Management and confirm a snapshot appears in Forecast History.
5. Activate next term and verify Next Forecast updates according to new context.
6. Open Comparison tab and verify `difference = actual - forecasted` for sample rows.
7. Attempt `/admin/forecast` as non-admin and verify route guard blocks page access.

### Verification Checklist
- [x] Current demand counts are accurate (verified against known test data)
- [x] Next semester forecast shows expected courses
- [x] Comparison report shows correct difference (actual minus previous forecast)
- [x] Snapshot is stored when a term ends
- [x] Forecast history lists all past snapshots with correct metadata
- [x] Forecasting dashboard is only accessible to admin

### Implementation Notes
- `ForecastSnapshot.snapshotData` now stores both `currentDemand` and `nextSemesterForecast` arrays so forecast history can show the full captured context and the comparison tab can compare current actual demand against the previous term's stored forecast.
- `activateTerm` stores a snapshot only for an outgoing still-active term when switching terms without an explicit end action; after an explicit `endCurrentTerm`, activating the next term does not create a duplicate snapshot for the closed term.
- Manual verification used three prepared Year 4 SARs with validated plans because curriculum `1` only has summer-slot courses in `Year 4`, which made the next-semester forecast and comparison rows observable in live data.

---

## Phase 10 — Auth & Access Control Refinements

**Depends on:** All previous phases  
**Scope:** Backend + Frontend — email domain enforcement, Program Chair first-login, ownership transfer, role-based guards audit

### Goal
Enforce all role-specific business rules from the spec that haven't been addressed yet:
- Email domain validation for student advisers (`.cpe@tip.edu.ph`)
- Email domain validation for students (`@tip.edu.ph`)
- Program Chair's initial forced password change
- Program Chair ownership transfer
- Full role-based access control audit across all pages and APIs

### Files to Modify (Backend)

#### `backend/controllers/authController.js`
**Email domain enforcement in `register`:**
- If role is `adviser`: email must end with `.cpe@tip.edu.ph`
- If role is `student` (public registration): email must end with `@tip.edu.ph` (note: `.cpe@tip.edu.ph` is a subset, so advisers registering as students should be blocked from the student registration path)
- If role is `admin`: only one admin can exist, and creation should be protected

**First-login forced credential change:**
Add `mustChangePassword` BOOLEAN field to `User` model (default `false`).
In `login`, if `user.mustChangePassword === true`, return a response with `{ mustChangePassword: true }` instead of a full token.
Add `changePassword(req, res)` route — PUT `/api/auth/change-password` — requires the old password for verification, sets new password, sets `mustChangePassword=false`.

**Program Chair ownership transfer:**
Add `transferOwnership(req, res)` — PATCH `/api/auth/transfer-ownership`:
1. Requester must be current `admin`
2. Target user (`targetUserId` in body) must exist and be an `adviser`
3. Change target user's `role` to `admin`
4. Change requester's `role` to `adviser`
5. Return success message

#### `backend/routes/authRoutes.js`
Add:
```js
router.put('/change-password', protect, changePassword);
router.patch('/transfer-ownership', protect, requireRole('admin'), transferOwnership);
```

### Files to Modify (Frontend)

#### `frontend/src/pages/Login.js`
After successful login, check if response includes `mustChangePassword: true`. If so, redirect to `/change-password` instead of dashboard.

#### `frontend/src/pages/ChangePassword.js` (Create new)
Form with fields: New Password, Confirm New Password.
Displays a warning: "You must change your password before continuing."
On submit, calls `PUT /api/auth/change-password`.
On success, re-fetches user and redirects to dashboard.

#### `frontend/src/pages/admin/TransferOwnership.js` (Create new)
- Lists all advisers
- "Transfer Ownership" button per adviser, with confirmation modal
- Warning: "This will permanently transfer Program Chair access to the selected adviser. You will become a Student Adviser."
- Calls `PATCH /api/auth/transfer-ownership`
- On success, logs out current user (since their role changed)

#### `frontend/src/App.js`
```jsx
<Route path="/change-password" element={<ChangePassword />} />
<Route path="/admin/transfer-ownership" element={<PrivateRoute roles={['admin']}><TransferOwnership /></PrivateRoute>} />
```

#### Audit pass — check all pages:
- `/admin/*` routes: only `admin` role
- `/adviser/*` routes: `adviser` and `admin` roles
- `/my-record`: only `student` role
- API controllers: verify `requireRole` is applied consistently

### API Endpoint Summary

| Method | Endpoint | Access |
|--------|----------|--------|
| PUT | `/api/auth/change-password` | authenticated users |
| PATCH | `/api/auth/transfer-ownership` | admin only |

### Manual Testing Steps
1. Attempt adviser registration with non-`.cpe@tip.edu.ph` email and verify rejection.
2. Attempt student registration with non-`@tip.edu.ph` email and verify rejection.
3. Set an admin user with `mustChangePassword=true`, log in, and verify forced redirect to `/change-password`.
4. Complete password change and verify normal dashboard access resumes.
5. Open `/admin/transfer-ownership`, transfer to an adviser, and confirm success.
6. Verify old admin is now adviser and cannot access admin-only pages.
7. Verify new admin can access `/admin/*` and old adviser-only pages still behave correctly for adviser/admin users.
8. Spot-check protected API endpoints in network tab to confirm `401/403` when role/user is unauthorized.

### Verification Checklist
- [x] Adviser registration fails if email doesn't end with `.cpe@tip.edu.ph`
- [x] Student registration fails if email doesn't end with `@tip.edu.ph`
- [x] Admin account with `mustChangePassword=true` is forced to change password on first login
- [x] Program Chair can transfer ownership to any adviser
- [x] After transfer, old admin becomes adviser and is logged out
- [x] All frontend routes enforce role-based access (no unauthorized page access)
- [x] All backend endpoints have correct `protect` + `requireRole` guards
- [x] Audit for any missing role guards across all controllers

### Implementation Notes
- Added `mustChangePassword` to `User` and implemented a short-lived password-change token (`purpose: 'password_change'`) so users flagged for first-login password reset can only access `/api/auth/change-password` until completion.
- Added admin-only `GET /api/users` route for the ownership transfer page to list eligible advisers.
- Manual verification ran against an isolated backend instance on port `5001` to avoid login-rate-limit state from an already-running local server on `5000`.

---

## General Implementation Notes (Apply to All Phases)

### Backend Conventions
- All timestamps use Unix milliseconds (BIGINT), consistent with the existing `User` model
- All routes follow RESTful conventions
- All controllers use try/catch and call `next(err)` for unhandled errors
- Validation errors return `400`, auth errors `401`, forbidden `403`, not found `404`
- Add `sequelize: { timestamps: false }` to all new models (handle timestamps manually)

### Frontend Conventions
- Use the existing `api` utility from `frontend/src/utils/api.js` for all HTTP calls (it handles the auth token)
- All new pages import `useAuth` from `AuthContext` for user/role info
- Show loading state for async operations
- Handle errors by displaying a user-friendly message (not a raw error object)
- Role checks in UI should mirror backend role checks (defense in depth)

### Sequelize Sync Behavior
- In development, `{ alter: { drop: false } }` is used — **adding new columns is safe**, but renaming or removing columns must be done manually via SQL or a migration
- After creating new models, the next `npm run dev` startup will auto-create the tables

### Testing Each Phase
After each phase, manually test using the browser and network tab, or use a tool like Postman/Thunder Client for API endpoints. There is no automated test suite in the current codebase.

---

*Last updated: Phases 1, 2, 3, 4, 5, 6, 7, 8, 9, and 10 complete; Phase 10 auth/access control refinements (role-specific registration domains, forced admin first-login password change flow, ownership transfer backend/frontend, route/API guard audit, and manual/API/build verification) implemented and verified.*
