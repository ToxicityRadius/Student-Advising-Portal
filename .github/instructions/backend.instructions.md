---
description: "Use when working on Express routes, controllers, middleware, Sequelize models, auth, and backend API behavior in Student Advising Portal."
name: "Backend API and Data Rules"
applyTo: "backend/**/*"
---

# Backend Implementation Rules

## Code Organization
- Keep endpoint wiring in routes files and business logic in controllers.
- Put shared auth, validation helpers, and cross-cutting concerns in middleware or utils.
- Follow existing file naming and export style in backend.

## Auth and Access
- Use existing auth middleware patterns for protected routes.
- Enforce role restrictions for admin, adviser, and student behavior according to existing access model.
- Prefer authenticated context (`req.user`) for ownership checks over client-provided identity fields.

## API Contracts
- Preserve existing response structures unless explicitly asked to change contract.
- Use appropriate status codes and clear JSON error messages.
- Keep route naming and parameter style consistent with existing backend routes.

## Sequelize and Data Integrity
- Follow existing model conventions and associations in models index.
- When adding relationships, update both model definitions and central association wiring.
- Avoid destructive schema assumptions in feature work; prefer additive changes when possible.

## Verification Expectations
- For backend endpoint changes, verify route registration, middleware order, and controller behavior.
- Mention exact backend files touched and summarize potential edge cases.
