export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Indian mobile number: 10 digits, starting with 6, 7, 8 or 9.
export const PHONE_REGEX = /^[6-9]\d{9}$/;
export const PASSWORD_MIN = 8;
// bcrypt only uses the first 72 bytes of a password, so longer ones are refused instead of silently cut short.
export const PASSWORD_MAX = 64;

// Request values must be plain strings. Anything else (a number, or an object such as { "$gt": "" }
// that could change a MongoDB query) becomes an empty string and fails validation.
export const toText = (value) => (typeof value === 'string' ? value.trim() : '');

// Returns { field: message } for every invalid field; an empty object means the data is valid.
export function validateRegister({ name, email, phone, password }) {
  const errors = {};
  if (name.length < 2 || name.length > 50) errors.name = 'Name must be 2 to 50 characters.';
  if (!EMAIL_REGEX.test(email)) errors.email = 'Enter a valid email address.';
  if (!PHONE_REGEX.test(phone)) errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    errors.password = `Password must be ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`;
  }
  return errors;
}
