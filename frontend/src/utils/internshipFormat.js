// Filter choices and display helpers for the Internships page. The labels come from the translation files
// (internships.*), so they follow the language the student picked.

// The same lists as the backend (models/Internship.js).
export const CATEGORIES = [
  'software_development',
  'web_development',
  'data_science',
  'design',
  'marketing',
  'content_writing',
  'finance',
  'human_resources',
];
export const WORK_MODES = ['remote', 'office', 'hybrid'];
export const ENGAGEMENTS = ['full_time', 'part_time'];
export const SORTS = ['deadline', 'newest', 'stipend']; // "deadline" (closing soon) is the default
export const STIPEND_STEPS = [2000, 5000, 10000, 15000, 20000];
export const DURATION_STEPS = [1, 2, 3, 4, 6];

// The filters as they appear in the page address (?category=design&city=Pune) and in the API request.
export const FILTER_KEYS = ['search', 'category', 'workMode', 'engagement', 'city', 'minStipend', 'maxDuration', 'sort'];
// The ones set in the Filters card, counted as "in use" (the search words and the sort order are not counted).
export const PANEL_FILTERS = ['category', 'workMode', 'engagement', 'city', 'minStipend', 'maxDuration'];

// Values the server would ignore are left out too, so the page never shows a filter that is not applied.
const isWholeNumber = (value) => /^[1-9]\d{0,6}$/.test(value);
const VALID = {
  search: () => true,
  category: (value) => CATEGORIES.includes(value),
  workMode: (value) => WORK_MODES.includes(value),
  engagement: (value) => ENGAGEMENTS.includes(value),
  city: () => true,
  minStipend: isWholeNumber,
  maxDuration: (value) => isWholeNumber(value) && Number(value) <= 24,
  sort: (value) => SORTS.includes(value),
};

export function filtersFromParams(searchParams) {
  return Object.fromEntries(
    FILTER_KEYS.map((key) => [key, searchParams.get(key)?.trim().slice(0, 50)]).filter(([key, value]) => value && VALID[key](value)),
  );
}

// English uses Indian conventions (₹1,00,000 and "9 Nov 2026"); other languages use their own format.
const localeFor = (language) => (!language || language.startsWith('en') ? 'en-IN' : language);

export const formatRupeesIn = (amount, language) =>
  new Intl.NumberFormat(localeFor(language), { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

// "₹15,000 – ₹20,000 /month", "₹10,000 /month" or "Unpaid".
export function formatStipendText({ min, max }, t, language) {
  if (max === 0) return t('internships.unpaid');
  if (min === max) return t('internships.stipendFixed', { amount: formatRupeesIn(max, language) });
  return t('internships.stipendRange', { min: formatRupeesIn(min, language), max: formatRupeesIn(max, language) });
}

// "20 Nov 2026" as the calendar day in India.
export const formatDateIn = (date, language) =>
  new Intl.DateTimeFormat(localeFor(language), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(date));

// "Work from home", "Bengaluru (hybrid)" or "Pune".
export function formatLocationText({ workMode, location }, t) {
  if (workMode === 'remote') return t('internships.workModes.remote');
  return workMode === 'hybrid' ? t('internships.hybridIn', { cities: location }) : location;
}
