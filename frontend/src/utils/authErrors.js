import { formatIstTime, waitText } from './securityFormat.js';

// Module 6: the API's error codes as messages in the student's language (login, registration, security panels).
export function authErrorMessage(error, t, language) {
  if (!error?.response) return t('authPages.errors.network');
  const data = error.response.data ?? {};
  const wait = waitText(data.retryAfterSeconds, t);

  switch (data.code) {
    case 'VALIDATION':
      return error.response.config?.url?.includes('/register') ? t('authPages.errors.fixFields') : t('authPages.errors.missingFields');
    case 'INVALID_CREDENTIALS':
      return t('authPages.errors.invalidCredentials');
    case 'MOBILE_LOGIN_WINDOW':
      return t('authPages.errors.mobileWindow', { time: data.opensAt ? formatIstTime(data.opensAt, language) : '10:00' });
    case 'LOGIN_COOLDOWN':
      return t('authPages.errors.cooldown', { wait });
    case 'LOGIN_BUSY':
      return t('authPages.errors.busy');
    case 'OTP_HOURLY_LIMIT':
      return t('authPages.errors.hourlyLimit', { wait });
    case 'OTP_RESEND_COOLDOWN':
      return t('authPages.errors.resendCooldown', { wait });
    case 'OTP_RESEND_LIMIT':
      return t('authPages.errors.resendLimit');
    case 'OTP_DELIVERY_FAILED':
      return data.accountCreated ? t('authPages.errors.deliveryFailedAccountCreated') : t('authPages.errors.deliveryFailed');
    case 'OTP_FORMAT':
      return t('authPages.errors.otpFormat');
    case 'OTP_INVALID':
      return t('authPages.errors.otpInvalid', { count: data.attemptsLeft });
    case 'OTP_EXPIRED':
      return t('authPages.errors.otpExpired');
    case 'OTP_LOCKED':
      return t('authPages.errors.otpLocked');
    case 'CHALLENGE_EXPIRED':
    case 'NO_CHALLENGE':
      return t('authPages.errors.challengeEnded');
    case 'ACCOUNT_EXISTS':
      return t('authPages.errors.accountExists');
    case 'PASSWORD_REQUIRED':
      return t('authPages.errors.passwordRequired');
    case 'PASSWORD_INCORRECT':
      return t('authPages.errors.passwordIncorrect');
    case 'SESSION_NOT_FOUND':
    case 'DEVICE_NOT_FOUND':
      return t('authPages.errors.notFound');
    default:
      return data.message || t('authPages.errors.generic');
  }
}

// Codes after which the email-code step cannot continue: the student starts again from the password.
export const ENDS_CODE_STEP = new Set(['OTP_LOCKED', 'CHALLENGE_EXPIRED', 'NO_CHALLENGE', 'MOBILE_LOGIN_WINDOW', 'OTP_RESEND_LIMIT']);

// Field errors from the registration API, translated through their codes (e.g. EMAIL_TAKEN).
export function fieldErrorsFrom(error, t) {
  const data = error?.response?.data ?? {};
  const codes = data.errorCodes ?? {};
  return Object.fromEntries(Object.entries(data.errors ?? {}).map(([field, message]) => [field, codes[field] ? t(`authPages.fieldErrors.${codes[field]}`) : message]));
}
