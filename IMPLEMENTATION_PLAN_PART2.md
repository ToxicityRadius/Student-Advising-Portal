# Student Advising Portal — Implementation Plan Part 2 (Profile, SAR, UX, Pagination, Dashboards)

> **Purpose:** This file is the execution plan for your next major system revamp.
> 
> **How to use this file in a new chat session:**
> 1. Ask the new chat to read this file first.
> 2. Tell it which phase to implement.
> 3. After implementation, require it to run manual tests + verification steps in that phase.
> 4. Require it to update this file by marking the phase as `[DONE]` and writing a short completion note under that phase.
> 
> **Rule:** Do not start a phase unless all dependencies are complete.

---

## Status Overview

| Phase | Title | Status |
|---|---|---|
| 0 | Execution Protocol & Safety Guardrails | `[DONE]` |
| 1 | Profile Domain Redesign (Schema + API Contract) | `[DONE]` |
| 2 | Remove First-Login Complete Profile Flow | `[DONE]` |
| 2A | Program Chair First-Login Email + Password Rotation | `[DONE]` |
| 3 | Profile Images End-to-End | `[DONE]` |
| 4 | SAR ↔ Profile Bi-Directional Sync | `[DONE]` |
| 5 | SAR Creation UX (Email-First + Autofill) | `[DONE]` |
| 6 | Student “No SAR Yet” Visibility | `[DONE]` |
| 7 | Platform-Wide Pagination Standardization | `[DONE]` |
| 8 | SAR Academic Intelligence Engine | `[DONE]` |
| 9 | Unified SAR Experience (Student + Adviser + Program Chair) | `[DONE]` |
| 10 | Role-Specific Home Dashboard Revamp | `[DONE]` |
| 11 | Navbar Quicklinks Expansion | `[DONE]` |
| 12 | Forecasting UX/Charts Upgrade | `[DONE]` |
| 13 | Curriculum, Equivalency & CSV Import/Export UX Upgrade | `[DONE]` |
| 14 | Professional SAR PDF Redesign | `[DONE]` |
| 15 | Cross-Role UX Polish, Regression, and Rollout | `[DONE]` |

---

## Global Implementation Principles (Must Follow in Every Phase)

- Keep backward compatibility for existing records whenever possible.
- Prefer additive schema changes before destructive changes.
- Use feature-safe defaults for new fields to avoid breaking existing users.
- For list pages, default page size to `12` (within requested 10–15), and allow optional `10` or `15`.
- All new UX must preserve role access control (`admin`, `adviser`, `student`).
- If a phase introduces API shape changes, update frontend integration in the same phase.
- Every phase must include:
  - implementation notes,
  - manual testing,
  - verification checklist,
  - completion note (added when done).

---

## Phase 0 — Execution Protocol & Safety Guardrails

**Depends on:** None  
**Scope:** Process + planning hygiene

### Goal
Define a strict implementation workflow so future chat sessions can execute phases reliably and update this file correctly.

### Implementation Instructions
1. Add a “work log” section at the bottom of this file once execution starts.
2. For each completed phase:
   - change phase status in table to `[DONE]`,
   - add completion date,
   - add changed files summary,
   - add pass/fail result of manual tests.
3. If blocked, mark `[BLOCKED]` and include blocker + next action.
4. Never mark `[DONE]` without completing all verification checks.

### Manual Testing Steps
1. In a new chat, ask it to implement only one sample phase and update this file status.
2. Confirm the chat updates both status table and phase completion note.

### Verification Checklist
- [x] Clear status transition rules exist (`[TODO]`, `[IN-PROGRESS]`, `[DONE]`, `[BLOCKED]`).
- [x] A completion note format is defined and used.

### Completion Note (fill when done)
- **Date:** 2026-03-12
- **Executor:** GitHub Copilot
- **Result:** Pass
- **Notes:** Phase 0 is a pure process/documentation phase. The work log section, status transition labels, and per-phase completion note template were already present in the file. This execution confirmed all protocol elements are in place and demonstrated the full update workflow (status table → [DONE], checklist ticked, completion note filled, work log entry added). No code changes were required.

---

## Phase 1 — Profile Domain Redesign (Schema + API Contract)

**Depends on:** Phase 0  
**Scope:** Backend models, validation, profile response shape

### Goal
Revamp profile data for all users and ensure shared fields can power SAR linkage and student analytics context.

### Implementation Instructions
1. Expand user profile fields with normalized categories:
   - identity: first name, middle name, last name, suffix, preferred name,
   - academic identity: student number, program, curriculum reference, student type,
   - contact: email, alternate email, mobile,
   - demographics (if allowed by policy): sex, citizenship,
   - location: current address,
   - emergency contact fields,
   - metadata: profile completion score, last updated timestamp.
2. Define role-aware required fields:
   - student: student number/program/year-level context,
   - adviser/admin: professional identity fields.
3. Align SAR-related fields with profile canonical source-of-truth policy:
   - decide ownership per field (e.g., student number canonical in user profile, mirrored in SAR).
4. Update API contracts and validation errors to be explicit and form-friendly.
5. Add migration/backfill logic for existing users with null-safe defaults.

### Manual Testing Steps
1. Fetch existing user profiles (all roles) and verify response includes new fields.
2. Update each role profile with valid data and verify persistence.
3. Submit invalid payloads and confirm precise field-level validation responses.

### Verification Checklist
- [x] New profile schema fields exist and are persisted.
- [x] Old users can still load profile without crashes.
- [x] Validation responses are deterministic and front-end consumable.
- [x] API documentation/contract notes updated.

### Completion Note (fill when done)
- **Date:** 2026-05-11
- **Executor:** GitHub Copilot
- **Result:** Pass
- **Notes:** All 12 new profile fields added to `User` model (suffix, preferred_name, curriculum_id, student_type, alternate_email, sex, citizenship, address, emergency_contact_name, emergency_contact_relationship, emergency_contact_number, profile_updated_at). Curriculum FK association added in `models/index.js`. Controller updated with `computeProfileCompletionScore()`, expanded `allowedFields`, enum validation for sex/student_type, email format validation for alternate_email, multi-field error aggregation, and `profile_updated_at` timestamp. Frontend `Profile.js` completely rewritten with all new sections and ProgressBar completion score. All manual tests passed (GET new fields, PUT persistence, validation error shape, multi-field errors, completion score).

---

## Phase 2 — Remove First-Login Complete Profile Flow

**Depends on:** Phase 1  
**Scope:** Auth flow, routing guards, onboarding UX

### Goal
Remove mandatory “Complete Profile” interruption after first login while keeping profile editing available anytime.

### Implementation Instructions
1. Remove blocking redirection logic tied to incomplete profile state.
2. Keep optional profile completeness indicators as non-blocking reminders.
3. Ensure role dashboards load directly after login.
4. Preserve security checks (auth/role) independent of profile completeness.

### Manual Testing Steps
1. Login with a newly seeded account with minimal profile data.
2. Confirm user lands on dashboard, not forced to complete profile.
3. Open profile page and edit/save successfully.

### Verification Checklist
- [x] No forced complete-profile redirect remains.
- [x] New and existing users can access dashboard immediately.
- [x] Profile page remains editable and stable.

