const { sequelize, User, Curriculum, Subject, Prerequisite, EquivalencyRule, AcademicTerm } = require('./models');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  // Wipe tables clean and recreate so we start fresh each seed
  await sequelize.sync({ force: true });
  console.log('Database synced (force: true).');

  // ─── 0. Create Default Academic Term ─────────────────────────────
  await AcademicTerm.create({
    term_name: '1st Semester 2025-2026',
    start_date: '2025-08-01',
    end_date: '2025-12-15',
    is_active: true
  });
  console.log('Created default active AcademicTerm.');

  // ─── 1. Create Curriculums ───────────────────────────────────────
  const oldCurriculum = await Curriculum.create({
    version_year: '2018-2019',
    active_status: false
  });
  console.log(`Created Old Curriculum (id: ${oldCurriculum.id})`);

  const newCurriculum = await Curriculum.create({
    version_year: '2023-2024',
    active_status: true
  });
  console.log(`Created New Curriculum (id: ${newCurriculum.id})`);

  // ─── 2. Create Subjects for New Curriculum ───────────────────────
  const newSubjects = await Subject.bulkCreate([
    { course_code: 'CPE 101', title: 'Programming Logic & Design',        units: 3, seasonal_term: '1st Semester', CurriculumId: newCurriculum.id },
    { course_code: 'CPE 102', title: 'Object-Oriented Programming',       units: 3, seasonal_term: '2nd Semester', CurriculumId: newCurriculum.id },
    { course_code: 'CPE 201', title: 'Data Structures and Algorithms',    units: 3, seasonal_term: '1st Semester', CurriculumId: newCurriculum.id },
    { course_code: 'CPE 202', title: 'Computer Organization',             units: 3, seasonal_term: '2nd Semester', CurriculumId: newCurriculum.id },
    { course_code: 'CPE 301', title: 'Operating Systems',                 units: 3, seasonal_term: '1st Semester', CurriculumId: newCurriculum.id },
    { course_code: 'CPE 302', title: 'Computer Networks',                 units: 3, seasonal_term: '2nd Semester', CurriculumId: newCurriculum.id },
    { course_code: 'MATH 101', title: 'Calculus 1',                       units: 4, seasonal_term: 'Both',         CurriculumId: newCurriculum.id },
    { course_code: 'MATH 102', title: 'Calculus 2',                       units: 4, seasonal_term: 'Both',         CurriculumId: newCurriculum.id },
    { course_code: 'MATH 201', title: 'Linear Algebra',                   units: 3, seasonal_term: '1st Semester', CurriculumId: newCurriculum.id },
    { course_code: 'PHYS 101', title: 'Physics for Engineers',            units: 4, seasonal_term: '1st Semester', CurriculumId: newCurriculum.id },
    { course_code: 'GEC 101',  title: 'Understanding the Self',           units: 3, seasonal_term: '1st Semester', CurriculumId: newCurriculum.id },
    { course_code: 'GEC 102',  title: 'Readings in Philippine History',   units: 3, seasonal_term: '2nd Semester', CurriculumId: newCurriculum.id },
  ]);
  console.log(`Created ${newSubjects.length} subjects for New Curriculum.`);

  // ─── 3. Create Subjects for Old Curriculum ───────────────────────
  const oldSubjects = await Subject.bulkCreate([
    { course_code: 'CpE 100', title: 'Introduction to Programming',      units: 3, seasonal_term: '1st Semester', CurriculumId: oldCurriculum.id },
    { course_code: 'CpE 110', title: 'Advanced Programming',             units: 3, seasonal_term: '2nd Semester', CurriculumId: oldCurriculum.id },
    { course_code: 'Math 100', title: 'College Calculus',                 units: 4, seasonal_term: 'Both',         CurriculumId: oldCurriculum.id },
  ]);
  console.log(`Created ${oldSubjects.length} subjects for Old Curriculum.`);

  // ─── 4. Set Prerequisites ────────────────────────────────────────
  // Build a lookup map: course_code → id
  const allSubjects = await Subject.findAll();
  const lookup = {};
  allSubjects.forEach(s => { lookup[s.course_code] = s.id; });

  await Prerequisite.bulkCreate([
    // CPE 101 → CPE 102 (need 101 before taking 102)
    { subject_id: lookup['CPE 102'], required_subj_id: lookup['CPE 101'] },
    // CPE 102 → CPE 201
    { subject_id: lookup['CPE 201'], required_subj_id: lookup['CPE 102'] },
    // CPE 201 → CPE 301
    { subject_id: lookup['CPE 301'], required_subj_id: lookup['CPE 201'] },
    // CPE 202 → CPE 302
    { subject_id: lookup['CPE 302'], required_subj_id: lookup['CPE 202'] },
    // MATH 101 → MATH 102
    { subject_id: lookup['MATH 102'], required_subj_id: lookup['MATH 101'] },
    // MATH 102 → MATH 201
    { subject_id: lookup['MATH 201'], required_subj_id: lookup['MATH 102'] },
    // MATH 101 → PHYS 101
    { subject_id: lookup['PHYS 101'], required_subj_id: lookup['MATH 101'] },
    // Old curriculum chain: CpE 100 → CpE 110
    { subject_id: lookup['CpE 110'], required_subj_id: lookup['CpE 100'] },
  ]);
  console.log('Prerequisites created.');

  // ─── 5. Set Equivalency Rules ───────────────────────────────────
  await EquivalencyRule.bulkCreate([
    // Old CpE 100 ≡ New CPE 101
    { source_subject_id: lookup['CpE 100'], target_subject_id: lookup['CPE 101'] },
    // Old CpE 110 ≡ New CPE 102
    { source_subject_id: lookup['CpE 110'], target_subject_id: lookup['CPE 102'] },
    // Old Math 100 ≡ New MATH 101
    { source_subject_id: lookup['Math 100'], target_subject_id: lookup['MATH 101'] },
  ]);
  console.log('Equivalency rules created.');

  // ─── 6. Create Default Admin User ─────────────────────────────
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await User.create({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@tip.edu.ph',
    password: hashedPassword,
    role: 'admin',
    isActive: true,
    isVerified: true
  });
  console.log('Created default admin (admin@tip.edu.ph / admin123)');

  // Create default Student (assigned to the new/active curriculum)
  await User.create({
    studentId: '1234567',
    firstName: 'Test',
    lastName: 'Student',
    email: 'student@tip.edu.ph',
    password: hashedPassword,
    role: 'student',
    isActive: true,
    isVerified: true,
    CurriculumId: newCurriculum.id
  });
  console.log('Created default student (student@tip.edu.ph / admin123)');

  // Create default Adviser
  await User.create({
    firstName: 'Test',
    lastName: 'Adviser',
    email: 'adviser@tip.edu.ph',
    password: hashedPassword,
    role: 'adviser',
    isActive: true,
    isVerified: true
  });
  console.log('Created default adviser (adviser@tip.edu.ph / admin123)');
}

// ─── Execute ────────────────────────────────────────────────────────
seedDatabase()
  .then(() => {
    console.log('\n✔  Seed completed successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
