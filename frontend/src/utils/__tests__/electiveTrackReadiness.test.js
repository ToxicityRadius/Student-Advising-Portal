import {
  isElectiveTrackSelectionRequiredForPlan,
  mergeStudyPlanCoursesForReadiness,
} from '../electiveTrackReadiness';

describe('electiveTrackReadiness', () => {
  test('does not require a track while a year 2 second semester course is pending', () => {
    expect(
      isElectiveTrackSelectionRequiredForPlan([
        { courseId: 1, yearLevel: 1, semester: 1, status: 'passed' },
        { courseId: 2, yearLevel: 2, semester: 2, status: 'pending' },
      ]),
    ).toBe(false);
  });

  test('requires a track after checkpoint courses have terminal statuses', () => {
    expect(
      isElectiveTrackSelectionRequiredForPlan([
        { courseId: 1, yearLevel: 1, semester: 1, status: 'passed' },
        { courseId: 2, yearLevel: 2, semester: 1, status: 'dropped' },
        { courseId: 3, yearLevel: 2, semester: 2, status: 'incomplete' },
      ]),
    ).toBe(true);
  });

  test('ignores elective rows and courses after year 2 second semester', () => {
    expect(
      isElectiveTrackSelectionRequiredForPlan([
        { courseId: 1, yearLevel: 1, semester: 1, status: 'passed' },
        { courseId: 2, yearLevel: 2, semester: 2, status: 'passed' },
        { courseId: 3, yearLevel: 2, semester: 2, status: 'pending', isElective: true },
        { courseId: 4, yearLevel: 2, semester: 3, status: 'pending' },
      ]),
    ).toBe(true);
  });

  test('applies checklist elective flags to study plan rows', () => {
    expect(
      mergeStudyPlanCoursesForReadiness(
        [{ courseId: 3, yearLevel: 2, semester: 2, status: 'pending' }],
        [{ courseId: 3, isElective: true }],
      ),
    ).toEqual([{ courseId: 3, yearLevel: 2, semester: 2, status: 'pending', isElective: true }]);
  });

  test('keeps missing checklist courses as unfinished readiness rows', () => {
    expect(
      isElectiveTrackSelectionRequiredForPlan(
        mergeStudyPlanCoursesForReadiness(
          [{ courseId: 1, yearLevel: 1, semester: 1, status: 'passed' }],
          [
            { courseId: 1, yearLevel: 1, semester: 1, status: 'completed' },
            { courseId: 2, yearLevel: 2, semester: 2, status: 'not yet taken' },
          ],
        ),
      ),
    ).toBe(false);
  });

  test('treats completed checklist rows as finished when checklist data is the source', () => {
    expect(
      isElectiveTrackSelectionRequiredForPlan(
        mergeStudyPlanCoursesForReadiness(
          [],
          [
            { courseId: 1, yearLevel: 1, semester: 1, status: 'completed' },
            { courseId: 2, yearLevel: 2, semester: 2, status: 'credited' },
          ],
        ),
      ),
    ).toBe(true);
  });
});