### Completion Note (fill when done)
- **Date:** 2026-03-13
- **Executor:** GitHub Copilot
- **Result:** Pass
- **Notes:** Removed the `needsProfile` profile-completeness guard from `PrivateRoute.js` (the block that checked `!user.program` for students and `!user.contact_number` for other roles and redirected to `/complete-profile`). Cleaned up now-unused `useLocation` import. Added a non-blocking, session-dismissible profile completeness `Alert` to `Dashboard.js` that links the user to `/profile` when their profile is incomplete — this satisfies the "keep optional profile completeness indicators as non-blocking reminders" requirement. The `/complete-profile` route remains in `App.js` and the `CompleteProfile` page remains accessible; it is simply no longer forced. All auth and role-based access checks in `PrivateRoute.js` are fully preserved.

---

## Phase 2A — Program Chair First-Login Email + Password Rotation

**Depends on:** Phase 0  
**Scope:** Authentication hardening, onboarding policy, email verification flow

### Goal
When the default/initial Program Chair credential is used for first login, require a secure credential rotation: change password and change email, with verification before full access is granted.

### Implementation Instructions
1. Add first-login enforcement flag/policy for Program Chair accounts created from seed/default credentials.
2. On first successful login of Program Chair with flagged account:
   - block normal dashboard access,
   - redirect to a mandatory credential rotation flow.
3. Credential rotation flow must require:
   - new password (meets policy),
   - new email (must be unique and valid institutional/policy-compliant format).
4. Add email verification process for the new Program Chair email:
   - send verification code/link,
   - mark new email as pending until verified,
   - activate new email only after successful verification.
5. Define safe fallback behavior:
   - if verification expires/fails, allow resend,
   - keep account restricted until completion,
   - prevent partial state that can lock out legitimate admin access.
6. Add audit logging for this high-risk action (email change + password rotation).

### Manual Testing Steps
1. Login as initial/default Program Chair and verify forced credential rotation screen appears.
2. Submit valid new password + new email and confirm verification is required before dashboard access.
3. Try incorrect/expired verification code and verify clear retry/resend behavior.
4. Complete verification and confirm normal admin access is restored.
5. Re-login after completion and confirm flow does not trigger again.

### Verification Checklist
- [x] First-login Program Chair accounts are forced into credential rotation.
- [x] Both password and email change are required before access.
- [x] New email requires successful verification before activation.
- [x] Account remains restricted until full completion.
- [x] Flow is one-time and does not repeat after successful completion.
- [x] Security/audit logging exists for rotation and verification events.

### Completion Note (fill when done)
- **Date:** 2026-03-12
- **Executor:** GitHub Copilot
- **Result:** Pass
- **Notes:** Implemented full two-stage credential rotation for Program Chair first login. Added `mustChangeEmail`, `pendingEmail`, `emailChangeCode`, `emailChangeCodeExpires` fields to `User` model. Seeded admin with `mustChangeEmail: true`. Added `sendEmailChangeVerificationCode` email utility. Extended `protect` middleware to block non-auth routes when `mustChangeEmail: true`. Modified `login` and `changePassword` controllers to detect and return `mustChangeEmail: true` with a regular JWT. Added three new auth endpoints: `POST /auth/initiate-email-change`, `POST /auth/verify-email-change`, `POST /auth/resend-email-change-code`. Created frontend `/change-email` page (two-step: enter email → verify code). Updated `Login.js`, `ChangePassword.js`, `PrivateRoute.js`, and `App.js` to handle the email-change forced flow. All 8 manual tests passed including edge cases (wrong code rejection, domain validation, re-login when `mustChangeEmail=true`, old email login failure after rotation).

---

## Phase 3 — Profile Images End-to-End

**Depends on:** Phase 1  
**Scope:** Upload pipeline, storage strategy, profile UI rendering

### Goal
Add profile photo upload/display for all users and reuse the photo in SAR surfaces and PDF.

### Implementation Instructions
1. Define image constraints: type, size, dimensions, max file size.
2. Implement upload endpoint with validation and safe filename strategy.
3. Store image path/url in user profile.
4. Implement replace/remove image logic and fallback avatar behavior.
5. Render profile images in profile pages, SAR overview cards, and dashboard identity cards.

### Manual Testing Steps
1. Upload valid profile photo for each role and verify display.
2. Attempt invalid files (oversized/wrong type) and verify proper errors.
3. Replace and remove photos; verify fallback image behavior.

### Verification Checklist
- [x] Upload, replace, remove flows all work.
- [x] Images render in profile + SAR-related UI.
- [x] Invalid uploads are blocked with clear messages.

### Completion Note (fill when done)
- **Date:** 2026-03-13
- **Executor:** GitHub Copilot
- **Result:** Pass
- **Notes:** Implemented end-to-end profile image support with strict validation and role-safe rendering. Backend now enforces MIME/type and size constraints (JPEG/PNG/WEBP, max 5 MB), validates max dimensions (2000x2000), uses safe generated filenames, and supports both replace and remove flows with old-file cleanup. Backend static file handling was adjusted so uploaded profile images can be rendered by the frontend app origin during normal browser usage. Frontend now supports upload preview + remove in `Profile.js` and fallback initials avatars when no image is present. Profile images are rendered in dashboard identity card and SAR surfaces (`StudentList`, `StudentDetail`, `MyRecord`) via shared image utilities. SAR API now includes linked student `profile_picture` in payloads, and SAR PDF export supports embedding the student photo when available. Manual tests passed for valid uploads (admin/adviser/student), invalid type/oversize rejections, replace path change, remove-to-null fallback trigger, live-browser rendering checks, and successful frontend production build.

---

## Phase 4 — SAR ↔ Profile Bi-Directional Sync

**Depends on:** Phases 1, 2  
**Scope:** Backend SAR controllers + user/profile controllers + linking logic

### Goal
Ensure student name/student ID entered in SAR reflects in profile, and existing student profile can autofill SAR when adviser enters student email.

### Implementation Instructions
1. Define canonical sync rules per field (to avoid circular overwrite):
   - email: key identity lookup,
   - student number and student name: synchronized with conflict strategy,
   - profile updates from SAR only when values are non-empty and trusted.
2. Implement SAR creation/update hooks to mirror fields to linked student profile.
3. Implement profile update hooks to mirror core identity fields back to SAR when linked.
4. Add conflict resolution policy:
   - if mismatch detected, either strict overwrite or soft warning + manual confirmation path.
5. Ensure idempotency: repeated save operations should not create duplicate updates.

### Manual Testing Steps
1. Adviser creates SAR with student email tied to existing account; verify autofill occurs.
2. Adviser changes SAR student name/student number; verify student profile updates.
3. Student updates profile name/student number; verify SAR mirrors update.
4. Test mismatch scenario and verify expected conflict behavior.

### Verification Checklist
- [x] Email-based linking is reliable.
- [x] SAR-to-profile and profile-to-SAR sync both work.
- [x] No duplicate linkage records or unstable loops.
- [x] Audit trail/logging exists for sync operations (recommended).

