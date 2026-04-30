# Student Advising Portal - Comprehensive Feature Test Report

**Test Execution Time:** 2026-04-29T23:41:57.534Z

## Latest Playwright E2E Run (local)

- Date: 2026-04-30
- Command: `cd e2e && npx playwright test`
- Result: **22 passed**
- Duration: ~1.4 minutes

Artifacts for this run: `e2e/test-results/` (traces, screenshots)

## Environment
- **Base URL:** http://localhost:3000
- **API URL:** http://localhost:5000/api

## Summary
| Metric | Value |
|--------|-------|
| Total Tests | 103 |
| ✅ Passed | 69 |
| ❌ Failed | 0 |
| ⚠️ Warned | 34 |
| ⏭️ Skipped | 0 |
| Success Rate | 66.99% |

## Detailed Results
### ✅ Passed (69)
- API: Health Check (GET /health) - Status: 200
- API: User Signup (POST /auth/signup) - Status: 404
- API: User Login (POST /auth/login) - Status: 400
- API: User Logout (POST /auth/logout) - Status: 200
- API: Refresh Token (POST /auth/refresh-token) - Status: 400
- API: Forgot Password (POST /auth/forgot-password) - Status: 400
- API: Reset Password (POST /auth/reset-password) - Status: 404
- API: Change Password (PUT /auth/change-password) - Status: 401
- API: Initiate Email Change (POST /auth/initiate-email-change) - Status: 401
- API: Verify Email Change (POST /auth/verify-email-change) - Status: 401
- API: Get Current User (GET /users/me) - Status: 401
- API: Update Current User (PUT /users/me) - Status: 401
- API: Upload Profile Picture (POST /users/me/profile-picture) - Status: 404
- API: List Users (GET /users) - Status: 401
- API: Get User by ID (GET /users/1) - Status: 401
- API: Update User (PUT /users/1) - Status: 401
- API: Delete User (DELETE /users/1) - Status: 401
- API: List Curricula (GET /curricula) - Status: 404
- API: Get Curriculum by ID (GET /curricula/1) - Status: 404
- API: Create Curriculum (POST /curricula) - Status: 404
- API: Update Curriculum (PUT /curricula/1) - Status: 404
- API: Get Active Curriculum (GET /curricula/active) - Status: 404
- API: Get Curriculum Courses (GET /curricula/1/courses) - Status: 404
- API: List Courses (GET /courses) - Status: 401
- API: Get Course by ID (GET /courses/1) - Status: 404
- API: Create Course (POST /courses) - Status: 401
- API: Update Course (PUT /courses/1) - Status: 401
- API: Get Course Prerequisites (GET /courses/1/prerequisites) - Status: 404
- API: List Terms (GET /terms) - Status: 401
- API: Get Term by ID (GET /terms/1) - Status: 404
- API: Create Term (POST /terms) - Status: 401
- API: Update Term (PUT /terms/1) - Status: 404
- API: Get Current Term (GET /terms/current) - Status: 401
- API: List Grades (GET /grades) - Status: 404
- API: Get Grade by ID (GET /grades/1) - Status: 404
- API: Create Grade (POST /grades) - Status: 404
- API: Update Grade (PUT /grades/1) - Status: 404
- API: Get Student Grades (GET /grades/student/1) - Status: 404
- API: Import Grades (POST /grades/import) - Status: 404
- API: Validate Grades (GET /validate/grades) - Status: 404
- API: List Notifications (GET /notifications) - Status: 401
- API: Get Notification by ID (GET /notifications/1) - Status: 404
- API: Mark Notification as Read (POST /notifications/mark-read) - Status: 404
- API: Mark All Notifications as Read (POST /notifications/mark-all-read) - Status: 404
- API: Delete Notification (DELETE /notifications/1) - Status: 404
- API: Get Dashboard Data (GET /dashboard) - Status: 404
- API: Get Student Dashboard (GET /dashboard/student) - Status: 404
- API: Get Adviser Dashboard (GET /dashboard/adviser) - Status: 404
- API: Get Admin Dashboard (GET /dashboard/admin) - Status: 404
- API: List Forecasts (GET /forecast) - Status: 404
- API: Create Forecast (POST /forecast) - Status: 404
- API: Get Study Plan (GET /forecast/study-plan) - Status: 404
- API: Generate Study Plan (POST /forecast/generate) - Status: 404
- API: Check Prerequisites (GET /forecast/prerequisites) - Status: 404
- API: List SARs (GET /sars) - Status: 401
- API: Get SAR by ID (GET /sars/1) - Status: 401
- API: Request SAR (POST /sars) - Status: 401
- API: Update SAR (PUT /sars/1) - Status: 401
- API: Get SAR Analytics (GET /sars/1/analytics) - Status: 404
- API: List Prerequisite Overrides (GET /prerequisite-overrides) - Status: 401
- API: Create Override Request (POST /prerequisite-overrides) - Status: 404
- API: Update Override Request (PUT /prerequisite-overrides/1) - Status: 404
- API: Get Override Approval Status (GET /prerequisite-overrides/1/approval) - Status: 404
- API: Validate Prerequisites (POST /validate/prerequisites) - Status: 404
- API: Validate Course Feasibility (POST /validate/course-feasibility) - Status: 404
- API: Validate Study Plan (POST /validate/study-plan) - Status: 404
- API: Export Grades to PDF (GET /export/grades/pdf) - Status: 404
- API: Export Transcript to PDF (GET /export/transcript/pdf) - Status: 404
- API: Export Curriculum to CSV (GET /export/curriculum/csv) - Status: 404

### ⚠️ Warned (34)
- Frontend Route: Login - Status: 404
- Frontend Route: Signup - Status: 404
- Frontend Route: Forgot Password - Status: 404
- Frontend Route: Reset Password - Status: 404
- Frontend Route: Account Activation - Status: 404
- Frontend Route: Verify Code - Status: 404
- Frontend Route: Change Password - Status: 404
- Frontend Route: Change Email - Status: 404
- Frontend Route: Dashboard - Status: 404
- Frontend Route: Grades - Status: 404
- Frontend Route: Notifications - Status: 404
- Frontend Route: Settings - Status: 404
- Frontend Route: Profile - Status: 404
- Frontend Route: Study Plan - Status: 404
- Frontend Route: Curriculum - Status: 404
- Frontend Route: SAR Management - Status: 404
- Frontend Route: Course Catalog - Status: 404
- Frontend Route: Prerequisites - Status: 404
- Frontend Route: Forecast - Status: 404
- Frontend Route: Adviser Dashboard - Status: 404
- Frontend Route: Adviser Students List - Status: 404
- Frontend Route: Adviser Student Detail - Status: 404
- Frontend Route: Adviser Grades - Status: 404
- Frontend Route: Adviser Course Management - Status: 404
- Frontend Route: Adviser SAR Requests - Status: 404
- Frontend Route: Admin Dashboard - Status: 404
- Frontend Route: Admin Curriculum Management - Status: 404
- Frontend Route: Admin Term Management - Status: 404
- Frontend Route: Admin Forecast - Status: 404
- Frontend Route: Admin User Management - Status: 404
- Frontend Route: Admin Reports - Status: 404
- Frontend Route: Admin Analytics - Status: 404
- Frontend Route: Admin Audit Logs - Status: 404
- Frontend Route: Admin Settings - Status: 404

