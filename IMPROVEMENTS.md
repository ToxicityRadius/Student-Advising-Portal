# Student Advising Portal — Possible Improvements

This document catalogs all identified improvements across the project, organized by category and priority.

---

## Table of Contents

1. [Security](#1-security)
2. [Backend Code Quality](#2-backend-code-quality)
3. [Backend Performance](#3-backend-performance)
4. [Backend Architecture](#4-backend-architecture)
5. [Database & Models](#5-database--models)
6. [Frontend Code Quality](#6-frontend-code-quality)
7. [Frontend Performance](#7-frontend-performance)
8. [Frontend Security](#8-frontend-security)
9. [UX & Accessibility](#9-ux--accessibility)
10. [State Management (Frontend)](#10-state-management-frontend)
11. [Testing](#11-testing)
12. [DevOps & Infrastructure](#12-devops--infrastructure)
13. [Documentation](#13-documentation)

Priority levels: **Critical** · **High** · **Medium** · **Low**

---

## 1. Security

### 1.1 Missing CSRF Protection — High

No CSRF middleware is configured in `server.js`. While `SameSite` cookies help, state-changing POST/PUT/PATCH endpoints remain vulnerable on older browsers.

**Recommendation:** Add a CSRF token middleware (e.g., `csurf` or double-submit cookie pattern).

---

### 1.2 Insufficient Input Validation in Controllers — High

Several controllers accept user payloads without strict field-length or format validation. Examples include CSV text parsing in `curriculumController.js` and search fields across `sarController.js`.

**Recommendation:** Add schema validation (e.g., Joi or express-validator) at the route level before controller logic runs.

---

### 1.3 File Upload Security Gaps — High

Profile picture uploads (via Supabase) lack a strict MIME-type whitelist and explicit file-size limits enforced in backend code.

**Recommendation:** Validate file type against an allowlist (`image/jpeg`, `image/png`, `image/webp`), enforce a size cap (e.g., 2 MB), and reject everything else.

---

### 1.4 Incomplete Refresh Token Implementation — High

`jwt.js` sets a refresh-token cookie with `path: '/api/auth/refresh'`, but no `/api/auth/refresh` endpoint exists in `authRoutes.js`. The refresh flow is partially implemented.

**Recommendation:** Complete the refresh-token rotation endpoint or remove the partial implementation to avoid confusion.

---

### 1.5 JWT Access Token Default Expiry Too Long — Medium

`.env.example` suggests `JWT_EXPIRE=7d`. Seven days is excessive for an access token.

**Recommendation:** Set access-token lifetime to 15–30 minutes and rely on refresh tokens for session continuity.

---

### 1.6 Missing Rate Limiting on Mutation Endpoints — Medium

Rate limiting exists on auth routes but is absent from profile updates, SAR mutations, and grade entry endpoints.

**Recommendation:** Apply per-user rate limits to all write endpoints.

---

### 1.7 Sensitive Database Error Details Exposed — High

The global error handler in `server.js` can return full database error details (SQL, table names, constraint names) to the client.

**Recommendation:** Log full errors server-side; return only generic error messages to clients in production.

---

### 1.8 Email Verification Code Brute-Force Risk — Medium

`generateVerificationCode()` produces 6-digit numeric codes (100,000 combinations). Within a 10-minute window this is brute-forceable without additional controls.

**Recommendation:** Switch to 8+ character alphanumeric codes, add attempt-based lockout, or require CAPTCHA after repeated failures.

---

### 1.9 Missing HTTP Security Headers — Medium

Helmet is enabled with minimal settings. A strict Content-Security-Policy, Strict-Transport-Security (HSTS), and explicit X-Content-Type-Options are not configured.

**Recommendation:** Add comprehensive CSP and HSTS headers appropriate for the deployment environment.

---

### 1.10 No Audit Logging — High

No structured logging of authentication events, SAR modifications, grade entries, or access-control decisions exists.

**Recommendation:** Implement an audit-log middleware that records user, action, resource, and timestamp for all sensitive operations.

---

### 1.11 Open-Redirect Risk via CLIENT_URL — Low

`CLIENT_URL` from environment is used directly in email links without validation. If the variable is tampered with, outbound links could point to an external domain.

**Recommendation:** Validate `CLIENT_URL` against an allowed-domain list at startup.

---

### 1.12 Missing 2FA Enforcement for Privileged Roles — Low

Two-factor authentication is optional. Admin and adviser accounts are not required to enable it.

**Recommendation:** Enforce 2FA for admin and adviser roles.

---

## 2. Backend Code Quality

### 2.1 Duplicated `sanitizeUser()` Function — Medium

`authController.js` and `userController.js` each define their own `sanitizeUser()` with overlapping logic.

**Recommendation:** Extract to a shared `utils/sanitize.js` and import in both controllers.

---

### 2.2 Inconsistent Response Envelope — Medium

Some endpoints return `{ success, message }`, others `{ success, message, data }`, and some `{ success, data }`.

**Recommendation:** Standardize on a single response shape project-wide (e.g., always include `success`, `message`, and `data`).

---

### 2.3 Fire-and-Forget Database Writes — Medium

`sendTokenResponse` in `jwt.js` calls `User.update()` without `await`, so a failed write is silently ignored.

**Recommendation:** Await the call and log failures, or restructure so the write is non-critical.

---

### 2.4 Overly Long Controller Functions — Medium

`sarController.js` → `updateSAR` spans ~220 lines handling validation, file upload, tracking, and syncing.

**Recommendation:** Decompose into focused helpers (e.g., `validateSARUpdate`, `handleProfilePictureUpload`, `syncProfileToSAR`).

---

### 2.5 Unused Imports — Low

`Op` from Sequelize is imported but unused in `authController.js`. Similar dead imports likely exist elsewhere.

**Recommendation:** Add an ESLint rule (`no-unused-vars`) and run a cleanup pass.

---

### 2.6 Magic Numbers and Hardcoded Validation Rules — Medium

Password length (8), student-number digit count (7), and role strings are scattered across multiple files.

**Recommendation:** Centralize in a `constants/validation.js` module.

---

### 2.7 Inconsistent Transaction Usage — Medium

Some multi-step writes use Sequelize transactions; others do not.

**Recommendation:** Establish a rule: every multi-model write operation uses a transaction.

---

### 2.8 Inconsistent Null/Undefined Checking — Low

Some code uses `=== undefined`, some `=== null`, some `hasOwnProperty`.

**Recommendation:** Standardize on a single defensive-check pattern across the codebase.

---

### 2.9 No ESLint Configuration — Medium

No `.eslintrc` file exists in either backend or frontend root.

**Recommendation:** Add ESLint with a shared config (e.g., `eslint-config-airbase` or similar) and integrate with CI.

---

## 3. Backend Performance

### 3.1 N+1 Query in Profile Sync — High

After updating a user, `syncProfileToSar()` fetches SAR and its relations individually. Batch updates amplify this.

**Recommendation:** Batch SAR syncs or use a single query with includes.

---

### 3.2 Missing Database Indexes — High

Likely missing indexes on frequently queried columns: `User.email`, `StudentAcademicRecord.studentNumber`, `StudentAcademicRecord.email`, `StudyPlanVersion.status`.

**Recommendation:** Audit query patterns and add indexes on high-cardinality, frequently filtered columns.

---

### 3.3 JavaScript-Side Filtering Instead of SQL — Medium

`forecastController.js` loads all `StudyPlanCourse` records and filters by semester in JavaScript.

**Recommendation:** Push filtering into Sequelize `where` clauses so the database does the work.

---

### 3.4 Missing Attribute Projection — Medium

SAR and forecast queries include full model data when only a few fields are needed.

**Recommendation:** Use Sequelize `attributes` to select only required columns.

---

### 3.5 No Server-Side Caching — Medium

Curriculum structure, course lists, and the current academic term are re-queried on every request.

**Recommendation:** Introduce server-side caching (in-memory or Redis) for slowly changing reference data.

---

### 3.6 Missing Pagination on Version History — Medium

`getStudyPlanVersions` returns all versions without limit.

**Recommendation:** Add pagination consistent with other list endpoints.

---

### 3.7 Inefficient Elective Track Resolution — Low

`fetchTrackContext` queries both selected and all curriculum tracks on every validation call.

**Recommendation:** Cache curriculum track layout per request or resolve with a single JOIN query.

---

### 3.8 No Database Connection Pool Tuning — Low

Sequelize uses default pool settings with no configuration exposed.

**Recommendation:** Configure `pool.max`, `pool.min`, `pool.idle` based on expected load.

---

## 4. Backend Architecture

### 4.1 No Service Layer — High

Controllers call models directly and contain business logic (prerequisite validation, unit packing, regeneration algorithms).

**Recommendation:** Extract a `services/` layer:
```
services/
├── UserService.js
├── SARService.js
├── StudyPlanService.js
├── GradeService.js
└── ValidationService.js
```

---

### 4.2 Tight Auth ↔ SAR Coupling — Medium

Auth login/register flows call `linkStudentAccountToSar` and `syncProfileToSar`. If SAR logic fails, authentication can fail.

**Recommendation:** Make SAR sync non-blocking (async queue) so auth never fails due to SAR issues.

---

### 4.3 Constants Scattered Across Files — Medium

Role strings, validation rules, allowed values, and business constants are defined inline throughout controllers.

**Recommendation:** Consolidate into `constants/` modules.

---

### 4.4 No Request-Context or Dependency Injection — Low

Every function imports models directly. This makes unit testing with mocks difficult.

**Recommendation:** Consider a lightweight DI container or at least pass dependencies into service functions.

---

### 4.5 Missing Cross-Cutting Middleware — Medium

Validation, audit logging, and request-context injection are done ad hoc in individual controllers.

**Recommendation:** Create dedicated middleware:
- `middleware/validate.js` — schema validation
- `middleware/auditLog.js` — mutation logging
- `middleware/requestContext.js` — inject request ID, user

---

### 4.6 No API Versioning — Low

All endpoints live under `/api/*` with no version prefix.

**Recommendation:** Prefix with `/api/v1/*` to allow non-breaking evolution.

---

### 4.7 No Graceful Shutdown — Medium

`server.js` exits immediately on SIGTERM. In-flight requests are dropped.

**Recommendation:** Implement graceful shutdown: stop accepting connections, finish in-flight requests, close the DB pool, then exit.

---

## 5. Database & Models

### 5.1 Duplicate Column Naming Convention — Medium

`User` model has both `firstName`/`lastName` and `first_name`/`last_name` columns (camelCase and snake_case).

**Recommendation:** Migrate to a single convention (snake_case in DB, camelCase via Sequelize `underscored: true`).

---

### 5.2 Missing CHECK Constraints — Medium

Fields like `semester` (should be 1–3) and `yearLevel` (should be 1–5) have no database-level check constraints.

**Recommendation:** Add CHECK constraints in a new migration.

---

### 5.3 Timestamps Stored as BIGINT — Medium

`createdAt` and `updatedAt` in the `User` model are BIGINT (epoch milliseconds) instead of native TIMESTAMP.

**Recommendation:** Use TIMESTAMP/TIMESTAMPTZ for proper date querying and indexing.

---

### 5.4 No Soft Delete Support — Low

Hard deletes are used everywhere. SARs, study-plan versions, and grade records have no `deletedAt` column.

**Recommendation:** Enable Sequelize paranoid mode on audit-sensitive tables.

---

### 5.5 Missing Compound Unique Constraints — Medium

No compound unique on combinations like `(curriculumId, semester, schoolYear)` for `AcademicTerm`.

**Recommendation:** Add unique constraints on meaningful composite keys to prevent duplicate records.

---

### 5.6 Missing Model-Level Validators — Medium

Models define types but lack min/max length, enum, email format, or numeric range validations.

**Recommendation:** Add Sequelize `validate` blocks to model definitions for defense-in-depth.

---

### 5.7 Missing Foreign Key Enforcement — Low

Some associations are defined in `models/index.js` but may lack database-level FK constraints with `onDelete` rules.

**Recommendation:** Verify FK constraints exist and set appropriate `onDelete: 'RESTRICT'` or `CASCADE` per business rule.

---

## 6. Frontend Code Quality

### 6.1 Massive Layout/Navigation Duplication — Critical

Sidebar markup, navigation items, notification dropdowns, and mobile-menu logic are copy-pasted across 8+ student pages (`ViewGrades.js`, `Checklist.js`, `Profile.js`, `Dashboard.js`, `Help.js`, `Settings.js`, `AvailableSubjects.js`). This accounts for 5,000+ duplicated lines.

**Recommendation:** Refactor all student pages to use the existing `StudentLayout.js` wrapper. Page components should only render their content area.

---

### 6.2 Duplicated Utility Functions — High

`formatYearLevel()`, `semesterLabel()`, and `SideNavItem` component are redefined in 5–8 files each.

**Recommendation:** Move to `utils/formatters.js` and a shared `components/SideNavItem.js`. Import everywhere.

---

### 6.3 Duplicated Image Imports — Medium

Every student page imports the same ~12 asset images.

**Recommendation:** Centralize in a single `assets/index.js` barrel file and import from there.

---

### 6.4 Large Single-File Components — High

- `Profile.js` — 800+ lines (form editing, picture upload, password change, notifications, mobile sidebar)
- `CurriculumManagement.js` — manages curricula, courses, AND equivalencies in one file
- `ViewGrades.js` — 400+ lines including full layout

**Recommendation:** Decompose into focused sub-components (e.g., `ProfileEditForm`, `PasswordSection`, `CurriculumTabs`).

---

### 6.5 No PropTypes or TypeScript — High

Zero prop validation across the entire frontend. No component documents its expected props.

**Recommendation:** Add `prop-types` package and define PropTypes for all components, or migrate to TypeScript.

---

### 6.6 Inconsistent Error Handling — Medium

`getErrorMessage()` helper is defined in `StudentList.js` but not reused. Other pages extract error messages with inline logic, each slightly different.

**Recommendation:** Create a shared `utils/errorHelpers.js` with a standard `getErrorMessage(error, fallback)` function.

---

### 6.7 Hardcoded Strings Everywhere — Medium

Role labels ("Program Chair", "Adviser"), API endpoint paths, semester/year-level mappings — all hardcoded across 15+ files.

**Recommendation:** Centralize in `utils/constants.js`.

---

### 6.8 Inline Style Mutations — Low

Mouse-event handlers in `SideNavItem` mutate `style.backgroundColor` directly, bypassing React optimizations.

**Recommendation:** Use CSS `:hover` pseudo-class or `className` toggling instead.

---

### 6.9 Inconsistent Component Naming — Low

Layout components: `StudentLayout` vs `SidebarLayout` vs `AdminLayout` vs `AdviserLayout` — unclear inheritance.

**Recommendation:** Standardize naming and document the layout hierarchy.

---

## 7. Frontend Performance

### 7.1 SideNavItem Recreated on Every Render — Medium

`SideNavItem` is defined inline inside page components, causing recreation on every render cycle.

**Recommendation:** Extract to a memoized standalone component with `React.memo`.

---

### 7.2 Missing `useMemo`/`useCallback` — Medium

Computed values like `activeCurriculum` in `StudentList.js` and nav-item arrays in layout components are recalculated every render.

**Recommendation:** Wrap these in `useMemo` with proper dependency arrays.

---

### 7.3 Redundant Notification Fetches — High

`useNotifications` hook fires an API call on every page mount. Navigating across pages causes N duplicate requests.

**Recommendation:** Lift notification state into a context provider so the fetch happens once and is shared.

---

### 7.4 No Image Lazy Loading — Low

Profile pictures and asset images load eagerly with no placeholder or `loading="lazy"` attribute.

**Recommendation:** Add `loading="lazy"` to `<img>` tags and provide placeholders.

---

### 7.5 No Request Cancellation — Low

API calls in `useEffect` don't cancel via `AbortController` when the component unmounts or when the user navigates away.

**Recommendation:** Pass an `AbortSignal` to Axios calls and cancel on cleanup.

---

### 7.6 Bundle Size Not Monitored — Low

No bundle-analysis tooling or size budgets are configured.

**Recommendation:** Add `source-map-explorer` or `webpack-bundle-analyzer` to the build pipeline.

---

## 8. Frontend Security

### 8.1 Sensitive Data in localStorage — High

`AuthContext.js` persists the full user object (including email, ID) in `localStorage`. `api.js` stores the refresh token in `localStorage`.

**Recommendation:** Store only minimal identifiers in localStorage. Move refresh tokens to HttpOnly cookies (backend change required). Fetch full profile from `/auth/me` on load.

---

### 8.2 Passwords Stored in sessionStorage — High

`ChangePassword.js` stores `forcePasswordChangeOldPassword` in `sessionStorage`.

**Recommendation:** Never persist passwords in browser storage. Use an opaque flow token instead.

---

### 8.3 No Client-Side JWT Signature Verification — Low

`AuthContext.js` decodes JWTs with `atob()` but doesn't verify the signature.

**Recommendation:** This is acceptable if all authorization decisions happen server-side. Ensure the client never trusts the decoded payload for access-control decisions.

---

### 8.4 API URL Fallback to Localhost in Production — Medium

`api.js` defaults to `http://localhost:5000/api` if `REACT_APP_API_URL` is unset.

**Recommendation:** Fail the build (or show an obvious warning) if the env variable is missing in production.

---

## 9. UX & Accessibility

### 9.1 Missing Loading States — High

Several pages (`Dashboard.js`, `AvailableSubjects.js`, `PlanOfStudy.js`) render no loading indicator while data is being fetched.

**Recommendation:** Show a spinner or skeleton while `data === null` and `error === null`.

---

### 9.2 Missing Empty States — Medium

`ViewGrades.js`, `StudentList.js`, and `Checklist.js` render no message when data arrays are empty.

**Recommendation:** Display a contextual "No records found" message for empty lists.

---

### 9.3 Missing `aria-invalid` on Invalid Form Fields — Medium

Form fields with validation errors don't set `aria-invalid="true"`.

**Recommendation:** Add `aria-invalid` to fields in error state and associate error messages with `aria-describedby`.

---

### 9.4 No Skip-to-Content Link — Medium

No hidden skip-navigation link exists for screen-reader users.

**Recommendation:** Add a visually-hidden "Skip to main content" link before the navbar.

---

### 9.5 Missing `role="alert"` on Dynamic Error Messages — Medium

Error alerts rendered after API failures lack `role="alert"`, so screen readers don't announce them.

**Recommendation:** Add `role="alert"` to dynamically appearing error/success messages.

---

### 9.6 Keyboard Navigation Gaps — Medium

`SideNavItem` in `SidebarLayout.js` uses `onMouseEnter`/`onMouseLeave` for hover styles but no `onFocus`/`onBlur` equivalents.

**Recommendation:** Add focus-visible styles so keyboard users see the same affordances.

---

### 9.7 Color Contrast Concerns — Low

`#FFC107` (yellow) used as text or background may not meet WCAG AA contrast ratios on light backgrounds.

**Recommendation:** Audit all color pairs with a contrast checker and adjust as needed.

---

### 9.8 Focus Not Trapped in Modals — Low

`StudentIdModal.js` and other modals don't trap focus or set `autoFocus` on the first input.

**Recommendation:** Use React-Bootstrap's built-in focus management or add `autoFocus` to the first interactive element.

---

### 9.9 Table Headers Missing `scope` — Low

Data tables in `ViewGrades.js` and other list pages lack `scope="col"` on `<th>` elements.

**Recommendation:** Add `scope="col"` to `<th>` in header rows and `scope="row"` where applicable.

---

### 9.10 No Error Retry Mechanism — Low

When a page-load API call fails, the user must manually refresh. No "Retry" button is provided.

**Recommendation:** Add a "Retry" action to error states.

---

## 10. State Management (Frontend)

### 10.1 Notification State Duplicated Per Page — High

`notifOpen`, `allRead`, and `notifications` are declared locally in every student page.

**Recommendation:** Centralize into a `NotificationContext` or a shared `useNotifications()` hook that caches results.

---

### 10.2 Mobile Menu State Duplicated — Medium

`mobileMenuOpen` and `isMobileView` are independently managed in 10+ files.

**Recommendation:** Move to a `LayoutContext` or handle entirely inside the layout wrapper component.

---

### 10.3 Alert/Feedback State Not Reusable — Medium

Every page defines its own `alert` state object with the same shape.

**Recommendation:** Create a reusable `useAlert()` hook that encapsulates the state and dismiss logic.

---

### 10.4 No Cross-Tab Auth Synchronization — Low

If a user logs out in one tab, other tabs remain authenticated until they make an API call.

**Recommendation:** Listen to `window.addEventListener('storage', ...)` to sync auth state across tabs.

---

## 11. Testing

### 11.1 Minimal Backend Test Coverage — Critical

Only 2–3 test files exist (`auth.test.js`, `gradeValidation.test.js`) for the entire backend.

**Recommendation:** Add tests for every controller, middleware, and utility. Target ≥80% coverage. Priority files:
- `sarController.test.js`
- `gradeController.test.js`
- `curriculumController.test.js`
- `middleware/auth.test.js`
- `utils/studyPlan.test.js`

---

### 11.2 No Backend Integration Tests — High

No tests exercise the full request → controller → model → database path.

**Recommendation:** Add integration tests using `supertest` against a test database.

---

### 11.3 No End-to-End Test Scenarios — Medium

No E2E tests cover critical user journeys (onboarding → SAR creation → study-plan generation → grade entry → graduation).

**Recommendation:** Add E2E tests with Cypress or Playwright.

---

### 11.4 Minimal Frontend Test Coverage — High

Only `PrivateRoute.test.js` exists. Form flows, auth context, API error handling, and page components are untested.

**Recommendation:** Add React Testing Library tests for critical pages and flows. Target ≥70% coverage.

---

### 11.5 No Accessibility Testing Automation — Low

No automated a11y audit (axe-core, pa11y) in the test pipeline.

**Recommendation:** Integrate `jest-axe` or `@axe-core/react` into the test suite.

---

## 12. DevOps & Infrastructure

### 12.1 No CI/CD Pipeline — Critical

No `.github/workflows/` directory or any CI configuration exists.

**Recommendation:** Set up GitHub Actions for:
- Lint checks
- Unit and integration tests
- Build verification
- (Optional) Automated deployment

---

### 12.2 No Dockerization — Medium

No Dockerfile or docker-compose configuration exists.

**Recommendation:** Add a `Dockerfile` for backend and frontend, plus a `docker-compose.yml` for local development with PostgreSQL.

---

### 12.3 No ESLint/Prettier Configuration — Medium

No `.eslintrc` or `.prettierrc` file in either backend or frontend.

**Recommendation:** Add shared ESLint + Prettier configs and a pre-commit hook (e.g., via `husky` + `lint-staged`).

---

### 12.4 Missing Environment Variable Validation at Startup — Medium

Only JWT secrets are validated. Missing checks for DATABASE_URL format, EMAIL config, SUPABASE credentials, etc.

**Recommendation:** Validate all required env variables at server startup and fail fast with clear messages.

---

### 12.5 No Health Check with Dependency Verification — Low

`/api/health` returns OK without verifying database connectivity.

**Recommendation:** Check database connection and return a `503` if any dependency is unhealthy.

---

### 12.6 No Request-ID Tracking — Low

No correlation IDs are generated for distributed tracing or log correlation.

**Recommendation:** Add middleware that generates a UUID per request and includes it in logs and response headers.

---

### 12.7 No Production Build Optimization Guide — Low

No documentation on production deployment, environment setup, or performance tuning.

**Recommendation:** Add a `DEPLOYMENT.md` covering build, environment, and scaling considerations.

---

## 13. Documentation

### 13.1 No API Documentation (OpenAPI/Swagger) — Medium

No machine-readable API documentation exists. Consumers must read code to understand endpoints.

**Recommendation:** Generate an OpenAPI spec from route definitions or add Swagger UI.

---

### 13.2 No `.env.example` Parity Check — Low

Backend `.env.example` has 22 variables; no mechanism verifies that the actual `.env` matches.

**Recommendation:** Add a startup check that compares `.env` keys against `.env.example`.

---

### 13.3 No Inline JSDoc on Public Functions — Low

Backend controllers, services, and utilities lack parameter/return-type documentation.

**Recommendation:** Add JSDoc to public-facing functions, especially in `utils/` and any future `services/` layer.

---

### 13.4 No Component Storybook or Living Style Guide — Low

Frontend components are defined ad hoc with no visual catalog.

**Recommendation:** Add Storybook for isolated component development and documentation.

---

### 13.5 No Contributing Guide — Low

No `CONTRIBUTING.md` file describing branch strategy, commit conventions, or review process.

**Recommendation:** Add a contributing guide if the project accepts external contributions.

---

## Summary

| Category                  | Critical | High | Medium | Low |
|---------------------------|----------|------|--------|-----|
| Security                  | —        | 5    | 5      | 2   |
| Backend Code Quality      | —        | —    | 6      | 3   |
| Backend Performance       | —        | 2    | 4      | 2   |
| Backend Architecture      | —        | 1    | 4      | 2   |
| Database & Models         | —        | —    | 5      | 2   |
| Frontend Code Quality     | 1        | 3    | 3      | 2   |
| Frontend Performance      | —        | 1    | 2      | 3   |
| Frontend Security         | —        | 2    | 1      | 1   |
| UX & Accessibility        | —        | 1    | 5      | 4   |
| State Management          | —        | 1    | 2      | 1   |
| Testing                   | 1        | 2    | 1      | 1   |
| DevOps & Infrastructure   | 1        | —    | 3      | 3   |
| Documentation             | —        | —    | 2      | 3   |
| **Totals**                | **3**    | **18** | **43** | **29** |