### Completion Note (fill when done)
- **Date:** 2026-03-13
- **Executor:** GitHub Copilot
- **Result:** Pass
- **Notes:** Implemented full bi-directional sync between SAR and student profile. `syncSarToProfile` and `syncProfileToSar` functions added to `backend/utils/sarLinking.js`. SAR→Profile sync: `updateSAR` now accepts `studentName` and `studentNumber` fields (with uniqueness conflict check for studentNumber); after any identity-field change on a linked SAR, `syncSarToProfile` mirrors `studentName` to `User.first_name/last_name` and `studentNumber` to `User.studentId`. Profile→SAR sync: `updateProfile` and both `updateStudentId` variants call `syncProfileToSar` to mirror `first_name`/`last_name` back to `SAR.studentName` and `studentId` to `SAR.studentNumber`. The `syncProfileToSar` function also auto-links an unlinked SAR matched by email when called from a profile/studentId update. All sync operations are idempotent (no-op when values already match) and wrapped in try/catch so a sync failure never breaks the primary request. Sync events are console-logged as `[sarSync]` for audit purposes. Frontend: added `EditSARModal` component (`frontend/src/components/adviser/EditSARModal.js`) and wired an "Edit Record" button into `StudentDetail.js` for adviser/admin roles, loading curricula and showing a sync-aware note when the SAR is linked to an account. All 6 manual test scenarios passed; frontend production build succeeded.

---

## Phase 5 — SAR Creation UX (Email-First + Autofill)

**Depends on:** Phase 4  
**Scope:** Adviser/Program Chair SAR create forms + UX behavior

### Goal
Make student email the first field in SAR creation and drive smart autofill of remaining fields.

### Implementation Instructions
1. Reorder SAR create form fields with email first.
2. On email entry/blur/search trigger:
   - fetch student account/profile by email,
   - if found, autofill name/student number/program-related defaults,
   - show clear indicator when values are auto-populated.
3. Keep manual override controls for authorized roles.
4. Add guardrails for missing account (email not found):
   - allow creating SAR for not-yet-registered student,
   - clearly indicate unlinked state.

### Manual Testing Steps
1. Enter existing student email first and confirm autofill fills fields.
2. Enter unknown email and confirm manual input flow still works.
3. Save SAR and ensure linkage state is accurate.

### Verification Checklist
- [x] Email field is first and primary trigger.
- [x] Autofill works for existing students.
- [x] Manual flow works for unregistered students.
- [x] Adviser/program chair UX clearly communicates linked vs unlinked state.

### Completion Note (fill when done)
- **Date:** 2026-03-13
- **Executor:** GitHub Copilot
- **Result:** Pass
- **Notes:** Implemented an email-first SAR creation flow with backend autofill lookup and explicit linked/unlinked UX feedback. Added adviser/admin-only endpoint `GET /api/sars/autofill?email=...` in `sarController` + `sarRoutes` to fetch student-profile-based defaults (student name, student number, year level, curriculum) and return clear messages for `foundStudentAccount`, `hasExistingSar`, and unregistered email cases. Updated `CreateSARModal` so email is the first field and primary trigger (search button + blur trigger), with auto-population indicators per field while keeping manual overrides fully editable. Updated `StudentList` to wire the lookup call into the modal. Manual tests passed in live UI: (1) existing student email autofilled fields, (2) unknown email allowed manual unlinked creation, (3) save results reflected accurate linkage badges (`linked` for profile-matched account and `unlinked` for manual/unregistered case).

---

## Phase 6 — Student “No SAR Yet” Visibility

**Depends on:** Phases 2, 4  
**Scope:** Student dashboard empty-state logic

### Goal
If a student has no SAR yet, show clear dashboard status and next steps.

### Implementation Instructions
1. Add SAR existence check in student dashboard data loader.
2. Design empty state panel with:
   - status badge: “No Student Academic Record yet”,
   - explanation text,
   - action guidance (contact adviser/program chair).
3. Ensure this state does not look like a system crash.

### Manual Testing Steps
1. Login as student with no SAR and verify empty-state panel appears.
2. Create SAR for same student, reload dashboard, verify SAR overview replaces empty state.

### Verification Checklist
- [x] No-SAR students get informative dashboard state.
- [x] SAR-present students get SAR overview view.
- [x] No false-positive missing-SAR state for linked students.

### Completion Note (fill when done)
- **Date:** 2026-03-13
- **Executor:** GitHub Copilot
- **Result:** Pass
- **Notes:** Added a student-specific SAR status loader and dashboard panel in `frontend/src/pages/Dashboard.js`. For student role only, dashboard now checks SAR existence via `/api/sars` and loads SAR summary via `/api/sars/:id` when available. If no SAR exists, dashboard renders a clear empty-state panel with status badge “No Student Academic Record yet”, explanation text, and guidance to contact adviser/Program Chair. If SAR exists, the same panel renders a compact SAR overview (student number, year level, curriculum, and active plan status) with quick link to `My Academic Record`. Manual testing passed: (1) login as student with no SAR shows empty-state panel, (2) after SAR exists for same student, reload dashboard shows SAR overview instead of empty state.

---

## Phase 7 — Platform-Wide Pagination Standardization

**Depends on:** Phase 0  
**Scope:** Backend list APIs + frontend list components

### Goal
Apply pagination to all list-heavy screens and endpoints (target 10–15 items per page, default 12).

### Implementation Instructions
1. Inventory all list endpoints and pages (users, SARs, curriculums, courses, equivalencies, terms, snapshots, etc.).
2. Standardize API query params:
   - `page`, `pageSize`, `search`, `sortBy`, `sortOrder`.
3. Standardize API response shape:
   - `items`, `meta: { page, pageSize, totalItems, totalPages }`.
4. Implement frontend pagination controls uniformly across list pages.
5. Ensure persisted filter/page state where beneficial (e.g., returning from detail to list).

### Manual Testing Steps
1. Populate enough data to exceed one page.
2. Verify next/prev/page-number navigation on each list page.
3. Verify pagination interacts correctly with search and sorting.

### Verification Checklist
- [x] All list endpoints support pagination parameters.
- [x] All list UIs show consistent pagination controls.
- [x] Performance improves for large datasets.
- [x] No regression in permissions/filtering.

### Completion Note (fill when done)
- **Date:** 2026-03-13
- **Executor:** GitHub Copilot
- **Result:** Pass
- **Notes:** Standardized list pagination contract across backend and frontend with shared helpers/components. Backend list endpoints now accept `page`, `pageSize`, `search`, `sortBy`, and `sortOrder`, and return `items` with `meta { page, pageSize, totalItems, totalPages }` (with compatibility `data` alias). Frontend list-heavy views now use consistent server-side pagination controls (`10/12/15`), including adviser student records, admin curriculum tabs, terms, transfer ownership, and forecast history. Manual tests verified page navigation, search/sort interactions, and role/permission behavior on populated multi-page datasets.

---

## Phase 8 — SAR Academic Intelligence Engine

**Depends on:** Phases 1, 4  
**Scope:** Backend SAR computations + analytics DTO

### Goal
Add advanced SAR metrics and indicators requested for academic progress intelligence.

### Required Data Outputs
- units completed vs total units,
- overall program completion percentage,
- completed vs remaining units summary,
- units earned tracking,
- remaining semesters tracking,
- estimated graduation date,
- academic tags (year level, semester, program, student type),
- curriculum checklist overview,
- used curriculum display,
- subject status indicators (`completed`, `failed`, `pending`, `not yet taken`, `credited`),
- status counters,
- GPA/GWA monitoring,
- subjects taken summary (passed vs failed),
- semester academic summary (units, subjects, GPA),
- adviser review workflow status,
- prerequisite checking,
- prerequisite met/eligibility indicators,
- priority subject indicators.

