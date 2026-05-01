# Student Advising System User Manual

This guide explains how to use the system by role:

- Super Admin (`superadmin`)
- Program Chair (`admin`)
- Student Adviser (`adviser`)
- Student (`student`)

## 1. Before You Start

### Log in the right way

- Super Admin, Program Chair, and Adviser use the Faculty login.
- Students use the Student login.

### First login and seeded accounts

- Production Super Admin bootstrap requires `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD`.
- Local fallback Super Admin accounts must change both email and password before normal use.
- Seeded Program Chair accounts also require first-login password and email setup unless local development sets `DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT=true`.
- Google sign-in is available for Faculty and Student portals. The first login may ask for role or student ID details depending on the account.

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

## 6. Common Questions

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

## 7. Suggested Monthly Routine

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

## 8. More Details

- [README.md](README.md): project overview and setup.
- [SYSTEM_REFERENCE.md](SYSTEM_REFERENCE.md): technical reference.
- [SOFTWARE_DESIGN.md](SOFTWARE_DESIGN.md): system design.
- [SYSTEM_WORKFLOW.puml](SYSTEM_WORKFLOW.puml): visual workflow map.
- [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md): Google OAuth setup.
