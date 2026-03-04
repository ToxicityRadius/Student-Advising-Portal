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

  // ═══════════════════════════════════════════════════════════════════
  // 1. Create Curriculums
  // ═══════════════════════════════════════════════════════════════════
  const legacyCurriculum = await Curriculum.create({
    version_year: 'BS CpE – 2018 (Legacy)',
    active_status: false
  });
  console.log(`Created Legacy Curriculum (id: ${legacyCurriculum.id})`);

  const activeCurriculum = await Curriculum.create({
    version_year: 'BS CpE – 2024 (Active)',
    active_status: true
  });
  console.log(`Created Active Curriculum (id: ${activeCurriculum.id})`);

  // ═══════════════════════════════════════════════════════════════════
  // 2. Subjects — Legacy Curriculum  (26 subjects, realistic codes)
  //    No "-OLD" suffix — entirely distinct codes & names reflecting
  //    a genuine 2018-era curriculum overhaul.
  // ═══════════════════════════════════════════════════════════════════
  const oldSubjects = await Subject.bulkCreate([
    // ── Year 1, 1st Semester ──
    { course_code: 'CpE 100',  title: 'Introduction to Computing',        units: 3, seasonal_term: '1st Semester', year_level: 1, CurriculumId: legacyCurriculum.id },
    { course_code: 'MATH 100', title: 'Advanced Algebra',                  units: 4, seasonal_term: '1st Semester', year_level: 1, CurriculumId: legacyCurriculum.id },
    { course_code: 'PHYS 10',  title: 'Classical Mechanics',               units: 3, seasonal_term: '1st Semester', year_level: 1, CurriculumId: legacyCurriculum.id }, // COMBO ½ → PHYS 100
    { course_code: 'GE 10',    title: 'Filipino Psychology',               units: 3, seasonal_term: '1st Semester', year_level: 1, CurriculumId: legacyCurriculum.id },

    // ── Year 1, 2nd Semester ──
    { course_code: 'CpE 110',  title: 'Structured Programming',           units: 3, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: legacyCurriculum.id },
    { course_code: 'MATH 110', title: 'Analytic Geometry',                 units: 4, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: legacyCurriculum.id },
    { course_code: 'PHYS 11',  title: 'Waves & Thermodynamics',            units: 3, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: legacyCurriculum.id }, // COMBO ½ → PHYS 100
    { course_code: 'GE 11',    title: 'Philippine Institutions',           units: 3, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: legacyCurriculum.id },

    // ── Year 2, 1st Semester ──
    { course_code: 'CpE 200',  title: 'Algorithms & Complexity',          units: 3, seasonal_term: '1st Semester', year_level: 2, CurriculumId: legacyCurriculum.id },
    { course_code: 'MATH 200', title: 'Differential Equations',            units: 3, seasonal_term: '1st Semester', year_level: 2, CurriculumId: legacyCurriculum.id },
    { course_code: 'CpE 210',  title: 'Combinatorics & Graph Theory',     units: 3, seasonal_term: '1st Semester', year_level: 2, CurriculumId: legacyCurriculum.id },

    // ── Year 2, 2nd Semester ──
    { course_code: 'CpE 220',  title: 'Digital Logic Design',             units: 3, seasonal_term: '2nd Semester', year_level: 2, CurriculumId: legacyCurriculum.id },
    { course_code: 'CpE 205',  title: 'Software Design',                  units: 3, seasonal_term: '2nd Semester', year_level: 2, CurriculumId: legacyCurriculum.id }, // SPLIT → CPE 205A + CPE 205B
    { course_code: 'CpE 230',  title: 'Database Fundamentals',            units: 3, seasonal_term: '2nd Semester', year_level: 2, CurriculumId: legacyCurriculum.id },

    // ── Year 3, 1st Semester ──
    { course_code: 'CpE 300',  title: 'Operating Systems Theory',         units: 3, seasonal_term: '1st Semester', year_level: 3, CurriculumId: legacyCurriculum.id },
    { course_code: 'CpE 310',  title: 'Microcontroller Systems',          units: 3, seasonal_term: '1st Semester', year_level: 3, CurriculumId: legacyCurriculum.id }, // COMBO ½ → CPE 305
    { course_code: 'CpE 311',  title: 'Embedded Hardware Lab',            units: 2, seasonal_term: '1st Semester', year_level: 3, CurriculumId: legacyCurriculum.id }, // COMBO ½ → CPE 305
    { course_code: 'CpE 350',  title: 'Software Engineering Principles',  units: 3, seasonal_term: '1st Semester', year_level: 3, CurriculumId: legacyCurriculum.id }, // SPLIT → CPE 303 + CPE 304

    // ── Year 3, 2nd Semester ──
    { course_code: 'CpE 320',  title: 'Networking Fundamentals',          units: 3, seasonal_term: '2nd Semester', year_level: 3, CurriculumId: legacyCurriculum.id }, // COMBO ½ → CPE 302
    { course_code: 'CpE 321',  title: 'Network Protocols',                units: 3, seasonal_term: '2nd Semester', year_level: 3, CurriculumId: legacyCurriculum.id }, // COMBO ½ → CPE 302
    { course_code: 'CpE 330',  title: 'Information Security Basics',      units: 3, seasonal_term: '2nd Semester', year_level: 3, CurriculumId: legacyCurriculum.id }, // COMBO ½ → CPE 306
    { course_code: 'CpE 331',  title: 'Cryptography Fundamentals',        units: 3, seasonal_term: '2nd Semester', year_level: 3, CurriculumId: legacyCurriculum.id }, // COMBO ½ → CPE 306

    // ── Year 4, 1st Semester ──
    { course_code: 'CpE 400',  title: 'Research Project I',               units: 3, seasonal_term: '1st Semester', year_level: 4, CurriculumId: legacyCurriculum.id },
    { course_code: 'CpE 410',  title: 'Intelligent Systems',              units: 3, seasonal_term: '1st Semester', year_level: 4, CurriculumId: legacyCurriculum.id }, // SPLIT → CPE 403 + CPE 404

    // ── Year 4, 2nd Semester ──
    { course_code: 'CpE 420',  title: 'Research Project II',              units: 3, seasonal_term: '2nd Semester', year_level: 4, CurriculumId: legacyCurriculum.id },
    { course_code: 'CpE 430',  title: 'Technology Venture Management',    units: 3, seasonal_term: '2nd Semester', year_level: 4, CurriculumId: legacyCurriculum.id },
  ]);
  console.log(`Created ${oldSubjects.length} subjects for Legacy Curriculum.`);

  // ═══════════════════════════════════════════════════════════════════
  // 3. Subjects — Active Curriculum  (26 subjects across 4 years)
  //
  //    Combination targets (N:1):
  //      • PHYS 100  ← PHYS 10 + PHYS 11
  //      • CPE 305   ← CpE 310 + CpE 311
  //      • CPE 302   ← CpE 320 + CpE 321
  //      • CPE 306   ← CpE 330 + CpE 331
  //
  //    Split targets (1:N) — each pair in DIFFERENT semesters:
  //      • CPE 205A (Y2 S1) + CPE 205B (Y2 S2) ← CpE 205
  //      • CPE 303  (Y3 S1) + CPE 304  (Y3 S2) ← CpE 350
  //      • CPE 403  (Y4 S1) + CPE 404  (Y4 S2) ← CpE 410
  // ═══════════════════════════════════════════════════════════════════
  const newSubjects = await Subject.bulkCreate([
    // ── Year 1, 1st Semester ──
    { course_code: 'CPE 101',  title: 'Programming Logic & Design',            units: 3, seasonal_term: '1st Semester', year_level: 1, CurriculumId: activeCurriculum.id },
    { course_code: 'MATH 101', title: 'Calculus 1',                            units: 4, seasonal_term: '1st Semester', year_level: 1, CurriculumId: activeCurriculum.id },
    { course_code: 'GEC 101',  title: 'Understanding the Self',                units: 3, seasonal_term: '1st Semester', year_level: 1, CurriculumId: activeCurriculum.id },
    { course_code: 'PHYS 100', title: 'General Physics',                       units: 4, seasonal_term: '1st Semester', year_level: 1, CurriculumId: activeCurriculum.id }, // COMBO target

    // ── Year 1, 2nd Semester ──
    { course_code: 'CPE 102',  title: 'Object-Oriented Programming',           units: 3, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: activeCurriculum.id },
    { course_code: 'MATH 102', title: 'Calculus 2',                            units: 4, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: activeCurriculum.id },
    { course_code: 'GEC 102',  title: 'Readings in Philippine History',        units: 3, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: activeCurriculum.id },
    { course_code: 'PHYS 102', title: 'Physics 2 (Electricity & Magnetism)',   units: 4, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: activeCurriculum.id },

    // ── Year 2, 1st Semester ──
    { course_code: 'CPE 201',  title: 'Data Structures and Algorithms',        units: 3, seasonal_term: '1st Semester', year_level: 2, CurriculumId: activeCurriculum.id },
    { course_code: 'MATH 201', title: 'Linear Algebra',                        units: 3, seasonal_term: '1st Semester', year_level: 2, CurriculumId: activeCurriculum.id },
    { course_code: 'CPE 203',  title: 'Discrete Mathematics',                  units: 3, seasonal_term: '1st Semester', year_level: 2, CurriculumId: activeCurriculum.id },
    { course_code: 'CPE 205A', title: 'Software Design 1',                     units: 3, seasonal_term: '1st Semester', year_level: 2, CurriculumId: activeCurriculum.id }, // SPLIT target ½

    // ── Year 2, 2nd Semester ──
    { course_code: 'CPE 202',  title: 'Computer Organization',                 units: 3, seasonal_term: '2nd Semester', year_level: 2, CurriculumId: activeCurriculum.id },
    { course_code: 'CPE 204',  title: 'Database Systems',                      units: 3, seasonal_term: '2nd Semester', year_level: 2, CurriculumId: activeCurriculum.id },
    { course_code: 'GEC 201',  title: 'Ethics',                                units: 3, seasonal_term: '2nd Semester', year_level: 2, CurriculumId: activeCurriculum.id },
    { course_code: 'CPE 205B', title: 'Software Design 2',                     units: 3, seasonal_term: '2nd Semester', year_level: 2, CurriculumId: activeCurriculum.id }, // SPLIT target ½

    // ── Year 3, 1st Semester ──
    { course_code: 'CPE 301',  title: 'Operating Systems',                     units: 3, seasonal_term: '1st Semester', year_level: 3, CurriculumId: activeCurriculum.id },
    { course_code: 'CPE 303',  title: 'Software Engineering 1',                units: 3, seasonal_term: '1st Semester', year_level: 3, CurriculumId: activeCurriculum.id }, // SPLIT target ½
    { course_code: 'CPE 305',  title: 'Embedded Systems',                      units: 3, seasonal_term: '1st Semester', year_level: 3, CurriculumId: activeCurriculum.id }, // COMBO target

    // ── Year 3, 2nd Semester ──
    { course_code: 'CPE 302',  title: 'Computer Networks',                     units: 3, seasonal_term: '2nd Semester', year_level: 3, CurriculumId: activeCurriculum.id }, // COMBO target
    { course_code: 'CPE 304',  title: 'Software Engineering 2',                units: 3, seasonal_term: '2nd Semester', year_level: 3, CurriculumId: activeCurriculum.id }, // SPLIT target ½
    { course_code: 'CPE 306',  title: 'Information Assurance & Security',      units: 3, seasonal_term: '2nd Semester', year_level: 3, CurriculumId: activeCurriculum.id }, // COMBO target

    // ── Year 4, 1st Semester ──
    { course_code: 'CPE 401',  title: 'Capstone Project 1',                    units: 3, seasonal_term: '1st Semester', year_level: 4, CurriculumId: activeCurriculum.id },
    { course_code: 'CPE 403',  title: 'Machine Learning',                      units: 3, seasonal_term: '1st Semester', year_level: 4, CurriculumId: activeCurriculum.id }, // SPLIT target ½

    // ── Year 4, 2nd Semester ──
    { course_code: 'CPE 402',  title: 'Capstone Project 2',                    units: 3, seasonal_term: '2nd Semester', year_level: 4, CurriculumId: activeCurriculum.id },
    { course_code: 'CPE 404',  title: 'Emerging Technologies in CpE',          units: 3, seasonal_term: '2nd Semester', year_level: 4, CurriculumId: activeCurriculum.id }, // SPLIT target ½
  ]);
  console.log(`Created ${newSubjects.length} subjects for Active Curriculum.`);

  // ═══════════════════════════════════════════════════════════════════
  // 4. Prerequisites
  // ═══════════════════════════════════════════════════════════════════
  const allCreated = await Subject.findAll();
  const lookup = {};
  allCreated.forEach(s => { lookup[s.course_code] = s.id; });

  await Prerequisite.bulkCreate([
    // ──────────── Active Curriculum chains ────────────
    // Year 1 internal
    { subject_id: lookup['CPE 102'],  required_subj_id: lookup['CPE 101'] },
    { subject_id: lookup['MATH 102'], required_subj_id: lookup['MATH 101'] },
    { subject_id: lookup['PHYS 100'], required_subj_id: lookup['MATH 101'] },
    { subject_id: lookup['PHYS 102'], required_subj_id: lookup['PHYS 100'] },
    // Year 1 → Year 2
    { subject_id: lookup['CPE 201'],  required_subj_id: lookup['CPE 102'] },
    { subject_id: lookup['CPE 203'],  required_subj_id: lookup['CPE 102'] },
    { subject_id: lookup['MATH 201'], required_subj_id: lookup['MATH 102'] },
    { subject_id: lookup['CPE 204'],  required_subj_id: lookup['CPE 102'] },
    { subject_id: lookup['CPE 202'],  required_subj_id: lookup['CPE 102'] },
    { subject_id: lookup['CPE 205A'], required_subj_id: lookup['CPE 201'] },     // SD1 requires DSA
    { subject_id: lookup['CPE 205B'], required_subj_id: lookup['CPE 205A'] },    // SD2 requires SD1
    // Year 2 → Year 3
    { subject_id: lookup['CPE 301'],  required_subj_id: lookup['CPE 201'] },
    { subject_id: lookup['CPE 303'],  required_subj_id: lookup['CPE 201'] },
    { subject_id: lookup['CPE 305'],  required_subj_id: lookup['CPE 202'] },
    { subject_id: lookup['CPE 302'],  required_subj_id: lookup['CPE 202'] },
    { subject_id: lookup['CPE 304'],  required_subj_id: lookup['CPE 303'] },
    { subject_id: lookup['CPE 306'],  required_subj_id: lookup['CPE 302'] },
    // Year 3 → Year 4
    { subject_id: lookup['CPE 401'],  required_subj_id: lookup['CPE 303'] },
    { subject_id: lookup['CPE 403'],  required_subj_id: lookup['CPE 201'] },
    { subject_id: lookup['CPE 402'],  required_subj_id: lookup['CPE 401'] },
    { subject_id: lookup['CPE 404'],  required_subj_id: lookup['CPE 302'] },

    // ──────────── Legacy Curriculum chains ────────────
    // Year 1 internal
    { subject_id: lookup['CpE 110'],  required_subj_id: lookup['CpE 100'] },
    { subject_id: lookup['MATH 110'], required_subj_id: lookup['MATH 100'] },
    { subject_id: lookup['PHYS 11'],  required_subj_id: lookup['PHYS 10'] },
    // Year 1 → Year 2
    { subject_id: lookup['CpE 200'],  required_subj_id: lookup['CpE 110'] },
    { subject_id: lookup['MATH 200'], required_subj_id: lookup['MATH 110'] },
    { subject_id: lookup['CpE 210'],  required_subj_id: lookup['CpE 110'] },
    { subject_id: lookup['CpE 220'],  required_subj_id: lookup['CpE 110'] },
    { subject_id: lookup['CpE 205'],  required_subj_id: lookup['CpE 200'] },
    { subject_id: lookup['CpE 230'],  required_subj_id: lookup['CpE 110'] },
    // Year 2 → Year 3
    { subject_id: lookup['CpE 300'],  required_subj_id: lookup['CpE 200'] },
    { subject_id: lookup['CpE 310'],  required_subj_id: lookup['CpE 220'] },
    { subject_id: lookup['CpE 311'],  required_subj_id: lookup['CpE 220'] },     // Embedded Lab requires Digital Logic
    { subject_id: lookup['CpE 350'],  required_subj_id: lookup['CpE 200'] },     // SE Principles requires Algorithms
    { subject_id: lookup['CpE 320'],  required_subj_id: lookup['CpE 220'] },
    { subject_id: lookup['CpE 321'],  required_subj_id: lookup['CpE 220'] },     // Network Protocols requires Digital Logic
    { subject_id: lookup['CpE 330'],  required_subj_id: lookup['CpE 320'] },
    { subject_id: lookup['CpE 331'],  required_subj_id: lookup['CpE 200'] },     // Cryptography requires Algorithms
    // Year 3 → Year 4
    { subject_id: lookup['CpE 400'],  required_subj_id: lookup['CpE 300'] },
    { subject_id: lookup['CpE 410'],  required_subj_id: lookup['CpE 200'] },
    { subject_id: lookup['CpE 420'],  required_subj_id: lookup['CpE 400'] },
    { subject_id: lookup['CpE 430'],  required_subj_id: lookup['CpE 320'] },
  ]);
  console.log('Prerequisites created (Active + Legacy).');

  // ═══════════════════════════════════════════════════════════════════
  // 5. Equivalency Rules — Legacy → Active
  //
  //    The schema (source_subject_id, target_subject_id) handles every
  //    relationship type via multiple rows:
  //      • 1 : 1 — one row per pair
  //      • N : 1 — N rows sharing the SAME target   (combination)
  //      • 1 : N — N rows sharing the SAME source   (split)
  //
  //    Summary:
  //      9  one-to-one   standard mappings
  //      4  combinations (8 rows — 2 sources each)
  //      3  splits       (6 rows — 2 targets each)
  //      ────────────────────────────────────
  //     23  total equivalency rows
  // ═══════════════════════════════════════════════════════════════════
  const equivRules = await EquivalencyRule.bulkCreate([
    // ─── 1 : 1   Standard mappings (9) ──────────────────────────────
    { source_subject_id: lookup['CpE 100'],  target_subject_id: lookup['CPE 101'] },   // Intro Computing → Prog Logic & Design
    { source_subject_id: lookup['CpE 110'],  target_subject_id: lookup['CPE 102'] },   // Structured Prog → OOP
    { source_subject_id: lookup['MATH 100'], target_subject_id: lookup['MATH 101'] },  // Adv Algebra → Calculus 1
    { source_subject_id: lookup['MATH 110'], target_subject_id: lookup['MATH 102'] },  // Analytic Geom → Calculus 2
    { source_subject_id: lookup['GE 10'],    target_subject_id: lookup['GEC 101'] },   // Filipino Psych → Understanding the Self
    { source_subject_id: lookup['GE 11'],    target_subject_id: lookup['GEC 102'] },   // PH Institutions → Readings in PH History
    { source_subject_id: lookup['CpE 200'],  target_subject_id: lookup['CPE 201'] },   // Algo & Complexity → DSA
    { source_subject_id: lookup['MATH 200'], target_subject_id: lookup['MATH 201'] },  // Diff Eq → Linear Algebra
    { source_subject_id: lookup['CpE 300'],  target_subject_id: lookup['CPE 301'] },   // OS Theory → Operating Systems

    // ─── N : 1   Combinations (4 — each uses 2 legacy → 1 active) ──
    //
    // (a) Classical Mechanics + Waves & Thermo → General Physics
    { source_subject_id: lookup['PHYS 10'],  target_subject_id: lookup['PHYS 100'] },
    { source_subject_id: lookup['PHYS 11'],  target_subject_id: lookup['PHYS 100'] },
    //
    // (b) Microcontroller Systems + Embedded Hardware Lab → Embedded Systems
    { source_subject_id: lookup['CpE 310'],  target_subject_id: lookup['CPE 305'] },
    { source_subject_id: lookup['CpE 311'],  target_subject_id: lookup['CPE 305'] },
    //
    // (c) Networking Fundamentals + Network Protocols → Computer Networks
    { source_subject_id: lookup['CpE 320'],  target_subject_id: lookup['CPE 302'] },
    { source_subject_id: lookup['CpE 321'],  target_subject_id: lookup['CPE 302'] },
    //
    // (d) Information Security Basics + Cryptography Fund. → Info Assurance & Security
    { source_subject_id: lookup['CpE 330'],  target_subject_id: lookup['CPE 306'] },
    { source_subject_id: lookup['CpE 331'],  target_subject_id: lookup['CPE 306'] },

    // ─── 1 : N   Splits (3 — each uses 1 legacy → 2 active) ────────
    //             Split targets are always in DIFFERENT semesters.
    //
    // (a) Software Design → Software Design 1 (Y2 S1) + Software Design 2 (Y2 S2)
    { source_subject_id: lookup['CpE 205'],  target_subject_id: lookup['CPE 205A'] },
    { source_subject_id: lookup['CpE 205'],  target_subject_id: lookup['CPE 205B'] },
    //
    // (b) SE Principles → Software Engineering 1 (Y3 S1) + Software Engineering 2 (Y3 S2)
    { source_subject_id: lookup['CpE 350'],  target_subject_id: lookup['CPE 303'] },
    { source_subject_id: lookup['CpE 350'],  target_subject_id: lookup['CPE 304'] },
    //
    // (c) Intelligent Systems → Machine Learning (Y4 S1) + Emerging Technologies (Y4 S2)
    { source_subject_id: lookup['CpE 410'],  target_subject_id: lookup['CPE 403'] },
    { source_subject_id: lookup['CpE 410'],  target_subject_id: lookup['CPE 404'] },
  ]);
  console.log(`Equivalency rules created (${equivRules.length} rows: 9 one-to-one, 8 combination, 6 split).`);

  // ═══════════════════════════════════════════════════════════════════
  // 6. Default Users
  // ═══════════════════════════════════════════════════════════════════
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

  // Student assigned to the active curriculum, year level 3
  await User.create({
    studentId: '1234567',
    firstName: 'Test',
    lastName: 'Student',
    email: 'student@tip.edu.ph',
    password: hashedPassword,
    role: 'student',
    isActive: true,
    isVerified: true,
    current_year_level: 3,
    CurriculumId: activeCurriculum.id
  });
  console.log('Created default student (student@tip.edu.ph / admin123) — Year 3');

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
