import { htmlLangOf } from '../i18n/languages.js';

// Module 6 display helpers. Times are shown in India Standard Time, the time zone of the sign-in rules.
const format = (value, language, options) => new Intl.DateTimeFormat(htmlLangOf(language), { timeZone: 'Asia/Kolkata', ...options }).format(new Date(value));

export const formatIstTime = (value, language) => format(value, language, { hour: 'numeric', minute: '2-digit' });
export const formatIstDateTime = (value, language) => format(value, language, { dateStyle: 'medium', timeStyle: 'short' });
export const formatIstDate = (value, language) => format(value, language, { dateStyle: 'medium' });

// 45 -> "45 seconds", 130 -> "3 minutes" (translated)
export function waitText(seconds, t) {
  const value = Math.max(1, Math.ceil(Number(seconds) || 0));
  return value < 60 ? t('authPages.wait.seconds', { count: value }) : t('authPages.wait.minutes', { count: Math.ceil(value / 60) });
}

const major = (version) => (version ? String(version).split('.')[0] : '');

// "Chrome 131 on Windows 11"; brand names stay as they are, "Unknown" is translated.
export function deviceLabel({ browser, os }, t) {
  const unknown = t('accountSecurity.unknown');
  const browserName = !browser?.name || browser.name === 'Unknown' ? unknown : `${browser.name} ${major(browser.version)}`.trim();
  const osName = !os?.name || os.name === 'Unknown' ? unknown : `${os.name}${os.version && os.name !== 'macOS' && os.name !== 'Android' ? ` ${os.version}` : ''}`;
  return t('accountSecurity.deviceLabel', { browser: browserName, os: osName });
}

export function locationText(location, t) {
  if (location?.kind === 'approximate') {
    const place = [location.city, location.region, location.country].filter(Boolean).join(', ');
    if (place) return t('accountSecurity.location.approximate', { place });
  }
  return location?.kind === 'local' ? t('accountSecurity.location.local') : t('accountSecurity.location.unknown');
}
