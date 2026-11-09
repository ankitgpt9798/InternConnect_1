// "::ffff:203.0.113.5" (an IPv4 address written in IPv6 form) -> "203.0.113.5"
export function normalizeIp(ip) {
  if (typeof ip !== 'string') return '';
  const trimmed = ip.trim();
  return trimmed.toLowerCase().startsWith('::ffff:') && trimmed.includes('.') ? trimmed.slice(7) : trimmed;
}

// Addresses that never appear on the public internet: this computer, home and office networks, carrier-grade NAT.
// They cannot be placed on a map, so their location is shown as "Local network".
export function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip.includes(':')) {
    const lower = ip.toLowerCase();
    return lower === '::1' || lower === '::' || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower);
  }
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

// TRUST_PROXY in backend/.env -> Express's "trust proxy" setting, which decides whose X-Forwarded-For header is
// believed. The default, "loopback", trusts only a proxy on this computer (the Vite dev server). In production set
// the number of proxies in front of the API, e.g. 1. "true" would let anyone fake their address, so it is refused.
export function parseTrustProxy(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text === 'true') return 'loopback';
  if (text === 'false') return false;
  if (/^\d+$/.test(text)) return Number(text);
  return text; // a list such as "loopback, 10.0.0.0/8"
}
