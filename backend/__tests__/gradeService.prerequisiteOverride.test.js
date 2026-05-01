process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/test';

const {
  buildStandardUnitsBySlot,
  buildRetakePlacementMap,
  getAllowedUnitsForSlot,
  buildMutualPrerequisitePairSet,
  buildPrerequisiteOverrideMap,
  isPrerequisitePlacementAllowed,
} = require('../services/GradeService');

describe('GradeService prerequisite override helpers', () => {
  describe('buildRetakePlacementMap', () => {
    const activeEntries = [
      { id: 1, courseId: 101, yearLevel: 1, semester: 1, grade: '5.00' },
      { id: 2, courseId: 102, yearLevel: 1, semester: 2, grade: '4.00' },
      { id: 3, courseId: 103, yearLevel: 1, semester: 2, grade: 'INC' },
      { id: 4, courseId: 104, yearLevel: 2, semester: 1, grade: '6.00' },
      { id: 5, courseId: 105, yearLevel: 2, semester: 2, grade: '7.00' },
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
          { studyPlanCourseId: 4, yearLevel: 2, semester: 2 },
          { studyPlanCourseId: 5, yearLevel: 3, semester: 1 },
        ],
      });

      expect(placementMap.get('101')).toEqual({ yearLevel: 1, semester: 2, slotIndex: 1 });
      expect(placementMap.get('104')).toEqual({ yearLevel: 2, semester: 2, slotIndex: 4 });
      expect(placementMap.get('105')).toEqual({ yearLevel: 3, semester: 1, slotIndex: 6 });
      expect(placementMap.has('102')).toBe(false);
      expect(placementMap.has('103')).toBe(false);
    });

    test('accepts courseId placements from regeneration review semester overrides', () => {
      const placementMap = buildRetakePlacementMap({
        activeEntries,
        retakePlacements: [
          { courseId: 101, yearLevel: 1, semester: 2 },
          { courseId: 104, yearLevel: 2, semester: 2 },
          { courseId: 105, yearLevel: 3, semester: 1 },
        ],
      });

      expect(placementMap.get('101')).toEqual({ yearLevel: 1, semester: 2, slotIndex: 1 });
      expect(placementMap.get('104')).toEqual({ yearLevel: 2, semester: 2, slotIndex: 4 });
      expect(placementMap.get('105')).toEqual({ yearLevel: 3, semester: 1, slotIndex: 6 });
    });

    test('rejects placements in the same or an earlier slot than the failed attempt', () => {
      expect(() =>
        buildRetakePlacementMap({
          activeEntries,
          retakePlacements: [
            { studyPlanCourseId: 1, yearLevel: 1, semester: 1 },
            { studyPlanCourseId: 4, yearLevel: 2, semester: 2 },
            { studyPlanCourseId: 5, yearLevel: 3, semester: 1 },
          ],
        }),
      ).toThrow('Retake placement must be after the failed or dropped course slot');
    });
  });

  describe('standard curriculum unit caps', () => {
    test('keeps the default cap when the standard slot load is below the limit', () => {
      const standardUnitsBySlot = buildStandardUnitsBySlot({
        curriculumCourses: [
          { courseId: 1, yearLevel: 1, semester: 1, Course: { units: 3 } },
          { courseId: 2, yearLevel: 1, semester: 1, Course: { units: 4 } },
        ],
      });

      expect(standardUnitsBySlot.get(0)).toBe(7);
      expect(getAllowedUnitsForSlot({ slotIndex: 0, standardUnitsBySlot })).toBe(25);
      expect(getAllowedUnitsForSlot({ slotIndex: 1, standardUnitsBySlot })).toBe(25);
    });

    test('allows a slot to match an overloaded standard curriculum term', () => {
      const standardUnitsBySlot = buildStandardUnitsBySlot({
        curriculumCourses: [
          { courseId: 101, yearLevel: 4, semester: 1, Course: { units: 23 } },
          { courseId: 102, yearLevel: 4, semester: 1, Course: { units: 3 } },
        ],
      });

      expect(standardUnitsBySlot.get(9)).toBe(26);
      expect(getAllowedUnitsForSlot({ slotIndex: 9, standardUnitsBySlot })).toBe(26);
    });

    test('counts the selected elective track and excludes unselected alternatives', () => {
      const standardUnitsBySlot = buildStandardUnitsBySlot({
        hasSelectedTrack: true,
        curriculumTrackCourseIds: new Set(['201', '202']),
        selectedTrackCourseIds: new Set(['201']),
        selectedTrackPlan: [
          {
            courseId: 201,
            yearLevel: 3,
            semester: 1,
            source: { Course: { units: 3 } },
          },
        ],
        curriculumCourses: [
          { courseId: 101, yearLevel: 3, semester: 1, Course: { units: 22 } },
          { courseId: 201, yearLevel: 3, semester: 1, Course: { units: 3 } },
          { courseId: 202, yearLevel: 3, semester: 1, Course: { units: 3 } },
        ],
      });

      expect(standardUnitsBySlot.get(6)).toBe(25);
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

    test('allows same-term placement for reciprocal prerequisite pairs', () => {
      const mutualPrerequisitePairs = buildMutualPrerequisitePairSet([
        { courseId: 201, prerequisiteCourseId: 202 },
        { courseId: 202, prerequisiteCourseId: 201 },
      ]);

      expect(
        isPrerequisitePlacementAllowed({
          prerequisiteCourseId: 201,
          dependentCourseId: 202,
          prerequisiteSlotIndex: 8,
          dependentSlotIndex: 8,
          overrideMap: new Map(),
          mutualPrerequisitePairs,
          allowPending: false,
        }),
      ).toEqual({ allowed: true, matchedOverrideStatus: null });
    });
  });
});
