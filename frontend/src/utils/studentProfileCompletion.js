const hasNonEmptyValue = (value) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  return true;
};

const readFirstFilled = (source, keys) => {
  for (const key of keys) {
    const value = source?.[key];
    if (hasNonEmptyValue(value)) {
      return value;
    }
  }

  return null;
};

const toPositiveInteger = (value) => {
  if (!hasNonEmptyValue(value)) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
};

const readFirstValidPositiveInteger = (source, keys) => {
  for (const key of keys) {
    const parsed = toPositiveInteger(source?.[key]);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
};

export const getStudentNumber = (user) =>
  readFirstFilled(user, ['studentId', 'student_id', 'studentNumber', 'student_number']);

const getProgram = (user) => readFirstFilled(user, ['program']);

const getCurriculumId = (user) =>
  readFirstValidPositiveInteger(user, ['curriculum_id', 'curriculumId', 'userCurriculumId']);

const getStudentType = (user) => readFirstFilled(user, ['student_type', 'studentType']);

const getSex = (user) => readFirstFilled(user, ['sex', 'gender']);

const getYearLevel = (user) =>
  readFirstValidPositiveInteger(user, [
    'yearLevel',
    'year_level',
    'current_year_level',
    'currentYearLevel',
  ]);

export const needsStudentNumber = (user) => user?.role === 'student' && !getStudentNumber(user);

export const needsAcademicInfo = (user) => {
  if (user?.role !== 'student') {
    return false;
  }

  return (
    !getYearLevel(user) ||
    !getProgram(user) ||
    !getCurriculumId(user) ||
    !getStudentType(user) ||
    !getSex(user)
  );
};

export const isStudentOnboardingIncomplete = (user) =>
  needsStudentNumber(user) || needsAcademicInfo(user);
