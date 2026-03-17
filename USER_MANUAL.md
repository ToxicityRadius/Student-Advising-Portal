# Student Advising System — User Manual 📘

This guide explains how to use the system in plain language for each type of user:
- 👔 Program Chair (`admin`)
- 🧑‍🏫 Student Adviser (`adviser`)
- 🎓 Student (`student`)

---

## 1) Before You Start 🚦

### Log in the right way 🔐
- Use the correct login path based on your role:
  - **Program Chair / Adviser:** Faculty login
  - **Student:** Student login

### First login for Program Chair 👔
- If you are using the initial Program Chair account, the system will require:
  1. Password change
  2. Email change + OTP verification (sent to your new email)
- You must complete both steps once before full admin access is enabled.
- To bypass this in a local development environment, set `DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT=true` in `backend/.env`.

### Google OAuth sign-in
- Google sign-in is available for both Faculty and Student portals.
- Signing in with Google the first time may prompt you to supply your Student ID (for student accounts) or choose a role.
- Only emails matching the configured domain policy will be accepted.

---

## 2) Program Chair Walkthrough (`admin`) 👔

### A. Set up curriculum data 🗂️
1. Open **Curriculum Management**.
2. Create or update curricula.
3. Manage courses and map them to year/semester.
4. Add prerequisites and co-requisites.
5. Maintain equivalencies and elective tracks.
6. Set one curriculum as **Active**.

Tips 💡:
- Use **CSV Import Preview** first (dry-run) before applying changes; review any row-level errors shown before committing.
- Use **Export CSV** when you need a backup or want to batch-edit curriculum data externally.
- Elective track course placements (year/semester) can be updated after being added.

### B. Manage academic terms 🗓️
1. Open **Term Management**.
2. Create a new term (school year + semester).
3. Activate the correct current term — all currently active study plans will be flagged for revalidation.
4. A confirmation modal is required before activating or ending a term.

### C. Monitor forecast and planning 📈
1. Open **Forecast Dashboard**.
2. Review four tabs:
   - **Current Demand** — how many students are taking each course this term
   - **Next Forecast** — projected demand one semester ahead
   - **Comparison** — actual vs. forecasted difference from the previous snapshot
   - **History** — all past forecast snapshots with full data tables
3. Both bar charts and data tables are available for each view.
4. Use this for section/capacity planning decisions.

### D. End-of-term routine 🔄
1. End the current term in **Term Management** — this saves a forecast snapshot automatically.
2. Activate the next term.
3. Ensure advisers pick up the revalidation work (study plans flagged after term activation).

### E. Transfer Program Chair access 🔁
1. Open **Transfer Ownership** (from the navbar or profile area).
2. Search and select an adviser.
3. Confirm the transfer — you will be demoted to adviser and automatically signed out.
4. The selected adviser's role is upgraded to Program Chair immediately.

---

## 3) Student Adviser Walkthrough (`adviser`) 🧑‍🏫

### A. Find or create a Student Academic Record (SAR) 📄
1. Open **Student Records**.
2. Search the student first.
3. If no SAR exists, click **Create New Record**:
   - Enter the student's `@tip.edu.ph` email first.
   - The system will autofill known profile details if the student already has an account.
   - Fill in any missing fields and save.

### B. Generate and manage study plans 🧩
1. Open a student SAR.
2. If no study plan exists, click **Generate Initial Study Plan**.
3. Review the draft version in the Study Plan tab.
4. Use **Review/Edit Draft** to adjust course placements before validating.
5. Validate the selected draft version to make it the new active plan.

### C. Enter grades and regenerate when needed 📝
1. Open **Grade Entry** for the student.
2. Enter or update grades (numeric grades, `INC`, `Pending`, `4.00` accepted).
3. If any courses are unresolved (failed / INC / dropped), click **Regenerate** to create a new draft.
   - Regeneration keeps passed courses as completed, reschedules unresolved ones, and respects prerequisites, co-requisites, and load constraints.
4. Review the regenerated draft, make any manual adjustments, then validate it.

### D. Elective track checkpoint 🎯
- For students reaching Year 2, Semester 2 or beyond:
  1. The system will flag if the elective track is not yet selected.
  2. Select the elective track from the SAR or during validation — it becomes immutable once set.
  3. Confirm all elective course slots match the selected track.

### E. Edit SAR profile and student details ✏️
- Use **Edit Record** (pencil icon on the SAR) to update:
  - Student name, student number, year level, curriculum assignment
  - Full student profile (contact, demographics, emergency contact)
  - Profile picture (upload, replace, or remove)

### F. Export and share outputs 🧾
- Use **Export PDF** from the SAR detail page to download a professional SAR summary document.

---

## 4) Student Walkthrough (`student`) 🎓

### A. Open your dashboard 🏠
- After login, the dashboard shows your current academic status.
- If no SAR has been created for you yet, you'll see a clear message with guidance to contact your adviser.

### B. Review your academic record 📘
1. Open **My Record**.
2. Review all tabs:
   - **Profile & Identity** — your personal and contact details
   - **Progress Summary** — GWA, completion %, remaining units, and prerequisite risk flags
   - **Checklist** — all courses with current status
   - **Prerequisites** — pending prerequisite risk items
   - **Grades & Performance** — grade breakdown by year/semester
   - **Study Plan** — your active study plan grouped by year level and semester

### C. Keep your profile updated 👤
- Open **Profile** to update contact details, demographic data, emergency contact, and profile photo.
- Profile updates are accepted anytime.
- **Note:** Students can update their profile once per active term. If you have already submitted a profile update during the current term, the form will be in view-only mode until the next term begins.

### D. Export your record 📤
- Use **Export PDF** in **My Record** to download your own SAR document.

---

## 5) Common Tasks & Quick Answers ❓

### "I can't see an admin/adviser page."
- Confirm you logged in with the correct role account.
- Confirm you used the correct role login path (Faculty vs. Student).

### "No current term appears in forecasting."
- Program Chair must activate a term in **Term Management** first.

### "Student has no record yet."
- Adviser should create a SAR from **Student Records** using the student's email.

### "Why is Program Chair blocked after first login?"
- Initial security policy requires one-time credential rotation (password + verified email change).

### "Why is my profile form locked?"
- Students can submit a profile update once per active academic term. The form unlocks at the start of the next term.

### "CSV import failed — what do I do?"
- Use the **Preview** step first; the system lists row-level errors.
- Fix errors in the CSV file and re-upload the corrected version.

### "How do I change my email?"
- Go to **Profile** and initiate email change.
- Check your new email's inbox for the OTP code.
- Enter the code to verify and complete the change.

---

## 6) Suggested Monthly Routine 📅

### Program Chair 👔
- Review curriculum updates
- Confirm active term status
- Check forecast trends
- Review any revalidation flags after term activation

### Adviser 🧑‍🏫
- Review assigned students
- Update grades regularly
- Validate updated draft plans before advising meetings
- Select elective tracks for qualifying students

### Student 🎓
- Check dashboard weekly
- Track prerequisite and plan status
- Keep profile and contact details current

---

## 7) Where to Find More Details 🔎

- [README.md](README.md) — Project overview and setup
- [SYSTEM_REFERENCE.md](SYSTEM_REFERENCE.md) — Detailed technical reference (project structure, API endpoints, models, utilities)
- [SYSTEM_WORKFLOW.puml](SYSTEM_WORKFLOW.puml) — Visual workflow map (PlantUML)
- [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) — Google OAuth configuration guide
