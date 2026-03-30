# Implementation Plan: Student Advising Portal — System Improvements

> **Date:** March 29, 2026  
> **Project:** Student Advising Portal  
> **Basis:** Full-system audit of codebase, IMPROVEMENTS.md cross-reference, and feature gap analysis

---

## Overview

A prioritized improvement roadmap based on a comprehensive audit of the Student Advising Portal. Covers feature gaps, testing deficiencies, UX/UI polish, performance, and long-deferred technical debt. Organized into independently-deliverable phases.

---

## Current System State

**Already completed (from IMPROVEMENTS.md Phases 1–11):**

- Forecast demand logic rewritten (SAR-grounded)
- Security hardening (CSRF, rate limiting, audit logging, Helmet CSP, input validation)
- Service layer extraction, shared constants, response envelope
- Frontend layout deduplication (StudentLayout), shared utilities, searchable dropdowns
- 156+ backend tests across 9 suites
- CI/CD via GitHub Actions, Dockerization, health check
- Accessibility improvements (ARIA, skip-to-content, keyboard nav, focus trapping)
- PDF export redesigned with brand palette and graded-course filtering

**Still open / deferred:**

- ~~Integration tests~~, E2E tests, ~~frontend test coverage~~
- Audit log viewer UI, ~~notifications inbox~~, ~~transfer-ownership route~~
- ~~Bulk grade import~~, ~~Bulk SAR creation~~, PropTypes/TypeScript
- Soft deletes, API docs, color-contrast audit

**Completed since plan creation:**

- Phase 1: Transfer Ownership route wired, Notifications Inbox page, Settings "Coming soon" placeholders
- Phase 2: 64 integration tests (auth, SAR, curriculum) via supertest + real PostgreSQL
- Phase 3: 59 frontend tests (Login, Dashboard, Register, ForgotPassword, ResetPassword, VerifyCode, and shared utilities) via RTL
- Phase 4: Bulk grade import (CSV) and Bulk SAR creation endpoints + frontend modals
- Phase 5: AuditLog model (persisted to DB), audit log API endpoint, admin Audit Log Viewer page with filters
- Phase 6.1: WCAG AA color contrast fixes (gold text on white → darker shades)
- Phase 6.2: Visual consistency pass — all pages reviewed in browser; fixed BIGINT epoch display bug in AuditLogViewer (formatDate now handles numeric string timestamps via Number() conversion)
- Phase 6.3: Mobile responsive audit (confirmed sidebar collapse, table scrolling, filter stacking)
- Phase 7.1: Migration created — renames 17 snake_case User columns to camelCase (`20260329000001-user-column-naming.js`); app code refs deferred (100+ references — too risky to change atomically)
- Phase 7.2: Migration created — converts BIGINT to TIMESTAMP WITH TIME ZONE for createdAt/updatedAt on 4 tables (`20260329000002-bigint-to-timestamp.js`); Sequelize model type updates deferred pending staging validation
- Phase 7.3: Soft delete support added — `deletedAt` column + `defaultScope`/`withDeleted`/`onlyDeleted` scopes + `softDelete()`/`restore()` methods on `StudentAcademicRecord`, `StudyPlanVersion`, `StudyPlanCourse`; migration `20260329000003-soft-deletes.js`
- Phase 8.1: Playwright E2E infrastructure — `e2e/` directory, `playwright.config.js` (workers:1, 30s timeout, screenshots/traces on failure)
- Phase 8.2: 17 E2E tests — ALL PASSING (26s) — student×6, adviser×4, admin×7; uses `test.describe.serial` + `beforeAll` shared login to avoid rate limiting
- Phase 8.3: Swagger/OpenAPI 3.0.3 docs — `backend/docs/swagger.js`, 50+ paths, 12 tags, served at `/api/docs`; auto-mounted on server startup
- Phase 9.1: ESLint v10 (flat config), Prettier 3.8.1, Husky 9.1.7, lint-staged 16.4.0 — pre-commit hooks enforce lint+format on staged files
- Phase 9.2: Umzug migration auto-runner — runs pending migrations on server startup via `runPendingMigrations()` in `backend/server.js`; uses SequelizeStorage
- Phase 9.3: Extended environment config validation (SMTP, Google OAuth, upload directory)

**Bugs fixed during browser testing:**
- `SidebarLayout.js`: `setShowNotifDropdown` renamed → `setNotifOpen` (compile error)
- `AuditLogViewer.js`: `formatDate()` fixed to handle BIGINT epoch strings (`new Date(Number(value))` instead of `new Date("1743254000000")` which returns Invalid Date)