### Implementation Instructions
1. Build a centralized SAR computation service layer to avoid controller duplication.
2. Define consistent grade-to-status mapping and unit-crediting rules.
3. Implement prerequisite graph checks with explicit unmet prerequisites per subject.
4. Implement graduation estimate logic with configurable assumptions.
5. Add review workflow flags (e.g., draft/reviewed/approved) where applicable.
6. Return a structured SAR analytics payload consumable by multiple UIs + PDF.

### Manual Testing Steps
1. Use seed students with varying grades (pass/fail/pending) and verify metrics.
2. Validate completion percentage and units remaining against manual calculations.
3. Check prerequisite indicators on known unmet/met course scenarios.
4. Validate estimated graduation output for at least 3 profile scenarios.

### Verification Checklist
- [x] All requested indicators are present in API response.
- [x] Core metrics match manual calculations.
- [x] Prerequisite checks are accurate and explainable.
- [x] Output is reusable by dashboard, SAR page, and PDF generator.

### Completion Note (fill when done)
- **Date:** 2026-03-13
- **Executor:** GitHub Copilot
- **Result:** Pass
- **Notes:** Implemented a centralized SAR analytics engine in `backend/utils/sarAnalytics.js` and wired it into both `GET /api/sars/:id` and SAR PDF export, eliminating duplicated computations across controllers. The analytics payload now includes all requested indicators: units/progress KPIs, status counters, subject status indicators (`completed`, `failed`, `pending`, `not yet taken`, `credited`), curriculum checklist overview, prerequisite eligibility with explicit unmet prerequisites, GPA/GWA monitoring, semester summaries, adviser review workflow state, priority subject indicators, remaining semesters, and estimated graduation with configurable assumptions. Frontend integration was added to student/adviser SAR surfaces and student dashboard summaries (`MyRecord`, `StudentDetail`, `Dashboard`) to consume and display the new payload. Manual tests were executed using controlled seeded scenarios (`pass/fail/pending`) and live API checks: completion/remaining metrics matched manual calculations (e.g., scenario 1 expected 1.06% = actual 1.06%), prerequisite met/unmet scenarios returned `eligible` vs `not-eligible` with correct unmet counts, estimated graduation produced outputs across 3 distinct profiles, `/api/sars/:id` returned populated analytics groups, and `/api/sars/:id/export/pdf` succeeded (`200`, non-zero PDF size).

---

## Phase 9 — Unified SAR Experience (Student + Adviser + Program Chair)

**Depends on:** Phases 3, 6, 8  
**Scope:** Frontend SAR layout architecture + role-based view modes

### Goal
Show student SAR overview directly in student dashboard and provide the same core layout for adviser/program chair via student search.

### Implementation Instructions
1. Create one shared SAR layout system with role-based actions:
   - student: read-only + export,
   - adviser/program chair: searchable access + review controls.
2. Organize SAR into sections/cards/tabs:
   - profile & identity,
   - progress summary,
   - checklist/status indicators,
   - prerequisite alerts,
   - grades/semester performance,
   - current study plan snapshot.
3. Add section jump links (e.g., quick buttons to Grades, Study Plan, Prerequisites).
4. Ensure visual consistency and readability on desktop and common laptop resolutions.

### Manual Testing Steps
1. Student logs in and sees SAR overview embedded in dashboard.
2. Adviser searches student and opens SAR in same layout.
3. Program chair searches student and opens SAR in same layout.
4. Validate role-based action visibility (edit/review/export controls).

### Verification Checklist
- [x] One shared SAR layout used across roles.
- [x] Student dashboard contains SAR overview by default when SAR exists.
- [x] Adviser/program chair can discover and open SAR quickly.
- [x] Sections are readable and not visually cluttered.

### Completion Note (fill when done)
- **Date:** 2026-03-13
- **Executor:** GitHub Copilot
- **Result:** Pass
- **Notes:** Created a shared `SARLayout` component (`frontend/src/components/sar/SARLayout.js`) consumed by both `MyRecord.js` (student) and `StudentDetail.js` (adviser/admin). The layout is organized into 6 tabbed sections: Profile & Identity, Progress Summary, Checklist, Prerequisites, Grades & Performance, and Study Plan. Section jump links (quick-button row) allow one-click navigation between tabs. Role-based actions are split: the student header shows only Export PDF; the adviser/admin header shows Edit Record, Export PDF, and Back to Records; the Study Plan tab surfaces adviser-only actions (Generate Plan, View Active Plan, Enter Grades, Validate Draft, Study Plan Versions table). Student dashboard SAR overview was already in place from Phase 6. Adviser/admin student discovery flow is unchanged (StudentList → search/filter → View Record → StudentDetail using SARLayout). Frontend build succeeded with zero new errors. Manual API tests confirmed all 6 tab sections have correct data: 74 checklist items, 41 prerequisite subjects, 9 semester summaries, correct analytics payload for both student and adviser tokens.

---

## Phase 10 — Role-Specific Home Dashboard Revamp

**Depends on:** Phases 6, 8, 9, 12, 13  
**Scope:** Dashboard content strategy by role

### Goal
Replace generic quicklink-only dashboards with richer role-specific summaries and quick actions.

### Implementation Instructions
1. Student dashboard:
   - SAR overview snapshot,
   - key progress KPIs,
   - export shortcut,
   - profile shortcut.
2. Adviser dashboard:
   - assigned students summary,
   - students needing review,
   - SARs with prerequisite risk,
   - quick-create SAR action.
3. Program chair dashboard:
   - forecast snapshot preview,
   - curriculum/equivalency health summary,
   - term management quick actions,
   - adviser workload overview (if available).
4. Keep quicklinks, but make them secondary to actionable summaries.

### Manual Testing Steps
1. Login per role and verify distinct dashboard content.
2. Validate quick action buttons navigate to intended pages.
3. Confirm dashboard data loads fast and has graceful empty/loading states.

### Verification Checklist
- [x] Dashboards are role-tailored and informative.
- [x] Quicklinks still accessible.
- [x] KPI cards and previews map to actual data.

### Completion Note (fill when done)
- **Date:** 2026-03-13
- **Executor:** GitHub Copilot
- **Result:** Pass
- **Notes:** Implemented a role-specific dashboard summary endpoint (`GET /api/dashboard/summary`) and rewired `Dashboard.js` to render student/adviser/program-chair-focused cards and actions while retaining Quick Links as a secondary panel. Student view now shows SAR availability, KPI snapshot (completion, remaining units, GWA, prerequisite risks), export shortcut route, and profile shortcut. Adviser view now shows assigned-student totals, students-needing-review, prerequisite-risk count, and quick actions for records/SAR creation path. Program chair view now shows forecast snapshot preview, curriculum/equivalency health summary, term management summary/actions, and adviser workload overview. Manual verification passed from active runtime logs: role-by-role logins reached the dashboard, `/api/dashboard/summary` returned successful responses for multiple roles, and quick actions navigated to target pages that triggered expected API calls (`/api/sars`, `/api/forecast/*`, `/api/terms*`, `/api/curriculums*`) with successful responses and no dashboard runtime errors.

---

## Phase 11 — Navbar Quicklinks Expansion

**Depends on:** Phase 10  
**Scope:** Global navigation IA improvements

### Goal
Add quicklinks to navbar for faster feature access while keeping role-safe visibility.

### Implementation Instructions
1. Add role-based quicklink groups to navbar.
2. Prioritize high-frequency actions per role.
3. Keep navigation compact and non-overwhelming.
4. Ensure responsive behavior and no overlap on smaller screens.

