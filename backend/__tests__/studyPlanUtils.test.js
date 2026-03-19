const {
  slotIndexFromYearSemester,
  yearSemesterFromSlotIndex,
  normalizeRegularSlotIndex,
  nextRegularSlotIndex,
  isElectiveTrackSelectionRequired,
  sortElectiveTrackCourses,
  buildElectiveTrackPlan
} = require('../utils/studyPlan');

describe('Study Plan Utilities', () => {
  // ---- slotIndexFromYearSemester ----

  describe('slotIndexFromYearSemester', () => {
    test('year 1, semester 1 → index 0', () => {
      expect(slotIndexFromYearSemester(1, 1)).toBe(0);
    });

    test('year 1, semester 2 → index 1', () => {
      expect(slotIndexFromYearSemester(1, 2)).toBe(1);
    });

    test('year 1, summer → index 2', () => {
      expect(slotIndexFromYearSemester(1, 3)).toBe(2);
    });

    test('year 2, semester 1 → index 3', () => {
      expect(slotIndexFromYearSemester(2, 1)).toBe(3);
    });

    test('year 4, semester 2 → index 10', () => {
      expect(slotIndexFromYearSemester(4, 2)).toBe(10);
    });

    test('handles string inputs', () => {
      expect(slotIndexFromYearSemester('3', '2')).toBe(7);
    });
  });

  // ---- yearSemesterFromSlotIndex ----

  describe('yearSemesterFromSlotIndex', () => {
    test('index 0 → year 1, semester 1', () => {
      expect(yearSemesterFromSlotIndex(0)).toEqual({ yearLevel: 1, semester: 1 });
    });

    test('index 2 → year 1, summer', () => {
      expect(yearSemesterFromSlotIndex(2)).toEqual({ yearLevel: 1, semester: 3 });
    });

    test('index 3 → year 2, semester 1', () => {
      expect(yearSemesterFromSlotIndex(3)).toEqual({ yearLevel: 2, semester: 1 });
    });

    test('roundtrip conversion', () => {
      for (let year = 1; year <= 5; year++) {
        for (let sem = 1; sem <= 3; sem++) {
          const idx = slotIndexFromYearSemester(year, sem);
          expect(yearSemesterFromSlotIndex(idx)).toEqual({ yearLevel: year, semester: sem });
        }
      }
    });
  });

  // ---- normalizeRegularSlotIndex ----

  describe('normalizeRegularSlotIndex', () => {
    test('returns same index for non-summer slots', () => {
      // Year 1, Sem 1 (index 0) — semester 1, not summer
      expect(normalizeRegularSlotIndex(0)).toBe(0);
      // Year 1, Sem 2 (index 1) — semester 2, not summer
      expect(normalizeRegularSlotIndex(1)).toBe(1);
    });

    test('skips summer slot by adding 1', () => {
      // Year 1, Summer (index 2) — semester 3 (summer), skips to next
      expect(normalizeRegularSlotIndex(2)).toBe(3);
    });

    test('returns input for negative numbers', () => {
      expect(normalizeRegularSlotIndex(-1)).toBe(-1);
    });

    test('returns input for non-integers', () => {
      expect(normalizeRegularSlotIndex(1.5)).toBe(1.5);
    });
  });

  // ---- nextRegularSlotIndex ----

  describe('nextRegularSlotIndex', () => {
    test('from semester 1 advances to semester 2', () => {
      // Index 0 = Year 1, Sem 1 → normalized is 0+0=0 → semester 1 → next = 0+1 = 1
      expect(nextRegularSlotIndex(0)).toBe(1);
    });

    test('from semester 2 skips summer to next year semester 1', () => {
      // Index 1 = Year 1, Sem 2 → normalized is 1 → semester 2 → next = 1+2 = 3
      expect(nextRegularSlotIndex(1)).toBe(3);
    });
  });

  // ---- isElectiveTrackSelectionRequired ----

  describe('isElectiveTrackSelectionRequired', () => {
    test('year 1 semester 1 → not required', () => {
      expect(isElectiveTrackSelectionRequired({ yearLevel: 1, currentSemester: 1 })).toBe(false);
    });

    test('year 2 semester 1 → not required', () => {
      expect(isElectiveTrackSelectionRequired({ yearLevel: 2, currentSemester: 1 })).toBe(false);
    });

    test('year 2 semester 2 → required', () => {
      expect(isElectiveTrackSelectionRequired({ yearLevel: 2, currentSemester: 2 })).toBe(true);
    });

    test('year 3 semester 1 → required', () => {
      expect(isElectiveTrackSelectionRequired({ yearLevel: 3, currentSemester: 1 })).toBe(true);
    });

    test('year 4 → required', () => {
      expect(isElectiveTrackSelectionRequired({ yearLevel: 4, currentSemester: 1 })).toBe(true);
    });

    test('handles string inputs', () => {
      expect(isElectiveTrackSelectionRequired({ yearLevel: '3', currentSemester: '1' })).toBe(true);
    });
  });

  // ---- sortElectiveTrackCourses ----

  describe('sortElectiveTrackCourses', () => {
    test('sorts by yearLevel and semester', () => {
      const courses = [
        { id: 1, yearLevel: 3, semester: 1, Course: { code: 'B' } },
        { id: 2, yearLevel: 2, semester: 2, Course: { code: 'A' } },
        { id: 3, yearLevel: 2, semester: 1, Course: { code: 'C' } },
      ];
      const sorted = sortElectiveTrackCourses(courses);
      expect(sorted.map(c => c.id)).toEqual([3, 2, 1]);
    });

    test('sorts by code for same slot', () => {
      const courses = [
        { id: 1, yearLevel: 3, semester: 1, Course: { code: 'CPE 312' } },
        { id: 2, yearLevel: 3, semester: 1, Course: { code: 'CPE 311' } },
      ];
      const sorted = sortElectiveTrackCourses(courses);
      expect(sorted.map(c => c.id)).toEqual([2, 1]);
    });

    test('returns empty for empty input', () => {
      expect(sortElectiveTrackCourses([])).toEqual([]);
      expect(sortElectiveTrackCourses()).toEqual([]);
    });

    test('does not mutate original array', () => {
      const courses = [
        { id: 2, yearLevel: 2, semester: 1, Course: { code: 'B' } },
        { id: 1, yearLevel: 1, semester: 1, Course: { code: 'A' } },
      ];
      const original = [...courses];
      sortElectiveTrackCourses(courses);
      expect(courses).toEqual(original);
    });
  });

  // ---- buildElectiveTrackPlan ----

  describe('buildElectiveTrackPlan', () => {
    test('builds plan with correct slot indices', () => {
      const courses = [
        { id: 10, courseId: 100, yearLevel: 3, semester: 1, Course: { code: 'CPE 311' } },
        { id: 11, courseId: 101, yearLevel: 3, semester: 2, Course: { code: 'CPE 312' } },
      ];
      const plan = buildElectiveTrackPlan(courses);
      expect(plan).toHaveLength(2);
      expect(plan[0].courseId).toBe(100);
      expect(plan[0].yearLevel).toBe(3);
      expect(plan[0].semester).toBe(1);
      expect(plan[0].order).toBe(0);
      expect(plan[1].order).toBe(1);
    });

    test('throws for missing placements', () => {
      const courses = [{ id: 1, courseId: 100, Course: { code: 'CPE 311' } }];
      expect(() => buildElectiveTrackPlan(courses)).toThrow('Elective track course placements are required');
    });

    test('throws for conflicting slots', () => {
      const courses = [
        { id: 1, courseId: 100, yearLevel: 3, semester: 1, Course: { code: 'CPE 311' } },
        { id: 2, courseId: 101, yearLevel: 3, semester: 1, Course: { code: 'CPE 312' } },
      ];
      expect(() => buildElectiveTrackPlan(courses)).toThrow('Elective track courses must have unique placements');
    });
  });
});
