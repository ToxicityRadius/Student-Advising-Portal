'use strict';

const CURRICULUM_NAME = 'BS CPE Curriculum 2018';

const PLACEMENTS = [
  ['Cybersecurity', 'CPE 209', 2, 2],
  ['Cybersecurity', 'CPE 320', 3, 1],
  ['Cybersecurity', 'CPE 315', 3, 2],
  ['Data Science', 'COE 003', 2, 2],
  ['Data Science', 'COE 004', 3, 1],
  ['Data Science', 'COE 005', 3, 2],
  ['Railway Engineering', 'RWE 001', 2, 2],
  ['Railway Engineering', 'RWE 002A', 3, 1],
  ['Railway Engineering', 'RWE 003A', 3, 2],
  ['Robotics', 'CPE 331A', 2, 2],
  ['Robotics', 'CPE 332', 3, 1],
  ['Robotics', 'CPE 343', 3, 2],
  ['Systems Administration', 'CPE 207', 2, 2],
  ['Systems Administration', 'CPE 307', 3, 1],
  ['Systems Administration', 'CPE 312', 3, 2],
  ['Technopreneurship', 'TECH 102', 2, 2],
  ['Technopreneurship', 'TECH 103', 3, 1],
  ['Technopreneurship', 'TECH 104', 3, 2],
];

const buildPlacementValues = (replacements) =>
  PLACEMENTS.map(([trackName, courseCode, yearLevel, semester], index) => {
    replacements[`trackName${index}`] = trackName;
    replacements[`courseCode${index}`] = courseCode;
    replacements[`yearLevel${index}`] = yearLevel;
    replacements[`semester${index}`] = semester;

    return `(:trackName${index}, :courseCode${index}, :yearLevel${index}, :semester${index})`;
  }).join(',\n        ');

module.exports = {
  async up(queryInterface) {
    const replacements = { curriculumName: CURRICULUM_NAME };
    const valuesSql = buildPlacementValues(replacements);

    await queryInterface.sequelize.query(
      `
      WITH defaults(track_name, course_code, year_level, semester) AS (
        VALUES
        ${valuesSql}
      )
      UPDATE elective_track_courses etc
      SET
        "yearLevel" = defaults.year_level::integer,
        semester = defaults.semester::integer
      FROM defaults
      JOIN elective_tracks et ON et.name = defaults.track_name
      JOIN curriculums c ON c.id = et."curriculumId" AND c.name = :curriculumName
      JOIN courses co
        ON co.code = defaults.course_code
       AND (co."programId" = c."programId" OR co."programId" IS NULL)
      WHERE etc."electiveTrackId" = et.id
        AND etc."courseId" = co.id;
      `,
      { replacements },
    );
  },

  async down(queryInterface) {
    const replacements = { curriculumName: CURRICULUM_NAME };
    const valuesSql = buildPlacementValues(replacements);

    await queryInterface.sequelize.query(
      `
      WITH defaults(track_name, course_code) AS (
        SELECT track_name, course_code
        FROM (VALUES
        ${valuesSql}
        ) AS rows(track_name, course_code, year_level, semester)
      )
      UPDATE elective_track_courses etc
      SET
        "yearLevel" = NULL,
        semester = NULL
      FROM defaults
      JOIN elective_tracks et ON et.name = defaults.track_name
      JOIN curriculums c ON c.id = et."curriculumId" AND c.name = :curriculumName
      JOIN courses co
        ON co.code = defaults.course_code
       AND (co."programId" = c."programId" OR co."programId" IS NULL)
      WHERE etc."electiveTrackId" = et.id
        AND etc."courseId" = co.id;
      `,
      { replacements },
    );
  },
};
