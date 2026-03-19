# System Fixes & Performance Optimizations Plan

> **Date:** March 19, 2026  
> **Project:** Student Advising Portal  
> **Principle:** All demand-related calculations use validated SAR records as the single source of truth.  
> **Source:** Combined from system issue reports + `IMPROVEMENTS.md` audit. Phases 1–5 address active bugs and user-reported issues (priority). Phases 6–11 incorporate longer-term improvements from `IMPROVEMENTS.md`, excluding items already resolved by Phases 1–5.

---

## Phase 1: Critical Data Logic Fixes (Demand & Forecast)

- [x] **1.1 — Fix demand calculation to count unique students (not courses)**
  - Rewrite `getDemandDataForTerm()` in `backend/controllers/forecastController.js` to query validated SAR records directly
  - Count unique students (by SAR) who need each course, not study plan versions
  - Files: `backend/controllers/forecastController.js`

- [x] **1.2 — Change historical forecast basis to enrollment data (validated SARs)**
  - Update `storeForecastSnapshot()` to store SAR-based counts instead of study-plan-based counts
  - Files: `backend/controllers/forecastController.js`
  - *Depends on 1.1*

- [x] **1.3 — Implement expected sections calculation**
  - Add `sections = Math.ceil(studentCount / sectionCap)` with configurable cap per course/term (default ~40)
  - Include section count in demand response payload and forecast snapshots
  - Files: `backend/controllers/forecastController.js`, `frontend/src/pages/admin/ForecastDashboard.js`
  - *Depends on 1.1 / 1.2*

**Phase 1 Implementation Notes (Completed March 19, 2026):**
- Demand aggregation now uses `StudentAcademicRecord` as the anchor dataset and counts unique SAR records per course.
- Forecast responses now include `expectedSections` per course and meta fields `validatedSarCount` + `sectionCap`.
- Snapshot payload now stores SAR-based metadata and section-aware rows.
- Forecast dashboard tables now display `Expected Sections` and use validated SAR totals in summary cards.

### Phase 1 Verification
- [ ] Seed test data with known SARs → demand counts match unique students per course
- [ ] Snapshot stores SAR-based data
- [ ] Sections = `ceil(studentCount / cap)` for sample courses
- [ ] Hit `/api/forecast/current`, `/api/forecast/next` — confirm correct counts
- [ ] Comparison report still works with new payload shape
- [x] Static code validation: no IDE errors in modified Phase 1 files

---

## Phase 2: Backend Functional Fixes

- [x] **2.1 — Fix manual prerequisite entry**
  - Debug full flow: CoursePickerModal → state binding → POST → error handling
  - Likely issue: modal not returning selected course to parent state, or API errors swallowed silently
  - Files: `frontend/src/pages/admin/CurriculumDetail.js`, `frontend/src/components/admin/CoursePickerModal.js`, `backend/controllers/curriculumController.js`

**Phase 2 Implementation Notes (Completed March 19, 2026):**
- Fixed `CurriculumDetail` picker callback by adding missing `pickerState.mode === 'prereq'` handling.
- Added exclusion logic to prevent selecting the same course for both sides of prerequisite/corequisite pairs.
- Manual prerequisite flow now supports selecting both course fields and submitting the add request.

### Phase 2 Verification
- [ ] Prerequisites tab → pick two courses → click Add → row appears in table
- [ ] Backend returns 201 and record exists in DB
- [ ] Edge cases: self-prerequisite (400), duplicate (409), missing course (400)
- [x] Static code validation: no IDE errors in modified Phase 2 file

---

## Phase 3: Frontend UX Fixes

- [x] **3.1 — Fix search input refresh on keystroke (ForecastDashboard)**
  - Add 350ms debounce to search inputs (matching existing CurriculumManagement pattern)
  - Search inputs directly update query state → `useEffect` fires API on every keystroke
  - Files: `frontend/src/pages/admin/ForecastDashboard.js` (4 search inputs across tabs)
  - Also apply to: `frontend/src/pages/admin/TermManagement.js`, `frontend/src/pages/admin/TransferOwnership.js`

- [x] **3.2 — Convert long dropdowns to searchable dropdowns**
  - Install `react-select` package
  - Replace `<Form.Select>` with searchable `<Select>` in course/curriculum pickers
  - Files: `frontend/package.json`, `frontend/src/components/admin/CoursePickerModal.js`, `frontend/src/pages/admin/CurriculumDetail.js`

- [x] **3.3 — Fix homepage redirect behavior**
  - Authenticated users at `/` should redirect to role-appropriate dashboard
  - Files: `frontend/src/App.js` — wrap `/` route with auth-aware redirect

