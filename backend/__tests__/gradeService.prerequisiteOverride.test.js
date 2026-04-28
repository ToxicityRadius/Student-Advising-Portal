process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/test';

const {
  buildRetakePlacementMap,
  buildPrerequisiteOverrideMap,
  isPrerequisitePlacementAllowed,
} = require('../services/GradeService');

describe('GradeService prerequisite override helpers', () => {
  describe('buildRetakePlacementMap', () => {
    const activeEntries = [
      { id: 1, courseId: 101, yearLevel: 1, semester: 1, grade: '5.00' },
      { id: 2, courseId: 102, yearLevel: 1, semester: 2, grade: '4.00' },
      { id: 3, courseId: 103, yearLevel: 1, semester: 2, grade: 'INC' },
    ];

    test('requires placements for failed and dropped courses only', () => {
      expect(() =>
        buildRetakePlacementMap({
          activeEntries,
          retakePlacements: [{ studyPlanCourseId: 1, yearLevel: 1, semester: 2 }],
        }),
      ).toThrow('Retake placement is required for failed or dropped courses');
    });

    test('accepts future placements and ignores incomplete courses', () => {
      const placementMap = buildRetakePlacementMap({
        activeEntries,
        retakePlacements: [
          { studyPlanCourseId: 1, yearLevel: 1, semester: 2 },
          { studyPlanCourseId: 2, yearLevel: 2, semester: 1 },
        ],
      });

      expect(placementMap.get('101')).toEqual({ yearLevel: 1, semester: 2, slotIndex: 1 });
      expect(placementMap.get('102')).toEqual({ yearLevel: 2, semester: 1, slotIndex: 3 });
      expect(placementMap.has('103')).toBe(false);
    });

    test('rejects placements in the same or an earlier slot than the failed attempt', () => {
      expect(() =>
        buildRetakePlacementMap({
          activeEntries,
          retakePlacements: [
            { studyPlanCourseId: 1, yearLevel: 1, semester: 1 },
            { studyPlanCourseId: 2, yearLevel: 2, semester: 1 },
          ],
        }),
      ).toThrow('Retake placement must be after the failed or dropped course slot');
    });
  });

  describe('prerequisite override placement checks', () => {
    test('allows same-term placement only when an approved or pending override exists', () => {
      const overrideMap = buildPrerequisiteOverrideMap([
        {
          prerequisiteCourseId: 101,
          dependentCourseId: 102,
          yearLevel: 1,
          semester: 2,
          status: 'pending',
        },
      ]);

      expect(
        isPrerequisitePlacementAllowed({
          prerequisiteCourseId: 101,
          dependentCourseId: 102,
          prerequisiteSlotIndex: 1,
          dependentSlotIndex: 1,
          overrideMap,
          allowPending: true,
        }),
      ).toEqual({ allowed: true, matchedOverrideStatus: 'pending' });

      expect(
        isPrerequisitePlacementAllowed({
          prerequisiteCourseId: 101,
          dependentCourseId: 102,
          prerequisiteSlotIndex: 1,
          dependentSlotIndex: 1,
          overrideMap,
          allowPending: false,
        }),
      ).toEqual({ allowed: false, matchedOverrideStatus: 'pending' });
    });

    test('never allows a dependent course before its prerequisite', () => {
      const overrideMap = buildPrerequisiteOverrideMap([
        {
          prerequisiteCourseId: 101,
          dependentCourseId: 102,
          yearLevel: 1,
          semester: 2,
          status: 'approved',
        },
      ]);

      expect(
        isPrerequisitePlacementAllowed({
          prerequisiteCourseId: 101,
          dependentCourseId: 102,
          prerequisiteSlotIndex: 3,
          dependentSlotIndex: 1,
          overrideMap,
          allowPending: true,
        }),
      ).toEqual({ allowed: false, matchedOverrideStatus: null });
    });
  });
});
