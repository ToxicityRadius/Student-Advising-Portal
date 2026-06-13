# Student Advising System

The Student Advising System is a full-stack academic advising platform for Computer Engineering programs. It supports a global Super Admin (`superadmin`), program-bound Program Chair (`admin`), Student Adviser (`adviser`), and Student (`student`) workflows across curriculum governance, student records, study plan lifecycle, and forecasting.

This system helps academic teams manage the full advising pipeline in one place:

- Define and maintain curriculum structures.
- Create and monitor Student Academic Records (SAR).
- Generate, regenerate, and validate study plans.
- Monitor grades, prerequisites, and academic progress.
- Forecast course demand by academic term.
- Export professional SAR PDF reports.

## User Manual

Read [USER_MANUAL.md](USER_MANUAL.md) for a role-based walkthrough of the system.

It includes step-by-step guides for:

- Super Admin (`superadmin`)
- Program Chair (`admin`)
- Student Adviser (`adviser`)
- Student (`student`)

## System Overview

### User Roles

- **Super Admin (`superadmin`)**: the only global account. Manages programs, transfer ownership, user account lifecycle controls, and program assignments.
- **Program Chair (`admin`)**: manages curricula, terms, forecasting, adviser assignments, SAR/study-plan operations, and high-level academic work only for assigned programs.
- **Student Adviser (`adviser`)**: manages SAR workflows, grades, and study plan decision points for assigned students/programs.
- **Student (`student`)**: views own academic record and progress outputs.

### Permission Matrix

| Capability | Super Admin | Program Chair | Adviser | Student |
|---|---|---|---|---|
| Global program management and program assignments | Yes | No | No | No |
| Transfer Ownership | Yes | No | No | No |
| Edit user account details | Yes | No | No | No |
| Activate or deactivate users | Yes | No | No | No |
| Manage adviser assignments | All programs | Assigned programs | No | No |
| Manage curriculum, terms, forecasting, and academic rules | All programs | Assigned programs | No | No |
| SAR, study-plan, prerequisite override, and elective override workflows | All programs | Assigned programs | Assigned students/programs | Own records only |
| View superadmin accounts | Yes | No | No | No |

### Main Functional Areas

- **Authentication and role access**: JWT, Google OAuth, role-guarded routes, email verification, OTP-based email change, and forced first-login credential rotation.
- **Curriculum management**: curricula, course library, prerequisites, co-requisites, elective tracks, equivalencies, and CSV import/export.
- **Student Academic Records**: email-first creation with profile autofill, profile sync, analytics, and KPIs.
- **Study plan and validation workflow**: generate, edit, regenerate, and validate versioned study plans with prerequisite and load enforcement.
- **Academic term and forecasting**: term lifecycle management, demand charts, and historical comparisons.
- **PDF export and reporting**: professional SAR PDF export for all roles.
- **Role-specific dashboards**: KPI summaries and quicklinks tailored to Super Admin, Program Chair, Adviser, and Student.

### High-Level Architecture

- Backend: Node.js, Express, Sequelize, PostgreSQL
- Frontend: React, React Router, React Bootstrap
- Security model: JWT-based auth plus backend role/program-scope enforcement

## Tech Stack

### Backend

- **Runtime:** Node.js
- **Framework:** Express.js v4.18.2
- **Database:** PostgreSQL v8.16.3 (pg driver)
- **ORM:** Sequelize v6.37.7
- **Authentication:** JWT (jsonwebtoken v9.0.2), Google OAuth via google-auth-library v10.5.0
- **Security:** bcryptjs v2.4.3 password hashing, helmet v8.1.0, express-rate-limit v8.3.0, express-validator v7.3.1
- **File Management:** Multer v2.1.0 for uploads, Supabase v2.99.1 for cloud storage
- **Email:** Nodemailer v8.0.5 for transactional emails
- **PDF Generation:** PDFKit v0.17.2, pdf-parse v1.1.1
- **Logging:** Pino v10.3.1 with pino-pretty v11.2.2
- **API Documentation:** Swagger UI Express v5.0.1
- **Database Migrations:** Sequelize CLI v6.6.5, Umzug v3.8.2
- **Development:** Nodemon v3.1.11
- **Testing:** Jest v30.3.0, Supertest v7.2.2

### Frontend