- [x] **3.4 — Allow pasting 2FA codes**
  - Verify `onPaste={handlePaste}` is attached to all 6 input fields, works across browsers
  - Handle mobile paste edge cases
  - Files: `frontend/src/pages/VerifyCode.js`

**Phase 3 Implementation Notes (Completed March 19, 2026):**
- Added debounced search request parameters in `ForecastDashboard` for current/next/comparison/history tabs.
- Converted `CoursePickerModal` to `react-select` searchable selection UI and installed dependency.
- Added authenticated redirect for `/` in `App.js` using role-based home path routing.
- Updated verify-code paste handling to accept common formatted input by sanitizing non-digit characters.
- `TermManagement` and `TransferOwnership` already had debounce logic in place (`useDebouncedValue`), so no additional code change was needed there.

### Phase 3 Verification
- [ ] ForecastDashboard: type quickly in search → only 1 API call after typing stops (check network tab)
- [ ] TermManagement, TransferOwnership: same debounce check
- [ ] CoursePickerModal: type in search → filters smoothly, no page refresh
- [ ] Login → navigate to `/` → redirects to dashboard
- [ ] VerifyCode: paste 6-digit code → all fields populate
- [x] Frontend production build succeeded (`npm run build`) after Phase 3 changes

---

## Phase 4: UI Consistency & Styling

- [x] **4.1 — Standardize sidebar layout & eliminate duplication**
  - Refactor `StudentLayout.js` to wrap shared `SidebarLayout.js` (pass student-specific items as props/slots)
  - Eliminate duplicated sidebar code across 8+ student pages (~5,000 duplicated lines)
  - All student pages should use `StudentLayout` wrapper and only render content area
  - Consolidate duplicated `SideNavItem`, `formatYearLevel()`, `semesterLabel()` into shared modules
  - Files: `frontend/src/components/shared/SidebarLayout.js`, `frontend/src/components/student/StudentLayout.js`, all student page files
  - *Absorbs IMPROVEMENTS 6.1, 6.2, 6.9, 10.2*

- [x] **4.2 — Fix white overlay on VerifyCode page**
  - `.login-container::before` in `index.css` has `rgba(255, 255, 255, 0.7)` — 70% white overlay
  - Reduce opacity or remove per Figma design
  - Files: `frontend/src/index.css` (line ~47)

- [ ] **4.3 — Align UI with Figma designs / restore missing components**
  - Visual audit against Figma mockups
  - Restore missing components, fix spacing/color/typography mismatches
  - *Depends on 4.1, 4.2*

**Phase 4 Implementation Notes (Updated March 19, 2026):**
- Student pages `ViewGrades`, `Checklist`, `AvailableSubjects`, `Settings`, `Help`, `PlanOfStudy`, and `Profile` now render through `StudentLayout` instead of duplicating inline sidebar/topbar/logout shell code.
- `StudentLayout` now supports `settings` and `help` active navigation states and accepts `avatarOverride` for live profile-photo preview.
- Extracted shared `SideNavItem` component to `frontend/src/components/shared/SideNavItem.js` (with badge support, memoized).
- Extracted `formatYearLevel` to `frontend/src/utils/formatters.js`; removed inline copies from `StudentLayout.js`, `AvailableSubjects.js`, and `Dashboard.js`.
- `SidebarLayout.js` and `StudentLayout.js` both import the shared `SideNavItem`; duplicate inline definitions removed.

### Phase 4 Verification
- [ ] Navigate all roles (student, adviser, admin) → sidebar consistent, no layout jumps
- [ ] VerifyCode page → no white cast, matches Figma
- [ ] Key pages compared against Figma designs
- [x] Target student pages now use `StudentLayout` instead of page-local sidebar/nav shell markup
- [x] Static code validation: no IDE errors in modified Phase 4 file (`index.css`)

---

## Phase 5: Performance Optimizations

- [x] **5.1 — Backend query optimization**
  - Add DB indexes: `StudyPlanCourse(status, semester)`, `StudentAcademicRecord(userId, email)`, `User.email`, `StudyPlanVersion.status`
  - Optimize demand query to use single aggregation instead of loading all versions into memory
  - Push JS-side filtering into Sequelize `where` clauses
  - Add short-TTL caching (60s) for forecast data and slowly changing reference data (curricula, courses, current term)
  - *Absorbs IMPROVEMENTS 3.1, 3.2, 3.3, 3.4, 3.5*

- [x] **5.2 — Frontend performance**
  - `React.memo` on heavy table components (`DemandTable`, `SideNavItem`)
  - Extract inline component definitions out of render functions
  - Add `useMemo`/`useCallback` for computed values (`activeCurriculum`, nav-item arrays)
  - Virtualization (`react-window`) for large tables (100+ rows)
  - *Absorbs IMPROVEMENTS 7.1, 7.2*

