/**
 * Response formatter utility for standardized API responses
 * All endpoints return { success, message, data } consistently
 */

/**
 * Format a successful response
 * @param {number} statusCode - HTTP status code (default 200)
 * @param {string} message - Human-readable success message
 * @param {*} data - Response payload (can be object, array, null, or undefined)
 * @returns {object} Formatted response object
 */
exports.successResponse = (statusCode, message, data = null) => {
  return {
    success: true,
    message,
    data: data === undefined ? null : data
  };
};

/**
 * Format an error response
 * @param {number} statusCode - HTTP status code (default 400)
 * @param {string} message - Human-readable error message
 * @returns {object} Formatted response object
 */
exports.errorResponse = (statusCode, message) => {
  return {
    success: false,
    message,
    data: null
  };
};

/**
 * Send a standardized success response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {*} data - Response payload
 */
exports.sendSuccess = (res, statusCode = 200, message = 'Success', data = null) => {
  return res.status(statusCode).json(exports.successResponse(statusCode, message, data));
};

/**
 * Send a standardized error response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 */
exports.sendError = (res, statusCode = 400, message = 'Bad Request') => {
  return res.status(statusCode).json(exports.errorResponse(statusCode, message));
};
