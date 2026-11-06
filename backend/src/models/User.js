import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    // Always stored in lowercase, so the unique index also makes duplicate checks case-insensitive.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // 10-digit Indian mobile number, e.g. 9876543210
    phone: { type: String, required: true, unique: true, trim: true },
    // bcrypt hash of the password. select: false leaves it out of every query
    // unless it is asked for with .select('+password').
    password: { type: String, required: true, select: false },
    // Accepted friends. Both students are added to each other's list.
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

// Hash the password whenever it is set or changed, so a plain password is never saved.
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
