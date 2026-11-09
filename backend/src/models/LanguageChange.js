import mongoose from 'mongoose';
import { SUPPORTED_LANGUAGES } from './User.js';

// Records an interface language change for audit history.
// Direct languages switch with verification='none'; French requires verification='email_otp'.
const languageChangeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    previousLanguage: { type: String, enum: SUPPORTED_LANGUAGES, required: true },
    selectedLanguage: { type: String, enum: SUPPORTED_LANGUAGES, required: true },
    verification: { type: String, enum: ['none', 'email_otp'], required: true },
    destination: { type: String, default: null }, // Masked email address for French OTP
    appliedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

languageChangeSchema.index({ user: 1, createdAt: -1 });

const LanguageChange = mongoose.model('LanguageChange', languageChangeSchema);

export default LanguageChange;
