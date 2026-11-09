import Bowser from 'bowser';
import { normalizeIp } from './ip.js';

// Module 6: what the server can tell about the browser and device behind a request.
//
// The browser reports all of this itself (User-Agent and Client Hints headers, plus optional details the login page
// sends), so a determined user can fake it. The rules therefore only ever let a signal ADD a restriction: a request
// counts as Google Chrome if any signal says Chrome, and as a phone or tablet if any signal says so.

export const DEVICE_CLASSES = ['desktop', 'mobile', 'tablet', 'unknown'];
const USER_AGENT_MAX = 512;
const DESKTOP_SYSTEMS = new Set(['Windows', 'macOS', 'Linux', 'Chrome OS']);
const BROWSER_NAMES = { 'Samsung Internet for Android': 'Samsung Internet' };

function parseUserAgent(userAgent) {
  if (!userAgent) return null;
  try {
    return Bowser.parse(userAgent);
  } catch {
    return null; // Bowser refuses empty or unreadable strings
  }
}

function browserOf(parsed, userAgent) {
  if (!parsed?.browser?.name) return { name: 'Unknown', version: '' };
  const version = parsed.browser.version || '';
  // Apps that show web pages inside themselves (Android WebView) also say "Chrome", but they are not Google Chrome.
  if (/;\s*wv\)/.test(userAgent)) return { name: 'Android WebView', version };
  return { name: BROWSER_NAMES[parsed.browser.name] ?? parsed.browser.name, version };
}

function deviceClassOf(parsed) {
  if (!parsed) return 'unknown';
  const type = parsed.platform?.type;
  if (type === 'mobile' || type === 'tablet' || type === 'desktop') return type;
  return DESKTOP_SYSTEMS.has(parsed.os?.name) ? 'desktop' : 'unknown';
}

// Sessions and trusted devices are tied to these three values. They come from the User-Agent, which the browser
// sends with every request, and they change only when another browser, system or kind of device is used (a browser
// update changes the version, not these).
export function bindingFromUserAgent(userAgentHeader) {
  const userAgent = String(userAgentHeader || '').slice(0, USER_AGENT_MAX);
  const parsed = parseUserAgent(userAgent);
  return { browserName: browserOf(parsed, userAgent).name, osName: parsed?.os?.name || 'Unknown', deviceClass: deviceClassOf(parsed) };
}

export const sameBinding = (a, b) =>
  Boolean(a && b) && a.browserName === b.browserName && a.osName === b.osName && a.deviceClass === b.deviceClass;

// Sec-CH-UA: '"Google Chrome";v="131", "Chromium";v="131"' -> ['Google Chrome', 'Chromium']
export function parseBrandHeader(value) {
  if (typeof value !== 'string') return [];
  return [...value.matchAll(/"([^"]{1,60})"\s*;\s*v="[^"]{0,40}"/g)].map((match) => match[1]);
}

const cleanText = (value, max) =>
  typeof value === 'string' ? value.replace(/[^\p{L}\p{N} ._()+/-]/gu, '').trim().slice(0, max) : '';

// Optional details the login page reads with navigator.userAgentData (Chromium browsers only). Only known fields
// of the right type and length are kept.
export function sanitizeClientHints(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const hints = {};
  const model = cleanText(raw.model, 60);
  if (model) hints.model = model;
  if (typeof raw.platformVersion === 'string' && /^\d{1,3}(\.\d{1,5}){0,3}$/.test(raw.platformVersion)) {
    hints.platformVersion = raw.platformVersion;
  }
  if (raw.mobile === true) hints.mobile = true;
  if (raw.touchMac === true) hints.touchMac = true; // an iPad showing the desktop version of sites
  if (Array.isArray(raw.brands)) {
    hints.brands = raw.brands.slice(0, 10).map((brand) => cleanText(typeof brand === 'string' ? brand : brand?.brand, 60)).filter(Boolean);
  }
  return hints;
}

function osVersionOf(parsed, hints) {
  const version = parsed?.os?.version || '';
  if (parsed?.os?.name !== 'Windows') return version;
  // Every Windows 10 and 11 browser says "Windows NT 10.0"; Chromium's platform version tells them apart.
  if (version === 'NT 10.0') return Number(hints.platformVersion?.split('.')[0]) >= 13 ? '11' : '10';
  return version.replace(/^NT\s*/, '');
}

// Android puts the phone model in the User-Agent unless the browser hides it (Chrome sends "K" instead).
function androidModelOf(userAgent) {
  const match = userAgent.match(/Android [\d.]+; ([^;)]+?)(?: Build\/[^;)]*)?[;)]/);
  const model = match?.[1]?.trim();
  return model && model !== 'K' && model !== 'Mobile' && model !== 'Tablet' ? model.slice(0, 60) : '';
}

// Everything recorded about the browser and device of a request.
export function getClientInfo(req, hints = {}) {
  const userAgent = String(req.get('user-agent') || '').slice(0, USER_AGENT_MAX);
  const parsed = parseUserAgent(userAgent);
  const browser = browserOf(parsed, userAgent);
  const os = { name: parsed?.os?.name || 'Unknown', version: osVersionOf(parsed, hints) };
  const brands = [...parseBrandHeader(req.get('sec-ch-ua')), ...(hints.brands ?? [])];

  const binding = { browserName: browser.name, osName: os.name, deviceClass: deviceClassOf(parsed) };
  let deviceClass = binding.deviceClass;
  if (hints.touchMac && os.name === 'macOS') deviceClass = 'tablet';
  if ((req.get('sec-ch-ua-mobile') === '?1' || hints.mobile) && deviceClass !== 'tablet') deviceClass = 'mobile';

  return {
    userAgent,
    browser,
    os,
    deviceClass,
    model: hints.model || parsed?.platform?.model || androidModelOf(userAgent) || '',
    isChrome: browser.name === 'Chrome' || brands.includes('Google Chrome'),
    ip: normalizeIp(req.ip),
    binding,
  };
}