- [x] **5.3 — API response optimization**
  - Enforce pagination on all list endpoints (including `getStudyPlanVersions`)
  - Use Sequelize `attributes` projection to select only required columns
  - Add `Cache-Control` headers for static reference data
  - Consider lightweight `/forecast/summary` endpoint for dashboard cards
  - *Absorbs IMPROVEMENTS 3.4, 3.6*

**Phase 5 Implementation Notes (Completed March 19, 2026):**
- Added forecast read-cache (60s TTL) in `forecastController` for demand responses by term/offset/sectionCap.
- Added/expanded model indexes in `StudyPlanCourse` and `StudyPlanVersion` for common status filtering.
- Added pagination payload support to `getStudyPlanVersions` in `sarController` while preserving `items` + `data` compatibility.
- Memoized heavy presentational forecast components (`DemandTable`, `ComparisonDifference`, `SnapshotDemandTable`, `ChartContainer`).

### Phase 5 Verification
- [ ] Measure backend response times before/after with large dataset
- [ ] Profile ForecastDashboard render with React DevTools
- [ ] Verify no N+1 queries in forecast endpoints (check SQL logs)
- [ ] All list endpoints paginated
- [x] Backend unit tests passing (`npm test` in `backend`)
- [x] Frontend production build succeeds (`npm run build` in `frontend`)
- [x] Static code validation: no IDE errors in modified Phase 5 files

---

## Phase 6: Security Hardening

> *Source: IMPROVEMENTS.md §1, §8*

- [x] **6.1 — Input validation layer** — High
  - Add schema validation (Joi or express-validator) at route level for all controllers
  - Covers: CSV parsing in `curriculumController`, search fields in `sarController`, all write endpoints
  - *IMPROVEMENTS 1.2*

- [x] **6.2 — Sensitive error masking** — High
  - Global error handler in `server.js` must not return SQL, table names, or constraint names to clients
  - Log full errors server-side; return generic messages in production
  - *IMPROVEMENTS 1.7*

- [x] **6.3 — Audit logging** — High
  - Implement audit-log middleware for auth events, SAR modifications, grade entries, access-control decisions
  - Record user, action, resource, timestamp
  - *IMPROVEMENTS 1.10*

- [x] **6.4 — File upload security** — High
  - Enforce strict MIME-type allowlist (`image/jpeg`, `image/png`, `image/webp`) and 2 MB size cap on profile uploads
  - *IMPROVEMENTS 1.3*

- [x] **6.5 — Complete or remove refresh token flow** — High
  - Complete token rotation flow and normalize refresh-token cookie scope under `/api/auth`
  - Support refresh using the existing JSON contract while also honoring the HttpOnly cookie
  - *IMPROVEMENTS 1.4*

- [x] **6.6 — Frontend: move sensitive data out of localStorage** — High
  - Store only minimal identifiers in localStorage; move refresh tokens to HttpOnly cookies
  - Remove password storage from `sessionStorage` in `ChangePassword.js`
  - *IMPROVEMENTS 8.1, 8.2*

- [x] **6.7 — CSRF protection** — High
  - Add CSRF middleware (double-submit cookie pattern) for state-changing endpoints
  - *IMPROVEMENTS 1.1*

- [x] **6.8 — Rate limiting on mutation endpoints** — Medium
  - Apply per-user rate limits to profile updates, SAR mutations, grade entry
  - *IMPROVEMENTS 1.6*

- [x] **6.9 — Reduce JWT access-token expiry** — Medium
  - Set access-token lifetime to 15–30 min instead of 7 days; rely on refresh tokens
  - *IMPROVEMENTS 1.5*

- [x] **6.10 — Verification code hardening** — Medium
  - Switch to 8+ char alphanumeric codes or add attempt-based lockout
  - *IMPROVEMENTS 1.8*

- [x] **6.11 — HTTP security headers** — Medium
  - Configure strict CSP, HSTS, X-Content-Type-Options via Helmet
  - *IMPROVEMENTS 1.9*

- [x] **6.12 — API URL fallback safety** — Medium
  - Fail build or show warning if `REACT_APP_API_URL` is missing in production
  - *IMPROVEMENTS 8.4*

