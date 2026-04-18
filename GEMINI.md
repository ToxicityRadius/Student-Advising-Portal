# Student Advising Portal — Project-Specific Instructions

This file provides context specific to the **Student Advising Portal** repository.
It is loaded on top of the global `~/.gemini/GEMINI.md` instructions when working in this project.

## Architecture

- **Backend**: Express.js — layered as `routes → controllers → models/middleware/utils`
  - Routes: `backend/routes/`
  - Controllers: `backend/controllers/`
  - Models: Sequelize ORM, centrally wired in `backend/models/index.js`
  - Middleware/utils: `backend/middleware/`, `backend/utils/`
- **Frontend**: React — structured as `pages → components → context → shared utils`
  - Pages: `frontend/src/pages/`
  - Components: `frontend/src/components/`
  - Auth context: `frontend/src/context/`
  - API helper: `frontend/src/utils/` (shared HTTP util with token handling)
- **Auth**: JWT + cookie-based. `req.user` is the authenticated identity source on the backend.
- **Roles**: admin, adviser, student — role-based access enforced via existing middleware.

## Build & Dev Commands

| Context | Command | Directory |
|---|---|---|
| Backend dev server | `npm run dev` | `backend/` |
| Frontend dev server | `npm start` | `frontend/` |
| Frontend tests | `npm test` | `frontend/` |
| E2E tests | see `e2e/` folder | project root |

## MCP Tools Available (via `.vscode/mcp.json`)

- **firecrawl** — web scraping and crawling (`npx -y firecrawl-mcp`)

## Husky Pre-commit Hook

Runs `lint-staged` automatically before every commit. Ensure linting passes before committing.

---

## Backend Rules (`backend/**`)

### Code Organization
- Keep endpoint wiring in routes files and business logic in controllers.
- Put shared auth, validation helpers, and cross-cutting concerns in middleware or utils.
- Follow existing file naming and export style in backend.

### Auth and Access
- Use existing auth middleware patterns for protected routes.
- Enforce role restrictions for admin, adviser, and student behavior according to existing access model.
- Prefer authenticated context (`req.user`) for ownership checks over client-provided identity fields.

### API Contracts
- Preserve existing response structures unless explicitly asked to change contract.
- Use appropriate status codes and clear JSON error messages.
- Keep route naming and parameter style consistent with existing backend routes.

### Sequelize and Data Integrity
- Follow existing model conventions and associations in models index.
- When adding relationships, update both model definitions and central association wiring.
- Avoid destructive schema assumptions in feature work; prefer additive changes when possible.

### Verification Expectations
- For backend endpoint changes, verify route registration, middleware order, and controller behavior.
- Mention exact backend files touched and summarize potential edge cases.

---

## Frontend Rules (`frontend/src/**`)

### Code Organization
- Keep route-level screens in pages and reusable UI in components.
- Follow existing naming and file placement patterns.
- Prefer focused component changes over broad UI rewrites.

### Auth and Routing
- Preserve current auth flow and route protection behavior.
- Use existing AuthContext patterns for user state and auth actions.
- Keep protected navigation and role-sensitive rendering aligned with existing route guards.

### API Usage and Async UX
- Use shared API utility for HTTP calls and token behavior.
- Handle loading, success, empty, and error states for async interactions.
- Surface actionable error messages without exposing internal server details.

### Forms and Validation
- Keep field validation consistent with current UX style.
- Validate before submit and handle backend validation feedback cleanly.
- Avoid changing existing payload contracts unless requested.

### Verification Expectations
- For UI changes, confirm route behavior, form flows, and API integration paths affected.
- List touched frontend files and any remaining UI edge cases.
