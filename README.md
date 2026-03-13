# Student Advising System

The Student Advising System is a full-stack academic advising platform for the Computer Engineering program. It supports Program Chair (`admin`), Student Adviser (`adviser`), and Student (`student`) workflows across curriculum governance, student records, study plan lifecycle, and forecasting.

## What Is This System?

This system helps academic teams manage the full advising pipeline in one place:
- define and maintain curriculum structures,
- create and monitor Student Academic Records (SAR),
- generate, regenerate, and validate study plans,
- monitor grades, prerequisites, and academic progress,
- forecast course demand by academic term,
- export professional SAR PDF reports.

## System Overview

### User Roles
- **Program Chair (`admin`)**: manages curricula, terms, forecasting, and high-level academic operations.
- **Student Adviser (`adviser`)**: manages SAR workflows, grades, and study plan decision points.
- **Student (`student`)**: views own academic record and progress outputs.

### Main Functional Areas
- **Authentication & Role Access**
- **Curriculum Management**
- **Student Academic Records (SAR)**
- **Study Plan & Validation Workflow**
- **Academic Term & Forecasting**
- **PDF Export & Reporting**

### High-Level Architecture
- **Backend:** Node.js, Express, Sequelize, PostgreSQL
- **Frontend:** React, React Router, React Bootstrap
- **Security model:** JWT-based auth + role-guarded APIs/routes

## Tech Stack

### Backend
- Node.js + Express
- PostgreSQL (via `DATABASE_URL`)
- Sequelize ORM
- JWT auth (access + refresh token flow)
- bcryptjs (password hashing)
- Nodemailer (verification/reset email workflows)
- Multer (file uploads)
- Google OAuth (`google-auth-library`)
- PDFKit (SAR PDF generation)
- helmet + morgan + nodemon (security/logging/dev)

### Frontend
- React 18 + React Router v6
- React Bootstrap + Bootstrap 5
- Axios (shared API utility)
- Context API (authentication state)
- `@react-oauth/google` (Google sign-in)

## Implementation Plans

Planned implementations are divided into phases and are documented here:
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)

Status summary:
- **Core build phases (1–10):** Done
- **Revamp phases (0–15):** Done

## Documentation

- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — Consolidated implementation roadmap and phase status
- [SYSTEM_REFERENCE.md](SYSTEM_REFERENCE.md) — Detailed technical reference (project structure, database models, API endpoints, setup, security, development notes)
- [SYSTEM_WORKFLOW.puml](SYSTEM_WORKFLOW.puml) — PlantUML activity workflow for current system behavior
- [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) — Google OAuth setup guide
- [REQUIRED_EXTENSIONS.md](REQUIRED_EXTENSIONS.md) — Recommended VS Code extensions

## Quick Start

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

### Seed Database (from repository root)
```bash
node backend/scripts/seed.js
```

### Reset Database (users only, no curriculum/SAR data)
```bash
node backend/scripts/seed_users_only.js
```

## Default User Credentials

These are recreated by both seed scripts (`seed.js` and `seed_users_only.js`):

| Role | Email | Password |
|---|---|---|
| Program Chair (`admin`) | admin.cpe@tip.edu.ph | password123 |
| Student Adviser (`adviser`) | adviser.cpe@tip.edu.ph | password123 |
| Student (`student`) | student@tip.edu.ph | password123 |

Notes:
- Program Chair account is seeded with first-login security rotation enabled (`mustChangePassword` and `mustChangeEmail`).
- Use the correct login portal selection by role in the frontend (faculty for admin/adviser, student for student).