- **Framework:** React v18.2.0
- **Routing:** React Router DOM v6.20.1
- **UI:** React Bootstrap v2.10.10, Bootstrap v5.3.8
- **Data Visualization:** Recharts v3.8.0
- **Authentication:** @react-oauth/google v0.13.4, jwt-decode v4.0.0
- **HTTP Client:** Axios v1.16.0
- **State Management:** Context API (built-in React)
- **Build Tool:** Create React App (react-scripts v5.0.1)
- **Component Selection:** react-select v5.10.2
- **Testing:** @testing-library/react v16.3.2, @testing-library/jest-dom v6.9.1

## Documentation

- [USER_MANUAL.md](USER_MANUAL.md): role-based user guide for Super Admin, Program Chair, Adviser, and Student.
- [SYSTEM_REFERENCE.md](SYSTEM_REFERENCE.md): technical reference for structure, models, API endpoints, setup, security, and development notes.
- [SOFTWARE_DESIGN.md](SOFTWARE_DESIGN.md): system design, scope, actors, use cases, and architecture notes.
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md): consolidated implementation roadmap and phase status.
- [SYSTEM_WORKFLOW.puml](SYSTEM_WORKFLOW.puml): PlantUML activity workflow for current behavior.
- [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md): Google OAuth setup guide.
- [REQUIRED_EXTENSIONS.md](REQUIRED_EXTENSIONS.md): recommended VS Code extensions.

## Quick Start

### Prerequisites

- Node.js v18.x or higher
- PostgreSQL v12 or higher (local or via Supabase)
- npm v9 or higher
- Git

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env          # Configure environment variables
npm run dev                   # Start development server on http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
npm install
REACT_APP_API_URL=http://localhost:5000/api npm start  # Start on http://localhost:3000
```

Both servers must be running for the full application to work.

### Environment Configuration

Key environment variables (see `backend/.env.example` for complete list):

| Variable | Required | Purpose | Example |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/student_advising` |
| `JWT_SECRET` | Yes | Secret key for JWT signing | Generate with `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Yes | Secret key for refresh tokens | Generate with `openssl rand -hex 32` |
| `SUPABASE_URL` | No | Supabase project URL for file storage | `https://project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key | From Supabase dashboard |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID | From Google Cloud Console |
| `EMAIL_HOST` | No | SMTP server for transactional emails | `smtp.gmail.com` |
| `EMAIL_USER` | No | SMTP credentials | Your email |
| `EMAIL_PASSWORD` | No | SMTP credentials / app password | For Gmail, use app password |
| `DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT` | No | Skip password/email rotation on first login (dev only) | `true` or `false` |

### Available Scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Start frontend development server |
| `npm run backend:dev` | Start backend development server |
| `npm run frontend:start` | Start frontend |
| `npm run frontend:build` | Build frontend for production |
| `npm run lint:backend` | Lint backend code |
| `npm run test:backend` | Run backend unit tests |
| `npm run test:backend:integration` | Run integration tests |
| `npm run test:frontend:ci` | Run frontend tests (CI mode) |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run verify:predeploy` | Full verification gate (lint, build, tests, audit) |
| `npm run verify:predeploy:e2e` | Full verification + E2E tests |

### Seed Database

Run from the repository root:

```bash
node backend/scripts/seed.js
```

### Reset Database Users Only

Run from the repository root:

```bash
node backend/scripts/seed_users_only.js
```

### Optional Local First-Login Bypass

If you want to access seeded Program Chair accounts without forced first-login password/email rotation, set this in `backend/.env`:

```env
DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT=true
```

Set it back to `false` when you want the normal security flow.

## Superadmin Bootstrap

Production seed/bootstrap requires:

```env
SUPERADMIN_EMAIL=superadmin@example.edu
SUPERADMIN_PASSWORD=replace-with-a-strong-password
```

Production startup must not rely on fallback superadmin credentials. Local development can create the fallback Super Admin account, but it is flagged with `mustChangePassword` and `mustChangeEmail`.

## Default User Credentials

These development accounts are recreated by both seed scripts (`seed.js` and `seed_users_only.js`):

| Role | Email | Password |
|---|---|---|
| Super Admin (`superadmin`) | `superadmin.cpe@tip.edu.ph` | `Password123!` |
| Program Chair (`admin`) | `admin.cpe@tip.edu.ph` | `Password123!` |
| Student Adviser (`adviser`) | `adviser.cpe@tip.edu.ph` | `Password123!` |
| Student (`student`) | `student@tip.edu.ph` | `Password123!` |

Notes:

- Default credentials are for local development only.
- The fallback Super Admin account is local-only and must rotate email/password.
- Program Chair accounts are program-bound through `UserProgramAssignment`.
- Use the correct frontend login portal selection by role: faculty for Super Admin, Program Chair, and Adviser; student for Student.

## Verification

Run the repository-level release gate from the project root:

```bash
npm run verify:predeploy
```

If npm audit endpoint availability is temporarily unstable, use:

```bash
npm run verify:predeploy:soft
```

Use the soft variant only for transient registry outages. The strict command remains the default release gate.

This command runs:

- Backend lint
- Frontend production build
- Frontend test suite in CI mode
- Backend unit tests
- Backend integration tests
- Backend production dependency audit at the `high` threshold

Optional E2E gate after core checks:

```bash
npm run verify:predeploy:e2e
```

E2E defaults to local targets:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api`