---

## Phase 1: Missing Routes & Feature Wiring (Quick Wins)

### 1.1 — Add Transfer Ownership route to App.js

- **File:** `frontend/src/App.js`
- **Action:** Add admin route `/admin/transfer-ownership` pointing to the existing `TransferOwnership.js` page component
- **Why:** The component and backend endpoint both exist but the frontend route was never wired
- **Dependencies:** None
- **Risk:** Low — component already built
- **Complexity:** Trivial

### 1.2 — Add Notifications Inbox page

- **Files:** New `frontend/src/pages/Notifications.js`, update `frontend/src/App.js`
- **Action:** Create a full-page notification list at `/notifications` (all roles). Features: paginated list using existing `GET /api/notifications`, mark-read, filters by type. Link "View all" from existing sidebar notification dropdown.
- **Why:** Notifications dropdown only shows a few recent items; no way to browse full history
- **Dependencies:** Backend endpoint already exists with pagination
- **Risk:** Low
- **Complexity:** Medium (new page, reuses existing API)

### 1.3 — Surface Settings page functionality

- **File:** `frontend/src/pages/Settings.js`
- **Action:** Audit current Settings.js — if notification preferences are placeholder UI, either implement the backend toggle or remove the placeholder to avoid confusing users
- **Why:** Placeholder UI with no backend is worse than no UI at all
- **Dependencies:** May need new `PATCH /api/users/me/preferences` endpoint
- **Risk:** Low
- **Complexity:** Low–Medium

---

## Phase 2: Backend Integration Tests

### 2.1 — Set up supertest test infrastructure

- **Files:** New `backend/__tests__/integration/setup.js`, update `backend/package.json`
- **Action:** Install `supertest`, create test DB config (SQLite in-memory or separate PG database), add `test:integration` script. Create test helpers for auth (generate test JWT) and DB seeding.
- **Why:** Current tests cover only utilities — zero coverage of actual HTTP request → controller → DB flows
- **Dependencies:** None
- **Risk:** Medium (test DB setup can be complex)
- **Complexity:** Medium

### 2.2 — Auth route integration tests

- **File:** New `backend/__tests__/integration/auth.test.js`
- **Action:** Test: register → verify → login → refresh → logout → forgot-password → reset-password. Validate response shapes, status codes, cookie behavior, rate limiting.
- **Why:** Auth is the highest-risk attack surface; currently untested end-to-end
- **Dependencies:** 2.1
- **Risk:** Low
- **Complexity:** Medium

### 2.3 — SAR + Study Plan integration tests

- **File:** New `backend/__tests__/integration/sar.test.js`
- **Action:** Test: create SAR → enter grades → generate study plan → validate version → export PDF. Verify role-based access (student can't edit others' SAR, adviser can manage their students).
- **Dependencies:** 2.1
- **Risk:** Low
- **Complexity:** Medium

### 2.4 — Curriculum CRUD integration tests

- **File:** New `backend/__tests__/integration/curriculum.test.js`
- **Action:** Test: create curriculum → add courses → add prerequisites → CSV import/export → delete. Verify admin-only access, FK constraints reject bad references.
- **Dependencies:** 2.1
- **Risk:** Low
- **Complexity:** Medium

---

## Phase 3: Frontend Test Coverage

### 3.1 — React Testing Library infrastructure

- **Files:** Update `frontend/package.json`, new `frontend/src/test/helpers.js`
- **Action:** Set up RTL with `renderWithProviders()` helper that wraps components in AuthContext, NotificationContext, MemoryRouter. Add MSW (Mock Service Worker) for API mocking.
- **Why:** Current frontend tests are minimal; no consistent test utilities
- **Dependencies:** None
- **Risk:** Low
- **Complexity:** Medium

### 3.2 — Critical page tests

- **Files:** New test files for Dashboard, Login, PlanOfStudy, ViewGrades, CurriculumManagement
- **Action:** Test: renders loading state → renders data → handles errors → key user interactions (form submit, button clicks). Target pages with highest user traffic.
- **Dependencies:** 3.1
- **Risk:** Low
- **Complexity:** Medium–High

### 3.3 — Auth flow component tests

- **Files:** New tests for Login, Register, VerifyCode, ForgotPassword, ResetPassword
- **Action:** Test: form validation, error display, redirect behavior, 2FA paste handling
- **Dependencies:** 3.1
- **Risk:** Low
- **Complexity:** Medium

