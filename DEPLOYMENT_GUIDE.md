# Deployment Guide - Student Advising Portal

Production target:

- Frontend: Cloudflare Pages
- Backend API: Render Web Service
- Database: Render PostgreSQL or another managed PostgreSQL reachable by `DATABASE_URL`
- Profile storage: Supabase Storage when configured

This guide assumes the frontend and backend run on separate HTTPS origins, for example:

- `https://student-advising-portal.pages.dev`
- `https://student-advising-backend.onrender.com/api`

## 1. Predeploy Verification

Run these from the repository root before deploying:

```powershell
npm.cmd run lint:backend
npm.cmd --prefix frontend run build
npm.cmd run test:backend:ci
npm.cmd run test:frontend:ci
```

Run integration tests when a disposable PostgreSQL URL is available:

```powershell
$env:TEST_DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/student_advising_test"
npm.cmd run test:backend:integration
```

Run local or hosted Playwright smoke tests when both services are reachable:

```powershell
npm.cmd run test:e2e:smoke
```

For hosted smoke tests:

```powershell
$env:E2E_BASE_URL="https://student-advising-portal.pages.dev"
$env:E2E_API_URL="https://student-advising-backend.onrender.com/api"
npm.cmd run test:e2e:smoke
```

## 2. Render Backend

Create a Render Web Service from the repository with these settings:

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Environment | Docker or Node |
| Dockerfile path | `backend/Dockerfile` when using Docker |
| Build command | `npm ci --omit=dev` when using Node |
| Start command | `npm start` |
| Health check path | `/api/health` |

Required Render environment variables:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/student_advising
CLIENT_URL=https://student-advising-portal.pages.dev
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<different-strong-random-secret>
SUPERADMIN_EMAIL=<production-superadmin-email>
SUPERADMIN_PASSWORD=<production-superadmin-password>
```

For separate Cloudflare Pages and Render domains, use cross-site secure cookies:

```env
AUTH_COOKIE_SAME_SITE=none
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_DOMAIN=
```

Optional backend variables:

```env
GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_IDS=<client-id>.apps.googleusercontent.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<smtp-user>
EMAIL_PASSWORD=<smtp-password-or-app-password>
EMAIL_FROM=Student Advising Portal <noreply@example.com>
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_PROFILE_BUCKET=profile-pictures
```

Keep `CLIENT_URL` exact by default. If Cloudflare preview deployments need to call the same backend, add only the trusted preview wildcard:

```env
CLIENT_URL=https://student-advising-portal.pages.dev,https://*.student-advising-portal.pages.dev
```

Do not use broad origins like `https://*`.

## 3. Cloudflare Pages Frontend

Create a Cloudflare Pages project from the repository with these settings:

| Setting | Value |
|---|---|
| Project root | `frontend` |
| Build command | `npm run build` |
| Build output directory | `build` |
| SPA fallback | `frontend/public/_redirects` contains `/* /index.html 200` |

Required Cloudflare Pages environment variables:

```env
REACT_APP_API_URL=https://student-advising-backend.onrender.com/api
REACT_APP_GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
NODE_VERSION=20
```

If the Pages build hits memory pressure, use the same production-safe build shape locally for diagnosis:

```powershell
cd frontend
$env:GENERATE_SOURCEMAP="false"
$env:DISABLE_ESLINT_PLUGIN="true"
node --max-old-space-size=8192 node_modules/react-scripts/scripts/build.js
```

Production builds must not rely on `http://localhost:5000/api`. Set `REACT_APP_API_URL` in Cloudflare before deploying.

## 4. Google OAuth

In Google Cloud Console, add the deployed frontend origin:

```text
https://student-advising-portal.pages.dev
```

If you use a custom domain, add that origin too. Keep the same client ID in:

- Cloudflare Pages `REACT_APP_GOOGLE_CLIENT_ID`
- Render `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_IDS`

## 5. Post-Deploy Checks

Backend health:

```powershell
Invoke-RestMethod "https://student-advising-backend.onrender.com/api/health"
```

Expected result:

- HTTP 200
- `dependencies.database` is `up`

Frontend checks:

- Open the Pages URL directly.
- Refresh a deep route such as `/notifications`; the SPA fallback should render the app.
- Log in by role and verify the frontend calls the Render API URL.
- Verify profile images render through the Render base URL or Supabase public URL.
- Click a notification and confirm it marks read and navigates to the related page.

Cross-site auth checks:

- Login succeeds from Cloudflare Pages.
- Session refresh succeeds after access-token expiry.
- Browser devtools show no CORS errors.
- Render logs do not show rejected origins for the Pages domain.

## 6. Release Gates

Before treating a deployment as ready:

```powershell
npm.cmd run audit:backend:high:soft
npm.cmd run audit:frontend:high
```

Policy:

- Backend high-severity production vulnerabilities block release.
- Frontend `axios` must stay upgraded.
- Remaining Create React App / `react-scripts` transitive findings are tracked as a separate tooling migration unless a safe non-breaking upgrade exists.

## 7. Troubleshooting

Frontend shows network errors:

- Confirm Cloudflare Pages `REACT_APP_API_URL` is the Render API URL and ends with `/api`.
- Confirm Render `CLIENT_URL` exactly includes the Pages origin.
- Confirm the backend health endpoint returns database `up`.

Login works but refresh fails:

- Confirm `AUTH_COOKIE_SAME_SITE=none`.
- Confirm `AUTH_COOKIE_SECURE=true`.
- Leave `AUTH_COOKIE_DOMAIN` empty unless frontend and backend share a parent domain.

Direct route refresh shows 404:

- Confirm `frontend/public/_redirects` is present in the deployed build.
- Confirm the Pages build output directory is `build`.

Render service starts but immediately exits:

- Check Render logs for missing `DATABASE_URL`, `CLIENT_URL`, `JWT_SECRET`, or `JWT_REFRESH_SECRET`.
- Confirm `NODE_ENV=production`.
- Confirm the database accepts connections from Render.

Migrations fail:

- Render production startup refuses to continue when migrations fail.
- Fix the migration or database state first, then redeploy.

## Quick Reference

| Component | URL / Setting |
|---|---|
| Frontend | `https://student-advising-portal.pages.dev` |
| Backend API | `https://student-advising-backend.onrender.com/api` |
| Backend health | `https://student-advising-backend.onrender.com/api/health` |
| Cloudflare API env | `REACT_APP_API_URL=https://student-advising-backend.onrender.com/api` |
| Render frontend allowlist | `CLIENT_URL=https://student-advising-portal.pages.dev` |
| Render cookie mode | `AUTH_COOKIE_SAME_SITE=none`, `AUTH_COOKIE_SECURE=true` |
