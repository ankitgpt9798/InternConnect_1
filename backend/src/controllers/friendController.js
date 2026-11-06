import mongoose from 'mongoose';
import FriendRequest from '../models/FriendRequest.js';
import User from '../models/User.js';
import { toText } from '../utils/validators.js';

const SEARCH_LIMIT = 20;
const SEARCH_MAX = 50;

const includes = (ids, id) => ids.some((item) => item.equals(id));
const person = (user) => ({ id: user._id, name: user.name });
// Lets a search for "c++" or "a.b" match those characters literally instead of as a regular expression.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const studentNotFound = (res) => res.status(404).json({ message: 'Student not found.' });
const requestNotFound = (res) => res.status(404).json({ message: 'Friend request not found.' });

// GET /api/users/search?q=asha - students by name, with how each one relates to the logged-in user
export async function searchUsers(req, res) {
  const me = req.user;
  const query = toText(req.query.q).slice(0, SEARCH_MAX);

  const filter = { _id: { $ne: me._id } };
  if (query) filter.name = { $regex: escapeRegex(query), $options: 'i' };
  // Without a search text, the newest students are shown.
  const students = await User.find(filter).sort({ createdAt: -1 }).limit(SEARCH_LIMIT).select('name');

  const ids = students.map((student) => student._id);
  const [sent, received] = await Promise.all([
    FriendRequest.find({ from: me._id, to: { $in: ids } }),
    FriendRequest.find({ to: me._id, from: { $in: ids } }),
  ]);

  const results = students.map((student) => {
    const sentRequest = sent.find((request) => request.to.equals(student._id));
    const receivedRequest = received.find((request) => request.from.equals(student._id));
    let status = 'none';
    if (includes(me.friends, student._id)) status = 'friend';
    else if (sentRequest) status = 'request_sent';
    else if (receivedRequest) status = 'request_received';
    return { ...person(student), status, requestId: (sentRequest ?? receivedRequest)?._id ?? null };
  });

  res.json({ results });
}

// GET /api/friends - friends, requests received and requests sent
export async function getFriends(req, res) {
  const me = req.user;
  const [user, received, sent] = await Promise.all([
    User.findById(me._id).populate('friends', 'name'),
    FriendRequest.find({ to: me._id }).sort({ createdAt: -1 }).populate('from', 'name'),
    FriendRequest.find({ from: me._id }).sort({ createdAt: -1 }).populate('to', 'name'),
  ]);

  res.json({
    friends: user.friends.map(person).sort((a, b) => a.name.localeCompare(b.name)),
    received: received.map((request) => ({ id: request._id, user: person(request.from), createdAt: request.createdAt })),
    sent: sent.map((request) => ({ id: request._id, user: person(request.to), createdAt: request.createdAt })),
  });
}

// POST /api/friends/requests  { userId }
export async function sendRequest(req, res) {
  const me = req.user;
  const userId = toText(req.body?.userId);

  if (!mongoose.isValidObjectId(userId)) return studentNotFound(res);
  if (me._id.equals(userId)) {
    return res.status(400).json({ message: 'You cannot send a friend request to yourself.' });
  }
  const other = await User.findById(userId);
  if (!other) return studentNotFound(res);
  if (includes(me.friends, other._id)) {
    return res.status(409).json({ message: `You and ${other.name} are already friends.` });
  }
  if (await FriendRequest.exists({ from: other._id, to: me._id })) {
    return res.status(409).json({ message: `${other.name} has already sent you a request. Accept it instead.` });
  }

  try {
    const request = await FriendRequest.create({ from: me._id, to: other._id });
    res.status(201).json({ message: `Friend request sent to ${other.name}.`, request: { id: request._id, user: person(other) } });
  } catch (error) {
    // The unique index refuses a second request to the same student.
    if (error.code === 11000) {
      return res.status(409).json({ message: `You have already sent a request to ${other.name}.` });
    }
    throw error;
  }
}

// POST /api/friends/requests/:id/accept - only the student who received the request
export async function acceptRequest(req, res) {
  const me = req.user;
  if (!mongoose.isValidObjectId(req.params.id)) return requestNotFound(res);

  // Deleting first means a request can only be accepted once.
  const request = await FriendRequest.findOneAndDelete({ _id: req.params.id, to: me._id });
  if (!request) return requestNotFound(res);

  await Promise.all([
    User.updateOne({ _id: me._id }, { $addToSet: { friends: request.from } }),
    User.updateOne({ _id: request.from }, { $addToSet: { friends: me._id } }),
  ]);
  const friend = await User.findById(request.from).select('name');
  res.json({ message: `You and ${friend.name} are now friends.`, friend: person(friend) });
}

// DELETE /api/friends/requests/:id - the receiver declines it, or the sender cancels it
export async function deleteRequest(req, res) {
  const me = req.user;
  if (!mongoose.isValidObjectId(req.params.id)) return requestNotFound(res);

  const request = await FriendRequest.findOneAndDelete({
    _id: req.params.id,
    $or: [{ from: me._id }, { to: me._id }],
  });
  if (!request) return requestNotFound(res);
  res.json({ message: 'Friend request removed.' });
}

// DELETE /api/friends/:userId - removes the friendship for both students
export async function removeFriend(req, res) {
  const me = req.user;
  const { userId } = req.params;
  if (!mongoose.isValidObjectId(userId) || !includes(me.friends, userId)) {
    return res.status(404).json({ message: 'This student is not in your friends list.' });
  }

  await Promise.all([
    User.updateOne({ _id: me._id }, { $pull: { friends: userId } }),
    User.updateOne({ _id: userId }, { $pull: { friends: me._id } }),
  ]);
  res.json({ message: 'Friend removed.' });
}