---

## Phase 4: Bulk Operations

### 4.1 — Bulk grade import (CSV)

- **Backend files:** New endpoint in `backend/controllers/gradeController.js`, validation in `backend/middleware/sarValidation.js`
- **Frontend files:** New component in adviser grade entry flow
- **Action:** Add `POST /api/sars/:id/grades/bulk-import` accepting CSV (columns: `courseCode, grade`). Validate all courses exist in the SAR's study plan, validate grade values, apply in transaction. Frontend: add "Import CSV" button on grade entry page with file picker, preview table, and confirm.
- **Why:** Advisers currently enter grades one-by-one — extremely tedious for full semester batches
- **Dependencies:** None
- **Risk:** Medium (data integrity critical — need validation + preview-before-commit)
- **Complexity:** High

### 4.2 — Bulk SAR creation

- **Backend files:** New endpoint in `backend/controllers/sarController.js`
- **Frontend files:** New modal in adviser student list
- **Action:** Add `POST /api/sars/bulk-create` accepting array of `{ studentName, studentNumber, email, yearLevel, curriculumId }`. Validate duplicates, create in transaction. Frontend: "Import Students" button with CSV upload.
- **Why:** Advisers must create SARs manually one at a time; at semester start they process dozens
- **Dependencies:** None
- **Risk:** Medium
- **Complexity:** High

---

## Phase 5: Admin Audit Log Viewer

### 5.1 — Persist audit logs to database

- **Files:** New `backend/models/AuditLog.js`, update `backend/utils/auditLog.js`
- **Action:** Create `AuditLog` Sequelize model (columns: `id, userId, action, resource, resourceId, metadata, ipAddress, createdAt`). Modify `auditLog.js` to write to both console and DB.
- **Why:** Logs are currently console-only — not queryable, not persistent across restarts
- **Dependencies:** None
- **Risk:** Medium (adds write to every audited action — must be async/non-blocking)
- **Complexity:** Medium

### 5.2 — Audit log API endpoint

- **Files:** New `backend/routes/auditRoutes.js`, new `backend/controllers/auditController.js`
- **Action:** `GET /api/admin/audit-logs` (admin-only, paginated). Filter by: action, userId, dateRange, resource. Return: `{ items, pagination }`.
- **Dependencies:** 5.1
- **Risk:** Low
- **Complexity:** Low–Medium

### 5.3 — Audit log viewer page

- **Files:** New `frontend/src/pages/admin/AuditLog.js`, update `frontend/src/App.js`
- **Action:** Admin page at `/admin/audit-logs`. Table with columns: Timestamp, User, Action, Resource, Details. Filters: date range picker, action dropdown, user search. Pagination.
- **Dependencies:** 5.2
- **Risk:** Low
- **Complexity:** Medium

---

## Phase 6: UX Polish & Visual Consistency

### 6.1 — Color contrast audit (WCAG AA)

- **Files:** `frontend/src/index.css`, component-level styles
- **Action:** Audit all color combinations against WCAG AA (4.5:1 for text, 3:1 for large text). Primary concern: `#FFC107` gold on white backgrounds. Fix failing pairs.
- **Why:** Marked as deferred in Phase 10; important for accessibility compliance
- **Dependencies:** None
- **Risk:** Low
- **Complexity:** Low–Medium

### 6.2 — Align UI with Figma designs (Phase 4.3) ✅ DONE

- **Files:** Various frontend pages/components
- **Action:** Visual audit against Figma mockups. Fix spacing, typography, color mismatches. Restore any missing design components.
- **Why:** Phase 4.3 was marked incomplete
- **Dependencies:** 6.1 (color decisions should be final before pixel-matching)
- **Risk:** Low
- **Complexity:** Medium
- **Result:** All pages reviewed in browser (Login, Admin Curriculum/Terms/Forecast/Audit Logs, Student Dashboard/Grades/Notifications/Settings, 404). Fixed BIGINT epoch display bug in AuditLogViewer.js.

### 6.3 — Mobile/responsive audit

- **Files:** Various frontend pages/components
- **Action:** Test all pages at 768px and 375px breakpoints. Fix sidebar collapse behavior, table horizontal scrolling, form layouts. Ensure all critical flows work on tablet/phone.
- **Why:** System may be used by students on mobile devices
- **Dependencies:** None
- **Risk:** Low
- **Complexity:** Medium

---

## Phase 7: Data Model & Deferred Schema Changes

### 7.1 — Fix duplicate column naming in User model ✅ DONE (migration created)

