/**
 * Vakancy.in - Centralized Error Utilities
 * Ensures user-friendly error messages and prevents raw HTML / 503 LiteSpeed dumps in UI.
 */

const HTML_PATTERN = /<\s*(!doctype|html|head|body|h1|h2|div|p)\b/i;

/**
 * Clean and format any error into a safe, human-readable user message.
 * @param {any} error - Caught error object, string, or Axios response payload
 * @param {string} fallback - Default message if no specific error can be parsed
 * @returns {string} Safe, human-friendly error string
 */
export const getUserFriendlyErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error) return fallback;

  // 1. Extract raw string and status code
  let rawMessage = '';
  let status = null;

  if (typeof error === 'string') {
    rawMessage = error;
  } else if (error && typeof error === 'object') {
    status = error.status || error.response?.status || error.statusCode || null;
    rawMessage =
      error.message ||
      error.error ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      (typeof error.response?.data === 'string' ? error.response.data : '');
  }

  // 2. Check if rawMessage is an HTML page (e.g. Hostinger LiteSpeed 503, 502, 504 or Cloudflare page)
  if (HTML_PATTERN.test(rawMessage)) {
    if (status === 503 || rawMessage.includes('503 Service Unavailable') || rawMessage.includes('server is temporarily busy')) {
      return 'Our recruitment services are temporarily busy. Please wait a few moments and try again.';
    }
    if (status === 502 || rawMessage.includes('502 Bad Gateway')) {
      return 'The recruitment server is temporarily updating. Please refresh in a moment.';
    }
    if (status === 504 || rawMessage.includes('504 Gateway Time-out')) {
      return 'The server took too long to respond. Please check back shortly.';
    }
    return 'The server is temporarily busy. Please wait a few moments and try again.';
  }

  // 3. Map HTTP Status Codes
  if (status === 503) {
    return 'Our recruitment services are temporarily busy. Please wait a few moments and try again.';
  }
  if (status === 502 || status === 504) {
    return 'The recruitment server is temporarily updating. Please refresh in a moment.';
  }
  if (status === 500) {
    return 'We encountered an unexpected server error. Please try again shortly.';
  }
  if (status === 429) {
    return 'Too many requests. Please slow down and try again in a few moments.';
  }
  if (status === 404) {
    return rawMessage && !rawMessage.toLowerCase().includes('not found')
      ? rawMessage
      : 'The requested job or resource was not found.';
  }
  if (status === 403) {
    return rawMessage || 'You do not have permission to perform this action.';
  }
  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  // 4. Handle Common Network & Timeout Errors
  const lowerMsg = String(rawMessage).toLowerCase();
  if (
    lowerMsg.includes('network error') ||
    lowerMsg.includes('failed to fetch') ||
    lowerMsg.includes('econnrefused') ||
    lowerMsg.includes('err_connection_refused') ||
    lowerMsg.includes('networkerror')
  ) {
    return 'Unable to reach Vakancy services. Please check your internet connection.';
  }
  if (lowerMsg.includes('timeout') || lowerMsg.includes('econnaborted')) {
    return 'Request timed out. Please try again in a moment.';
  }

  // 5. If clean message exists and isn't too long/cryptic, return it
  if (rawMessage && typeof rawMessage === 'string' && rawMessage.trim().length > 0) {
    const trimmed = rawMessage.trim();
    if (trimmed.length < 250 && !trimmed.includes('{') && !trimmed.includes('at ')) {
      return trimmed;
    }
  }

  return fallback;
};

export default {
  getUserFriendlyErrorMessage
};

