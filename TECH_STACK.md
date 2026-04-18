# Tech Stack — Student Advising Portal

**Full-stack Node.js + React academic advising platform**  
*Generated: April 12, 2026*

---

## 📊 High-Level Overview

| Component | Stack | Version |
|-----------|-------|---------|
| **Frontend** | React + React Router + Bootstrap | 18.2 / 6.20 / 5.3 |
| **Backend** | Node.js + Express + Sequelize | 20 / 4.18 / 6.37 |
| **Database** | PostgreSQL | 16 |
| **Testing** | Jest + Playwright | 30.3 / 1.58 |
| **Deployment** | Cloudflare Pages + Oracle Cloud | Latest |

---

## Backend Stack

### Core Runtime & Framework

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 20.x LTS | JavaScript runtime environment |
| **Express.js** | ^4.18.2 | REST API framework & web server |
| **npm** | Latest | Package manager & task runner |

### Database & ORM

| Technology | Version | Purpose |
|---|---|---|
| **PostgreSQL** | 16 | Relational database management system |
| **Sequelize** | ^6.37.7 | Promise-based Node.js ORM |
| **sequelize-cli** | ^6.6.5 | CLI for migrations, seeders, models |
| **pg** | ^8.16.3 | PostgreSQL client driver for Node.js |
| **umzug** | ^3.8.2 | Database migration orchestrator |

**Sequelize Models (17 total):**
- `User` — User profiles, roles, authentication
- `StudentAcademicRecord` (SAR) — Student academic records
- `Curriculum` — Degree program structures
- `Course` — Course catalog & definitions
- `CurriculumCourse` — Course-to-curriculum mappings
- `AcademicTerm` — Semester/term periods
- `StudyPlan` — Student study plans
- `StudyPlanVersion` — Versioned study plans
- `StudyPlanCourse` — Individual course enrollment in plan
- `Prerequisite` — Course prerequisite rules
- `CoRequisite` — Concurrent course requirements
- `CourseEquivalency` — Transfer credit equivalencies
- `ElectiveTrack` — Elective specialization tracks
- `ElectiveTrackCourse` — Track-course mappings
- `ForecastSnapshot` — Course demand forecasts
- `Notification` — User notifications

### Authentication & Security

| Technology | Version | Purpose |
|---|---|---|
| **jsonwebtoken (JWT)** | ^9.0.2 | Access & refresh token authentication |
| **bcryptjs** | ^2.4.3 | Password hashing & verification |
| **google-auth-library** | ^10.5.0 | Google OAuth 2.0 integration |
| **helmet** | ^8.1.0 | HTTP security headers middleware |
| **express-validator** | ^7.3.1 | Request payload validation & sanitization |
| **cookie-parser** | ^1.4.6 | Cookie parsing & handling |

**Security Features:**
- JWT-based stateless authentication
- Role-based access control (Admin, Adviser, Student)
- Password hashing with bcrypt (salt rounds: 10+)
- CORS protection for cross-origin requests
- Rate limiting on sensitive endpoints
- Input validation on all API routes

### Communication & File Storage

| Technology | Version | Purpose |
|---|---|---|
| **Nodemailer** | ^7.0.12 | Email transport (SMTP via Gmail) |
| **@supabase/supabase-js** | ^2.99.1 | Supabase client for file storage |
| **Multer** | ^2.1.0 | Multipart file upload handling |
| **image-size** | ^2.0.2 | Image dimension extraction |

**Use Cases:**
- Nodemailer: Email verification, password reset, notifications
- Supabase Storage: Profile picture uploads & storage
- Multer: CSV file uploads for curriculum import

### API Documentation & Export

| Technology | Version | Purpose |
|---|---|---|
| **swagger-ui-express** | ^5.0.1 | Swagger API documentation UI |
| **pdfkit** | ^0.17.2 | PDF generation for SAR reports |

### Logging & Monitoring

| Technology | Version | Purpose |
|---|---|---|
| **morgan** | ^1.10.1 | HTTP request logging middleware |
| **pino** | ^10.3.1 | Structured JSON logging framework |
| **pino-pretty** | ^11.2.2 | Pretty-print logs in development |
| **express-rate-limit** | ^8.3.0 | API rate limiting middleware |
| **dotenv** | ^16.3.1 | Environment variable loading |
| **cors** | ^2.8.5 | Cross-Origin Resource Sharing middleware |

