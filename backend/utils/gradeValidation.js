const VALID_STATUSES = new Set(['pending', 'passed', 'failed', 'dropped', 'incomplete']);

const formatQuarterGrade = (value) => Number(value).toFixed(2);

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
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 5) {
    throw new Error('Grade must be between 1.00 and 5.00, INC, or Pending');
  }

  if (Math.round(numeric * 4) !== numeric * 4) {
    throw new Error('Numeric grades must be in 0.25 increments');
  }

  if (numeric <= 3) {
    return { grade: formatQuarterGrade(numeric), status: 'passed' };
  }

  if (numeric === 4) {
    return { grade: '4.00', status: 'dropped' };
  }

  return { grade: '5.00', status: 'failed' };
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
  formatQuarterGrade,
  parseGradeInput,
  parseGradePayload
};
