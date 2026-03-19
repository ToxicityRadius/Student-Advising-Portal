# Commit Changes Summary (IMPROVEMENTS Style)

> **Commit:** `2f3075d462495268a81661992d139a4e471ab8f7`  
> **Date:** March 19, 2026  
> **Message:** Revisions  
> **Scope:** Large cross-cutting refactor and hardening across backend, frontend, tests, and DevOps  
> **Diff Size:** 111 files changed, 7450 insertions(+), 7166 deletions(-)

---

## Phase 1: Forecast & Demand Accuracy

- [x] Reworked forecast demand logic to use SAR-grounded aggregation path
- [x] Updated forecast endpoints and payload handling for current/next/comparison/history use cases
- [x] Updated dashboard-side consumption and rendering for revised forecast data

**Key files:**
- `backend/controllers/forecastController.js`
- `frontend/src/pages/admin/ForecastDashboard.js`

**Implementation notes:**
- Demand and forecast logic moved toward cleaner aggregation and reduced client-side assumptions.
- Frontend forecast views were updated to align with the new response behavior.

---

## Phase 2: Security Hardening & Request Safety

- [x] Added comprehensive request validation middleware modules
- [x] Added CSRF middleware and request-level protection wiring
- [x] Added mutation-focused rate limiting middleware
- [x] Added stronger upload validation utilities and enforcement points
- [x] Tightened auth route validation and token refresh flow behavior
- [x] Added response envelope support and safer error handling pathway

**Key files:**
- `backend/middleware/authValidation.js`
- `backend/middleware/csrf.js`
- `backend/middleware/curriculumValidation.js`
- `backend/middleware/rateLimiter.js`
- `backend/middleware/sarValidation.js`
- `backend/middleware/userValidation.js`
- `backend/middleware/validate.js`
- `backend/controllers/authController.js`
- `backend/utils/imageValidation.js`
- `backend/server.js`
- `frontend/src/utils/api.js`

**Implementation notes:**
- Validation moved closer to routes to fail fast before controller execution.
- State-changing requests now pass through stricter safety controls.

---

## Phase 3: Backend Architecture & Maintainability

- [x] Introduced service layer modules and shifted business logic out of large controllers
- [x] Added shared constants module for role and policy values
- [x] Added transaction policy helper for multi-write consistency
- [x] Added request context plumbing to improve traceability
- [x] Added audit logging utility for important security/data events
- [x] Refined JWT utility behavior and auth utility responsibilities
- [x] Added graceful shutdown and improved startup/runtime guards in server flow

**Key files:**
- `backend/services/SARService.js`
- `backend/services/UserService.js`
- `backend/services/GradeService.js`
- `backend/constants/index.js`
- `backend/middleware/transactionPolicy.js`
- `backend/middleware/requestContext.js`
- `backend/utils/auditLog.js`
- `backend/utils/jwt.js`
- `backend/controllers/sarController.js`
- `backend/controllers/userController.js`
- `backend/controllers/gradeController.js`
- `backend/server.js`

**Implementation notes:**
- Controller complexity was reduced by extracting reusable domain logic into services.
- Cross-cutting behavior became more centralized and testable.

---

## Phase 4: Data Model & Database Consistency

- [x] Updated model-level validators and constraints for key entities
- [x] Updated association and deletion behavior definitions in model index wiring
- [x] Expanded index coverage for important query paths
- [x] Updated DB configuration/connectivity behavior for local and containerized setups

**Key files:**
- `backend/models/AcademicTerm.js`
- `backend/models/Course.js`
- `backend/models/CurriculumCourse.js`
- `backend/models/StudentAcademicRecord.js`
- `backend/models/StudyPlanCourse.js`
- `backend/models/StudyPlanVersion.js`
- `backend/models/index.js`
- `backend/database/config.js`
- `backend/database/db.js`

**Implementation notes:**
- Data integrity enforcement moved closer to the model layer.
- Query performance and relationship safety were improved through schema-level updates.

---

## Phase 5: Frontend UX, Refactoring, and Shared Components

- [x] Added auth-aware root route behavior and app-level integration updates
- [x] Converted multiple heavy pages to extracted subcomponents for maintainability
- [x] Added shared side navigation item component and reduced layout duplication
- [x] Added notification context and improved notification lifecycle handling
- [x] Added shared frontend utility modules (constants, errors, formatters, grades)
- [x] Added asset barrel export for cleaner import patterns
- [x] Updated VerifyCode/Login/Student ID UX and accessibility-related behavior
- [x] Updated admin curriculum flows and course picker interactions

**Key files:**
- `frontend/src/App.js`
- `frontend/src/components/shared/SideNavItem.js`
- `frontend/src/components/shared/SidebarLayout.js`
- `frontend/src/components/student/StudentLayout.js`
- `frontend/src/context/NotificationContext.js`
- `frontend/src/context/AuthContext.js`
- `frontend/src/pages/Profile.js`
- `frontend/src/pages/ViewGrades.js`
- `frontend/src/pages/admin/CurriculumManagement.js`
- `frontend/src/components/admin/CurriculaTab.js`
- `frontend/src/components/admin/CoursesTab.js`
- `frontend/src/components/admin/EquivalenciesTab.js`
- `frontend/src/components/admin/CoursePickerModal.js`
- `frontend/src/utils/constants.js`
- `frontend/src/utils/errorHelpers.js`
- `frontend/src/utils/formatters.js`
- `frontend/src/utils/gradeHelpers.js`
- `frontend/src/assets/index.js`

