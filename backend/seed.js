require('dotenv').config();
const { sequelize, User, Curriculum, Subject, Prerequisite, EquivalencyRule, AcademicTerm, Grade, StudyPlan, PlanSubject } = require('./models');
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
  const curriculum2018 = await Curriculum.create({
    version_year: 'BS CpE – 2018',
    active_status: false
  });
  console.log(`Created 2018 Curriculum (id: ${curriculum2018.id})`);

  const curriculum2023 = await Curriculum.create({
    version_year: 'BS CpE – 2023',
    active_status: false
  });
  console.log(`Created 2023 Curriculum (id: ${curriculum2023.id})`);

  const curriculum2025 = await Curriculum.create({
    version_year: 'BS CpE – 2025',
    active_status: true
  });
  console.log(`Created 2025 Curriculum (id: ${curriculum2025.id})`);

  // ═══════════════════════════════════════════════════════════════════
  // 2. Subjects — 2018 Curriculum  (26 subjects)
  // ═══════════════════════════════════════════════════════════════════
  const oldSubjects = await Subject.bulkCreate([
    // ── Year 1, 1st Semester ──
    { course_code: 'CpE 100',  title: 'Introduction to Computing',        lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '1st Semester', year_level: 1, CurriculumId: curriculum2018.id },
    { course_code: 'MATH 100', title: 'Advanced Algebra',                  lecture_hours: 4, laboratory_hours: 0, units: 4, seasonal_term: '1st Semester', year_level: 1, CurriculumId: curriculum2018.id },
    { course_code: 'PHYS 10',  title: 'Classical Mechanics',               lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '1st Semester', year_level: 1, CurriculumId: curriculum2018.id },
    { course_code: 'GE 10',    title: 'Filipino Psychology',               lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '1st Semester', year_level: 1, CurriculumId: curriculum2018.id },

    // ── Year 1, 2nd Semester ──
    { course_code: 'CpE 110',  title: 'Structured Programming',           lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: curriculum2018.id },
    { course_code: 'MATH 110', title: 'Analytic Geometry',                 lecture_hours: 4, laboratory_hours: 0, units: 4, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: curriculum2018.id },
    { course_code: 'PHYS 11',  title: 'Waves & Thermodynamics',            lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: curriculum2018.id },
    { course_code: 'GE 11',    title: 'Philippine Institutions',           lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: curriculum2018.id },

    // ── Year 2, 1st Semester ──
    { course_code: 'CpE 200',  title: 'Algorithms & Complexity',          lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '1st Semester', year_level: 2, CurriculumId: curriculum2018.id },
    { course_code: 'MATH 200', title: 'Differential Equations',            lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '1st Semester', year_level: 2, CurriculumId: curriculum2018.id },
    { course_code: 'CpE 210',  title: 'Combinatorics & Graph Theory',     lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '1st Semester', year_level: 2, CurriculumId: curriculum2018.id },

    // ── Year 2, 2nd Semester ──
    { course_code: 'CpE 220',  title: 'Digital Logic Design',             lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 2, CurriculumId: curriculum2018.id },
    { course_code: 'CpE 205',  title: 'Software Design',                  lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 2, CurriculumId: curriculum2018.id },
    { course_code: 'CpE 230',  title: 'Database Fundamentals',            lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 2, CurriculumId: curriculum2018.id },

    // ── Year 3, 1st Semester ──
    { course_code: 'CpE 300',  title: 'Operating Systems Theory',         lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '1st Semester', year_level: 3, CurriculumId: curriculum2018.id },
    { course_code: 'CpE 310',  title: 'Microcontroller Systems',          lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '1st Semester', year_level: 3, CurriculumId: curriculum2018.id },
    { course_code: 'CpE 311',  title: 'Embedded Hardware Lab',            lecture_hours: 0, laboratory_hours: 6, units: 2, seasonal_term: '1st Semester', year_level: 3, CurriculumId: curriculum2018.id },
    { course_code: 'CpE 350',  title: 'Software Engineering Principles',  lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '1st Semester', year_level: 3, CurriculumId: curriculum2018.id },

    // ── Year 3, 2nd Semester ──
    { course_code: 'CpE 320',  title: 'Networking Fundamentals',          lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 3, CurriculumId: curriculum2018.id },
    { course_code: 'CpE 321',  title: 'Network Protocols',                lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '2nd Semester', year_level: 3, CurriculumId: curriculum2018.id },
    { course_code: 'CpE 330',  title: 'Information Security Basics',      lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '2nd Semester', year_level: 3, CurriculumId: curriculum2018.id },
    { course_code: 'CpE 331',  title: 'Cryptography Fundamentals',        lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '2nd Semester', year_level: 3, CurriculumId: curriculum2018.id },

    // ── Year 4, 1st Semester ──
    { course_code: 'CpE 400',  title: 'Research Project I',               lecture_hours: 1, laboratory_hours: 6, units: 3, seasonal_term: '1st Semester', year_level: 4, CurriculumId: curriculum2018.id },
    { course_code: 'CpE 410',  title: 'Intelligent Systems',              lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '1st Semester', year_level: 4, CurriculumId: curriculum2018.id },

    // ── Year 4, 2nd Semester ──
    { course_code: 'CpE 420',  title: 'Research Project II',              lecture_hours: 1, laboratory_hours: 6, units: 3, seasonal_term: '2nd Semester', year_level: 4, CurriculumId: curriculum2018.id },
    { course_code: 'CpE 430',  title: 'Technology Venture Management',    lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '2nd Semester', year_level: 4, CurriculumId: curriculum2018.id },
  ]);
  console.log(`Created ${oldSubjects.length} subjects for 2018 Curriculum.`);

  // ═══════════════════════════════════════════════════════════════════
  // 3. Subjects — 2023 Curriculum  (26 subjects)
  // ═══════════════════════════════════════════════════════════════════
  const midSubjects = await Subject.bulkCreate([
    // ── Year 1, 1st Semester ──
    { course_code: 'CPE 1101', title: 'Fundamentals of Programming',       lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '1st Semester', year_level: 1, CurriculumId: curriculum2023.id },
    { course_code: 'MATH 1101', title: 'Calculus I',                       lecture_hours: 4, laboratory_hours: 0, units: 4, seasonal_term: '1st Semester', year_level: 1, CurriculumId: curriculum2023.id },
    { course_code: 'PHYS 1101', title: 'Physics for Engineers I',          lecture_hours: 3, laboratory_hours: 3, units: 4, seasonal_term: '1st Semester', year_level: 1, CurriculumId: curriculum2023.id },
    { course_code: 'GEC 1101', title: 'Understanding the Self',            lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '1st Semester', year_level: 1, CurriculumId: curriculum2023.id },

    // ── Year 1, 2nd Semester ──
    { course_code: 'CPE 1102', title: 'Intermediate Programming',          lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: curriculum2023.id },
    { course_code: 'MATH 1102', title: 'Calculus II',                      lecture_hours: 4, laboratory_hours: 0, units: 4, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: curriculum2023.id },
    { course_code: 'PHYS 1102', title: 'Physics for Engineers II',         lecture_hours: 3, laboratory_hours: 3, units: 4, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: curriculum2023.id },
    { course_code: 'GEC 1102', title: 'Readings in Philippine History',    lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: curriculum2023.id },

    // ── Year 2, 1st Semester ──
    { course_code: 'CPE 2201', title: 'Data Structures',                   lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '1st Semester', year_level: 2, CurriculumId: curriculum2023.id },
    { course_code: 'MATH 2201', title: 'Differential Equations',           lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '1st Semester', year_level: 2, CurriculumId: curriculum2023.id },
    { course_code: 'CPE 2203', title: 'Discrete Mathematics',              lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '1st Semester', year_level: 2, CurriculumId: curriculum2023.id },

    // ── Year 2, 2nd Semester ──
    { course_code: 'CPE 2202', title: 'Computer Organization & Architecture', lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 2, CurriculumId: curriculum2023.id },
    { course_code: 'CPE 2204', title: 'Database Management Systems',       lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 2, CurriculumId: curriculum2023.id },
    { course_code: 'CPE 2205', title: 'Object-Oriented Software Design',   lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 2, CurriculumId: curriculum2023.id },

    // ── Year 3, 1st Semester ──
    { course_code: 'CPE 3301', title: 'Operating Systems',                 lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '1st Semester', year_level: 3, CurriculumId: curriculum2023.id },
    { course_code: 'CPE 3302', title: 'Microprocessors & Microcontrollers', lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '1st Semester', year_level: 3, CurriculumId: curriculum2023.id },
    { course_code: 'CPE 3303', title: 'Software Engineering',              lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '1st Semester', year_level: 3, CurriculumId: curriculum2023.id },

    // ── Year 3, 2nd Semester ──
    { course_code: 'CPE 3304', title: 'Data Communications & Networking',  lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 3, CurriculumId: curriculum2023.id },
    { course_code: 'CPE 3305', title: 'Information Assurance & Security',  lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 3, CurriculumId: curriculum2023.id },
    { course_code: 'CPE 3306', title: 'Embedded Systems Design',           lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 3, CurriculumId: curriculum2023.id },

    // ── Year 4, 1st Semester ──
    { course_code: 'CPE 4401', title: 'Capstone Design Project I',         lecture_hours: 1, laboratory_hours: 6, units: 3, seasonal_term: '1st Semester', year_level: 4, CurriculumId: curriculum2023.id },
    { course_code: 'CPE 4402', title: 'Machine Learning & AI',             lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '1st Semester', year_level: 4, CurriculumId: curriculum2023.id },

    // ── Year 4, 2nd Semester ──
    { course_code: 'CPE 4403', title: 'Capstone Design Project II',        lecture_hours: 1, laboratory_hours: 6, units: 3, seasonal_term: '2nd Semester', year_level: 4, CurriculumId: curriculum2023.id },
    { course_code: 'CPE 4404', title: 'Technopreneurship',                 lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '2nd Semester', year_level: 4, CurriculumId: curriculum2023.id },
  ]);
  console.log(`Created ${midSubjects.length} subjects for 2023 Curriculum.`);

  // ═══════════════════════════════════════════════════════════════════
  // 4. Subjects — 2025 Curriculum (Active)  (26 subjects)
  // ═══════════════════════════════════════════════════════════════════
  const newSubjects = await Subject.bulkCreate([
    // ── Year 1, 1st Semester ──
    { course_code: 'CPE 101',  title: 'Programming Logic & Design',            lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '1st Semester', year_level: 1, CurriculumId: curriculum2025.id },
    { course_code: 'MATH 101', title: 'Calculus 1',                            lecture_hours: 4, laboratory_hours: 0, units: 4, seasonal_term: '1st Semester', year_level: 1, CurriculumId: curriculum2025.id },
    { course_code: 'GEC 101',  title: 'Understanding the Self',                lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '1st Semester', year_level: 1, CurriculumId: curriculum2025.id },
    { course_code: 'PHYS 100', title: 'General Physics',                       lecture_hours: 3, laboratory_hours: 3, units: 4, seasonal_term: '1st Semester', year_level: 1, CurriculumId: curriculum2025.id },

    // ── Year 1, 2nd Semester ──
    { course_code: 'CPE 102',  title: 'Object-Oriented Programming',           lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: curriculum2025.id },
    { course_code: 'MATH 102', title: 'Calculus 2',                            lecture_hours: 4, laboratory_hours: 0, units: 4, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: curriculum2025.id },
    { course_code: 'GEC 102',  title: 'Readings in Philippine History',        lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: curriculum2025.id },
    { course_code: 'PHYS 102', title: 'Physics 2 (Electricity & Magnetism)',   lecture_hours: 3, laboratory_hours: 3, units: 4, seasonal_term: '2nd Semester', year_level: 1, CurriculumId: curriculum2025.id },

    // ── Year 2, 1st Semester ──
    { course_code: 'CPE 201',  title: 'Data Structures and Algorithms',        lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '1st Semester', year_level: 2, CurriculumId: curriculum2025.id },
    { course_code: 'MATH 201', title: 'Linear Algebra',                        lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '1st Semester', year_level: 2, CurriculumId: curriculum2025.id },
    { course_code: 'CPE 203',  title: 'Discrete Mathematics',                  lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '1st Semester', year_level: 2, CurriculumId: curriculum2025.id },
    { course_code: 'CPE 205A', title: 'Software Design 1',                     lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '1st Semester', year_level: 2, CurriculumId: curriculum2025.id },

    // ── Year 2, 2nd Semester ──
    { course_code: 'CPE 202',  title: 'Computer Organization',                 lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 2, CurriculumId: curriculum2025.id },
    { course_code: 'CPE 204',  title: 'Database Systems',                      lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 2, CurriculumId: curriculum2025.id },
    { course_code: 'GEC 201',  title: 'Ethics',                                lecture_hours: 3, laboratory_hours: 0, units: 3, seasonal_term: '2nd Semester', year_level: 2, CurriculumId: curriculum2025.id },
    { course_code: 'CPE 205B', title: 'Software Design 2',                     lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 2, CurriculumId: curriculum2025.id },

    // ── Year 3, 1st Semester ──
    { course_code: 'CPE 301',  title: 'Operating Systems',                     lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '1st Semester', year_level: 3, CurriculumId: curriculum2025.id },
    { course_code: 'CPE 303',  title: 'Software Engineering 1',                lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '1st Semester', year_level: 3, CurriculumId: curriculum2025.id },
    { course_code: 'CPE 305',  title: 'Embedded Systems',                      lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '1st Semester', year_level: 3, CurriculumId: curriculum2025.id },

    // ── Year 3, 2nd Semester ──
    { course_code: 'CPE 302',  title: 'Computer Networks',                     lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 3, CurriculumId: curriculum2025.id },
    { course_code: 'CPE 304',  title: 'Software Engineering 2',                lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 3, CurriculumId: curriculum2025.id },
    { course_code: 'CPE 306',  title: 'Information Assurance & Security',      lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 3, CurriculumId: curriculum2025.id },

    // ── Year 4, 1st Semester ──
    { course_code: 'CPE 401',  title: 'Capstone Project 1',                    lecture_hours: 1, laboratory_hours: 6, units: 3, seasonal_term: '1st Semester', year_level: 4, CurriculumId: curriculum2025.id },
    { course_code: 'CPE 403',  title: 'Machine Learning',                      lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '1st Semester', year_level: 4, CurriculumId: curriculum2025.id },

    // ── Year 4, 2nd Semester ──
    { course_code: 'CPE 402',  title: 'Capstone Project 2',                    lecture_hours: 1, laboratory_hours: 6, units: 3, seasonal_term: '2nd Semester', year_level: 4, CurriculumId: curriculum2025.id },
    { course_code: 'CPE 404',  title: 'Emerging Technologies in CpE',          lecture_hours: 2, laboratory_hours: 3, units: 3, seasonal_term: '2nd Semester', year_level: 4, CurriculumId: curriculum2025.id },
  ]);
  console.log(`Created ${newSubjects.length} subjects for 2025 Curriculum.`);

  // ═══════════════════════════════════════════════════════════════════
  // 5. Prerequisites
  // ═══════════════════════════════════════════════════════════════════
  const allCreated = await Subject.findAll();
  const lookup = {};
  allCreated.forEach(s => { lookup[s.course_code] = s.id; });

  await Prerequisite.bulkCreate([
    // ──────────── 2025 (Active) Curriculum chains ────────────
    { subject_id: lookup['CPE 102'],  required_subj_id: lookup['CPE 101'] },
    { subject_id: lookup['MATH 102'], required_subj_id: lookup['MATH 101'] },
    { subject_id: lookup['PHYS 100'], required_subj_id: lookup['MATH 101'] },
    { subject_id: lookup['PHYS 102'], required_subj_id: lookup['PHYS 100'] },
    { subject_id: lookup['CPE 201'],  required_subj_id: lookup['CPE 102'] },
    { subject_id: lookup['CPE 203'],  required_subj_id: lookup['CPE 102'] },
    { subject_id: lookup['MATH 201'], required_subj_id: lookup['MATH 102'] },
    { subject_id: lookup['CPE 204'],  required_subj_id: lookup['CPE 102'] },
    { subject_id: lookup['CPE 202'],  required_subj_id: lookup['CPE 102'] },
    { subject_id: lookup['CPE 205A'], required_subj_id: lookup['CPE 201'] },
    { subject_id: lookup['CPE 205B'], required_subj_id: lookup['CPE 205A'] },
    { subject_id: lookup['CPE 301'],  required_subj_id: lookup['CPE 201'] },
    { subject_id: lookup['CPE 303'],  required_subj_id: lookup['CPE 201'] },
    { subject_id: lookup['CPE 305'],  required_subj_id: lookup['CPE 202'] },
    { subject_id: lookup['CPE 302'],  required_subj_id: lookup['CPE 202'] },
    { subject_id: lookup['CPE 304'],  required_subj_id: lookup['CPE 303'] },
    { subject_id: lookup['CPE 306'],  required_subj_id: lookup['CPE 302'] },
    { subject_id: lookup['CPE 401'],  required_subj_id: lookup['CPE 303'] },
    { subject_id: lookup['CPE 403'],  required_subj_id: lookup['CPE 201'] },
    { subject_id: lookup['CPE 402'],  required_subj_id: lookup['CPE 401'] },
    { subject_id: lookup['CPE 404'],  required_subj_id: lookup['CPE 302'] },

    // ──────────── 2023 Curriculum chains ────────────
    { subject_id: lookup['CPE 1102'],  required_subj_id: lookup['CPE 1101'] },
    { subject_id: lookup['MATH 1102'], required_subj_id: lookup['MATH 1101'] },
    { subject_id: lookup['PHYS 1102'], required_subj_id: lookup['PHYS 1101'] },
    { subject_id: lookup['CPE 2201'],  required_subj_id: lookup['CPE 1102'] },
    { subject_id: lookup['MATH 2201'], required_subj_id: lookup['MATH 1102'] },
    { subject_id: lookup['CPE 2203'],  required_subj_id: lookup['CPE 1102'] },
    { subject_id: lookup['CPE 2202'],  required_subj_id: lookup['CPE 1102'] },
    { subject_id: lookup['CPE 2204'],  required_subj_id: lookup['CPE 1102'] },
    { subject_id: lookup['CPE 2205'],  required_subj_id: lookup['CPE 2201'] },
    { subject_id: lookup['CPE 3301'],  required_subj_id: lookup['CPE 2201'] },
    { subject_id: lookup['CPE 3302'],  required_subj_id: lookup['CPE 2202'] },
    { subject_id: lookup['CPE 3303'],  required_subj_id: lookup['CPE 2201'] },
    { subject_id: lookup['CPE 3304'],  required_subj_id: lookup['CPE 2202'] },
    { subject_id: lookup['CPE 3305'],  required_subj_id: lookup['CPE 3304'] },
    { subject_id: lookup['CPE 3306'],  required_subj_id: lookup['CPE 3302'] },
    { subject_id: lookup['CPE 4401'],  required_subj_id: lookup['CPE 3303'] },
    { subject_id: lookup['CPE 4402'],  required_subj_id: lookup['CPE 2201'] },
    { subject_id: lookup['CPE 4403'],  required_subj_id: lookup['CPE 4401'] },
    { subject_id: lookup['CPE 4404'],  required_subj_id: lookup['CPE 3304'] },

    // ──────────── 2018 (Legacy) Curriculum chains ────────────
    { subject_id: lookup['CpE 110'],  required_subj_id: lookup['CpE 100'] },
    { subject_id: lookup['MATH 110'], required_subj_id: lookup['MATH 100'] },
    { subject_id: lookup['PHYS 11'],  required_subj_id: lookup['PHYS 10'] },
    { subject_id: lookup['CpE 200'],  required_subj_id: lookup['CpE 110'] },
    { subject_id: lookup['MATH 200'], required_subj_id: lookup['MATH 110'] },
    { subject_id: lookup['CpE 210'],  required_subj_id: lookup['CpE 110'] },
    { subject_id: lookup['CpE 220'],  required_subj_id: lookup['CpE 110'] },
    { subject_id: lookup['CpE 205'],  required_subj_id: lookup['CpE 200'] },
    { subject_id: lookup['CpE 230'],  required_subj_id: lookup['CpE 110'] },
    { subject_id: lookup['CpE 300'],  required_subj_id: lookup['CpE 200'] },
    { subject_id: lookup['CpE 310'],  required_subj_id: lookup['CpE 220'] },
    { subject_id: lookup['CpE 311'],  required_subj_id: lookup['CpE 220'] },
    { subject_id: lookup['CpE 350'],  required_subj_id: lookup['CpE 200'] },
    { subject_id: lookup['CpE 320'],  required_subj_id: lookup['CpE 220'] },
    { subject_id: lookup['CpE 321'],  required_subj_id: lookup['CpE 220'] },
    { subject_id: lookup['CpE 330'],  required_subj_id: lookup['CpE 320'] },
    { subject_id: lookup['CpE 331'],  required_subj_id: lookup['CpE 200'] },
    { subject_id: lookup['CpE 400'],  required_subj_id: lookup['CpE 300'] },
    { subject_id: lookup['CpE 410'],  required_subj_id: lookup['CpE 200'] },
    { subject_id: lookup['CpE 420'],  required_subj_id: lookup['CpE 400'] },
    { subject_id: lookup['CpE 430'],  required_subj_id: lookup['CpE 320'] },
  ]);
  console.log('Prerequisites created (2025 + 2023 + 2018).');

  // ═══════════════════════════════════════════════════════════════════
  // 6. Equivalency Rules — 2018 → 2025 and 2023 → 2025
  // ═══════════════════════════════════════════════════════════════════
  const equivRules = await EquivalencyRule.bulkCreate([
    // ─── 2018 → 2025: 1:1 Standard mappings ────────────────────────
    { source_subject_id: lookup['CpE 100'],  target_subject_id: lookup['CPE 101'] },
    { source_subject_id: lookup['CpE 110'],  target_subject_id: lookup['CPE 102'] },
    { source_subject_id: lookup['MATH 100'], target_subject_id: lookup['MATH 101'] },
    { source_subject_id: lookup['MATH 110'], target_subject_id: lookup['MATH 102'] },
    { source_subject_id: lookup['GE 10'],    target_subject_id: lookup['GEC 101'] },
    { source_subject_id: lookup['GE 11'],    target_subject_id: lookup['GEC 102'] },
    { source_subject_id: lookup['CpE 200'],  target_subject_id: lookup['CPE 201'] },
    { source_subject_id: lookup['MATH 200'], target_subject_id: lookup['MATH 201'] },
    { source_subject_id: lookup['CpE 300'],  target_subject_id: lookup['CPE 301'] },

    // ─── 2018 → 2025: N:1 Combinations ─────────────────────────────
    { source_subject_id: lookup['PHYS 10'],  target_subject_id: lookup['PHYS 100'] },
    { source_subject_id: lookup['PHYS 11'],  target_subject_id: lookup['PHYS 100'] },
    { source_subject_id: lookup['CpE 310'],  target_subject_id: lookup['CPE 305'] },
    { source_subject_id: lookup['CpE 311'],  target_subject_id: lookup['CPE 305'] },
    { source_subject_id: lookup['CpE 320'],  target_subject_id: lookup['CPE 302'] },
    { source_subject_id: lookup['CpE 321'],  target_subject_id: lookup['CPE 302'] },
    { source_subject_id: lookup['CpE 330'],  target_subject_id: lookup['CPE 306'] },
    { source_subject_id: lookup['CpE 331'],  target_subject_id: lookup['CPE 306'] },

    // ─── 2018 → 2025: 1:N Splits ───────────────────────────────────
    { source_subject_id: lookup['CpE 205'],  target_subject_id: lookup['CPE 205A'] },
    { source_subject_id: lookup['CpE 205'],  target_subject_id: lookup['CPE 205B'] },
    { source_subject_id: lookup['CpE 350'],  target_subject_id: lookup['CPE 303'] },
    { source_subject_id: lookup['CpE 350'],  target_subject_id: lookup['CPE 304'] },
    { source_subject_id: lookup['CpE 410'],  target_subject_id: lookup['CPE 403'] },
    { source_subject_id: lookup['CpE 410'],  target_subject_id: lookup['CPE 404'] },

    // ─── 2023 → 2025: 1:1 Standard mappings ────────────────────────
    { source_subject_id: lookup['CPE 1101'],  target_subject_id: lookup['CPE 101'] },
    { source_subject_id: lookup['CPE 1102'],  target_subject_id: lookup['CPE 102'] },
    { source_subject_id: lookup['MATH 1101'], target_subject_id: lookup['MATH 101'] },
    { source_subject_id: lookup['MATH 1102'], target_subject_id: lookup['MATH 102'] },
    { source_subject_id: lookup['GEC 1101'],  target_subject_id: lookup['GEC 101'] },
    { source_subject_id: lookup['GEC 1102'],  target_subject_id: lookup['GEC 102'] },
    { source_subject_id: lookup['PHYS 1101'], target_subject_id: lookup['PHYS 100'] },
    { source_subject_id: lookup['PHYS 1102'], target_subject_id: lookup['PHYS 102'] },
    { source_subject_id: lookup['CPE 2201'],  target_subject_id: lookup['CPE 201'] },
    { source_subject_id: lookup['MATH 2201'], target_subject_id: lookup['MATH 201'] },
    { source_subject_id: lookup['CPE 2203'],  target_subject_id: lookup['CPE 203'] },
    { source_subject_id: lookup['CPE 2202'],  target_subject_id: lookup['CPE 202'] },
    { source_subject_id: lookup['CPE 2204'],  target_subject_id: lookup['CPE 204'] },
    { source_subject_id: lookup['CPE 2205'],  target_subject_id: lookup['CPE 205A'] },
    { source_subject_id: lookup['CPE 3301'],  target_subject_id: lookup['CPE 301'] },
    { source_subject_id: lookup['CPE 3304'],  target_subject_id: lookup['CPE 302'] },
    { source_subject_id: lookup['CPE 3303'],  target_subject_id: lookup['CPE 303'] },
    { source_subject_id: lookup['CPE 3305'],  target_subject_id: lookup['CPE 306'] },
    { source_subject_id: lookup['CPE 3302'],  target_subject_id: lookup['CPE 305'] },
    { source_subject_id: lookup['CPE 3306'],  target_subject_id: lookup['CPE 305'] },
    { source_subject_id: lookup['CPE 4401'],  target_subject_id: lookup['CPE 401'] },
    { source_subject_id: lookup['CPE 4402'],  target_subject_id: lookup['CPE 403'] },
    { source_subject_id: lookup['CPE 4403'],  target_subject_id: lookup['CPE 402'] },
    { source_subject_id: lookup['CPE 4404'],  target_subject_id: lookup['CPE 404'] },
  ]);
  console.log(`Equivalency rules created (${equivRules.length} rows: 2018→2025 + 2023→2025).`);

  // ═══════════════════════════════════════════════════════════════════
  // 7. Default Users
  // ═══════════════════════════════════════════════════════════════════
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await User.create({
    firstName: 'Admin',
    lastName: 'User',
    first_name: 'Admin',
    last_name: 'User',
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
    first_name: 'Test',
    last_name: 'Student',
    email: 'student@tip.edu.ph',
    password: hashedPassword,
    role: 'student',
    isActive: true,
    isVerified: true,
    current_year_level: 3,
    CurriculumId: curriculum2025.id
  });
  console.log('Created default student (student@tip.edu.ph / admin123) — Year 3');

  const adviserPasswordHash = await bcrypt.hash('password123', 10);
  const adviser1 = await User.create({
    firstName: 'Adviser',
    lastName: 'One',
    first_name: 'Adviser',
    last_name: 'One',
    email: 'adviser1@tip.edu.ph',
    password: adviserPasswordHash,
    role: 'adviser',
    isActive: true,
    isVerified: true
  });
  const adviser2 = await User.create({
    firstName: 'Adviser',
    lastName: 'Two',
    first_name: 'Adviser',
    last_name: 'Two',
    email: 'adviser2@tip.edu.ph',
    password: adviserPasswordHash,
    role: 'adviser',
    isActive: true,
    isVerified: true
  });
  const adviser3 = await User.create({
    firstName: 'Adviser',
    lastName: 'Three',
    first_name: 'Adviser',
    last_name: 'Three',
    email: 'adviser3@tip.edu.ph',
    password: adviserPasswordHash,
    role: 'adviser',
    isActive: true,
    isVerified: true
  });
  const seededAdvisers = [adviser1, adviser2, adviser3];
  console.log('Created 3 default advisers (adviser1/2/3@tip.edu.ph / password123)');

  // ═══════════════════════════════════════════════════════════════════
  // 8. Generate 20 Mock Students for Demand Forecasting
  // ═══════════════════════════════════════════════════════════════════
  const studentUsers = [];
  for (let i = 1; i <= 20; i++) {
    const sid = String(2000000 + i);                       // e.g. "2000001"
    const yearLevel = i <= 5 ? 2 : i <= 15 ? 3 : 4;      // mix of year levels
    const student = await User.create({
      studentId: sid,
      firstName: `Student${i}`,
      lastName: `Mock${i}`,
      first_name: `Student${i}`,
      last_name: `Mock${i}`,
      email: `student${i}@tip.edu.ph`,
      password: hashedPassword,
      role: 'student',
      adviserId: seededAdvisers[(i - 1) % 3].id,
      isActive: true,
      isVerified: true,
      current_year_level: yearLevel,
      CurriculumId: curriculum2025.id
    });
    studentUsers.push(student);
  }
  console.log(`Created ${studentUsers.length} mock students (student1@tip.edu.ph … student20@tip.edu.ph).`);

  // ═══════════════════════════════════════════════════════════════════
  // 9. Seed Grade Records (mix of pass / fail for realism)
  // ═══════════════════════════════════════════════════════════════════
  const passedY1Subjects = ['CPE 101', 'MATH 101', 'GEC 101', 'PHYS 100',
                            'CPE 102', 'MATH 102', 'GEC 102', 'PHYS 102'];
  const passedY2Subjects = ['CPE 201', 'MATH 201', 'CPE 203', 'CPE 205A',
                            'CPE 202', 'CPE 204', 'GEC 201', 'CPE 205B'];

  const gradeRows = [];

  for (let i = 0; i < studentUsers.length; i++) {
    const student = studentUsers[i];

    // All 20 students passed Year-1 subjects (except students 19-20 fail CPE 102)
    for (const code of passedY1Subjects) {
      const isFail = (i >= 18 && code === 'CPE 102');       // students 19 & 20
      gradeRows.push({
        grade_value: isFail ? 5.0 : 1.5,
        term_taken: '1st Semester 2024-2025',
        status: 'verified',
        risk_status: isFail ? 'at_risk' : 'on_track',
        UserId: student.id,
        SubjectId: lookup[code]
      });
    }

    // Students 1-14 also passed all Year-2 subjects
    // Students 15-18 failed CPE 201 (DSA prerequisite)
    // Students 19-20 don't have Year-2 grades (they still need to retake CPE 102)
    if (i < 18) {
      for (const code of passedY2Subjects) {
        const isFail = (i >= 14 && code === 'CPE 201');     // students 15-18
        gradeRows.push({
          grade_value: isFail ? 5.0 : (1.0 + Math.random() * 1.5).toFixed(1),
          term_taken: '2nd Semester 2024-2025',
          status: 'verified',
          risk_status: isFail ? 'at_risk' : 'on_track',
          UserId: student.id,
          SubjectId: lookup[code]
        });
      }
    }
  }

  await Grade.bulkCreate(gradeRows);
  console.log(`Created ${gradeRows.length} Grade records for 20 students.`);

  // ═══════════════════════════════════════════════════════════════════
  // 10. Approved Study Plans + PlanSubjects
  // ═══════════════════════════════════════════════════════════════════
  const planSubjectRows = [];

  for (let i = 0; i < studentUsers.length; i++) {
    const student = studentUsers[i];

    const plan = await StudyPlan.create({
      status: 'approved',
      UserId: student.id
    });

    // --- Year 3, 1st Semester subjects (the bottleneck term) ---
    if (i < 16) {
      // 16 students all take CPE 301 & CPE 303 in the same term → bottleneck
      planSubjectRows.push(
        { target_term: 'Year 3 - 1st Semester', StudyPlanId: plan.id, SubjectId: lookup['CPE 301'] },
        { target_term: 'Year 3 - 1st Semester', StudyPlanId: plan.id, SubjectId: lookup['CPE 303'] },
        { target_term: 'Year 3 - 1st Semester', StudyPlanId: plan.id, SubjectId: lookup['CPE 305'] }
      );
    }

    // --- Year 3, 2nd Semester subjects ---
    if (i < 14) {
      planSubjectRows.push(
        { target_term: 'Year 3 - 2nd Semester', StudyPlanId: plan.id, SubjectId: lookup['CPE 302'] },
        { target_term: 'Year 3 - 2nd Semester', StudyPlanId: plan.id, SubjectId: lookup['CPE 304'] },
        { target_term: 'Year 3 - 2nd Semester', StudyPlanId: plan.id, SubjectId: lookup['CPE 306'] }
      );
    }

    // --- Students 15-18: retake CPE 201 (failed DSA) ---
    if (i >= 14 && i < 18) {
      planSubjectRows.push(
        { target_term: 'Year 3 - 1st Semester', StudyPlanId: plan.id, SubjectId: lookup['CPE 201'] }
      );
    }

    // --- Students 19-20: retake CPE 102, plus some Year 2 subjects ---
    if (i >= 18) {
      planSubjectRows.push(
        { target_term: 'Year 3 - 1st Semester', StudyPlanId: plan.id, SubjectId: lookup['CPE 102'] },
        { target_term: 'Year 3 - 1st Semester', StudyPlanId: plan.id, SubjectId: lookup['CPE 201'] },
        { target_term: 'Year 3 - 2nd Semester', StudyPlanId: plan.id, SubjectId: lookup['CPE 203'] }
      );
    }

    // --- Year 4 subjects for students 1-5 (senior standing) ---
    if (i < 5) {
      planSubjectRows.push(
        { target_term: 'Year 4 - 1st Semester', StudyPlanId: plan.id, SubjectId: lookup['CPE 401'] },
        { target_term: 'Year 4 - 1st Semester', StudyPlanId: plan.id, SubjectId: lookup['CPE 403'] },
        { target_term: 'Year 4 - 2nd Semester', StudyPlanId: plan.id, SubjectId: lookup['CPE 402'] },
        { target_term: 'Year 4 - 2nd Semester', StudyPlanId: plan.id, SubjectId: lookup['CPE 404'] }
      );
    }
  }

  await PlanSubject.bulkCreate(planSubjectRows);
  console.log(`Created 20 approved StudyPlans with ${planSubjectRows.length} PlanSubject rows.`);
  console.log('  → CPE 301 bottleneck: 16 students in "Year 3 - 1st Semester"');
  console.log('  → CPE 303 bottleneck: 16 students in "Year 3 - 1st Semester"');
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
