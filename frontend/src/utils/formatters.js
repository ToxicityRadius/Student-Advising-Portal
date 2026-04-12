/**
 * Shared formatting utilities — single source of truth for display helpers
 * used across student, adviser, and admin layouts.
 */

const YEAR_SUFFIX = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th' };

export const formatYearLevel = (level) => {
  const n = parseInt(level, 10);
  return YEAR_SUFFIX[n] ? `${YEAR_SUFFIX[n]} Year` : `${level} Year`;
};
