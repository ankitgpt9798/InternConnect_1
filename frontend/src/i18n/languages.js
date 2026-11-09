/**
 * The six interface languages, named in their own language. `htmlLang` goes on <html lang> so the browser
 * picks the right fonts (Devanagari, Simplified Chinese) and screen readers the right voice.
 * French is applied only after a code sent to the student's email is verified (`needsVerification`): it is
 * never chosen directly without verification.
 */
export const LANGUAGES = Object.freeze([
  { code: 'en', nativeName: 'English', htmlLang: 'en' },
  { code: 'es', nativeName: 'Español', htmlLang: 'es' },
  { code: 'hi', nativeName: 'हिन्दी', htmlLang: 'hi' },
  { code: 'pt', nativeName: 'Português', htmlLang: 'pt-BR' },
  { code: 'zh', nativeName: '中文（简体）', htmlLang: 'zh-CN' },
  { code: 'fr', nativeName: 'Français', htmlLang: 'fr', needsVerification: true },
]);

export const DEFAULT_LANGUAGE = 'en';
export const LANGUAGE_CODES = LANGUAGES.map((language) => language.code);

export const isSupportedLanguage = (code) => LANGUAGE_CODES.includes(code);

/** Languages a student can switch to straight away (all except French). */
export const canChooseDirectly = (code) =>
  LANGUAGES.some((language) => language.code === code && !language.needsVerification);

export const htmlLangOf = (code) =>
  LANGUAGES.find((language) => language.code === code)?.htmlLang ?? DEFAULT_LANGUAGE;

// Browser storage keeps the choice on this device
export const LANGUAGE_STORAGE_KEY = 'ic_language';

/** The language saved on this device. */
export function readStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function storeLanguage(code) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    // If local storage is disabled
  }
}
