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
  2. Email change + verification
- You must finish this once before full admin access is enabled.

---

## 2) Program Chair Walkthrough (`admin`) 👔

### A. Set up curriculum data 🗂️
1. Open **Curriculum Management**.
2. Create or update curricula.
3. Manage courses and map them to year/semester.
4. Add prerequisites and co-requisites.
5. Maintain equivalencies and elective tracks.
6. Set one curriculum as **Active**.

Tip 💡:
- Use CSV import preview first before applying changes.
- Export CSV when you need backup or batch editing.

### B. Manage academic terms 🗓️
1. Open **Term Management**.
2. Create a new term (school year + semester).
3. Activate the correct current term.

### C. Monitor forecast and planning 📈
1. Open **Forecast Dashboard**.
2. Review:
   - current demand,
   - next-term forecast,
   - comparison and history views.
3. Use this for section/capacity planning decisions.

### D. End-of-term routine 🔄
1. End current term.
2. Confirm snapshot is saved.
3. Activate the next term.
4. Ensure required plan revalidation is completed.

---

## 3) Student Adviser Walkthrough (`adviser`) 🧑‍🏫

### A. Find or create a Student Academic Record (SAR) 📄
1. Open **Student Records**.
2. Search the student first.
3. If no SAR exists, create one using email-first flow:
   - enter email,
   - let autofill complete known details,
   - fill missing fields and save.

### B. Generate and manage study plans 🧩
1. Open a student SAR.
2. Generate initial study plan if needed.
3. Review draft version.
4. Edit/adjust draft when necessary.
5. Validate the selected draft to make it active.

### C. Enter grades and regenerate when needed 📝
1. Enter/update grades in the current cycle.
2. If unresolved/failed/INC subjects exist, regenerate draft plan.
3. Re-check prerequisites and load balance.
4. Validate updated draft.

### D. Elective track checkpoint 🎯
- For students reaching Year 2, Semester 2:
  1. Ensure elective track is selected.
  2. Confirm plan electives follow that track.

### E. Export and share outputs 🧾
- Use **Export PDF** from SAR for a printable advising summary.

---

## 4) Student Walkthrough (`student`) 🎓

### A. Open your dashboard 🏠
- After login, dashboard shows your current academic status.
- If no SAR exists yet, you’ll see a clear message and next steps.

### B. Review your academic record 📘
1. Open **My Record**.
2. Check progress sections (status, prerequisites, grades, study plan).
3. Follow the latest validated plan for your term.

### C. Keep your profile updated 👤
- Update profile details anytime.
- Upload/replace/remove profile photo as needed.

### D. Export your record 📤
- Use **Export PDF** to download your own SAR document.

---

## 5) Common Tasks & Quick Answers ❓

### “I can’t see an admin/adviser page.”
- Confirm you logged in with the correct role account.
- Confirm you used the correct role login path.

### “No current term appears in forecasting.”
- Program Chair must activate a term in **Term Management** first.

### “Student has no record yet.”
- Adviser should create SAR from **Student Records** using student email.

### “Why is Program Chair blocked after first login?”
- Initial security policy requires one-time credential rotation and email verification.

---

## 6) Suggested Monthly Routine 📅

### Program Chair 👔
- Review curriculum updates
- Confirm active term status
- Check forecast trends

### Adviser 🧑‍🏫
- Review assigned students
- Update grades regularly
- Validate updated draft plans before advising meetings

### Student 🎓
- Check dashboard weekly
- Track prerequisite and plan status
- Keep profile and contact details current

---

## 7) Where to Find More Details 🔎

- [README.md](README.md) — Project overview and setup
- [SYSTEM_REFERENCE.md](SYSTEM_REFERENCE.md) — Detailed technical reference
- [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) — Google OAuth configuration
- [SYSTEM_WORKFLOW.puml](SYSTEM_WORKFLOW.puml) — Visual workflow map
