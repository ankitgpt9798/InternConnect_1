// A readable message for a failed API request.
export function getErrorMessage(error) {
  if (error.response) {
    return error.response.data?.message || 'Something went wrong. Please try again.';
  }
  return 'Cannot reach the server. Please check your connection and try again.';
}

// Field errors sent by the API, e.g. { email: 'This email is already registered.' }
export function getFieldErrors(error) {
  return error.response?.data?.errors || {};
}