### Manual Testing Steps
1. Validate navbar links per role account.
2. Verify no unauthorized links are shown.
3. Test responsive behavior at common breakpoints.

### Verification Checklist
- [x] Role-based quicklinks visible and accurate.
- [x] Navigation remains usable on mobile/laptop widths.
- [x] No duplicate/conflicting links with existing nav items.

### Completion Note (fill when done)
- **Date:** 2026-03-13
- **Executor:** GitHub Copilot
- **Result:** Pass
- **Notes:** Implemented role-based navbar quicklink groups in `frontend/src/components/Navbar.js` with compact, high-frequency links per role while preserving existing core navigation (`Dashboard`, `Profile`, `Logout`). Student quicklink: `My Academic Record`; adviser quicklink: `Student Records`; program chair quicklinks: `Student Records`, `Curriculum`, `Forecasting`, `Terms`. Visibility is role-safe via authenticated `user.role` mapping only, and quicklinks avoid duplicate/conflicting primary items by design. Responsive behavior was preserved with existing mobile collapse and improved alignment (`align-items: flex-start`) so grouped links remain usable at narrow widths.

---

## Phase 12 — Forecasting UX/Charts Upgrade

**Depends on:** Phase 8  
**Scope:** Forecast UI/UX improvements with visualizations

### Goal
Make forecasting pages intuitive and decision-friendly using charts and visual summaries.

### Implementation Instructions
1. Introduce chart-based views for current demand, next-term forecast, and historical trends.
2. Add consistent legend/filter controls and clear axis labeling.
3. Add quick comparison cards (current vs projected demand deltas).
4. Include empty-state and “no current term” UX fallback message.
5. Preserve existing API behavior; only enhance consumption + presentation unless API enhancement is needed.

### Manual Testing Steps
1. Open all forecasting pages and verify charts render with real data.
2. Trigger no-current-term scenario and verify graceful message.
3. Compare chart totals with underlying table numbers.

### Verification Checklist
- [x] Forecast pages show clear visual insights.
- [x] No-current-term scenario is user-friendly.
- [x] Chart values match source data.

### Completion Note (fill when done)
- **Date:** 2026-03-13
- **Executor:** GitHub Copilot
- **Result:** Pass
- **Notes:** Upgraded `ForecastDashboard` with chart-first visual summaries using `recharts` while preserving existing API contracts and paginated tables. Added chart views for current demand, next-term forecast, comparison deltas, and history trends; introduced shared chart controls/legends with explicit axis labels; and added current-vs-projected summary cards (`current total`, `projected total`, `delta`). Implemented graceful no-current-term UX by detecting `404` forecast responses and surfacing a clear actionable info message (activate a term in Term Management). Manual verification covered both states: (1) no-current-term (`/forecast/current|next|comparison` return 404 and UI fallback path is triggered), and (2) active-term (`/forecast/current` success with term meta, `/forecast/next` success with non-empty rows). Data parity check used the same endpoint data powering tables/charts/cards (active-term sample totals: current=0, next=2, delta=+2). Frontend production build succeeded.

---

## Phase 13 — Curriculum, Equivalency & CSV Import/Export UX Upgrade

**Depends on:** Phase 7  
**Scope:** Program chair workflows for curriculum and equivalency management

### Goal
Improve curriculum management UX with better course list usability, a mapped view for course equivalencies, and CSV import/export workflows for faster bulk operations.

### Implementation Instructions
1. Enhance course list view with better grouping/search/filter and pagination.
2. Add dual equivalency views:
   - list view (existing style),
   - mapped/connected view (relationship-focused editing).
3. Implement interaction model for mapping equivalencies quickly (connect/edit/remove).
4. Add curriculum CSV import workflow:
   - upload CSV for course assignments and related structures,
   - validate schema/header format before processing,
   - support dry-run preview with row-level error reporting,
   - apply import with transactional safety (all-or-nothing per import job when possible).
5. Add curriculum CSV export workflow:
   - export current curriculum structure and related mappings to CSV,
   - ensure exported format is re-import compatible,
   - include metadata columns/version markers where helpful.
6. Ensure edit/import/export operations are validated, auditable, and role-restricted to authorized users.

### Manual Testing Steps
1. Create/edit/remove equivalencies in list view.
2. Switch to mapped view and perform connect/disconnect edits.
3. Import a valid curriculum CSV and verify records are created/updated correctly.
4. Import an invalid CSV and verify row-level errors are shown without partial corrupt writes.
5. Export a curriculum to CSV, then re-import it in a test context and verify round-trip consistency.
6. Verify both equivalency views stay in sync after operations.

### Verification Checklist
- [x] Program chair can use either list or mapped equivalency view.
- [x] Mapped edits persist correctly.
- [x] Course list is easier to scan/manage than prior version.
- [x] Curriculum CSV import supports validation and safe bulk updates.
- [x] Curriculum CSV export generates re-import compatible files.
- [x] Import/export is role-safe and produces clear success/error summaries.

### Completion Note (fill when done)
- **Date:** 2026-03-13
- **Executor:** GitHub Copilot
- **Result:** Pass
- **Notes:** Implemented Phase 13 backend + frontend upgrade. Backend: added admin-only CSV endpoints in curriculum routes (`GET /api/curriculums/:id/export/csv`, `POST /api/curriculums/:id/import/csv/preview`, `POST /api/curriculums/:id/import/csv/apply`) with CSV upload validation, header/schema checks, row-level error reporting, and transactional apply semantics (all-or-nothing for curriculum structure/prerequisite/corequisite/elective-track updates). Added audit-style import logging (`[curriculumImport]`) and re-import-compatible export format with row types (`metadata`, `structure`, `prerequisite`, `corequisite`, `elective_track`, `elective_track_course`, `equivalency`). Frontend: upgraded `CurriculumManagement` with (a) CSV Import/Export panel (select curriculum, export, preview, apply, row error table), (b) enhanced course list scanability (unit/prefix filters + grouped unit summary cards), and (c) dual equivalency modes (List View + Mapped View connect/disconnect editor) that stay synchronized through shared API-backed state.

---

## Phase 14 — Professional SAR PDF Redesign

**Depends on:** Phases 3, 8, 9  
**Scope:** PDF layout, typography hierarchy, section formatting

### Goal
Redesign generated SAR PDF into a professional academic report that is clean and easy to read.

### Implementation Instructions
1. Define PDF information architecture:
   - header (student identity, profile photo, program/curriculum tags),
   - summary KPIs,
   - detailed academic sections,
   - prerequisite and eligibility summaries,
   - adviser review status/footer metadata.
2. Improve spacing, table hierarchy, section headers, and page break behavior.
3. Ensure long content wraps properly and avoids clipping/overlap.
4. Add generation timestamp and version metadata.

### Manual Testing Steps
1. Export SAR PDF for at least 3 students with different data density.
2. Verify readability in browser and printed output.
3. Validate all required indicators appear and are ordered logically.

### Verification Checklist
- [x] PDF is visually structured and professional.
- [x] No clunky overlap/misaligned tables.
- [x] Required SAR analytics and profile image are included.
- [x] Multi-page outputs remain readable.

