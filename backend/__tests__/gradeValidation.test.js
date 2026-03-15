const {
  parseGradeInput,
  parseGradePayload,
  formatQuarterGrade,
  VALID_STATUSES
} = require('../utils/gradeValidation');

describe('Grade Validation', () => {
  // ---- parseGradeInput ----

  describe('parseGradeInput', () => {
    test('null input returns pending', () => {
      expect(parseGradeInput(null)).toEqual({ grade: null, status: 'pending' });
    });

    test('undefined input returns pending', () => {
      expect(parseGradeInput(undefined)).toEqual({ grade: null, status: 'pending' });
    });

    test('empty string returns pending', () => {
      expect(parseGradeInput('')).toEqual({ grade: null, status: 'pending' });
      expect(parseGradeInput('  ')).toEqual({ grade: null, status: 'pending' });
    });

    test('INC (case-insensitive) returns incomplete', () => {
      expect(parseGradeInput('INC')).toEqual({ grade: 'INC', status: 'incomplete' });
      expect(parseGradeInput('inc')).toEqual({ grade: 'INC', status: 'incomplete' });
      expect(parseGradeInput('Inc')).toEqual({ grade: 'INC', status: 'incomplete' });
    });

    test('PENDING (case-insensitive) returns pending', () => {
      expect(parseGradeInput('PENDING')).toEqual({ grade: 'Pending', status: 'pending' });
      expect(parseGradeInput('pending')).toEqual({ grade: 'Pending', status: 'pending' });
      expect(parseGradeInput('Pending')).toEqual({ grade: 'Pending', status: 'pending' });
    });

    // Passing grades: 1.00 to 3.00
    test.each([
      [1.00, '1.00'], [1.25, '1.25'], [1.50, '1.50'], [1.75, '1.75'],
      [2.00, '2.00'], [2.25, '2.25'], [2.50, '2.50'], [2.75, '2.75'],
      [3.00, '3.00']
    ])('grade %s maps to passed with formatted value %s', (input, expected) => {
      const result = parseGradeInput(input);
      expect(result.grade).toBe(expected);
      expect(result.status).toBe('passed');
    });

    test('string numeric input "1.75" works the same as number 1.75', () => {
      expect(parseGradeInput('1.75')).toEqual({ grade: '1.75', status: 'passed' });
    });

    test('grade 4.00 maps to dropped', () => {
      expect(parseGradeInput(4.00)).toEqual({ grade: '4.00', status: 'dropped' });
      expect(parseGradeInput('4.00')).toEqual({ grade: '4.00', status: 'dropped' });
    });

    test('grade 5.00 maps to failed', () => {
      expect(parseGradeInput(5.00)).toEqual({ grade: '5.00', status: 'failed' });
      expect(parseGradeInput('5.00')).toEqual({ grade: '5.00', status: 'failed' });
    });

    // Grades between 3 and 5 that are NOT 4.00 or 5.00 map to failed
    test.each([3.25, 3.50, 3.75, 4.25, 4.50, 4.75])('grade %s maps to failed', (input) => {
      const result = parseGradeInput(input);
      expect(result.grade).toBe('5.00');
      expect(result.status).toBe('failed');
    });

    // Invalid grades: out of range
    test('throws for grade below 1.00', () => {
      expect(() => parseGradeInput(0.75)).toThrow('Grade must be between 1.00 and 5.00');
      expect(() => parseGradeInput(0)).toThrow('Grade must be between 1.00 and 5.00');
      expect(() => parseGradeInput(-1)).toThrow('Grade must be between 1.00 and 5.00');
    });

    test('throws for grade above 5.00', () => {
      expect(() => parseGradeInput(5.25)).toThrow('Grade must be between 1.00 and 5.00');
      expect(() => parseGradeInput(6)).toThrow('Grade must be between 1.00 and 5.00');
    });

    // Invalid grades: not 0.25 increments
    test('throws for non-0.25 increment grades', () => {
      expect(() => parseGradeInput(1.10)).toThrow('0.25 increments');
      expect(() => parseGradeInput(2.33)).toThrow('0.25 increments');
      expect(() => parseGradeInput(1.5001)).toThrow('0.25 increments');
    });

    // Invalid grades: non-numeric strings
    test('throws for arbitrary strings', () => {
      expect(() => parseGradeInput('abc')).toThrow('Grade must be between 1.00 and 5.00');
      expect(() => parseGradeInput('NaN')).toThrow('Grade must be between 1.00 and 5.00');
    });
  });

  // ---- parseGradePayload ----

  describe('parseGradePayload', () => {
    test('returns parsed grade when no status provided', () => {
      const result = parseGradePayload({ grade: 1.50 });
      expect(result).toEqual({ grade: '1.50', status: 'passed' });
    });

    test('accepts matching status', () => {
      const result = parseGradePayload({ grade: 1.50, status: 'passed' });
      expect(result).toEqual({ grade: '1.50', status: 'passed' });
    });

    test('status comparison is case-insensitive', () => {
      const result = parseGradePayload({ grade: 5.00, status: 'Failed' });
      expect(result).toEqual({ grade: '5.00', status: 'failed' });
    });

    test('throws for mismatched status', () => {
      expect(() => parseGradePayload({ grade: 1.50, status: 'failed' }))
        .toThrow('Provided status does not match the computed status for the grade');
    });

    test('throws for invalid status string', () => {
      expect(() => parseGradePayload({ grade: 1.50, status: 'excellent' }))
        .toThrow('Invalid status value provided');
    });

    test('null status is ignored (no validation)', () => {
      const result = parseGradePayload({ grade: 1.50, status: null });
      expect(result).toEqual({ grade: '1.50', status: 'passed' });
    });

    test('undefined status is ignored', () => {
      const result = parseGradePayload({ grade: 1.50, status: undefined });
      expect(result).toEqual({ grade: '1.50', status: 'passed' });
    });
  });

  // ---- formatQuarterGrade ----

  describe('formatQuarterGrade', () => {
    test('formats integer to 2 decimal places', () => {
      expect(formatQuarterGrade(1)).toBe('1.00');
    });

    test('formats 1-decimal to 2 decimal places', () => {
      expect(formatQuarterGrade(2.5)).toBe('2.50');
    });

    test('keeps 2 decimal places as-is', () => {
      expect(formatQuarterGrade(3.75)).toBe('3.75');
    });
  });

  // ---- VALID_STATUSES ----

  describe('VALID_STATUSES', () => {
    test('contains all expected statuses', () => {
      expect(VALID_STATUSES.has('pending')).toBe(true);
      expect(VALID_STATUSES.has('passed')).toBe(true);
      expect(VALID_STATUSES.has('failed')).toBe(true);
      expect(VALID_STATUSES.has('dropped')).toBe(true);
      expect(VALID_STATUSES.has('incomplete')).toBe(true);
    });

    test('does not contain invalid statuses', () => {
      expect(VALID_STATUSES.has('excellent')).toBe(false);
      expect(VALID_STATUSES.has('withdrawn')).toBe(false);
    });
  });
});