**Implementation notes:**
- Several large UI files were split into focused components.
- Shared utilities and context providers reduced duplication and improved consistency.

---

## Phase 6: Testing Expansion

- [x] Added focused backend test suites for utilities and behavior contracts
- [x] Expanded auth-related tests and added image validation tests
- [x] Added test coverage for pagination, sanitization, analytics, and formatter logic

**Key files:**
- `backend/__tests__/featureFlags.test.js`
- `backend/__tests__/imageValidation.test.js`
- `backend/__tests__/pagination.test.js`
- `backend/__tests__/responseFormatter.test.js`
- `backend/__tests__/sanitize.test.js`
- `backend/__tests__/sarAnalytics.test.js`
- `backend/__tests__/studyPlanUtils.test.js`
- `backend/__tests__/auth.test.js`

**Implementation notes:**
- Commit materially increased backend confidence for utility-heavy and data-processing paths.

---

## Phase 7: DevOps, Tooling, and Delivery

- [x] Added CI workflow for install/test/build quality gates
- [x] Added Dockerfiles for backend and frontend
- [x] Added root docker-compose stack orchestration
- [x] Added ESLint configuration for backend and frontend
- [x] Updated ignore and workspace support files to align with new tooling

**Key files:**
- `.github/workflows/ci.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `docker-compose.yml`
- `backend/.eslintrc.json`
- `frontend/.eslintrc.json`
- `.gitignore`

**Implementation notes:**
- Project now has stronger baseline automation for CI and local containerized execution.

---

## Backend Files Touched (High Impact)

- Controllers: auth, forecast, grade, SAR, user
- Routes: auth, curriculum, grade, SAR, user
- Middleware: validation, CSRF, rate-limit, transaction, request context, envelope
- Services: SARService, UserService, GradeService
- Utils: jwt, audit log, sanitize, image validation, response formatter
- Models and DB config updated for integrity/performance

---

## Frontend Files Touched (High Impact)

- App routing/auth entry flow
- Student/adviser/admin page refactors and UX updates
- Shared layout and side nav extraction
- Notification and auth context behavior improvements
- Utilities centralization and asset export cleanup

---

## Commit Outcome Summary

- [x] Security posture improved across validation, CSRF, rate limits, and upload handling
- [x] Backend architecture moved toward service-first maintainable structure
- [x] Frontend maintainability improved through component extraction and shared utilities
- [x] Test and CI maturity significantly increased
- [x] Delivery tooling improved with Docker + workflow automation

---

## Phase 8: Notification System

- [x] Added persistent Notification model with recipientId, actorId, type, category, title, body, isRead, resourceType/Id, and BIGINT createdAt
- [x] Added NotificationService with `notify()`, `notifyMany()`, `getNotifications()`, `markAsRead()`, `markAllAsRead()`, `getUnreadCount()`, and category-based templates
- [x] Added notification REST controller with paginated list, unread count, mark-read, and mark-all-read endpoints
- [x] Added `/api/notifications` route group (all protected via `protect` middleware)
- [x] Wired Notification model associations (Recipient, Actor) and export in model index
- [x] Added notification triggers after study plan validation, grade entry, study plan regeneration, and SAR creation
- [x] Rewrote `getMyNotifications` to merge ephemeral profile-completion hints with persisted notifications
- [x] Rewrote NotificationContext with `unreadCount`, `markAsRead()`, `markAllAsRead()`, and 60-second polling
- [x] Updated StudentLayout bell to use `unreadCount` badge, per-item mark-as-read on click, and wired mark-all-read
- [x] Added full notification bell + dropdown to SidebarLayout for adviser/admin views

**Key files:**
- `backend/models/Notification.js` *(new)*
- `backend/services/NotificationService.js` *(new)*
- `backend/controllers/notificationController.js` *(new)*
- `backend/routes/notificationRoutes.js` *(new)*
- `backend/models/index.js`
- `backend/server.js`
- `backend/controllers/userController.js`
- `backend/controllers/validationController.js`
- `backend/controllers/gradeController.js`
- `backend/controllers/sarController.js`
- `frontend/src/context/NotificationContext.js`
- `frontend/src/components/student/StudentLayout.js`
- `frontend/src/components/shared/SidebarLayout.js`

**Implementation notes:**
- Notifications are persisted in a `notifications` table (auto-created by Sequelize sync; migration needed if using strict migration mode).
- `NotificationService.notify()` is fire-and-forget (non-blocking) so it never delays the primary response.
- Notification triggers fire after transaction commits to avoid notifying on rolled-back operations.
- Ephemeral profile-completion hints (no DB row) are merged client-side with persisted notifications in the feed.
- Adviser and admin views now have the same bell + dropdown UI that students already had.

**Notification trigger points:**

| Event | Category | Recipient | Controller |
|---|---|---|---|
| Study plan validated | `study_plan_validated` | Student | `validationController` |
| Grades entered | `grades_entered` | Student | `gradeController` |
| Study plan regenerated | `study_plan_regenerated` | Student | `gradeController` |
| SAR created | `sar_created` | Student | `sarController` |

---

## Follow-up Recommendation

1. Run full backend and frontend verification (tests + production build) after merge to confirm no environment-specific regressions.
2. Add integration/E2E coverage next to validate the new middleware/service interactions under realistic request flows.
3. Keep this summary synchronized with future commits that continue the same phased workstream.
4. Add a Sequelize migration for the `notifications` table if not relying on auto-sync.
5. Consider adding notification triggers for adviser-facing events (e.g., student submits elective track selection, student updates profile).
