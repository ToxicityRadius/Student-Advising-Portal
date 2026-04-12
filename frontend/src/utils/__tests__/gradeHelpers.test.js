import { semesterGwa, formatGwa } from '../gradeHelpers';

describe('semesterGwa', () => {
  test('returns "-" when no courses have numeric grades', () => {
    expect(semesterGwa([])).toBe('-');
    expect(semesterGwa([{ grade: null, units: 3 }])).toBe('-');
    expect(semesterGwa([{ grade: 'INC', units: 3 }])).toBe('-');
    expect(semesterGwa([{ grade: 'DRP', units: 3 }])).toBe('-');
  });

  test('weights grades by units (not a simple average)', () => {
    // Course A: grade 1.0, 3 units
    // Course B: grade 3.0, 1 unit
    // Unit-weighted: (1.0×3 + 3.0×1) / (3+1) = 6/4 = 1.50
    // Simple average (wrong): (1.0 + 3.0) / 2 = 2.00
    const courses = [
      { grade: '1.0', units: 3 },
      { grade: '3.0', units: 1 },
    ];
    expect(semesterGwa(courses)).toBe('1.50');
  });

  test('equal-unit courses give a straight average', () => {
    const courses = [
      { grade: '1.25', units: 3 },
      { grade: '2.75', units: 3 },
    ];
    // (1.25×3 + 2.75×3) / 6 = 12/6 = 2.00
    expect(semesterGwa(courses)).toBe('2.00');
  });

  test('ignores courses without units or with zero units', () => {
    const courses = [
      { grade: '1.5', units: 3 },
      { grade: '3.0', units: 0 }, // should be ignored
      { grade: '2.5', units: null }, // should be ignored
    ];
    // Only first course contributes: 1.5
    expect(semesterGwa(courses)).toBe('1.50');
  });

  test('ignores courses with non-numeric grades when computing average', () => {
    const courses = [
      { grade: '1.0', units: 3 },
      { grade: 'INC', units: 3 }, // excluded
      { grade: '2.0', units: 3 },
    ];
    // (1.0×3 + 2.0×3) / 6 = 1.5
    expect(semesterGwa(courses)).toBe('1.50');
  });

  test('rounds to 2 decimal places', () => {
    const courses = [
      { grade: '1.0', units: 3 },
      { grade: '2.0', units: 2 },
      { grade: '3.0', units: 2 },
    ];
    // (1.0×3 + 2.0×2 + 3.0×2) / 7 = (3+4+6)/7 = 13/7 ≈ 1.857...
    expect(semesterGwa(courses)).toBe('1.86');
  });
});

describe('formatGwa', () => {
  test('returns N/A for null', () => {
    expect(formatGwa(null)).toBe('N/A');
  });

  test('returns N/A for undefined', () => {
    expect(formatGwa(undefined)).toBe('N/A');
  });

  test('returns N/A for non-finite values', () => {
    expect(formatGwa(NaN)).toBe('N/A');
    expect(formatGwa(Infinity)).toBe('N/A');
  });

  test('formats whole number with two decimal places', () => {
    // Backend returns Number("2.00") = 2 — must display as "2.00" not "2"
    expect(formatGwa(2)).toBe('2.00');
  });

  test('formats number with one decimal place to two', () => {
    // Backend returns Number("1.50") = 1.5 — must display as "1.50" not "1.5"
    expect(formatGwa(1.5)).toBe('1.50');
  });

  test('formats number already at two decimal places', () => {
    expect(formatGwa(1.25)).toBe('1.25');
  });

  test('accepts string GWA values', () => {
    expect(formatGwa('1.50')).toBe('1.50');
    expect(formatGwa('2')).toBe('2.00');
  });
});
