// The same rules as the backend (backend/src/utils/validators.js). They run in the browser first for
// instant feedback; the server always checks again.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

export function validateRegister({ name, email, phone, password }) {
  const errors = {};
  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 50) errors.name = 'Name must be 2 to 50 characters.';
  if (!EMAIL_REGEX.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!PHONE_REGEX.test(phone.trim())) errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  if (password.length < 8 || password.length > 64) errors.password = 'Password must be 8 to 64 characters.';
  return errors;
}

export function validateLogin({ identifier, password }) {
  const errors = {};
  if (!identifier.trim()) errors.identifier = 'Enter your email or phone number.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
}
