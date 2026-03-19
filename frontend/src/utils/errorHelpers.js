/**
 * Extracts a user-facing error message from an Axios error response.
 * Falls back to `fallback` when no server message is available.
 *
 * @param {Error} error - The caught error (typically an Axios error)
 * @param {string} fallback - Message to show when the server provides none
 * @returns {string}
 */
export function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}
