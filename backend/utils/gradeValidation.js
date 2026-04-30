const VALID_STATUSES = new Set([
  'pending',
  'passed',
  'failed',
  'incomplete',
  'dropped',
  'officially_dropped',
  'unofficially_dropped',
]);

/**
 * Statuses that block prerequisite chains during study plan regeneration.
 * INC (incomplete / 4.00) is intentionally excluded — it is treated as
 * "potentially passable" and does NOT block dependents.
 */
const BLOCKING_STATUSES = new Set(['failed', 'officially_dropped', 'unofficially_dropped']);

const isBlockingStatus = (status) => BLOCKING_STATUSES.has(status);

const formatQuarterGrade = (value) => Number(value).toFixed(2);

/**
 * Valid grade values for the TIP grading scale:
 *   1.00–3.00 (0.25 increments) → passed
 *   4.00 → incomplete
 *   5.00 → failed
 *   6.00 → officially dropped
 *   7.00 → unofficially dropped
 */
const SPECIAL_GRADE_MAP = {
  4: { grade: '4.00', status: 'incomplete' },
  5: { grade: '5.00', status: 'failed' },
  6: { grade: '6.00', status: 'officially_dropped' },
  7: { grade: '7.00', status: 'unofficially_dropped' },
};

const parseGradeInput = (input) => {
  if (input === null || input === undefined) {
    return { grade: null, status: 'pending' };
  }

  const raw = String(input).trim();
  if (!raw) {
    return { grade: null, status: 'pending' };
  }

  const normalized = raw.toUpperCase();

  if (normalized === 'INC') {
    return { grade: 'INC', status: 'incomplete' };
  }

  if (normalized === 'PENDING') {
    return { grade: 'Pending', status: 'pending' };
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 7) {
    throw new Error('Grade must be between 1.00 and 7.00, INC, or Pending');
  }

  // Special grades: 4.00, 5.00, 6.00, 7.00 — exact match only
  const specialEntry = SPECIAL_GRADE_MAP[numeric];
  if (specialEntry) {
    return { ...specialEntry };
  }

  // Passing range: 1.00–3.00 in 0.25 increments
  if (numeric > 3) {
    throw new Error(
      'Grades between 3.00 and 4.00 are invalid. Valid grades: 1.00–3.00 (0.25 steps), 4.00, 5.00, 6.00, 7.00',
    );
  }

  if (Math.round(numeric * 4) !== numeric * 4) {
    throw new Error('Numeric grades must be in 0.25 increments');
  }

  return { grade: formatQuarterGrade(numeric), status: 'passed' };
};

const parseGradePayload = (item) => {
  const parsed = parseGradeInput(item.grade);

  if (item.status !== undefined && item.status !== null) {
    const normalizedStatus = String(item.status).trim().toLowerCase();
    if (!VALID_STATUSES.has(normalizedStatus)) {
      throw new Error('Invalid status value provided');
    }

    if (normalizedStatus !== parsed.status) {
      throw new Error('Provided status does not match the computed status for the grade');
    }
  }

  return parsed;
};

module.exports = {
  VALID_STATUSES,
  BLOCKING_STATUSES,
  isBlockingStatus,
  formatQuarterGrade,
  parseGradeInput,
  parseGradePayload,
};