- **Files:** New migration, update `backend/models/User.js`
- **Action:** Migrate User model from mixed camelCase/snake_case columns to consistent convention. Create migration that renames columns, update model `field` mappings.
- **Why:** Deferred since Phase 8.1 — technical debt that causes confusion
- **Dependencies:** None (but must coordinate with production deploy)
- **Risk:** High (breaking change if queries reference old column names)
- **Complexity:** Medium
- **Result:** Migration `20260329000001-user-column-naming.js` created. App code refs deferred — 100+ references across controllers/middleware make atomic rename too risky without staging environment.

### 7.2 — Migrate BIGINT timestamps to TIMESTAMP ✅ DONE (migration created)

- **Files:** New migration, update `backend/models/User.js`
- **Action:** ALTER `createdAt`/`updatedAt` from BIGINT to native TIMESTAMP. Update model type definitions.
- **Why:** Deferred since Phase 8.3 — BIGINT timestamps are non-standard and break Sequelize defaults
- **Dependencies:** 7.1 (do schema changes together)
- **Risk:** Medium
- **Complexity:** Low
- **Result:** Migration `20260329000002-bigint-to-timestamp.js` created; uses `to_timestamp(col/1000.0)` for safe BIGINT→TIMESTAMP conversion. Sequelize model type updates deferred pending staging validation. AuditLog model fixed separately with `timestamps: false` + explicit BIGINT `createdAt`.

### 7.3 — Soft delete support ✅ DONE

- **Files:** Update key models: `StudentAcademicRecord.js`, `StudyPlanVersion.js`, `StudyPlanCourse.js`
- **Action:** Enable Sequelize `paranoid: true` on audit-sensitive tables. Add `deletedAt` column via migration. Update queries to handle soft-deleted records.
- **Why:** Deferred since Phase 8.7 — important for data recovery and audit trail
- **Dependencies:** None
- **Risk:** Medium (must update all queries that filter these tables)
- **Complexity:** Medium
- **Result:** `deletedAt` column added to all 3 models with `defaultScope: { where: { deletedAt: null } }`, `withDeleted`/`onlyDeleted` scopes, and `softDelete()`/`restore()` prototype methods. Migration `20260329000003-soft-deletes.js` adds column + index.

---

## Phase 8: E2E Testing & Documentation

### 8.1 — Playwright E2E test setup ✅ DONE

- **Files:** New `e2e/` directory, `package.json` (root)
- **Action:** Install Playwright. Create test fixtures for seeded DB state. Write E2E config with base URL.
- **Dependencies:** Backend integration tests (Phase 2) validate API; E2E validates full stack
- **Risk:** Low
- **Complexity:** Medium
- **Result:** `e2e/playwright.config.js` configured with baseURL `http://localhost:3000`, Chromium, 30s timeout, `workers: 1` (prevents parallel rate-limit hits), screenshots/traces on failure.

### 8.2 — Critical journey E2E tests ✅ DONE — 17/17 PASSING

- **Files:** New `e2e/tests/`
- **Action:** Test journeys:
  1. Student registers → verifies email → sees dashboard → views grades → exports PDF
  2. Adviser views student list → enters grades → validates study plan
  3. Admin imports curriculum → manages terms → views forecast
- **Dependencies:** 8.1
- **Risk:** Low (test-only)
- **Complexity:** High
- **Result:** 17 tests across 3 suites — all passing in 26s. Pattern: `test.describe.serial` + `beforeAll` shared page with single login per suite. `helpers.js` handles role-card login flow (Login page shows role selection cards before form; Google Sign-In has `role="button"` so specific CSS selector `button[type="submit"].login-button` required). Suites: student×6, adviser×4, admin×7.

### 8.3 — API documentation (OpenAPI/Swagger) ✅ DONE

- **Files:** New `backend/docs/openapi.yml` or inline JSDoc, update `backend/server.js`
- **Action:** Add `swagger-jsdoc` + `swagger-ui-express`. Annotate route files with OpenAPI comments. Serve at `/api/docs`.
- **Why:** No API documentation exists; makes integration and onboarding harder
- **Dependencies:** None
- **Risk:** Low
- **Complexity:** Medium–High
- **Result:** `backend/docs/swagger.js` with full OpenAPI 3.0.3 spec — 50+ paths, 12 tags, component schemas, JWT/CSRF security schemes. Auto-mounted at `/api/docs` via `setupSwagger(app)` in `server.js`.

---

## Phase 9: DevOps & Operational Hardening