### Development & Testing

| Technology | Version | Purpose |
|---|---|---|
| **Jest** | ^30.3.0 | Unit & integration test framework |
| **Supertest** | ^7.2.2 | HTTP assertion & testing library |
| **Nodemon** | ^3.1.11 | Auto-reload server on file changes |

**Test Coverage:**
- Unit tests for controllers, models, utilities
- Integration tests for database operations
- API endpoint tests with Supertest

---

## Frontend Stack

### Core Framework & Routing

| Technology | Version | Purpose |
|---|---|---|
| **React** | ^18.2.0 | UI library & component framework |
| **React DOM** | ^18.2.0 | React rendering to the DOM |
| **React Router** | ^6.20.1 | Client-side SPA routing & navigation |
| **React Scripts** | ^5.0.1 | Create React App build tooling |

**Supported Routes:**
- `/` — Public landing page
- `/about`, `/purpose` — Public info pages
- `/login` — Login & Google OAuth
- `/dashboard` — Role-specific dashboards
- `/grades` — Student grades view
- `/study-plan` — Study plan management
- `/notifications` — User notifications
- `/settings` — User settings
- `/admin/*` — Admin-only routes

### UI Components & Styling

| Technology | Version | Purpose |
|---|---|---|
| **Bootstrap** | ^5.3.8 | CSS framework & style utilities |
| **React Bootstrap** | ^2.10.10 | Bootstrap as React components |
| **Recharts** | ^3.8.0 | Composable charting library |
| **react-select** | ^5.10.2 | Advanced multiselect component |

**UI Patterns:**
- Responsive grid layouts (Bootstrap)
- Modal dialogs for confirmations
- Bar charts & line charts (Recharts)
- Dropdown filters & selectors

### Authentication & API

| Technology | Version | Purpose |
|---|---|---|
| **@react-oauth/google** | ^0.13.4 | Google Sign-In button & flow |
| **axios** | ^1.6.2 | HTTP client for REST API calls |
| **jwt-decode** | ^4.0.0 | JWT token parsing & inspection |

**Auth Flow:**
- Google OAuth sign-in
- JWT token storage in localStorage
- Automatic token refresh on expiry
- Role-based component rendering

### State Management

| Technology | Purpose |
|---|---|
| **React Context API** | Global state (auth, user, theme) |
| **Custom Hooks** | Composition for state logic |

### Build & Tooling

| Technology | Purpose |
|---|---|
| **Webpack** | Module bundler (via react-scripts) |
| **Babel** | JSX & ES6+ transpilation |
| **ESLint** | Code quality & style checking |
| **CSS Modules** | Component scoped styling |

### Testing

| Technology | Version | Purpose |
|---|---|---|
| **@testing-library/react** | ^16.3.2 | React component testing utilities |
| **@testing-library/jest-dom** | ^6.9.1 | Custom Jest matchers for DOM |
| **@testing-library/user-event** | ^14.6.1 | User interaction simulation |

---

## End-to-End (E2E) Testing Stack

| Technology | Version | Purpose |
|---|---|---|
| **Playwright** | ^1.58.2 | Cross-browser E2E test automation |

**Test Coverage:**
- User login & authentication flows
- Dashboard loading & rendering
- Page navigation (grades, notifications, settings)
- Form submission & validation
- Role-based access control

**Browsers Tested:**
- Chromium
- Firefox
- WebKit (Safari)

---

## DevOps & Deployment Stack

### Containerization

| Technology | Purpose | Files |
|---|---|---|
| **Docker** | Container runtime & images | `backend/Dockerfile`, `frontend/Dockerfile` |
| **Docker Compose** | Multi-container orchestration | `docker-compose.yml` |

**Services:**
- `db` — PostgreSQL 16 container
- `backend` — Node.js Express API
- `frontend` — React dev server

### Deployment Architecture

| Component | Hosting | Technology |
|---|---|---|
| **Frontend** | Cloudflare Pages | Static hosting + global CDN |
| **Backend API** | Oracle Cloud (Always Free) | Node.js on ARM VM (A1.Flex) |
| **Database** | Oracle Cloud (Always Free) | PostgreSQL 16 on VM |
| **File Storage** | Supabase Storage | S3-compatible object storage |
| **DNS & CDN** | Cloudflare | Global DNS + content delivery |

