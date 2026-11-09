// The same rules as the backend (backend/src/utils/validators.js). They run in the browser first for
// instant feedback; the server always checks again. They return translation keys (shown with t()).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

export function validateRegister({ name, email, phone, password }) {
  const errors = {};
  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 50) errors.name = 'authPages.validation.nameLength';
  if (!EMAIL_REGEX.test(email.trim())) errors.email = 'authPages.validation.emailInvalid';
  if (!PHONE_REGEX.test(phone.trim())) errors.phone = 'authPages.validation.phoneInvalid';
  if (password.length < 8 || password.length > 64) errors.password = 'authPages.validation.passwordLength';
  return errors;
}

export function validateLogin({ identifier, password }) {
  const errors = {};
  if (!identifier.trim()) errors.identifier = 'authPages.validation.identifierRequired';
  if (!password) errors.password = 'authPages.validation.passwordRequired';
  return errors;
}
