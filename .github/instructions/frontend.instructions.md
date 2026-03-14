---
description: "Use when working on React pages/components, route protection, AuthContext usage, forms, and API integration in Student Advising Portal frontend."
name: "Frontend UI and Auth Rules"
applyTo: "frontend/src/**/*"
---

# Frontend Implementation Rules

## Code Organization
- Keep route-level screens in pages and reusable UI in components.
- Follow existing naming and file placement patterns.
- Prefer focused component changes over broad UI rewrites.

## Auth and Routing
- Preserve current auth flow and route protection behavior.
- Use existing AuthContext patterns for user state and auth actions.
- Keep protected navigation and role-sensitive rendering aligned with existing route guards.

## API Usage and Async UX
- Use shared API utility for HTTP calls and token behavior.
- Handle loading, success, empty, and error states for async interactions.
- Surface actionable error messages without exposing internal server details.

## Forms and Validation
- Keep field validation consistent with current UX style.
- Validate before submit and handle backend validation feedback cleanly.
- Avoid changing existing payload contracts unless requested.

## Verification Expectations
- For UI changes, confirm route behavior, form flows, and API integration paths affected.
- List touched frontend files and any remaining UI edge cases.
