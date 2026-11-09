import LanguageChange from '../models/LanguageChange.js';
import User, { DIRECT_LANGUAGES, SUPPORTED_LANGUAGES } from '../models/User.js';
import { maskEmail } from '../utils/mask.js';
import {
  createOtp,
  deleteOtp,
  OTP_MINUTES,
  OTP_RESEND_SECONDS,
  otpErrorMessage,
  secondsUntilResend,
  verifyOtp,
} from '../utils/otp.js';
import { sendEmail } from '../utils/sendEmail.js';

const OTP_PURPOSE = 'french_language';

const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  preferredLanguage: user.preferredLanguage || 'en',
  createdAt: user.createdAt,
});

// PUT /api/users/me/language  { language: 'en' | 'es' | 'hi' | 'pt' | 'zh' }
// Direct languages can be selected immediately. Selecting 'fr' directly is rejected with 403.
export async function updateLanguage(req, res) {
  const language = typeof req.body?.language === 'string' ? req.body.language.trim().toLowerCase() : '';

  if (!language || !SUPPORTED_LANGUAGES.includes(language)) {
    return res.status(400).json({
      message: `Invalid language. Supported languages are: ${SUPPORTED_LANGUAGES.join(', ')}.`,
    });
  }

  if (language === 'fr') {
    return res.status(403).json({
      message: 'Email OTP verification is required to switch to French.',
      requiresVerification: true,
    });
  }

  const previousLanguage = req.user.preferredLanguage || 'en';
  if (previousLanguage === language) {
    return res.json({
      message: 'Language unchanged.',
      user: userResponse(req.user),
    });
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { preferredLanguage: language },
    { returnDocument: 'after' },
  );

  await LanguageChange.create({
    user: req.user._id,
    previousLanguage,
    selectedLanguage: language,
    verification: 'none',
    appliedAt: new Date(),
  });

  res.json({
    message: 'Language updated successfully.',
    user: userResponse(updatedUser),
  });
}

// POST /api/users/me/language/french/otp - sends a 6-digit verification code to user's registered email
export async function sendFrenchOtp(req, res) {
  const wait = await secondsUntilResend(req.user._id, OTP_PURPOSE);
  if (wait > 0) {
    return res.status(429).json({
      message: `Please wait ${wait} seconds before requesting a new code.`,
      destination: maskEmail(req.user.email),
      retryAfterSeconds: wait,
    });
  }

  const code = await createOtp(req.user._id, OTP_PURPOSE);
  try {
    await sendEmail({
      to: req.user.email,
      subject: 'Your InternConnect French language verification code',
      text: `Your verification code to switch your InternConnect interface to French is ${code}. It expires in ${OTP_MINUTES} minutes. If you did not request this, you can ignore this email.`,
    });
  } catch (error) {
    console.error('The French language OTP could not be sent:', error.message);
    await deleteOtp(req.user._id, OTP_PURPOSE);
    return res.status(502).json({ message: 'The verification code could not be sent. Please try again.' });
  }

  const destination = maskEmail(req.user.email);
  res.json({
    message: `We sent a 6-digit verification code to ${destination}.`,
    destination,
    expiresInMinutes: OTP_MINUTES,
    resendAfterSeconds: OTP_RESEND_SECONDS,
  });
}

// POST /api/users/me/language/french/verify  { otp: '123456' }
export async function verifyFrenchOtp(req, res) {
  const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';
  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ message: 'Enter the 6-digit code.' });
  }

  const result = await verifyOtp(req.user._id, OTP_PURPOSE, otp);
  if (!result.ok) {
    return res.status(400).json({
      message: otpErrorMessage(result),
      attemptsLeft: result.attemptsLeft,
    });
  }

  const previousLanguage = req.user.preferredLanguage || 'en';
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { preferredLanguage: 'fr' },
    { returnDocument: 'after' },
  );

  await LanguageChange.create({
    user: req.user._id,
    previousLanguage,
    selectedLanguage: 'fr',
    verification: 'email_otp',
    destination: maskEmail(req.user.email),
    appliedAt: new Date(),
  });

  res.json({
    message: 'Language updated to French.',
    user: userResponse(updatedUser),
  });
}

// GET /api/users/me/language/history
export async function getLanguageHistory(req, res) {
  const history = await LanguageChange.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json({ history });
}