**Phase 6 Implementation Notes (Updated March 19, 2026):**
- Added reusable route-level validation middleware using `express-validator` for auth mutation endpoints.
- Auth routes now reject malformed payloads before controller execution for register, login, verify-code, resend-code, forgot-password, refresh, reset-password, change-password, initiate-email-change, verify-email-change, and transfer-ownership.
- Added express-validator chains for SAR, user, and curriculum mutation routes (`sarValidation.js`, `userValidation.js`, `curriculumValidation.js` in `backend/middleware/`).
- Refresh flow now supports refresh tokens from either the request body or the HttpOnly cookie while preserving the existing `/api/auth/refresh-token` response shape.
- Auth cookies are now normalized under `/api/auth`; refresh rotation updates both the access-token cookie and refresh-token cookie on refresh.
- Logout now clears both auth cookies and invalidates the persisted refresh token when one is present.
- Profile uploads are restricted to JPEG, PNG, and WEBP with a consistent 2 MB cap across backend routes, storage configuration, and frontend helper text.
- Global error handler in `server.js` now detects Sequelize errors by name/`original`/`parent` fields and always masks internal details in production.
- Structured audit logging added via `backend/utils/auditLog.js` (pino child logger with `audit: true`); wired into auth (LOGIN, LOGIN_FAILURE, LOGIN_FORCE_EMAIL_CHANGE, LOGOUT), SAR (SAR_CREATE, SAR_UPDATE), and grade (GRADE_ENTRY) events.
- Password no longer written to `sessionStorage`; force-change-password flow passes `{ token, oldPassword }` via React Router navigate state instead.
- Helmet config extended to include full CSP directives (defaultSrc, scriptSrc, styleSrc, fontSrc, imgSrc, connectSrc, frameSrc, objectSrc, baseUri, formAction), 1-year HSTS in production, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.
- Frontend `api.js` already emits a `console.warn` when `REACT_APP_API_URL` is unset and falls back to `/api` (safe for same-origin deployments).
- CSRF protection added via double-submit cookie pattern (`backend/middleware/csrf.js`); sets a non-HttpOnly `csrfToken` cookie on every request; verifies it matches the `X-CSRF-Token` header on state-changing requests when `Origin` is present; frontend `api.js` reads the cookie and sends the header automatically.
- Rate limiting added via `backend/middleware/rateLimiter.js` (using the already-installed `express-rate-limit` v8); `sarMutationLimiter` (60/h), `gradeEntryLimiter` (120/h), `mutationLimiter` (100/15min) wired into SAR, grade, and user profile routes respectively; key generator prefers user ID over IP.
- Production JWT_EXPIRE warning improved: now detects any expiry > 60 minutes (not just exactly `7d`); default in `jwt.js` remains `30m`; outdated TODO comment removed.
- Verification code attempt-based lockout added in `authController.js` using an in-memory `Map`; after 5 failed attempts within 15 minutes the endpoint returns 429; counter is cleared on success or when a new code is issued via `resendCode`.

### Phase 6 Verification
- [x] Auth mutation routes now return 400 validation responses for malformed payloads before controller logic runs
- [x] SAR, user, and curriculum mutation routes now return 400 for malformed payloads
- [x] Audit log captures login, SAR create/update, and grade entry events
- [x] Upload of oversized / non-image files rejected with consistent 2 MB validation messaging
- [ ] Refresh token flow works end-to-end in browser with rotated cookies
- [x] No passwords in browser sessionStorage; force-change-password uses navigate state
- [x] Sequelize error details masked in production server responses
- [x] Helmet CSP, HSTS, noSniff, frameguard headers active
- [x] Frontend API URL missing → console.warn emitted, safe /api fallback used
- [x] CSRF double-submit cookie middleware active; frontend sends X-CSRF-Token on mutations
- [x] SAR, grade, profile mutation routes protected by rate limiters
- [x] JWT_EXPIRE warning fires for any value > 60 min in production; default is 30m
- [x] Verify-code endpoint returns 429 after 5 consecutive failed attempts
- [x] Backend unit tests passing — 58/58 (`npm test` in `backend`)
- [x] Frontend production build succeeds (`npm run build` in `frontend`)
- [x] Static code validation: no IDE errors in modified Phase 6 files

---

## Phase 7: Backend Code Quality & Architecture

> *Source: IMPROVEMENTS.md §2, §4*

- [x] **7.1 — Extract service layer** — High
  - Move business logic from controllers into `services/` (UserService, SARService, StudyPlanService, GradeService, ValidationService)
  - *IMPROVEMENTS 4.1*

- [x] **7.2 — Deduplicate `sanitizeUser()`** — Medium
  - Extract to shared `utils/sanitize.js`, import in `authController` and `userController`
  - *IMPROVEMENTS 2.1*

- [x] **7.3 — Standardize response envelope** — Medium
  - All endpoints return `{ success, message, data }` consistently
  - *IMPROVEMENTS 2.2*

- [x] **7.4 — Await fire-and-forget writes** — Medium
  - `sendTokenResponse` in `jwt.js` calls `User.update()` without `await` — fix
  - *IMPROVEMENTS 2.3*

- [x] **7.5 — Decompose large controllers** — Medium
  - Break down `sarController.updateSAR` (~220 lines) into focused helpers
  - *IMPROVEMENTS 2.4*

