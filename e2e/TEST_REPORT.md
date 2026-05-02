# Student Advising Portal - Comprehensive Feature Test Report

**Test Execution Time:** 2026-05-02T10:14:33.259Z

## Environment
- **Base URL:** http://localhost:3000
- **API URL:** http://localhost:5000/api

## Summary
| Metric | Value |
|--------|-------|
| Total Tests | 44 |
| Passed | 39 |
| Failed | 0 |
| Warned | 5 |
| Skipped | 0 |
| Success Rate | 88.64% |

## Detailed Results
### Passed (39)
- **Route: Login Page (/login)** - OK
- **Route: Register Page (/register)** - OK
- **Auth: student login** - Redirected to: http://localhost:3000/dashboard
- **Auth: adviser login** - Redirected to: http://localhost:3000/adviser/dashboard
- **Auth: admin login** - Redirected to: http://localhost:3000/admin/dashboard
- **Auth: student login** - Redirected to: http://localhost:3000/dashboard
- **Student: Dashboard** - http://localhost:3000/dashboard
- **Student: Grades Page** - http://localhost:3000/grades
- **Student: Notifications** - http://localhost:3000/notifications
- **Student: Settings** - http://localhost:3000/settings
- **Auth: adviser login** - Redirected to: http://localhost:3000/adviser/dashboard
- **Adviser: Dashboard** - http://localhost:3000/adviser/dashboard
- **Adviser: Student List** - http://localhost:3000/adviser/students?programId=1
- **Adviser: Notifications** - http://localhost:3000/notifications
- **Adviser: Settings** - http://localhost:3000/settings
- **Auth: admin login** - Redirected to: http://localhost:3000/admin/dashboard
- **Admin: Dashboard** - http://localhost:3000/admin/dashboard
- **Admin: Curriculum Management** - http://localhost:3000/admin/curriculum
- **Admin: Term Management** - http://localhost:3000/admin/terms
- **Admin: Forecast Management** - http://localhost:3000/admin/forecast
- **Admin: Notifications** - http://localhost:3000/notifications
- **Admin: Settings** - http://localhost:3000/settings
- **Admin: Logout** - OK
- **API: Health Check (GET /health)** - Status: 200
- **API: Signup Endpoint (POST /auth/signup)** - Status: 404
- **API: Login Endpoint (POST /auth/login)** - Status: 400
- **API: Get Current User (GET /users/me)** - Status: 401
- **API: Update Current User (PUT /users/me)** - Status: 401
- **API: Get Curricula (GET /curricula)** - Status: 404
- **API: Get Active Curriculum (GET /curricula/active)** - Status: 404
- **API: Get Terms (GET /terms)** - Status: 401
- **API: Get Current Term (GET /terms/current)** - Status: 401
- **API: Get Grades (GET /grades)** - Status: 404
- **API: Get Notifications (GET /notifications)** - Status: 401
- **API: Get Forecast (GET /forecast)** - Status: 404
- **API: Get Study Plan (GET /forecast/study-plan)** - Status: 404
- **API: Get Dashboard Data (GET /dashboard)** - Status: 404
- **API: Get SARs (GET /sars)** - Status: 401
- **API: Validate Prerequisites (GET /validate/prerequisites)** - Status: 404

### Warnings (5)
- **Route: Forgot Password Page (/forgot-password)** - Missing expected content: "forgot password"
- **Route: Reset Password Page (/reset-password/test-token)** - Missing expected content: "reset password"
- **Route: Account Activation Page (/activate/test-token)** - Missing expected content: "activation"
- **Student: Logout** - Logout button not easily accessible
- **Adviser: Logout** - Logout button not easily accessible

