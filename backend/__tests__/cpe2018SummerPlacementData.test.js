const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

const readCsv = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8').split(/\r?\n/);

describe('BS CPE Curriculum 2018 summer placement data', () => {
  const summerBeforeFourthYearCodes = ['CPE 308', 'CPE 408', 'CPE 409', 'CPE 410'];

  test('registers the summer before fourth year as third-year summer in source CSVs', () => {
    const fullCsv = readCsv('bs_cpe_curriculum_2018_full.csv');
    const importCsv = readCsv('data/curriculum_import_ready/bs_cpe_curriculum_2018_import.csv');
    const normalizedCsv = readCsv('data/curriculum_normalized/curriculum_courses.csv');

    summerBeforeFourthYearCodes.forEach((courseCode) => {
      const fullRow = fullCsv.find((line) => line.startsWith(`${courseCode},`));
      const importRow = importCsv.find((line) =>
        line.includes(`,BS CPE Curriculum 2018,${courseCode},`),
      );
      const normalizedRow = normalizedCsv.find((line) =>
        line.startsWith(`BS_CPE_2018,${courseCode},`),
      );

      expect(fullRow).toBeDefined();
      expect(importRow).toBeDefined();
      expect(normalizedRow).toBeDefined();
      expect(fullRow).toMatch(/,3,summer,core$/);
      expect(importRow).toMatch(/,3,3,false,3,,,?$/);
      expect(normalizedRow).toBe(`BS_CPE_2018,${courseCode},3,3,false`);
    });
  });
});
