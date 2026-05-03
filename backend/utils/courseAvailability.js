const { CurriculumCourse, Curriculum, Course } = require('../models');
const { Op } = require('sequelize');

/**
 * Returns a map of courseId -> availability records across all curriculums.
 * Active curriculums are treated as recurring future batches. Inactive
 * curriculums remain visible for context but are unavailable for planning.
 *
 * @param {number[]} courseIds - IDs of failed/dropped courses to check
 * @param {object} [options]
 * @param {object} [options.transaction] - Sequelize transaction
 * @returns {Promise<Map<string, Array<{curriculumId: number, curriculumName: string, yearLevel: number, semester: number, curriculumIsActive: boolean, isAvailable: boolean, unavailableReason: string|null}>>>}
 */
async function getCrossCurriculumAvailability(courseIds, options = {}) {
  if (!courseIds || courseIds.length === 0) {
    return new Map();
  }

  const numericIds = courseIds.map(Number);
  const rows = await CurriculumCourse.findAll({
    where: { courseId: { [Op.in]: numericIds } },
    include: [
      { model: Curriculum, attributes: ['id', 'name', 'isActive'] },
      { model: Course, attributes: ['id', 'code', 'name'] },
    ],
    ...(options.transaction ? { transaction: options.transaction } : {}),
  });

  const availabilityMap = new Map();

  for (const row of rows) {
    const key = String(row.courseId);
    if (!availabilityMap.has(key)) {
      availabilityMap.set(key, []);
    }

    const curriculumIsActive = row.Curriculum?.isActive === true;
    availabilityMap.get(key).push({
      curriculumId: row.Curriculum?.id,
      curriculumName: row.Curriculum?.name || 'Unknown',
      yearLevel: row.yearLevel,
      semester: row.semester,
      curriculumIsActive,
      isAvailable: curriculumIsActive,
      unavailableReason: curriculumIsActive
        ? null
        : 'Inactive curriculum; no new batch is assumed.',
    });
  }

  for (const [key, entries] of availabilityMap) {
    entries.sort(
      (a, b) =>
        Number(b.isAvailable) - Number(a.isAvailable) ||
        a.semester - b.semester ||
        a.yearLevel - b.yearLevel ||
        a.curriculumName.localeCompare(b.curriculumName),
    );
  }

  return availabilityMap;
}

/**
 * Builds a full prerequisite cascade tree starting from each failed course.
 * Returns for each root: all transitively blocked courses with depth.
 *
 * @param {string[]} failedCourseIds - course IDs that have blocking status
 * @param {Map<string,Set>} prerequisiteMap - courseId -> Set of prerequisiteCourseIds
 * @param {Map<string,object>} courseInfoMap - courseId -> { code, name } for display
 * @returns {Map<string, Array<{courseId: string, code: string, name: string, depth: number}>>}
 */
function buildPrerequisiteCascade(failedCourseIds, prerequisiteMap, courseInfoMap) {
  const dependentsMap = new Map();
  for (const [courseId, prereqIds] of prerequisiteMap) {
    for (const prereqId of prereqIds) {
      if (!dependentsMap.has(prereqId)) {
        dependentsMap.set(prereqId, new Set());
      }
      dependentsMap.get(prereqId).add(courseId);
    }
  }

  const cascadeMap = new Map();

  for (const rootId of failedCourseIds) {
    const blocked = [];
    const visited = new Set([rootId]);
    const queue = [{ id: rootId, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      const dependents = dependentsMap.get(current.id) || new Set();

      for (const depId of dependents) {
        if (visited.has(depId)) continue;
        visited.add(depId);

        const info = courseInfoMap.get(depId) || {};
        blocked.push({
          courseId: depId,
          code: info.code || 'Unknown',
          name: info.name || 'Unknown',
          depth: current.depth + 1,
        });

        queue.push({ id: depId, depth: current.depth + 1 });
      }
    }

    blocked.sort((a, b) => a.depth - b.depth);
    cascadeMap.set(rootId, blocked);
  }

  return cascadeMap;
}

module.exports = {
  getCrossCurriculumAvailability,
  buildPrerequisiteCascade,
};
