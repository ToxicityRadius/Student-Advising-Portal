require('dotenv').config();
const db = require('./database/db');

(async () => {
  await db.authenticate();
  const [rows] = await db.query(`
    SELECT c.version_year, s.course_code, s.title,
           s.lecture_hours, s.laboratory_hours, s.units,
           s.year_level, s.seasonal_term,
           COALESCE(STRING_AGG(rs.course_code, ', '), 'None') AS prerequisites
    FROM curricula c
    JOIN subjects s ON s."CurriculumId" = c.id
    LEFT JOIN prerequisites p ON p.subject_id = s.id
    LEFT JOIN subjects rs ON rs.id = p.required_subj_id
    GROUP BY c.version_year, s.course_code, s.title,
             s.lecture_hours, s.laboratory_hours, s.units,
             s.year_level, s.seasonal_term
    ORDER BY c.version_year, s.year_level, s.seasonal_term, s.course_code
  `);

  let curr = '';
  for (const r of rows) {
    if (r.version_year !== curr) {
      curr = r.version_year;
      console.log(`\n${'='.repeat(80)}`);
      console.log(`CURRICULUM ${curr}`);
      console.log('='.repeat(80));
      console.log('Code'.padEnd(14) + 'Title'.padEnd(50) + 'Lec Lab Units Yr  Sem  Prerequisites');
      console.log('-'.repeat(120));
    }
    const line = [
      String(r.course_code).padEnd(14),
      String(r.title).padEnd(50),
      String(r.lecture_hours).padStart(3),
      String(r.laboratory_hours).padStart(4),
      String(r.units).padStart(6),
      String(r.year_level).padStart(3),
      String(r.seasonal_term || '').padStart(5),
      '  ' + r.prerequisites
    ].join('');
    console.log(line);
  }
  process.exit();
})();
