import { OTP_MINUTES } from './otp.js';
import { formatIst } from './istTime.js';
import { sendEmail } from './sendEmail.js';

// Module 6 emails: the sign-in code and the "new sign-in" alert. They say which browser, approximate place, IP
// address and time the sign-in came from, so the student can tell if it was not them. No links or tokens.

const DEVICE_WORDS = { desktop: 'computer', mobile: 'phone', tablet: 'tablet', unknown: 'unknown device' };

const REASON_TEXT = {
  chrome: 'Sign-ins from Google Chrome always need a code.',
  new_device: 'This browser has not been verified on your account yet.',
  untrusted_device: 'This browser has not been verified on your account recently.',
  device_mismatch: 'This browser does not match the one that was verified before.',
  new_country: 'This sign-in comes from a country you have not signed in from before.',
  recent_failures: 'There were several failed sign-in attempts on your account recently.',
  new_account: 'Confirm your email address to finish creating your account.',
};

const major = (version) => (version ? ` ${String(version).split('.')[0]}` : '');

export function describeDevice(client) {
  const os = `${client.os.name}${client.os.version && client.os.name !== 'macOS' ? ` ${client.os.version}` : ''}`;
  const model = client.model ? `, ${client.model}` : '';
  return `${client.browser.name}${major(client.browser.version)} on ${os} (${DEVICE_WORDS[client.deviceClass] ?? 'device'}${model})`;
}

export function describeLocation(location) {
  if (location?.kind === 'approximate') {
    const place = [location.city, location.region, location.country].filter(Boolean).join(', ');
    return `${place || 'Unknown'} (approximate)`;
  }
  return location?.kind === 'local' ? 'Local network' : 'Unknown';
}

const details = (client, location, at) =>
  [
    `Browser: ${describeDevice(client)}`,
    `Approximate location: ${describeLocation(location)}`,
    `IP address: ${client.ip || 'unknown'}`,
    `Time: ${formatIst(at)} IST`,
  ].join('\n');

export function sendSignInCodeEmail({ user, code, purpose, reasons, client, location, at }) {
  const isRegistration = purpose === 'register';
  const why = reasons.map((reason) => REASON_TEXT[reason]).filter(Boolean).join(' ');
  const text = [
    `Your InternConnect ${isRegistration ? 'verification' : 'sign-in'} code is ${code}. It expires in ${OTP_MINUTES} minutes.`,
    why && `Why we asked: ${why}`,
    `${isRegistration ? 'Registration' : 'Sign-in'} details\n${details(client, location, at)}`,
    "If this wasn't you, do not share this code with anyone and reset your password from the login page.",
  ]
    .filter(Boolean)
    .join('\n\n');
  return sendEmail({
    to: user.email,
    subject: isRegistration ? 'Confirm your InternConnect account' : 'Your InternConnect sign-in code',
    text,
  });
}

export function sendNewIpAlertEmail({ user, client, location, at }) {
  const text = [
    'Your InternConnect account was just signed in from a new IP address, on a browser you verified before.',
    `Sign-in details\n${details(client, location, at)}`,
    "If this was you, you don't need to do anything. If it wasn't, reset your password from the login page; that signs out every device.",
  ].join('\n\n');
  return sendEmail({ to: user.email, subject: 'New sign-in to your InternConnect account', text });
}