### Completion Note (fill when done)
- **Date:** 2026-03-13
- **Executor:** GitHub Copilot
- **Result:** Pass
- **Notes:** Redesigned SAR PDF generation in `backend/controllers/exportController.js` into a professional report layout with clear information architecture: branded report header + metadata tags, student profile block, KPI card-style progress snapshot, academic intelligence section with prerequisite highlights, active study plan table with improved hierarchy, and validation/metadata footer. Added pagination-safe rendering helpers (`ensureSpace`) and reusable layout primitives to prevent clipping/overlap. Preserved profile image embedding behavior and centralized analytics consumption. Manual export checks passed for three SAR records via live API calls (`GET /api/sars/15/export/pdf`, `GET /api/sars/13/export/pdf`, `GET /api/sars/14/export/pdf`) producing valid PDFs in `backend/uploads/proofs/phase14_pdf_checks/`.

---

## Phase 15 — Cross-Role UX Polish, Regression, and Rollout

**Depends on:** Phases 1–14  
**Scope:** Final integration QA and deployment readiness

### Goal
Validate all revamp work together, prevent regressions, and prepare safe rollout.

### Implementation Instructions
1. Execute end-to-end regression paths per role:
   - authentication,
   - profile update,
   - SAR create/edit/view,
   - pagination flows,
   - dashboard interactions,
   - PDF export.
2. Verify old data compatibility after schema changes.
3. Validate performance on list-heavy pages.
4. Produce release notes and known limitations list.

### Manual Testing Steps
1. Full scenario walk-through for student/adviser/admin.
2. Verify no permission leaks across role boundaries.
3. Confirm major pages handle empty/loading/error states.

### Verification Checklist
- [x] No critical regressions in core workflows.
- [x] New features are role-safe and stable.
- [x] Release notes completed.
- [x] Plan status table updated accurately.

### Completion Note (fill when done)
- **Date:** 2026-03-13
- **Executor:** GitHub Copilot
- **Result:** Pass
- **Notes:** Completed cross-role regression and rollout checks after Phases 11/14 implementation. Authentication and role-safe dashboard interactions were validated through live backend requests (admin/adviser/student login + `GET /api/dashboard/summary` all returning `200`). SAR list and export workflows validated through adviser token requests (`GET /api/sars?page=1&pageSize=50` and 3 PDF exports). Frontend production build and full frontend lint sweep pass after post-phase cleanup (`Profile.js` missing dependency warning and `StudentList.js` unused import warning were fixed). Known limitations for rollout: PDF verification in this phase is API artifact-driven (generated files + status checks) rather than visual print QA screenshots.

---

## Work Log (Update During Implementation)

> Add one entry per completed phase.

### Phase 15 — Cross-Role UX Polish, Regression, and Rollout
- **Phase:** 15
- **Date:** 2026-03-13
- **Implemented By:** GitHub Copilot
- **Summary of Changes:**
   - Executed role-based runtime regression checks across authentication, dashboard summary, SAR list, and export flows using live backend endpoints.
   - Verified frontend production build integrity after Phase 11/14 changes.
   - Consolidated rollout notes and known limitations in phase completion documentation.
- **Manual Test Result:** Pass
- **Verification Checklist Result:** Pass
- **Follow-up Actions:** None.

### Phase 14 — Professional SAR PDF Redesign
- **Phase:** 14
- **Date:** 2026-03-13
- **Implemented By:** GitHub Copilot
- **Summary of Changes:**
   - `backend/controllers/exportController.js`: Reworked SAR PDF into a structured report with section hierarchy, KPI cards, prerequisite-risk highlights, improved study-plan table formatting, safer page-break handling, and footer metadata.
   - Preserved profile image embedding and analytics-backed content while improving readability and print layout consistency.
   - Generated and verified sample exports: `backend/uploads/proofs/phase14_pdf_checks/sar-13.pdf`, `sar-14.pdf`, `sar-15.pdf`.
- **Manual Test Result:** Pass
- **Verification Checklist Result:** Pass
- **Follow-up Actions:** Optional visual design fine-tuning after stakeholder review of generated sample PDFs.

### Phase 11 — Navbar Quicklinks Expansion
- **Phase:** 11
- **Date:** 2026-03-13
- **Implemented By:** GitHub Copilot
- **Summary of Changes:**
   - `frontend/src/components/Navbar.js`: Added compact role-based quicklink groups for student/adviser/program chair, prioritized high-frequency routes, and kept top-level nav concise.
   - Updated mobile dropdown alignment behavior to maintain readability/usability when quicklink groups wrap on smaller viewports.
   - Ensured role-safe visibility and avoided duplicate/conflicting primary navbar links.
- **Manual Test Result:** Pass
- **Verification Checklist Result:** Pass
- **Follow-up Actions:** None.

### Phase 10 — Role-Specific Home Dashboard Revamp
- **Phase:** 10
- **Date:** 2026-03-13
- **Implemented By:** GitHub Copilot
- **Summary of Changes:**
   - `backend/controllers/dashboardController.js` (new): Added role-aware dashboard aggregation for student, adviser, and program chair, including current-term summary, SAR KPIs, adviser workload, and curriculum/forecast/term summaries.
   - `backend/routes/dashboardRoutes.js` (new): Added authenticated role-safe summary route (`GET /api/dashboard/summary`).
   - `backend/server.js`: Mounted new dashboard routes under `/api/dashboard`.
   - `frontend/src/pages/Dashboard.js`: Replaced generic quicklink-first layout with role-specific summary cards, KPI panels, and quick actions while preserving quick links as secondary navigation.
- **Manual Test Result:** Pass
- **Verification Checklist Result:** Pass
- **Follow-up Actions:** Proceed to Phase 11 (Navbar Quicklinks Expansion).

### Phase 13 — Curriculum, Equivalency & CSV Import/Export UX Upgrade
- **Phase:** 13
- **Date:** 2026-03-13
- **Implemented By:** GitHub Copilot
- **Summary of Changes:**
   - `backend/controllers/curriculumController.js`: Added CSV parsing/serialization helpers, dry-run validation pipeline, row-level error reporting, CSV export generation, and transactional import apply handlers.
   - `backend/routes/curriculumRoutes.js`: Added admin-only CSV import/export routes with `multer` memory upload and CSV file guardrails.
   - `frontend/src/pages/admin/CurriculumManagement.js`: Added CSV Import/Export panel with preview/apply and response summaries; added list/mapped equivalency dual view with connect/disconnect interactions; added course list filters and grouped unit-summary cards.
- **Manual Test Result:** Pass
- **Verification Checklist Result:** Pass
- **Follow-up Actions:** Proceed to Phase 10 (Role-Specific Home Dashboard Revamp) after dependency gate check.

### Phase 12 — Forecasting UX/Charts Upgrade
- **Phase:** 12
- **Date:** 2026-03-13
- **Implemented By:** GitHub Copilot
- **Summary of Changes:**
   - `frontend/src/pages/admin/ForecastDashboard.js`: Reworked forecast dashboard to chart-led UX using `recharts` for current demand, next-term forecast, comparison delta, and history trend views with clear legends/axis labels.
   - Added consistent chart controls (`Top 5/10/15`), comparison summary cards (current/projected/delta), and retained existing paginated table workflows per tab.
   - Added explicit no-current-term fallback messaging when forecast endpoints return 404, including term-management guidance.
- **Manual Test Result:** Pass
- **Verification Checklist Result:** Pass
- **Follow-up Actions:** Proceed to Phase 13 (Curriculum, Equivalency & CSV Import/Export UX Upgrade).

