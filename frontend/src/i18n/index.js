import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  canChooseDirectly,
  DEFAULT_LANGUAGE,
  htmlLangOf,
  LANGUAGE_CODES,
  readStoredLanguage,
  storeLanguage,
} from './languages.js';
import en from './locales/en.json';

// English is bundled by default. The other 5 languages are loaded dynamically on demand.
const loaders = import.meta.glob(['./locales/*.json', '!./locales/en.json'], { import: 'default' });

i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: LANGUAGE_CODES,
  initAsync: false,
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (code) => {
  document.documentElement.lang = htmlLangOf(code);
});

/** Loads a language bundle dynamically if not already loaded. */
export async function loadLanguage(code) {
  if (i18n.hasResourceBundle(code, 'translation')) return;
  const load = loaders[`./locales/${code}.json`];
  if (!load) throw new Error(`No translations available for "${code}"`);
  const bundle = await load();
  i18n.addResourceBundle(code, 'translation', bundle, true, true);
}

/**
 * Changes active language in i18next without page reload and stores selection in localStorage.
 */
export async function applyLanguage(code) {
  await loadLanguage(code);
  if (i18n.language !== code) {
    await i18n.changeLanguage(code);
  }
  storeLanguage(code);
}

/**
 * Reads initial language from localStorage or authenticated user preference.
 */
export async function startInStoredLanguage(profileLanguage) {
  const stored = readStoredLanguage();
  if (!stored || stored === DEFAULT_LANGUAGE) {
    if (profileLanguage && profileLanguage !== DEFAULT_LANGUAGE) {
      try {
        await applyLanguage(profileLanguage);
      } catch {
        // Fallback to default
      }
    }
    return;
  }
  try {
    if (canChooseDirectly(stored)) {
      await applyLanguage(stored);
    } else if (profileLanguage === stored) {
      await applyLanguage(stored);
    }
  } catch {
    // Start in default English on error
  }
}

export default i18n;
