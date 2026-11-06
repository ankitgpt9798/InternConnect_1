import { randomInt } from 'node:crypto';

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const LETTERS = UPPER + LOWER;

// A new password made only of English upper- and lowercase letters (no numbers or special characters),
// as the assignment asks. crypto.randomInt is a secure random generator. At least one uppercase and one
// lowercase letter are placed at random positions.
export function generateLetterPassword(length = 12) {
  const chars = Array.from({ length }, () => LETTERS[randomInt(LETTERS.length)]);
  const upperAt = randomInt(length);
  let lowerAt = randomInt(length - 1);
  if (lowerAt >= upperAt) lowerAt += 1; // a different position from the uppercase one
  chars[upperAt] = UPPER[randomInt(UPPER.length)];
  chars[lowerAt] = LOWER[randomInt(LOWER.length)];
  return chars.join('');
}