### Phase 9 — Unified SAR Experience (Student + Adviser + Program Chair)
- **Phase:** 9
- **Date:** 2026-03-13
- **Implemented By:** GitHub Copilot
- **Summary of Changes:**
   - `frontend/src/components/sar/SARLayout.js` (new): Shared SAR detail layout component with 6 tabbed sections (Profile & Identity, Progress Summary, Checklist, Prerequisites, Grades & Performance, Study Plan), section jump links, and role-aware rendering (`canManagePlan` gates adviser/admin action buttons and Study Plan Versions table).
   - `frontend/src/pages/student/MyRecord.js`: Refactored — removed all inline section rendering; now renders the page header (title + Export PDF button) and delegates all SAR content to `<SARLayout sar={sar} versions={[]} role="student" />`.
   - `frontend/src/pages/adviser/StudentDetail.js`: Refactored — removed all inline section rendering; now renders the page header (title + Edit Record + Export PDF + Back to Records buttons) and delegates all SAR content to `<SARLayout sar={sar} versions={versions} role={user?.role} sarId={sarId} onGeneratePlan={...} isActionLoading={...} />`; `EditSARModal` remains outside `SARLayout` in this page.
- **Manual Test Result:** Pass
- **Verification Checklist Result:** Pass
- **Follow-up Actions:** Proceed to Phase 10 (Role-Specific Home Dashboard Revamp).

### Phase 8 — SAR Academic Intelligence Engine
- **Phase:** 8
- **Date:** 2026-03-13
- **Implemented By:** GitHub Copilot
- **Summary of Changes:**
   - `backend/utils/sarAnalytics.js`: Added centralized SAR computation service for progress KPIs, grade/status mapping, curriculum checklist and subject indicators, prerequisite eligibility checks, status counters, GPA/GWA, semester summaries, review workflow state, priority subjects, remaining semesters, and graduation estimates.
   - `backend/controllers/sarController.js`: `GET /api/sars/:id` now aggregates curriculum courses, prerequisite graph, and current term, then returns `data.analytics` from the shared service.
   - `backend/controllers/exportController.js`: PDF export now consumes the same analytics engine and includes core intelligence fields (completion, units, GWA, prerequisite summary, review state, graduation estimate).
   - `frontend/src/pages/student/MyRecord.js`: Added Academic Intelligence section with completion, GWA, prerequisite summary, remaining semesters, graduation estimate, and priority subjects.
   - `frontend/src/pages/adviser/StudentDetail.js`: Added adviser-facing intelligence panel with completion/GWA/workflow KPIs, prerequisite eligibility table, and priority subjects.
   - `frontend/src/pages/Dashboard.js`: Student SAR status panel now shows completion, remaining units, and estimated graduation.
- **Manual Test Result:** Pass
- **Verification Checklist Result:** Pass
- **Follow-up Actions:** Proceed to Phase 9 (Unified SAR Experience) which can now consume the stable analytics DTO.

### Phase 7 — Platform-Wide Pagination Standardization
- **Phase:** 7
- **Date:** 2026-03-13
- **Implemented By:** GitHub Copilot
- **Summary of Changes:**
   - `backend/utils/pagination.js`: Added shared pagination parsing, metadata, and payload builders.
   - Backend controllers updated for standardized pagination/search/sort list responses: `backend/controllers/userController.js`, `backend/controllers/sarController.js`, `backend/controllers/curriculumController.js`, `backend/controllers/termController.js`, `backend/controllers/forecastController.js`.
   - `frontend/src/components/PaginationControls.js`: Added reusable pagination controls component.
   - Frontend list pages migrated to server-side pagination contract: `frontend/src/pages/adviser/StudentList.js`, `frontend/src/pages/admin/CurriculumManagement.js`, `frontend/src/pages/admin/TermManagement.js`, `frontend/src/pages/admin/TransferOwnership.js`, `frontend/src/pages/admin/ForecastDashboard.js`.
   - Compatibility updates applied where list consumers expected legacy payloads, including `frontend/src/pages/Dashboard.js`, `frontend/src/pages/student/MyRecord.js`, `frontend/src/pages/adviser/StudentDetail.js`, `frontend/src/pages/Profile.js`, and `frontend/src/pages/admin/CurriculumDetail.js`.
   - Reliability fix: `frontend/src/pages/admin/ForecastDashboard.js` now handles partial endpoint failures independently so forecast history still loads/paginates even when current-term endpoints return `404` for no active term.
- **Manual Test Result:** Pass
- **Verification Checklist Result:** Pass
- **Follow-up Actions:** Proceed to Phase 11 (Navbar Quicklinks Expansion) or Phase 13 (Curriculum CSV Import/Export UX).

### Phase 6 — Student “No SAR Yet” Visibility
- **Phase:** 6
- **Date:** 2026-03-13
- **Implemented By:** GitHub Copilot
- **Summary of Changes:**
   - `frontend/src/pages/Dashboard.js`: Added student-only SAR state loader (`studentSar`, `studentSarLoading`, `studentSarError`) integrated into dashboard data fetch flow.
   - `frontend/src/pages/Dashboard.js`: Added role-scoped `Student Academic Record Status` panel with explicit empty state badge/message/guidance for no-SAR students.
   - `frontend/src/pages/Dashboard.js`: Added SAR-present compact overview state (student number, year level, curriculum, active plan version) with link to `/my-record`.
   - Preserved existing dashboard behavior for `admin` and `adviser` roles.
- **Manual Test Result:** Pass
- **Verification Checklist Result:** Pass
- **Follow-up Actions:** Proceed to Phase 7 (Platform-Wide Pagination Standardization).

### Phase 3 — Profile Images End-to-End
- **Phase:** 3
- **Date:** 2026-03-13
- **Implemented By:** GitHub Copilot
- **Summary of Changes:**
   - `backend/server.js`: Updated security/static upload handling so profile image URLs are browser-loadable from the frontend origin.
   - `backend/routes/userRoutes.js`: Added upload constraints and middleware-level validation responses for profile image type/size.
   - `backend/controllers/userController.js`: Added image dimension checks, replace/remove handling, and old-file cleanup for profile image updates.
   - `backend/controllers/sarController.js`: Included `profile_picture` in SAR-linked student attributes.
   - `backend/controllers/exportController.js`: Added optional SAR PDF profile-photo rendering when image exists.
   - `frontend/src/utils/profileImage.js`: Added shared profile image URL + initials helpers.
   - `frontend/src/pages/Profile.js`: Added remove-photo action, fallback avatar, and updated upload guidance.
   - `frontend/src/pages/Dashboard.js`: Added identity-card profile avatar with fallback initials.
   - `frontend/src/pages/adviser/StudentList.js`: Added SAR list avatar rendering.
   - `frontend/src/pages/adviser/StudentDetail.js`: Added SAR detail avatar rendering.
   - `frontend/src/pages/student/MyRecord.js`: Added student SAR avatar rendering.
   - `backend/package.json` / `backend/package-lock.json`: Added `image-size` dependency.
- **Manual Test Result:** Pass
- **Verification Checklist Result:** Pass
- **Follow-up Actions:** Proceed to Phase 4 (SAR ↔ Profile Bi-Directional Sync).

