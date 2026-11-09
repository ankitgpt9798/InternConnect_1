// What the API sends back about the logged-in user. The password hash is never included.
export const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  preferredLanguage: user.preferredLanguage || 'en',
  createdAt: user.createdAt,
});
