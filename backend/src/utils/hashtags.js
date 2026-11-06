export const MAX_HASHTAGS = 10;

// "#internship" at the start of the caption or after a space. Letters of any language, digits and "_"
// (\p{M} keeps the vowel signs of Hindi and other scripts).
const HASHTAG = /(?:^|\s)#([\p{L}\p{M}\p{N}_]{1,50})/gu;
export const TAG_PATTERN = /^[\p{L}\p{M}\p{N}_]{1,50}$/u;

// The caption's hashtags in lowercase, without "#" and without repeats (at most 10).
export function extractHashtags(text) {
  const tags = [...text.matchAll(HASHTAG)].map((match) => match[1].toLowerCase());
  return [...new Set(tags)].slice(0, MAX_HASHTAGS);
}