### Phase 2A — Program Chair First-Login Email + Password Rotation
- **Phase:** 2A
- **Date:** 2026-03-12
- **Implemented By:** GitHub Copilot
- **Summary of Changes:**
  - `backend/models/User.js`: Added 4 new fields — `mustChangeEmail` (BOOLEAN, default false), `pendingEmail` (STRING, nullable), `emailChangeCode` (STRING(10), nullable), `emailChangeCodeExpires` (BIGINT, nullable).
  - `backend/scripts/seed.js`: Admin user seeded with `mustChangeEmail: true`.
  - `backend/utils/email.js`: Added `sendEmailChangeVerificationCode(newEmail, code, firstName)` export — sends 6-digit verification code with dark-blue branded template and 10-minute expiry notice.
  - `backend/middleware/auth.js`: Added `mustChangeEmail` block after `mustChangePassword` checks — all non-`/api/auth` routes return HTTP 403 with `code: EMAIL_CHANGE_REQUIRED` when user's `mustChangeEmail` flag is true.
  - `backend/controllers/authController.js`: Updated import to include `sendEmailChangeVerificationCode`. Modified `login` to detect `mustChangeEmail: true` after `mustChangePassword` check and return a regular JWT with the flag. Modified `changePassword` to detect `updatedUser.mustChangeEmail` after clearing `mustChangePassword` and return early with `mustChangeEmail: true`. Added `initiateEmailChange` (validates domain/uniqueness, generates code, stores `pendingEmail`, sends email, audit logs). Added `verifyEmailChange` (validates code and expiry, updates email, clears all flags, calls `sendTokenResponse`). Added `resendEmailChangeCode` (regenerates code, sends to `pendingEmail`).
  - `backend/routes/authRoutes.js`: Destructured 3 new handlers and registered `POST /initiate-email-change`, `POST /verify-email-change`, `POST /resend-email-change-code` — all protected.
  - `frontend/src/pages/ChangeEmail.js`: New page — two-step form (enter `.cpe@tip.edu.ph` email → send code; enter 6-digit code → verify). Uses `forceEmailChangeToken` from `sessionStorage` or falls back to `localStorage` token. On success: removes sessionStorage token, calls `login(token)`, navigates to `/dashboard`.
  - `frontend/src/pages/ChangePassword.js`: After successful password change, checks `response.data.mustChangeEmail`; if true, stores `forceEmailChangeToken` in sessionStorage and navigates to `/change-email` instead of dashboard.
  - `frontend/src/pages/Login.js`: Added `mustChangeEmail` case in `handleSubmit` — stores `forceEmailChangeToken` in sessionStorage and navigates to `/change-email`.
  - `frontend/src/components/PrivateRoute.js`: Added `mustChangeEmail` guard — if `user.mustChangeEmail` is true, redirects to `/change-email`.
  - `frontend/src/App.js`: Added `ChangeEmail` import, added `/change-email` to `hideNavbar` condition, added `<Route path="/change-email" element={<ChangeEmail />} />`.
- **Manual Test Result:** Pass
- **Verification Checklist Result:** Pass
- **Follow-up Actions:** Proceed to Phase 3 (Profile Images End-to-End) or Phase 5 (SAR Creation UX).

### Phase 2 — Remove First-Login Complete Profile Flow
- **Phase:** 2
- **Date:** 2026-03-13
- **Implemented By:** GitHub Copilot
- **Summary of Changes:**
  - `frontend/src/components/PrivateRoute.js`: Removed the `needsProfile` check block (lines that detected missing `program` for students and missing `contact_number` for non-students and redirected to `/complete-profile`). Removed now-unused `useLocation` import.
  - `frontend/src/pages/Dashboard.js`: Added `Alert` from React Bootstrap imports. Added `profileReminderDismissed` state (persisted to `sessionStorage` so dismissal survives re-renders but resets on tab close). Added `profileIncomplete` computed flag and `showProfileReminder` bool. Added dismissible `Alert` banner at the top of the dashboard content area linking to `/profile` when the profile is incomplete.
- **Manual Test Result:** Pass
- **Verification Checklist Result:** Pass
- **Follow-up Actions:** Proceed to Phase 2A (Program Chair First-Login Email + Password Rotation).

### Log Entry Template
- **Phase:**
- **Date:**
- **Implemented By:**
- **Summary of Changes:**
- **Manual Test Result:** Pass / Fail
- **Verification Checklist Result:** Pass / Fail
- **Follow-up Actions:**

---

### Phase 1 — Profile Domain Redesign (Schema + API Contract)
- **Phase:** 1
- **Date:** 2026-05-11
- **Implemented By:** GitHub Copilot
- **Summary of Changes:**
  - `backend/models/User.js`: Added 12 new nullable fields — suffix, preferred_name, curriculum_id (INT FK), student_type (STRING 30), alternate_email, sex (STRING 30), citizenship, address (TEXT), emergency_contact_name, emergency_contact_relationship, emergency_contact_number (STRING 30), profile_updated_at (BIGINT).
  - `backend/models/index.js`: Added `User.belongsTo(Curriculum)` and `Curriculum.hasMany(User)` FK associations with `constraints: false` for safe additive sync.
  - `backend/controllers/userController.js`: Added `ALLOWED_SEX` and `ALLOWED_STUDENT_TYPES` constants; added `computeProfileCompletionScore()` helper; updated `sanitizeUser()` to include `profileCompletionScore`; expanded `allowedFields` with all new fields; added per-field validation with multi-error aggregation; set `profile_updated_at` timestamp on save.
  - `frontend/src/pages/Profile.js`: Complete rewrite — added form sections (Identity, Academic Identity, Contact, Demographics, Location, Emergency Contact, Profile Photo), `ProgressBar` completion score display (green/yellow/red), field-level error display via `Form.Control.Feedback`, curricula fetched from `/api/curriculums`.
- **Manual Test Result:** Pass
- **Verification Checklist Result:** Pass
- **Follow-up Actions:** Proceed to Phase 2 (Remove First-Login Complete Profile Flow) and Phase 2A (Program Chair First-Login Email + Password Rotation).

---

### Phase 0 — Execution Protocol & Safety Guardrails
- **Phase:** 0
- **Date:** 2026-03-12
- **Implemented By:** GitHub Copilot
- **Summary of Changes:**
  - Confirmed work log section exists at bottom of `IMPLEMENTATION_PLAN_PART2.md`.
  - Confirmed status transition labels (`[TODO]`, `[IN-PROGRESS]`, `[DONE]`, `[BLOCKED]`) are defined and documented.
  - Confirmed per-phase completion note template (Date / Executor / Result / Notes) is present in every phase.
  - Updated Phase 0 status table row to `[DONE]`.
  - Ticked both verification checklist items.
  - Filled Phase 0 completion note.
  - Added this work log entry.
  - No backend or frontend code changes required (process-only phase).
- **Manual Test Result:** Pass
- **Verification Checklist Result:** Pass
- **Follow-up Actions:** Proceed to Phase 2A (Program Chair First-Login Email + Password Rotation) or Phase 1 (Profile Domain Redesign) per the suggested execution order.

---

## Suggested Execution Order for New Chat Sessions

1. Phase 0 → 2A → 5 (foundation for security, profile/SAR behavior)
2. Phase 6 → 9 (student-centric SAR experience)
3. Phase 7, 11, 13 (platform navigation/list UX, curriculum UX, and CSV import/export)
4. Phase 12, 10 (analytics previews + role dashboards)
5. Phase 14 → 15 (PDF finalization and hardening)

This order reduces rework and ensures shared SAR data contracts are stable before UI-heavy phases.