**Infrastructure Specs (Production):**
- Backend: Oracle A1.Flex VM (2 OCPUs, 12 GB RAM)
- Database: PostgreSQL 16 on same VM
- Storage: 200 GB block volume (Oracle)
- Bandwidth: 10 TB/month outbound (Oracle)
- Reverse Proxy: Nginx + Let's Encrypt SSL

### CI/CD Pipeline (Recommended)

| Tool | Purpose |
|---|---|
| **GitHub Actions** | Automated build & deploy workflows |
| **Git Hooks** | Pre-commit linting & testing |

---

## Infrastructure & External Services

### Authentication Providers
- **Google OAuth 2.0** — Social login integration
- **Email verification** — OTP via Gmail SMTP

### Email Service
- **Gmail SMTP** — Transactional emails (verification, password reset, notifications)
- **Configuration:** TLS, port 587, app-specific password

### File & Data Storage
- **Supabase Storage** — Profile picture uploads (S3-compatible)
- **Supabase PostgreSQL** (original) — Can migrate to self-hosted in Oracle VM

### Process Management (Production)
- **PM2** — Node.js process manager for auto-restart & monitoring
- **Nginx** — Reverse proxy, SSL termination, load balancing

### Security & Compliance
- **SSL/TLS** — Let's Encrypt certificates via Certbot
- **HTTPS** — All traffic encrypted
- **CORS** — Configurable cross-origin policy
- **Rate Limiting** — Protection against brute force & DoS

---

## Environment Variables

### Backend `.env` (Production)

```env
# Server
NODE_ENV=production
PORT=5000
CLIENT_URL=https://student-advising-portal.pages.dev
ACTIVATION_URL_BASE=https://api.yourdomain.com/api/auth/activate

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/student_advising
DB_SSL=false

# JWT
JWT_SECRET=<64-char-hex-string>
JWT_REFRESH_SECRET=<64-char-hex-string>
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=noreply@gmail.com
EMAIL_PASSWORD=<app-password>
EMAIL_FROM=Portal <noreply@gmail.com>

# Google OAuth
GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_IDS=<id1>,<id2>,<id3>

# Supabase (File Storage)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_PROFILE_BUCKET=profile-pictures

# Feature Flags
DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT=true
MOBILE_APP_SCHEME=studentadvising
```

### Frontend Environment Variables (Cloudflare Pages)

```env
REACT_APP_API_URL=https://api.yourdomain.com/api
REACT_APP_GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
NODE_VERSION=20
```

---

## Development Tools & Configuration

### Package Management
- **npm** — Dependency management & scripts
- **Node.js 20.x** — Runtime environment

### Build Automation

**Backend Scripts:**
```bash
npm start              # Production start
npm run dev           # Development with nodemon
npm test              # Run unit tests
npm run test:integration  # Run integration tests
npm run db:migrate    # Run database migrations
npm run seed          # Seed initial data
npm run normalize     # Normalize curriculum CSV
npm run generate:import-csvs  # Generate importable CSVs
```

**Frontend Scripts:**
```bash
npm start             # Dev server on port 3000
npm run build         # Production build
npm test              # Run tests
npm run eject         # Eject from Create React App (irreversible)
```

**E2E Tests:**
```bash
npm test              # Run Playwright tests
```

### Configuration Files

| File | Purpose |
|---|---|
| `.env` | Environment variables (production) |
| `.env.example` | Template for env variables |
| `package.json` | Dependencies & scripts |
| `package-lock.json` | Locked dependency versions |
| `docker-compose.yml` | Local dev container setup |
| `Dockerfile` | Container image definitions |
| `eslintrc` | Linting rules (via react-scripts) |

### Code Quality Tools

| Tool | Purpose | Config |
|---|---|---|
| **ESLint** | Linting | `.eslintrc` (via react-scripts) |
| **Prettier** | Formatting | Optional (`.prettierrc`) |
| **Jest** | Testing | `jest.config.js` |

---

## Database Schema Summary

**17 core tables:**

```
User
├── StudentAcademicRecord
│   ├── StudyPlan
│   │   ├── StudyPlanVersion
│   │   └── StudyPlanCourse
│   │       └── Course
│   │           ├── Prerequisite
│   │           ├── CoRequisite
│   │           ├── CourseEquivalency
│   │           └── CurriculumCourse
│   │               └── Curriculum
│   │                   └── ElectiveTrack
│   │                       └── ElectiveTrackCourse
│   │                           └── Course
│   ├── Notification
│   └── AcademicTerm
│       └── ForecastSnapshot
```

