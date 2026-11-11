import mongoose from 'mongoose';

// Module 6: counters for the sign-in limits, updated atomically so parallel requests cannot slip past them.
//   acct_ip:<user>:<ip>   failed passwords for one account from one IP address (progressive cooldown)
//   ip:<ip>               failed sign-ins from one IP address, any account (progressive cooldown)
//   otp:<user>            email codes sent to one account (6 per rolling hour)
//   otp_start:<user>:<k>  new sign-in codes from one browser (1 per minute, so a double-click sends one email)
//   alert:<user>:<ip>     "new sign-in" alert emails (1 per IP address per day)
// Every entry has its own random id, so removing one never removes another made in the same millisecond.
const entry = { _id: false, id: String, at: Date };

const authThrottleSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  hits: [entry], // failures (login limits) or uses (quotas) in the window
  pending: [entry], // password checks still running
  blockedUntil: { type: Date, default: null },
  expiresAt: { type: Date, required: true },
});

authThrottleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AuthThrottle = mongoose.model('AuthThrottle', authThrottleSchema);

export default AuthThrottle;