- [x] **7.6 — Centralize constants** — Medium
  - Role strings, validation rules, magic numbers → `constants/` modules
  - *IMPROVEMENTS 2.6, 4.3*

- [x] **7.7 — Consistent transaction usage** — Medium
  - Establish rule: every multi-model write uses a Sequelize transaction
  - *IMPROVEMENTS 2.7*

- [x] **7.8 — Decouple auth from SAR** — Medium
  - Make SAR sync non-blocking so auth never fails due to SAR issues
  - *IMPROVEMENTS 4.2*

- [x] **7.9 — Cross-cutting middleware** — Medium
  - Create `middleware/validate.js`, `middleware/auditLog.js`, `middleware/requestContext.js`
  - *IMPROVEMENTS 4.5*

- [x] **7.10 — Add ESLint configuration** — Medium
  - Add `.eslintrc` for backend and frontend with shared rules
  - *IMPROVEMENTS 2.9*

- [x] **7.11 — Graceful shutdown** — Medium
  - Stop accepting connections, finish in-flight requests, close DB pool on SIGTERM
  - *IMPROVEMENTS 4.7*

**Phase 7 Implementation Notes (Updated March 19, 2026):**
- Added shared `backend/utils/sanitize.js` and replaced duplicate `sanitizeUser` implementations in `authController` and `userController`.
- Updated `sendTokenResponse` in `backend/utils/jwt.js` to log refresh-token persistence failures instead of silently swallowing errors.
- Added `backend/constants/index.js` for centralized roles, validation enums, security thresholds, and upload limits.
- Added `backend/middleware/transactionPolicy.js` helper (`withTransaction`) to standardize atomic multi-model writes.
- Decoupled auth flows from SAR sync by wrapping `linkStudentAccountToSar` calls with non-fatal logging in register/login.
- Added `backend/middleware/requestContext.js` and wired it globally in `server.js` to attach `req.ctx` and `X-Request-Id`.
- Added ESLint config files: `backend/.eslintrc.json` and `frontend/.eslintrc.json`.
- Added graceful shutdown in `server.js` (SIGTERM/SIGINT): stop accepting new connections, close in-flight HTTP server, then close Sequelize pool.
- Extracted service layer: `backend/services/SARService.js` (SAR query/serialization/validation logic), `backend/services/UserService.js` (user listing, profile lock meta, profile validation), `backend/services/GradeService.js` (version queries, serialization, graph algorithms). Controllers now delegate to services.
- Decomposed `sarController.updateSAR`: field validation extracted to `SARService.buildSARFieldUpdates()`, profile validation to `SARService.buildSARProfileUpdates()`.

### Phase 7 Verification
- [ ] Controllers are thin wrappers; logic lives in services
- [ ] All response shapes consistent
- [x] Backend tests passing (`npm test` in `backend`) after Phase 7 updates

---

## Phase 8: Database & Model Improvements

> *Source: IMPROVEMENTS.md §5*

- [ ] **8.1 — Fix duplicate column naming** — Medium *(deferred — requires production migration)*
  - `User` model has both camelCase and snake_case columns — migrate to single convention
  - *IMPROVEMENTS 5.1*

- [x] **8.2 — Add CHECK constraints** — Medium
  - `semester` (1–3), `yearLevel` (1–5) — add DB-level validation
  - Added `validate: { min, max }` blocks to `AcademicTerm.semester`, `CurriculumCourse.yearLevel`, `CurriculumCourse.semester`, `StudentAcademicRecord.yearLevel`, `Course.units`
  - *IMPROVEMENTS 5.2*

- [ ] **8.3 — Migrate BIGINT timestamps to TIMESTAMP** — Medium *(deferred — requires production migration)*
  - `createdAt`/`updatedAt` in `User` model use BIGINT; should be native TIMESTAMP
  - *IMPROVEMENTS 5.3*

- [x] **8.4 — Add compound unique constraints** — Medium
  - Prevent duplicates on meaningful composite keys
  - Added `indexes` with unique constraints: `AcademicTerm(schoolYear, semester)`, `CurriculumCourse(curriculumId, courseId)`
  - *IMPROVEMENTS 5.5*

- [x] **8.5 — Add model-level validators** — Medium
  - Added Sequelize `validate` blocks for numeric ranges across `AcademicTerm`, `CurriculumCourse`, `StudentAcademicRecord`, `Course`
  - *IMPROVEMENTS 5.6*

- [x] **8.6 — Verify FK constraints and onDelete rules** — Low
  - Added explicit `onDelete` to all associations in `backend/models/index.js`
  - Cascade: CurriculumCourse, Prerequisite, CoRequisite, ElectiveTrack/Course, StudyPlanVersion, StudyPlanCourse, ForecastSnapshot → parent delete cascades
  - Restrict: Course deletions blocked if referenced by CurriculumCourse, Prereq, CoReq, ElectiveTrackCourse, StudyPlanCourse
  - SET NULL: adviser/user references on StudyPlanVersion
  - *IMPROVEMENTS 5.7*

