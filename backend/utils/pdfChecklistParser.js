const pdf = require('pdf-parse');

const PDF_TEXT_UNREADABLE = 'PDF_TEXT_UNREADABLE';

const createParserError = (message, code = PDF_TEXT_UNREADABLE) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const normalizeLine = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeCourseCode = (value) =>
  normalizeLine(value)
    .toUpperCase()
    .replace(/([A-Z])(\d)/g, '$1 $2')
    .replace(/\s+/g, ' ');

const normalizeIdentityName = (value) =>
  normalizeLine(value)
    .toUpperCase()
    .replace(/[^A-Z0-9Ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const nameTokens = (value) => normalizeIdentityName(value).split(' ').filter(Boolean).sort();

const namesMatch = (left, right) => {
  const leftTokens = nameTokens(left);
  const rightTokens = nameTokens(right);
  if (leftTokens.length === 0 || rightTokens.length === 0) return false;
  if (leftTokens.length !== rightTokens.length) return false;
  return leftTokens.every((token, index) => token === rightTokens[index]);
};

const isStudentNumber = (value) => /^\d{5,12}$/.test(normalizeLine(value));

const findIdentity = (lines) => {
  const nameLabelIndex = lines.findIndex((line) => /^NAME:?$/i.test(line));
  const studentNoLabelIndex = lines.findIndex((line) => /^STUDENT\s*NO:?$/i.test(line));

  let studentNumber = '';
  if (studentNoLabelIndex >= 0) {
    const nearby = [lines[studentNoLabelIndex - 1], lines[studentNoLabelIndex + 1]].filter(Boolean);
    const exactNumber = nearby.find(isStudentNumber) || '';
    studentNumber =
      exactNumber || nearby.map((line) => line.match(/\d{5,12}/)?.[0]).find(Boolean) || '';
  }

  if (!studentNumber) {
    studentNumber =
      lines.find(isStudentNumber) ||
      lines.map((line) => line.match(/\d{5,12}/)?.[0]).find(Boolean) ||
      '';
  }

  let studentName = '';
  if (studentNumber) {
    const combinedIdentityLine = lines.find(
      (line) => line.includes(studentNumber) && /[A-Z]/i.test(line),
    );
    const nameBeforeNumber = normalizeLine(combinedIdentityLine || '').split(studentNumber)[0];
    if (/[A-Z]/i.test(nameBeforeNumber)) {
      studentName = nameBeforeNumber;
    }
  }

  if (nameLabelIndex >= 0) {
    const candidates = [
      lines[nameLabelIndex + 1],
      lines[nameLabelIndex - 1],
      lines[nameLabelIndex - 2],
      lines[nameLabelIndex - 3],
    ].filter(Boolean);
    studentName =
      studentName ||
      candidates.find(
        (line) =>
          !isStudentNumber(line) &&
          !/^STUDENT\s*NO:?$/i.test(line) &&
          !/^NAME:?$/i.test(line) &&
          /[A-Z]/i.test(line),
      ) ||
      '';
  }

  if (!studentName && studentNumber) {
    const numberIndex = lines.findIndex((line) => line === studentNumber);
    studentName =
      [lines[numberIndex - 1], lines[numberIndex + 1]].find(
        (line) => line && /[A-Z]/i.test(line) && !/^NAME:?$/i.test(line),
      ) || '';
  }

  return {
    studentName: normalizeLine(studentName),
    studentNumber: normalizeLine(studentNumber),
  };
};

const findCurriculumTitle = (lines) =>
  lines.find((line) => /CURRICULUM|BACHELOR OF SCIENCE|BACHELOR OF ARTS/i.test(line)) || '';

const parseChecklistText = (text) => {
  const normalizedText = String(text || '').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n').map(normalizeLine).filter(Boolean);

  if (lines.length < 5 || !/[A-Z]{2,}[A-Z0-9]*\s+\d{3}[A-Z]?/.test(normalizedText)) {
    throw createParserError('Unable to read text from PDF. Upload the official portal PDF export.');
  }

  const rows = [];
  const warnings = [];
  const seenCodes = new Map();
  const rowPattern =
    /(?:^|\n)\s*((?:[1-3]\.\d{2}|4\.00|5\.00|6\.00|7\.00))\s*([A-Z]{2,}[A-Z0-9]*\s+\d{3})([A-Z]?)/g;
  let match;

  while ((match = rowPattern.exec(normalizedText)) !== null) {
    const possibleSuffix = match[3] || '';
    const nextCharacter = normalizedText[match.index + match[0].length] || '';
    const suffixBelongsToCode = possibleSuffix && !/[a-z]/.test(nextCharacter);
    const row = {
      courseCode: normalizeCourseCode(`${match[2]}${suffixBelongsToCode ? possibleSuffix : ''}`),
      grade: normalizeLine(match[1]),
    };
    rows.push(row);
    seenCodes.set(row.courseCode, (seenCodes.get(row.courseCode) || 0) + 1);
  }

  if (rows.length === 0) {
    warnings.push('No graded course rows were found in the PDF.');
  }

  const duplicateRows = [...seenCodes.entries()]
    .filter(([, count]) => count > 1)
    .map(([courseCode, count]) => ({ courseCode, count }));

  return {
    identity: findIdentity(lines),
    curriculumTitle: findCurriculumTitle(lines),
    rows,
    duplicateRows,
    warnings,
  };
};

const extractChecklistFromPdf = async (buffer) => {
  const parsed = await pdf(buffer);
  return parseChecklistText(parsed?.text || '');
};

module.exports = {
  PDF_TEXT_UNREADABLE,
  extractChecklistFromPdf,
  parseChecklistText,
  normalizeCourseCode,
  normalizeIdentityName,
  namesMatch,
};
