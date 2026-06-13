# Student Advising System User Manual

This guide explains how to use the system by role:

- Super Admin (`superadmin`)
- Program Chair (`admin`)
- Student Adviser (`adviser`)
- Student (`student`)

## 1. Before You Start

### Login Portals

The system has two separate login portals:

- **Faculty Portal** (`/login` or `/faculty-login`): For Super Admin, Program Chair, and Adviser roles
- **Student Portal** (`/student-login`): For Student roles only

Always use the correct portal for your role.

### Authentication Methods

- **Email & Password:** Standard credential-based login available on both portals
- **Google OAuth:** Available for Faculty and Student portals (if configured by system admin)
- **First-Login Workflow:** New or bootstrapped accounts may require credential setup:
  - Super Admin: Must change email and password before normal use (if bootstrapped locally)
  - Program Chair: Must change password and email on first login (unless `DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT=true` in dev)

### Session Management

- Tokens expire based on configuration (default: 7 days for access, 30 days for refresh)
- Sessions are scoped to a single browser tab
- Logging out clears your session immediately
- For security, always log out when done, especially on shared devices

### Production Bootstrap

Production deployments require Super Admin credentials to be set via environment variables:

- `SUPERADMIN_EMAIL`: The email address for the system's global Super Admin account
- `SUPERADMIN_PASSWORD`: A strong, production-grade password (never use default credentials in production)