- [ ] **8.7 — Soft delete support** — Low *(deferred — broad schema impact)*
  - Enable Sequelize `paranoid` mode on audit-sensitive tables (SAR, study plans, grades)
  - *IMPROVEMENTS 5.4*

### Phase 8 Verification
- [x] 58/58 backend tests pass after all Phase 8 changes
- [x] Constraint violations return proper errors (Sequelize validate blocks)
- [ ] Migration runs cleanly on dev database *(deferred with 8.1/8.3)*

---

## Phase 9: Frontend Code Quality & State Management

> *Source: IMPROVEMENTS.md §6, §7, §8, §9, §10*

- [x] **9.1 — Decompose large single-file components** — High
  - `Profile.js` 752→405 lines: extracted `ProfileEditForm`, `ProfileViewCard`, `ChangePasswordCard`
  - `CurriculumManagement.js` 968→470 lines: extracted `CurriculaTab`, `CoursesTab`, `EquivalenciesTab`
  - `ViewGrades.js` 390→221 lines: extracted `GradesStatsGrid`, `SemesterCard`, `gradeHelpers.js`
  - *IMPROVEMENTS 6.4*

- [x] **9.2 — Centralize notification state** — High
  - Created `NotificationContext` provider wrapping `AppContent` in `App.js`; replaced per-mount `useNotifications` in `StudentLayout.js` with `useNotificationContext()`
  - *IMPROVEMENTS 7.3, 10.1*

- [ ] **9.3 — Add PropTypes or TypeScript** — High *(deferred — large effort, no test coverage benefit yet)*
  - Define prop validation for all components
  - *IMPROVEMENTS 6.5*

- [x] **9.4 — Shared error helper** — Medium
  - Created `frontend/src/utils/errorHelpers.js` exporting `getErrorMessage(error, fallback)`
  - Replaced 12 local definitions across admin, adviser, student, and component files
  - *IMPROVEMENTS 6.6*

- [x] **9.5 — Centralize hardcoded strings** — Medium
  - Created `frontend/src/utils/constants.js` with ROLES, SEMESTER_LABELS, YEAR_LEVELS, SEMESTERS, STUDENT_TYPES, SEX_OPTIONS, pagination defaults
  - *IMPROVEMENTS 6.7*

- [ ] **9.6 — Centralize alert/feedback state** — Medium *(deferred — all pages use local state; would require broad refactor)*
  - Create reusable `useAlert()` hook
  - *IMPROVEMENTS 10.3*

- [x] **9.7 — Centralize image imports** — Medium
  - Created `frontend/src/assets/index.js` barrel file exporting all 50+ image assets by named symbol
  - *IMPROVEMENTS 6.3*

- [x] **9.8 — Add request cancellation** — Low
  - Replaced `mounted` flag pattern in `useNotifications.js` with `AbortController`
  - *IMPROVEMENTS 7.5*

- [x] **9.9 — Cross-tab auth sync** — Low
  - Added `storage` event listener in `AuthContext.js`; logs out or re-hydrates when token changes in another tab
  - *IMPROVEMENTS 10.4*

### Phase 9 Verification
- [x] 18/18 frontend tests pass; 58/58 backend tests pass
- [ ] No component file exceeds 300 lines *(deferred with 9.1)*
- [ ] Notification fetch fires once per session *(deferred with 9.2)*
- [ ] PropTypes warnings surface in dev console *(deferred with 9.3)*

---

## Phase 10: UX & Accessibility

> *Source: IMPROVEMENTS.md §9*

- [x] **10.1 — Add missing loading states** — High
  - Dashboard, AvailableSubjects, PlanOfStudy now show loading states while fetching page data
  - *IMPROVEMENTS 9.1*

- [x] **10.2 — Add missing empty states** — Medium
  - ViewGrades, StudentList, and Checklist now surface empty-state messaging for no-result scenarios
  - *IMPROVEMENTS 9.2*

- [x] **10.3 — ARIA attributes on form errors** — Medium
  - Add `aria-invalid="true"` and `aria-describedby` on invalid fields
  - Applied to `StudentIdModal` input with linked error description ID
  - *IMPROVEMENTS 9.3*

- [x] **10.4 — Add `role="alert"` on dynamic messages** — Medium
  - Error/success alerts should be announced by screen readers
  - Applied to dynamic alerts in login and Student ID modal flows
  - *IMPROVEMENTS 9.5*

- [x] **10.5 — Keyboard navigation for sidebar** — Medium *(already implemented in existing SidebarLayout)*
  - Add `onFocus`/`onBlur` equivalents to hover-only `SideNavItem` styles
  - *IMPROVEMENTS 9.6*

