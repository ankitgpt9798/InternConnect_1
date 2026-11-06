import { maskPhone } from './mask.js';

// Mock SMS: no SMS provider is set up for this project, so the message is printed in the backend terminal
// instead of reaching a phone. Read the code from there when testing.
export async function sendSms({ to, text }) {
  console.log(`[Mock SMS to ${maskPhone(to)}] ${text}`);
}
