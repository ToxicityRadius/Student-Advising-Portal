/**
 * GradeService — Business logic for grade entry and study plan regeneration.
 *
 * Extracted from gradeController to separate HTTP concerns from domain logic.
 * Controllers delegate query composition and algorithmic operations here.
 */

const {
  StudentAcademicRecord,
  StudyPlan,
  StudyPlanVersion,
  StudyPlanCourse,
  Course,
  User,
} = require('../models');
const { parseGradeInput } = require('../utils/gradeValidation');
const { sortStudyPlanCourses } = require('../utils/studyPlan');

const PERSON_ATTRIBUTES = ['id', 'firstName', 'lastName', 'email', 'role', 'studentId'];

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Fetches a SAR record with its associated StudyPlan (if any).
 */
const getSarWithStudyPlan = async (sarId, transaction) => {
  return StudentAcademicRecord.findByPk(sarId, {
    include: [{ model: StudyPlan, attributes: ['id', 'studentAcademicRecordId'] }],
    transaction,
  });
};

/**
 * Fetches the active StudyPlanVersion for a study plan, including all courses.
 */
const getActiveVersion = async (studyPlanId, transaction) => {
  return StudyPlanVersion.findOne({
    where: { studyPlanId, status: 'active' },
    include: [
      {
        model: StudyPlanCourse,
        include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
      },
    ],
    transaction,
  });
};

/**
 * Fetches the latest StudyPlanVersion number for a study plan.
 */
const getLatestVersionNumber = async (studyPlanId, transaction) => {
  const latest = await StudyPlanVersion.findOne({
    where: { studyPlanId },
    order: [['versionNumber', 'DESC']],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  return Number(latest?.versionNumber || 0);
};

/**
 * Standard include set for returning a study plan version after a write operation.
 */
const buildVersionIncludes = () => [
  { model: User, as: 'GeneratedByAdviser', attributes: PERSON_ATTRIBUTES },
  {
    model: StudyPlanCourse,
    include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
  },
];

// ---------------------------------------------------------------------------
// Serializers
// ---------------------------------------------------------------------------

/**
 * Serializes a StudyPlanVersion, sorting courses by yearLevel → semester → course code.
 */
const serializeVersion = (version) => {
  const plain = version?.get ? version.get({ plain: true }) : version;
  const courses = Array.isArray(plain.StudyPlanCourses)
    ? sortStudyPlanCourses(plain.StudyPlanCourses)
    : [];
  return { ...plain, StudyPlanCourses: courses };
};

// ---------------------------------------------------------------------------
// Graph algorithm helpers (study plan regeneration)
// ---------------------------------------------------------------------------

/**
 * Partitions a set of courseIds into connected components using the provided adjacency map.
 * Used to ensure co-requisite groups are placed together during plan regeneration.
 */
const collectConnectedComponents = (courseIds, adjacencyMap) => {
  const unvisited = new Set(courseIds);
  const components = [];

  while (unvisited.size > 0) {
    const [start] = unvisited;
    const queue = [start];
    unvisited.delete(start);
    const component = [start];

    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = adjacencyMap.get(current) || [];
      neighbors.forEach((neighbor) => {
        if (unvisited.has(neighbor)) {
          unvisited.delete(neighbor);
          queue.push(neighbor);
          component.push(neighbor);
        }
      });
    }

    components.push(component);
  }

  return components;
};

module.exports = {
  getSarWithStudyPlan,
  getActiveVersion,
  getLatestVersionNumber,
  buildVersionIncludes,
  serializeVersion,
  collectConnectedComponents,
  parseGradeInput,
};
