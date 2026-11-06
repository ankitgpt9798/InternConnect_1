import mongoose from 'mongoose';

// What a code is for. Later modules add their own purposes (login, French, resume).
export const OTP_PURPOSES = ['password_reset'];

// A one-time code sent by email or SMS. Only a hash of the code is stored, like a password.
const otpSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    purpose: { type: String, enum: OTP_PURPOSES, required: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 }, // wrong codes entered
    sentAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// One active code per student and purpose: a new code replaces the old one.
otpSchema.index({ user: 1, purpose: 1 }, { unique: true });
// MongoDB deletes expired codes by itself (it checks about once a minute, so the expiry is also checked in code).
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Otp = mongoose.model('Otp', otpSchema);

export default Otp;
