import { maskPhone } from './mask.js';

// No SMS provider is set up for this project. In local development a "mock SMS" prints the message (with its code) in
// the backend terminal instead of reaching a phone. In production that terminal is the server log, so SMS is turned
// off there until a real SMS provider is configured: nothing is printed, and password reset works by email only.
export const smsAvailable = (env = process.env) => env.NODE_ENV !== 'production';

export async function sendSms({ to, text }) {
  if (!smsAvailable()) throw new Error('SMS is not available in production (no SMS provider is configured).');
  console.log(`[Mock SMS to ${maskPhone(to)}] ${text}`);
}