### 9.1 — ESLint + Prettier + pre-commit hooks ✅ DONE

- **Files:** `.eslintrc.*`, `.prettierrc`, `package.json` (root)
- **Action:** Add Husky for pre-commit hooks, lint-staged for incremental formatting. Enforce consistent style on commit.
- **Why:** Deferred since Phase 11.5 — prevents style drift across contributors
- **Dependencies:** None
- **Risk:** Low (but first run may reformat many files)
- **Complexity:** Low
- **Result:** ESLint v10 flat config (`eslint.config.js`), Prettier 3.8.1 (`.prettierrc`), Husky 9.1.7 (`.husky/pre-commit`), lint-staged 16.4.0. Pre-commit hook runs `npx lint-staged` on staged `backend/**/*.js` and `frontend/src/**/*.{js,jsx}`.

### 9.2 — Database migration auto-runner ✅ DONE

- **Files:** Update `backend/server.js` or add `scripts/migrate.js`
- **Action:** Run pending Sequelize migrations automatically on server startup (with safety guard for production). Alternatively, add to Docker entrypoint.
- **Why:** Currently migrations must be run manually — easy to forget after deploy
- **Dependencies:** None
- **Risk:** Medium (must never drop data in production)
- **Complexity:** Low
- **Result:** `runPendingMigrations()` added to `backend/server.js` using Umzug with SequelizeStorage. Runs pending migrations after DB connection is established, before server starts listening. Logs each migration applied.

### 9.3 — Environment config validation

- **Files:** Update `backend/server.js`
- **Action:** Extend existing `validateStartupEnvironment()` to check SMTP credentials, Google OAuth config, upload directory writability, and DB connection string format.
- **Why:** Missing config currently causes cryptic runtime errors
- **Dependencies:** None
- **Risk:** Low
- **Complexity:** Low

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Schema migrations break production | High | Run in staging first; add rollback scripts; never auto-migrate destructive changes |
| Bulk import corrupts grade data | High | Preview-before-commit pattern; transaction rollback on any validation failure |
| Integration tests flaky due to shared DB state | Medium | Use isolated test DB; reset between suites |
| E2E tests slow or brittle | Medium | Run only on CI, not pre-commit; use stable selectors |
| Large formatting commit from Prettier | Low | Do as single, separate PR with no logic changes |

---

## Testing Strategy

| Layer | Tool | Target Coverage | Phase |
|-------|------|-----------------|-------|
| Backend unit tests | Jest | ≥80% of utils/services | ✅ Done (8 suites, 156 tests) |
| Backend integration tests | Jest + Supertest | ≥80% of endpoints | ✅ Done (Phase 2) |
| Frontend unit tests | RTL + MSW | ≥70% of critical pages | ✅ Done (8 suites, 59 tests — Phase 3) |
| E2E tests | Playwright | 3 critical journeys | ✅ Done (17 tests, all passing — Phase 8) |

---

## Success Criteria

- [x] Transfer Ownership page accessible at `/admin/transfer-ownership`
- [x] Notifications inbox at `/notifications` with paginated history
- [x] Backend integration test coverage for auth, SAR, curriculum, grades (≥80% of endpoints)
- [x] Frontend RTL tests for 5 critical pages
- [x] Bulk grade CSV import working end-to-end
- [x] Audit log viewer at `/admin/audit-logs` with filtering
- [x] All color pairs pass WCAG AA contrast check
- [x] Playwright E2E tests for 3 critical journeys
- [x] API docs served at `/api/docs`
- [x] Pre-commit hooks enforce lint + format

---

## Priority Order

| Priority | Phase | Impact | Effort |
|----------|-------|--------|--------|
| **1** | Phase 1 — Missing routes & features | High | Low |
| **2** | Phase 2 — Backend integration tests | High | Medium |
| **3** | Phase 4 — Bulk operations | High | High |
| **4** | Phase 5 — Audit log viewer | Medium | Medium |
| **5** | Phase 3 — Frontend tests | Medium | Medium |
| **6** | Phase 6 — UX polish | Medium | Medium |
| **7** | Phase 7 — Schema fixes | Medium | Medium |
| **8** | Phase 8 — E2E tests & API docs | Medium | High |
| **9** | Phase 9 — DevOps hardening | Low | Low |

Phase 1 is the highest value-to-effort ratio — wiring an already-built page and adding a simple notifications inbox. Phase 2 (integration tests) is the most impactful quality investment. Phase 4 (bulk operations) addresses the biggest daily user pain point for advisers.
