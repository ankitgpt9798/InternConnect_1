import User from '../models/User.js';
import { startOfIstDay } from '../utils/istTime.js';
import { maskEmail, maskPhone } from '../utils/mask.js';
import { createOtp, deleteOtp, OTP_MINUTES, OTP_RESEND_SECONDS, secondsUntilResend } from '../utils/otp.js';
import { sendEmail } from '../utils/sendEmail.js';
import { sendSms } from '../utils/sendSms.js';
import { EMAIL_REGEX, PHONE_REGEX, toText } from '../utils/validators.js';

const PURPOSE = 'password_reset';
export const DAILY_LIMIT_MESSAGE = 'You can use this option only once per day.';

// "Forgot password" may set a new password once per calendar day (IST).
const resetToday = (user) => user.lastPasswordResetAt && user.lastPasswordResetAt >= startOfIstDay();

// Reads { identifier } (email or 10-digit mobile number) and finds the account.
// Sends the error response itself and returns null when the identifier is invalid or unknown.
async function findAccount(req, res) {
  const identifier = toText(req.body?.identifier).toLowerCase();
  const byEmail = identifier.includes('@');

  if (byEmail ? !EMAIL_REGEX.test(identifier) : !PHONE_REGEX.test(identifier)) {
    res.status(400).json({ message: 'Enter a valid email address or 10-digit mobile number.' });
    return null;
  }
  const user = await User.findOne(byEmail ? { email: identifier } : { phone: identifier });
  if (!user) {
    res.status(404).json({ message: 'No account found with this email or mobile number.' });
    return null;
  }
  return { user, byEmail };
}

// POST /api/auth/forgot-password  { identifier }
// Sends a 6-digit code to the email or mobile number the student typed.
export async function forgotPassword(req, res) {
  const account = await findAccount(req, res);
  if (!account) return;
  const { user, byEmail } = account;

  if (resetToday(user)) return res.status(429).json({ message: DAILY_LIMIT_MESSAGE });

  const wait = await secondsUntilResend(user._id, PURPOSE);
  if (wait > 0) {
    return res.status(429).json({ message: `Please wait ${wait} seconds before asking for a new code.`, retryAfterSeconds: wait });
  }

  const code = await createOtp(user._id, PURPOSE);
  const text = `Your InternConnect password reset code is ${code}. It expires in ${OTP_MINUTES} minutes. If you did not ask for it, you can ignore this message.`;
  try {
    if (byEmail) await sendEmail({ to: user.email, subject: 'Your InternConnect password reset code', text });
    else await sendSms({ to: user.phone, text });
  } catch (error) {
    console.error('The reset code could not be sent:', error.message);
    await deleteOtp(user._id, PURPOSE); // a code nobody received must not count for the 60-second wait
    return res.status(502).json({ message: 'The code could not be sent. Please try again.' });
  }

  const destination = byEmail ? maskEmail(user.email) : maskPhone(user.phone);
  res.json({
    message: `We sent a 6-digit code to ${destination}.`,
    channel: byEmail ? 'email' : 'phone',
    destination,
    expiresInMinutes: OTP_MINUTES,
    resendAfterSeconds: OTP_RESEND_SECONDS,
  });
}
