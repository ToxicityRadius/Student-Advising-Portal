# Student Advising Portal Guidelines

## Scope
These rules apply to all work in this repository. Follow existing patterns first and keep changes minimal, targeted, and consistent.

## Architecture
- Keep the backend layered as routes -> controllers -> models/middleware/utils.
- Keep the frontend structured as pages, components, context, and shared utils.
- Reuse existing modules before introducing new folders or abstractions.

## Safety and Change Discipline
- Do not refactor unrelated code.
- Do not change public API request or response shapes unless explicitly requested.
- Keep database and API compatibility in mind; avoid breaking existing consumers.
- Never revert user changes unrelated to the task.

## Authentication and Authorization
- Preserve JWT and cookie-based auth flows already implemented.
- Any protected backend endpoint must enforce authentication and role-based access checks consistent with existing middleware usage.
- Do not trust user identity values from request body when authenticated context exists.

## Data and Validation
- Validate request payloads in controllers before writes.
- Keep error handling explicit and consistent by status type (validation, unauthorized, forbidden, not found, server error).
- Follow existing Sequelize association and naming conventions.

## Frontend Behavior
- Use shared API helper for network calls.
- For async UI work, include loading, error, and empty states where applicable.
- Preserve existing route protection patterns and auth context usage.

## Build and Verification
- Backend dev command: run `npm run dev` in `backend`.
- Frontend dev command: run `npm start` in `frontend`.
- Frontend test command: run `npm test` in `frontend`.
- After edits, run the smallest relevant verification and report what was checked.

## Response Quality
- Before edits, briefly state assumptions and intended files.
- After edits, report changed files, verification steps, and any remaining risks or follow-ups.
- If a requirement is ambiguous, ask concise clarifying questions before making risky assumptions.
