import User from '../models/User.js';
import { clearAuthCookie, setAuthCookie } from '../utils/authCookie.js';
import { toText, validateRegister } from '../utils/validators.js';

// What the API sends back about a user. The password hash is never included.
const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  createdAt: user.createdAt,
});

const duplicateErrors = (fields) => {
  const errors = {};
  if (fields.includes('email')) errors.email = 'This email is already registered.';
  if (fields.includes('phone')) errors.phone = 'This phone number is already registered.';
  return errors;
};

// POST /api/auth/register
export async function register(req, res) {
  const body = req.body ?? {};
  const data = {
    name: toText(body.name),
    email: toText(body.email).toLowerCase(),
    phone: toText(body.phone),
    password: typeof body.password === 'string' ? body.password : '',
  };

  const errors = validateRegister(data);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
  }

  // Emails are stored in lowercase, so this check is case-insensitive.
  const existing = await User.find({ $or: [{ email: data.email }, { phone: data.phone }] });
  const taken = [];
  if (existing.some((user) => user.email === data.email)) taken.push('email');
  if (existing.some((user) => user.phone === data.phone)) taken.push('phone');
  if (taken.length > 0) {
    return res.status(409).json({ message: 'An account with these details already exists.', errors: duplicateErrors(taken) });
  }

  let user;
  try {
    user = await User.create(data); // the password is hashed by the model before saving
  } catch (error) {
    // Two sign-ups with the same details at the same moment: the unique index stops the second one.
    if (error.code === 11000) {
      const fields = Object.keys(error.keyPattern ?? {});
      return res.status(409).json({ message: 'An account with these details already exists.', errors: duplicateErrors(fields) });
    }
    throw error;
  }

  setAuthCookie(res, user._id);
  res.status(201).json({ user: userResponse(user) });
}

// POST /api/auth/login  { identifier: email or phone, password }
export async function login(req, res) {
  const body = req.body ?? {};
  const identifier = toText(body.identifier).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Enter your email or phone number and your password.' });
  }

  // An "@" means an email address; anything else is treated as a phone number.
  const query = identifier.includes('@') ? { email: identifier } : { phone: identifier };
  const user = await User.findOne(query).select('+password');

  // The same message for an unknown account and a wrong password, so it does not reveal which accounts exist.
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Incorrect email/phone or password.' });
  }

  setAuthCookie(res, user._id);
  res.json({ user: userResponse(user) });
}

// POST /api/auth/logout
export function logout(req, res) {
  clearAuthCookie(res);
  res.json({ message: 'Logged out.' });
}

// GET /api/auth/me (protected)
export function getMe(req, res) {
  res.json({ user: userResponse(req.user) });
}