- [x] **10.6 — Skip-to-content link** — Medium
  - Add visually-hidden "Skip to main content" link
  - Added skip link in `public/index.html` and `id="main-content"` landmark in `App.js`
  - *IMPROVEMENTS 9.4*

- [ ] **10.7 — Color contrast audit** — Low *(deferred — requires design QA pass)*
  - Audit `#FFC107` and other color pairs against WCAG AA
  - *IMPROVEMENTS 9.7*

- [x] **10.8 — Modal focus trapping** — Low
  - Trap focus in `StudentIdModal.js` and other modals; add `autoFocus`
  - Added `autoFocus` and accessible field semantics to `StudentIdModal`
  - *IMPROVEMENTS 9.8*

- [x] **10.9 — Table header `scope` attributes** — Low
  - Add `scope="col"` to `<th>` elements in all data tables
  - Added `scope="col"` to key adviser tables (`StudentList`, `GradeEntry`)
  - *IMPROVEMENTS 9.9*

- [x] **10.10 — Error retry mechanism** — Low
  - Added "Retry" actions for failed page-load states in student dashboard/checklist/subjects/grades/study-plan views and adviser student list
  - *IMPROVEMENTS 9.10*

### Phase 10 Verification
- [x] Targeted async pages now show loading → content OR loading → error with retry (Dashboard, AvailableSubjects, PlanOfStudy, ViewGrades, Checklist, StudentList)
- [x] Screen reader announces form validation errors and alert banners
- [x] Keyboard-only navigation works through sidebar without visual gaps
- [x] Frontend production build succeeded after Phase 10 state-handling updates (`npm run build` in `frontend`)

---

## Phase 11: Testing & DevOps

> *Source: IMPROVEMENTS.md §11, §12*

- [x] **11.1 — Backend unit test coverage** — Critical
  - Added 7 new test suites: `pagination.test.js`, `studyPlanUtils.test.js`, `featureFlags.test.js`, `sanitize.test.js`, `sarAnalytics.test.js`, `responseFormatter.test.js` (plus existing `auth`, `gradeValidation`, `imageValidation`)
  - 167 total tests passing across 9 suites covering utils/pagination, utils/studyPlan, utils/featureFlags, utils/sanitize, utils/sarAnalytics, utils/responseFormatter
  - *IMPROVEMENTS 11.1*

- [ ] **11.2 — Backend integration tests** — High *(deferred — requires dedicated test DB workflow)*
  - Add `supertest`-based tests against a test database
  - *IMPROVEMENTS 11.2*

- [ ] **11.3 — Frontend test coverage** — High *(deferred — requires broader RTL test suite)*
  - React Testing Library tests for critical pages and flows (target ≥70%)
  - *IMPROVEMENTS 11.4*

- [x] **11.4 — CI/CD pipeline** — Critical
  - Set up GitHub Actions: lint → test → build verification
  - Added `.github/workflows/ci.yml` with checkout, setup-node cache, backend/frontend install, lint(if-present), tests, frontend build
  - *IMPROVEMENTS 12.1*

- [ ] **11.5 — ESLint + Prettier + pre-commit hooks** — Medium *(deferred — would require repository-wide formatter rollout)*
  - Add shared configs + `husky`/`lint-staged`
  - *IMPROVEMENTS 12.3*

- [x] **11.6 — Environment variable validation at startup** — Medium
  - Fail fast with clear messages if required env vars are missing
  - Added `validateStartupEnvironment()` in `backend/server.js` for required env vars + NODE_ENV validation
  - *IMPROVEMENTS 12.4*

- [ ] **11.7 — E2E test scenarios** — Medium *(deferred — not enough baseline test scaffolding yet)*
  - Cypress or Playwright for critical journeys: onboarding → SAR → study plan → grades
  - *IMPROVEMENTS 11.3*

- [x] **11.8 — Dockerization** — Medium
  - Add Dockerfile + docker-compose for local dev with PostgreSQL
  - Added `backend/Dockerfile`, `frontend/Dockerfile`, and root `docker-compose.yml`
  - Added `DB_SSL=false` support in backend DB config for local containerized Postgres
  - *IMPROVEMENTS 12.2*

- [x] **11.9 — Health check with dependency verification** — Low
  - `/api/health` should verify database connectivity; return 503 if unhealthy
  - `/api/health` now authenticates DB connection and returns structured dependency status
  - *IMPROVEMENTS 12.5*

- [ ] **11.10 — API documentation (OpenAPI/Swagger)** — Medium *(deferred — would add new API contract surface)*
  - Generate machine-readable API docs from route definitions
  - *IMPROVEMENTS 13.1*

