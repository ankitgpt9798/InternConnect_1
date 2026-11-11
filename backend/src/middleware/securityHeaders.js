// Basic security headers on every response. There is no strict Content-Security-Policy for scripts and images, so the
// Razorpay checkout and Cloudinary media keep working; only framing of InternConnect by other sites is blocked.
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff'); // browsers must not guess a different file type
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY'); // no other site may show InternConnect inside a frame
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  // Production is served over HTTPS only (Render); browsers remember to never use plain HTTP for this site.
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=15552000');
  next();
}