Development environments can fall back to seeded accounts (see [Default User Credentials](#default-user-credentials)).

## 2. Super Admin Walkthrough (`superadmin`)

### A. Manage global system access

1. Open **User Management**.
2. Search users across programs.
3. Edit account details only when a system-level correction is needed.
4. Activate or deactivate users.
5. Assign or remove program access.

Program Chair, Adviser, and Student users cannot manage Super Admin accounts.

### B. Manage programs

1. Open **Program Management**.
2. Create, update, activate, deactivate, or review programs.
3. Assign Program Chairs and advisers to the correct programs.

### C. Transfer ownership

1. Open **Transfer Ownership**.
2. Select the target account according to the transfer flow.
3. Confirm the transfer.

Transfer Ownership is Super Admin-only. Program Chair users should see an insufficient-permission response if they try to access it.

### D. Review all-program operations

Super Admin can access all programs for audit, support, correction, and release verification work. Use this access only for system-level administration.

## 3. Program Chair Walkthrough (`admin`)

Program Chair remains stored internally as `admin`, but access is limited to assigned programs.

### A. Set up curriculum data

1. Open **Curriculum Management**.
2. Create or update curricula within assigned programs.
3. Manage courses and map them to year/semester.
4. Add prerequisites and co-requisites.
5. Maintain equivalencies and elective tracks.
6. Set the correct curriculum as active.

Tips:

- Use **CSV Import Preview** before applying changes.
- Review row-level errors before committing a curriculum import.
- Elective track default placements come from the curriculum import/seed data and can still be overridden per student by authorized adviser/program-chair workflows.

### B. Manage academic terms

1. Open **Term Management**.
2. Create a new term for an assigned program.
3. Activate the correct current term.
4. End a term when the term is complete.

Activating or ending terms can trigger study-plan revalidation and forecast snapshots.

### C. Monitor forecast and planning

1. Open **Forecast Dashboard**.
2. Review current demand, next forecast, comparison, and history views.
3. Use the charts and tables for section and capacity planning.

### D. Manage scoped academic operations

Program Chair can work with assigned-program SAR, study-plan, adviser assignment, curriculum, term, forecasting, prerequisite override, and elective override workflows where backend scope allows it.

Program Chair cannot:

- Transfer ownership.
- Edit user account details.
- Activate or deactivate users.
- Manage Super Admin accounts.
- Manage global program assignment controls.

## 4. Student Adviser Walkthrough (`adviser`)

### A. Find or create a Student Academic Record

1. Open **Student Records**.
2. Search for the student first.
3. If no SAR exists, click **Create New Record**.
4. Enter the student's `@tip.edu.ph` email first.
5. Fill in any missing profile fields and save.

### B. Generate and manage study plans

1. Open a student SAR.
2. If no study plan exists, click **Generate Initial Study Plan**.
3. Review the draft version in the Study Plan tab.
4. Use **Review/Edit Draft** to adjust course placements before validation.
5. Validate the selected draft version to make it active.

### C. Enter grades and regenerate when needed

1. Open **Grade Entry** for the student.
2. Enter or update grades.
3. If courses are unresolved, click **Regenerate** to create a new draft.
4. Review the regenerated draft, make any manual adjustments, then validate it.

Regeneration keeps passed courses as completed, reschedules unresolved courses, and respects prerequisites, co-requisites, and load constraints.

### D. Elective track checkpoint

For students reaching Year 2, Semester 2 or beyond:

1. Check whether the elective track is selected.
2. Select the elective track from the SAR or validation workflow.
3. Confirm elective course placements.
4. Use the per-student override workflow when the default placement needs adjustment for that student.

### E. Edit SAR profile and student details

Use **Edit Record** on the SAR to update student record details, contact information, emergency contact, and profile picture according to your assigned access.

### F. Export outputs

Use **Export PDF** from the SAR detail page to download a professional SAR summary document.

## 5. Student Walkthrough (`student`)

### A. Open your dashboard

After login, the dashboard shows current academic status. If no SAR has been created yet, contact your adviser.

### B. Review your academic record

1. Open **My Record**.
2. Review profile, progress summary, checklist, prerequisites, grades, performance, and study plan tabs.

### C. Keep your profile updated

Open **Profile** to update contact details, demographic data, emergency contact, and profile photo.

Students can update their profile once per active term. After submitting a profile update, the form becomes view-only until the next term begins.

### D. Export your record

Use **Export PDF** in **My Record** to download your own SAR document.

## 6. Role Permissions Summary

The following table summarizes what each role can access and modify:

| Feature | Super Admin | Program Chair | Adviser | Student |
|---------|-------------|---------------|---------|---------|
| **User Management** | | | | |
| View all users | Yes | Assigned program only | No | No |
| Edit user details | Yes | No | No | No |
| Activate/Deactivate users | Yes | No | No | No |
| **Program Management** | | | | |
| Create/update programs | Yes | No | No | No |
| Assign users to programs | Yes | No | No | No |
| **Curriculum** | | | | |
| View curriculum | Yes | Assigned programs | Assigned students' programs | Own curriculum only |
| Create/edit curriculum | Yes | Assigned programs | No | No |
| Import CSV courses | Yes | Assigned programs | No | No |
| **Academic Terms** | | | | |
| Manage terms | Yes | Assigned programs | No | No |
| Activate current term | Yes | Assigned programs | No | No |
| **Student Records (SAR)** | | | | |
| Create SAR | Yes | Assigned programs | Assigned students | No |
| Edit SAR | Yes | Assigned programs | Assigned students | No |
| View SAR | Yes | Assigned programs | Assigned students | Own SAR only |
| **Study Plans** | | | | |
| Generate/regenerate | Yes | Assigned programs | Assigned students | View only |
| Edit draft plans | Yes | Assigned programs | Assigned students | No |
| Validate/activate plans | Yes | Assigned programs | Assigned students | No |
| **Forecasting** | | | | |
| View forecasts | Yes | Assigned programs | No | No |
| Generate forecasts | Yes | Assigned programs | No | No |
| **Profile** | | | | |
| Update own profile | Yes | Yes | Yes | Yes (once per term) |
| Change own email | Yes | Yes | Yes | Yes |
| Change own password | Yes | Yes | Yes | Yes |
| **Special Operations** | | | | |
| Transfer ownership | Yes | No | No | No |
| Override prerequisites | Yes | Assigned programs | Assigned students | No |
| Override elective tracks | Yes | Assigned programs | Assigned students | No |
| Manage advisers | Yes | Assigned programs | No | No |

## 7. Common Questions

### I cannot see an admin or adviser page.

Confirm you logged in with the correct role account and selected the right login portal.

### Why does Program Chair see Insufficient Permission?

The action is outside the Program Chair scope. Transfer Ownership, account-detail editing, activation/deactivation, global program assignment controls, and Super Admin account management are Super Admin-only.

### No current term appears in forecasting.

Program Chair or Super Admin must activate a term first.

### Student has no record yet.

Adviser should create a SAR from **Student Records** using the student's email.

### CSV import failed.

Use the preview step first, fix the listed row-level errors, then upload the corrected CSV.

### How do I change my email?

Go to **Profile**, start email change, check the new email inbox for the OTP code, and enter the OTP to complete verification.

## 8. Suggested Monthly Routine

### Super Admin

- Review user access and program assignments.
- Check global account lifecycle changes.
- Confirm no non-superadmin account has global permissions.

### Program Chair

- Review assigned-program curriculum updates.
- Confirm active term status.
- Check forecast trends.
- Review revalidation flags after term activation.

### Adviser

- Review assigned students.
- Update grades regularly.
- Validate updated draft plans before advising meetings.
- Select or override elective track placements for qualifying students.

### Student

- Check dashboard weekly.
- Track prerequisite and plan status.
- Keep profile and contact details current.

## 9. Troubleshooting and Best Practices

### Error Messages and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid credentials" | Wrong email or password | Verify caps lock is off. Check email spelling. Use password reset if needed. |
| "Insufficient permissions" | Attempting an unauthorized action | Confirm your role and program assignment. Contact Super Admin if needed. |
| "Email already in use" | Account with that email exists | Use a different email or recover the existing account. |
| "OTP verification failed" | Wrong or expired verification code | Check the email for a fresh OTP code (codes expire after 10 minutes). |
| "Cannot access student record" | Student not assigned to program | Ensure the student is enrolled in a program and the adviser is assigned. |
| "Study plan validation failed" | Prerequisites or load constraints violated | Review prerequisites, co-requisites, and course load before validating. |

### Best Practices

**For Super Admin:**
- Review user access monthly to prevent privilege creep
- Always use strong, unique passwords for the superadmin account
- Enable 2FA (two-factor authentication) if available
- Audit program ownership transfers for legitimacy

**For Program Chair:**
- Keep curriculum data current; outdated courses cause validation errors
- Activate a new term before the previous term ends to maintain continuity
- Review forecast trends regularly to plan course sections and capacity
- Test CSV imports with small files first to catch format errors

**For Adviser:**
- Update student grades promptly after each term
- Validate study plan drafts before advising meetings
- Document prerequisite overrides with a reason (audit trail)
- Keep in touch with students about academic progress via profile reviews

**For Student:**
- Check the dashboard weekly to track academic progress
- Update profile information promptly, especially contact details
- Review prerequisites before registering for courses
- Keep your email current for critical system notifications

### Account Recovery

- **Forgot Password:** Use the "Forgot Password" link on your login portal. An email will be sent with password reset instructions.
- **Locked Account:** After 5 failed login attempts, accounts are temporarily locked. Wait 15 minutes or contact Super Admin.
- **Lost Email Access:** Contact Super Admin to update the account email address.

## 10. More Details

- [README.md](README.md): project overview and setup.
- [SYSTEM_REFERENCE.md](SYSTEM_REFERENCE.md): technical reference.
- [SOFTWARE_DESIGN.md](SOFTWARE_DESIGN.md): system design.
- [SYSTEM_WORKFLOW.puml](SYSTEM_WORKFLOW.puml): visual workflow map.
- [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md): Google OAuth setup.
