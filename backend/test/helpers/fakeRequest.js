// A minimal stand-in for an Express request: headers (case-insensitive) and the client IP.
export function fakeRequest({ userAgent = '', headers = {}, ip = '203.0.113.10' } = {}) {
  const all = { 'user-agent': userAgent, ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])) };
  return { ip, get: (name) => all[name.toLowerCase()] };
}