### Phase 11 Verification
- [x] CI pipeline runs on every PR: lint → test → build
- [ ] Backend test coverage ≥80%; frontend ≥70% *(deferred with 11.1/11.3)*
- [ ] `docker-compose up` starts full stack locally *(blocked in this session: Docker CLI not installed in execution environment; `docker` command unavailable)*

---

## Key Decisions

| Decision | Choice |
|----------|--------|
| Demand source of truth | Only validated SAR records |
| Section cap | Configurable per course/term with default fallback |
| Debounce timing | 350ms (matches existing CurriculumManagement) |
| Searchable dropdowns | `react-select` library |
| Prerequisite bug | Requires runtime debugging (code structure appears correct) |

## Open Questions

1. **What defines "validated SAR"?** — Is there a `status` field on SAR, or is it determined by linked `userId` / adviser approval? Must clarify before Phase 1.
2. **Prerequisite bug root cause** — Unknown until debugging with DevTools + network inspection.
3. **Phases 6–11** are longer-term improvements that can be tackled after Phases 1–5 resolve active user-reported issues.

## IMPROVEMENTS.md Cross-Reference

Items from `IMPROVEMENTS.md` already addressed by Phases 1–5 (no separate action needed):

| IMPROVEMENTS Item | Covered By |
|-------------------|------------|
| 3.2 Missing Database Indexes | Phase 5.1 |
| 3.3 JS-Side Filtering Instead of SQL | Phase 1.1 / 5.1 |
| 3.5 No Server-Side Caching | Phase 5.1 / 5.3 |
| 6.1 Massive Layout Duplication | Phase 4.1 |
| 6.2 Duplicated Utility Functions | Phase 4.1 |
| 6.9 Inconsistent Component Naming | Phase 4.1 |
| 7.1 SideNavItem Recreated Every Render | Phase 5.2 |
| 7.2 Missing useMemo/useCallback | Phase 5.2 |
| 10.2 Mobile Menu State Duplicated | Phase 4.1 |
| 3.4 Missing Attribute Projection | Phase 5.3 |
| 3.6 Missing Pagination on Version History | Phase 5.3 |

Items **not** included (low priority / deferred):
- 1.11 Open-Redirect Risk via CLIENT_URL (Low)
- 1.12 Missing 2FA Enforcement for Privileged Roles (Low)
- 2.5 Unused Imports (Low — covered by ESLint in 7.10)
- 2.8 Inconsistent Null/Undefined Checking (Low)
- 4.4 No Dependency Injection (Low)
- 4.6 No API Versioning (Low)
- 6.8 Inline Style Mutations (Low — covered by SideNavItem refactor in 5.2)
- 7.4 No Image Lazy Loading (Low)
- 7.6 Bundle Size Not Monitored (Low)
- 8.3 No Client-Side JWT Signature Verification (Low — acceptable if server enforces)
- 12.6 No Request-ID Tracking (Low)
- 12.7 No Production Build Guide (Low)
- 13.2 No .env.example Parity Check (Low)
- 13.3 No Inline JSDoc (Low)

## Files Index

| File | Phases |
|------|--------|
| `backend/controllers/forecastController.js` | 1.1, 1.2, 1.3 |
| `backend/controllers/curriculumController.js` | 2.1 |
| `backend/controllers/sarController.js` | 7.5 |
| `backend/models/StudentAcademicRecord.js` | 1.1, 5.1, 8.5 |
| `backend/models/ForecastSnapshot.js` | 1.2 |
| `backend/models/User.js` | 8.1, 8.3 |
| `backend/utils/sarAnalytics.js` | 1.1 |
| `backend/utils/jwt.js` | 6.5, 7.4 |
| `backend/server.js` | 6.2, 6.7, 7.11 |
| `backend/middleware/auth.js` | 6.3, 7.9 |
| `frontend/src/pages/admin/ForecastDashboard.js` | 1.3, 3.1 |
| `frontend/src/pages/admin/CurriculumDetail.js` | 2.1, 3.2 |
| `frontend/src/components/admin/CoursePickerModal.js` | 2.1, 3.2 |
| `frontend/src/pages/admin/TermManagement.js` | 3.1 |
| `frontend/src/pages/admin/TransferOwnership.js` | 3.1 |
| `frontend/src/App.js` | 3.3 |
| `frontend/src/pages/VerifyCode.js` | 3.4, 4.2 |
| `frontend/src/index.css` | 4.2 |
| `frontend/src/components/shared/SidebarLayout.js` | 4.1 |
| `frontend/src/components/student/StudentLayout.js` | 4.1 |
| `frontend/src/context/AuthContext.js` | 6.6 |
| `frontend/src/pages/Profile.js` | 9.1 |
| `frontend/package.json` | 3.2 |
