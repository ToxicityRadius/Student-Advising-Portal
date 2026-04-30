const {
  parseGradeInput,
  parseGradePayload,
  formatQuarterGrade,
  VALID_STATUSES,
  BLOCKING_STATUSES,
  isBlockingStatus,
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
      [1.0, '1.00'],
      [1.25, '1.25'],
      [1.5, '1.50'],
      [1.75, '1.75'],
      [2.0, '2.00'],
      [2.25, '2.25'],
      [2.5, '2.50'],
      [2.75, '2.75'],
      [3.0, '3.00'],
    ])('grade %s maps to passed with formatted value %s', (input, expected) => {
      const result = parseGradeInput(input);
      expect(result.grade).toBe(expected);
      expect(result.status).toBe('passed');
    });

    test('string numeric input "1.75" works the same as number 1.75', () => {
      expect(parseGradeInput('1.75')).toEqual({ grade: '1.75', status: 'passed' });
    });

    test('grade 4.00 maps to incomplete', () => {
      expect(parseGradeInput(4.0)).toEqual({ grade: '4.00', status: 'incomplete' });
      expect(parseGradeInput('4.00')).toEqual({ grade: '4.00', status: 'incomplete' });
    });

    test('grade 5.00 maps to failed', () => {
      expect(parseGradeInput(5.0)).toEqual({ grade: '5.00', status: 'failed' });
      expect(parseGradeInput('5.00')).toEqual({ grade: '5.00', status: 'failed' });
    });

    test('grade 6.00 maps to officially_dropped', () => {
      expect(parseGradeInput(6.0)).toEqual({ grade: '6.00', status: 'officially_dropped' });
      expect(parseGradeInput('6.00')).toEqual({ grade: '6.00', status: 'officially_dropped' });
    });

    test('grade 7.00 maps to unofficially_dropped', () => {
      expect(parseGradeInput(7.0)).toEqual({ grade: '7.00', status: 'unofficially_dropped' });
      expect(parseGradeInput('7.00')).toEqual({ grade: '7.00', status: 'unofficially_dropped' });
    });

    // Grades between 3 and 4 are now invalid (no longer silently mapped)
    test.each([3.25, 3.5, 3.75])('grade %s throws invalid error', (input) => {
      expect(() => parseGradeInput(input)).toThrow('Grades between 3.00 and 4.00 are invalid');
    });

    // Invalid grades: out of range
    test('throws for grade below 1.00', () => {
      expect(() => parseGradeInput(0.75)).toThrow('Grade must be between 1.00 and 7.00');
      expect(() => parseGradeInput(0)).toThrow('Grade must be between 1.00 and 7.00');
      expect(() => parseGradeInput(-1)).toThrow('Grade must be between 1.00 and 7.00');
    });

    test('throws for grade above 7.00', () => {
      expect(() => parseGradeInput(7.25)).toThrow('Grade must be between 1.00 and 7.00');
      expect(() => parseGradeInput(8)).toThrow('Grade must be between 1.00 and 7.00');
    });

    // Invalid grades: not 0.25 increments
    test('throws for non-0.25 increment grades in passing range', () => {
      expect(() => parseGradeInput(1.1)).toThrow('0.25 increments');
      expect(() => parseGradeInput(2.33)).toThrow('0.25 increments');
      expect(() => parseGradeInput(1.5001)).toThrow('0.25 increments');
    });

    // Invalid grades: non-numeric strings
    test('throws for arbitrary strings', () => {
      expect(() => parseGradeInput('abc')).toThrow('Grade must be between 1.00 and 7.00');
      expect(() => parseGradeInput('NaN')).toThrow('Grade must be between 1.00 and 7.00');
    });
  });

  // ---- parseGradePayload ----

  describe('parseGradePayload', () => {
    test('returns parsed grade when no status provided', () => {
      const result = parseGradePayload({ grade: 1.5 });
      expect(result).toEqual({ grade: '1.50', status: 'passed' });
    });

    test('accepts matching status', () => {
      const result = parseGradePayload({ grade: 1.5, status: 'passed' });
      expect(result).toEqual({ grade: '1.50', status: 'passed' });
    });

    test('accepts matching status for new grade types', () => {
      expect(parseGradePayload({ grade: 6.0, status: 'officially_dropped' })).toEqual({
        grade: '6.00',
        status: 'officially_dropped',
      });
      expect(parseGradePayload({ grade: 7.0, status: 'unofficially_dropped' })).toEqual({
        grade: '7.00',
        status: 'unofficially_dropped',
      });
    });

    test('status comparison is case-insensitive', () => {
      const result = parseGradePayload({ grade: 5.0, status: 'Failed' });
      expect(result).toEqual({ grade: '5.00', status: 'failed' });
    });

    test('throws for mismatched status', () => {
      expect(() => parseGradePayload({ grade: 1.5, status: 'failed' })).toThrow(
        'Provided status does not match the computed status for the grade',
      );
    });

    test('throws for invalid status string', () => {
      expect(() => parseGradePayload({ grade: 1.5, status: 'excellent' })).toThrow(
        'Invalid status value provided',
      );
    });

    test('null status is ignored (no validation)', () => {
      const result = parseGradePayload({ grade: 1.5, status: null });
      expect(result).toEqual({ grade: '1.50', status: 'passed' });
    });

    test('undefined status is ignored', () => {
      const result = parseGradePayload({ grade: 1.5, status: undefined });
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
      expect(VALID_STATUSES.has('officially_dropped')).toBe(true);
      expect(VALID_STATUSES.has('unofficially_dropped')).toBe(true);
    });

    test('does not contain invalid statuses', () => {
      expect(VALID_STATUSES.has('excellent')).toBe(false);
      expect(VALID_STATUSES.has('withdrawn')).toBe(false);
    });
  });

  // ---- BLOCKING_STATUSES & isBlockingStatus ----

  describe('BLOCKING_STATUSES', () => {
    test('failed blocks prerequisites', () => {
      expect(isBlockingStatus('failed')).toBe(true);
    });

    test('officially_dropped blocks prerequisites', () => {
      expect(isBlockingStatus('officially_dropped')).toBe(true);
    });

    test('unofficially_dropped blocks prerequisites', () => {
      expect(isBlockingStatus('unofficially_dropped')).toBe(true);
    });

    test('incomplete does NOT block prerequisites', () => {
      expect(isBlockingStatus('incomplete')).toBe(false);
    });

    test('passed does NOT block prerequisites', () => {
      expect(isBlockingStatus('passed')).toBe(false);
    });

    test('pending does NOT block prerequisites', () => {
      expect(isBlockingStatus('pending')).toBe(false);
    });
  });
});