Override targets when needed with:

- `E2E_BASE_URL`
- `E2E_API_URL`
- `REACT_APP_API_URL`

## Development Workflow

### Local Development

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Student-Advising-Portal
   ```

2. **Install dependencies:**
   ```bash
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   ```

3. **Set up environment variables:**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your local PostgreSQL connection and secrets
   ```

4. **Initialize database:**
   ```bash
   npm run backend:db:migrate
   npm run backend:seed
   ```

5. **Start both servers:**
   - Terminal 1: `npm run backend:dev` (runs on http://localhost:5000)
   - Terminal 2: `npm run frontend:start` (runs on http://localhost:3000)

### Code Quality and Testing

All changes should pass these checks before committing:

```bash
# Lint backend
npm run lint:backend

# Run backend tests
npm run test:backend

# Run frontend tests
npm run test:frontend:ci

# Full pre-deployment verification
npm run verify:predeploy
```

### Database Management

- **Create migration:** `npx sequelize-cli migration:generate --name migration-name`
- **Run migrations:** `npm run backend:db:migrate`
- **Undo last migration:** `npm run backend:db:migrate:undo`
- **Reset database:** Drop and recreate; reseed with `npm run backend:seed`

### Commit and Push Workflow

1. Create a feature branch: `git checkout -b feat/feature-name`
2. Make changes and run tests locally
3. Commit with conventional format: `git commit -m "feat(scope): description"`
4. Push to remote: `git push -u origin feat/feature-name`
5. Create a Pull Request and wait for CI checks to pass

## Frontend Vulnerability Strategy

The frontend currently uses `react-scripts` 5.x. `npm audit` may report transitive vulnerabilities that cannot be safely removed without a focused tooling migration.

Current policy:

- Block release on backend high-severity production vulnerabilities.
- Track frontend audit findings separately and review them each release.
- Defer migration from CRA/react-scripts to Vite until release hardening, CI, permissions, and E2E smoke tests are green.

## Deployment

### Production Environment Variables

Before deploying, ensure these are configured in your production environment:

- `NODE_ENV=production`
- `DATABASE_URL` pointing to production PostgreSQL
- `JWT_SECRET` and `JWT_REFRESH_SECRET` (generate new strong values)
- `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` (for bootstrap)
- All OAuth and email service credentials
- `CLIENT_URL` set to production frontend domain
- `REACT_APP_API_URL` pointing to production API

### Deployment Checklist

- [ ] All tests pass locally and in CI
- [ ] Database migrations are prepared and tested
- [ ] Frontend production build succeeds
- [ ] Security audit passes (`npm run audit:backend:high`)
- [ ] Environment variables are configured correctly
- [ ] Backup of production database is available
- [ ] Rollback plan is documented

## Troubleshooting

### Backend won't start
- Check `DATABASE_URL` is correct and PostgreSQL is running
- Verify all required environment variables are set
- Check for port conflicts (default: 5000)
- Review logs: `npm run backend:dev` shows detailed error messages

### Frontend won't build
- Clear node_modules and package-lock: `rm -rf node_modules package-lock.json && npm install`
- Check Node.js version: `node --version` (should be v18+)
- Clear React cache: `rm -rf build/ && npm run frontend:build`

### Tests fail locally but pass in CI
- Ensure database is in a clean state: `npm run backend:seed`
- Check environment variables in `.env` match test expectations
- Run tests with `--verbose` flag for detailed output
- Isolate failing tests: `npm test -- --testNamePattern="test-name"`

### Port already in use
- Backend (5000): `lsof -i :5000` to find process, `kill -9 <pid>` to terminate
- Frontend (3000): `lsof -i :3000` to find process, `kill -9 <pid>` to terminate