---

## Project Statistics

| Metric | Count |
|---|---|
| **Backend Dependencies** | 20+ |
| **Frontend Dependencies** | 8+ |
| **Dev Dependencies** | 12+ |
| **Sequelize Models** | 17 |
| **Database Tables** | 17 |
| **API Endpoints** | 15+ |
| **Frontend Routes** | 8+ |
| **User Roles** | 3 (Admin, Adviser, Student) |
| **Total npm Packages** | 40+ |

---

## Supported Browsers

| Browser | Version |
|---|---|
| Chrome | Last 1 version |
| Firefox | Last 1 version |
| Safari | Last 1 version |
| Edge | Last 1 version |

---

## Performance & Scalability

### Backend
- Single-threaded Node.js runtime
- PM2 cluster mode ready (can spawn multiple workers)
- Connection pooling via pg driver
- Query optimization via Sequelize lazy loading

### Frontend
- Code splitting via React.lazy() (recommended)
- Image optimization via Supabase CDN
- Cloudflare global edge caching
- 500 builds/month, unlimited bandwidth (Cloudflare Pages)

### Database
- PostgreSQL indexing on frequently queried columns
- Connection pooling (pgBouncer available)
- Backup automation via cron jobs

---

## Security Best Practices Implemented

✅ JWT token-based stateless auth  
✅ Password hashing with bcrypt (10+ rounds)  
✅ HTTPS/TLS encryption (Let's Encrypt)  
✅ CORS protection  
✅ Rate limiting on API endpoints  
✅ Input validation & sanitization  
✅ SQL injection prevention (Sequelize ORM)  
✅ XSS protection (React auto-escaping)  
✅ Environment variables for secrets (no hardcoded keys)  
✅ Secure HTTP headers (Helmet middleware)  
✅ Role-based access control  

---

## Deployment Checklist

- [ ] Oracle Cloud account created & home region selected
- [ ] A1.Flex VM provisioned (2 OCPU, 12 GB RAM)
- [ ] Node.js 20.x installed on VM
- [ ] PostgreSQL 16 installed locally on VM
- [ ] Nginx installed & configured as reverse proxy
- [ ] SSL certificate obtained (Let's Encrypt via Certbot)
- [ ] Backend `.env` configured with production secrets
- [ ] Database migrations run (`npm run db:migrate`)
- [ ] Backend started with PM2 (`pm2 start server.js`)
- [ ] Cloudflare account created & GitHub connected
- [ ] Frontend deployed to Cloudflare Pages
- [ ] Frontend environment variables set
- [ ] Google OAuth credentials updated
- [ ] DNS records configured (Cloudflare)
- [ ] CORS configured for frontend domain
- [ ] Email service (Gmail App Password) configured
- [ ] Supabase profile picture bucket configured
- [ ] Database backup cron job created
- [ ] Monitoring & logging enabled
- [ ] Domain SSL certificate auto-renewal verified

---

## Version Control & Documentation

| Document | Purpose |
|---|---|
| `README.md` | Project overview & quick start |
| `USER_MANUAL.md` | Role-based user guide |
| `DEPLOYMENT_GUIDE.md` | Step-by-step production deployment |
| `TECH_STACK.md` | Technology & architecture documentation (this file) |
| `IMPLEMENTATION_PLAN.md` | Feature roadmap & completeness |
| `SOFTWARE_DESIGN.md` | System design & architecture patterns |

---

## Quick Links

- **GitHub Repo:** [Student-Advising-Portal](https://github.com/YOUR_USERNAME/Student-Advising-Portal)
- **Live Frontend:** https://student-advising-portal.pages.dev (when deployed)
- **Backend API:** https://api.yourdomain.com/api (when deployed)
- **API Docs:** https://api.yourdomain.com/api-docs (Swagger UI)
- **Oracle Cloud Console:** https://cloud.oracle.com
- **Cloudflare Dashboard:** https://dash.cloudflare.com
- **Google Cloud Console:** https://console.cloud.google.com

---

**Last Updated:** April 12, 2026  
**Maintainer:** Student Advising Portal Team
