import { Info, Search, SearchX } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigationType, useSearchParams } from 'react-router';
import { searchInternships } from '../api/internships.js';
import ActiveFilters from '../components/internships/ActiveFilters.jsx';
import InternshipCard from '../components/internships/InternshipCard.jsx';
import InternshipFilters from '../components/internships/InternshipFilters.jsx';
import Alert from '../components/ui/Alert.jsx';
import { buttonClasses } from '../components/ui/buttonStyles.js';
import { getErrorMessage } from '../utils/getErrorMessage.js';
import { FILTER_KEYS, filtersFromParams, PANEL_FILTERS, SORTS } from '../utils/internshipFormat.js';

const SEARCH_DELAY_MS = 300;

// Browse open internships. The search words, filters and sort order live in the page address
// (?search=react&category=web_development&sort=stipend), so a refresh, the back button and shared links keep them.
export default function InternshipsPage() {
  const { t } = useTranslation();
  const searchId = useId();
  const sortId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigationType = useNavigationType();
  const filters = filtersFromParams(searchParams);
  const queryKey = new URLSearchParams(filters).toString();
  const urlSearch = filters.search ?? '';
  // The search box text, and the ?search= it was last in step with.
  const [search, setSearch] = useState({ text: urlSearch, base: urlSearch });
  const [result, setResult] = useState({ key: null, internships: [], error: null });
  const [cities, setCities] = useState([]);
  const loaded = result.key === queryKey;
  // Address changes made by this page carry this flag; the back button (POP) and outside links do not.
  const ownChange = navigationType !== 'POP' && Boolean(location.state?.internshipFilters);

  // ?search= changed. After our own search the box keeps the text as typed; after the back button or a link from
  // another page it shows the address's words.
  if (search.base !== urlSearch) {
    setSearch({ text: ownChange ? search.text : urlSearch, base: urlSearch });
  }

  useEffect(() => {
    let current = true;
    searchInternships(Object.fromEntries(new URLSearchParams(queryKey)))
      .then((data) => {
        if (!current) return;
        setResult({ key: queryKey, internships: data.internships, error: null });
        setCities(data.cities);
      })
      .catch((error) => current && setResult({ key: queryKey, internships: [], error }));
    return () => {
      current = false;
    };
  }, [queryKey]);

  // React Router can render an address change a moment later, so every change starts from this ref, which holds the
  // newest filters at once: a filter picked just as the delayed search is sent keeps the search words (and the other
  // way round).
  const latestParams = useRef(searchParams);
  useEffect(() => {
    if (!ownChange) latestParams.current = new URLSearchParams(location.search);
  }, [location, ownChange]);

  const update = useCallback(
    (changes, { replace = false } = {}) => {
      const next = new URLSearchParams(latestParams.current);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      latestParams.current = next;
      setSearchParams(next, { replace, state: { internshipFilters: true } });
    },
    [setSearchParams],
  );

  // Search once the student stops typing for a moment; typing does not add browser history entries.
  useEffect(() => {
    const words = search.text.trim();
    if (words === urlSearch) return undefined;
    const timer = setTimeout(() => update({ search: words }, { replace: true }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search.text, urlSearch, update]);

  // Everything except the sort order.
  function clearAll() {
    setSearch((previous) => ({ ...previous, text: '' }));
    update(Object.fromEntries(FILTER_KEYS.filter((key) => key !== 'sort').map((key) => [key, ''])));
  }

  const hasFilters = Boolean(filters.search) || PANEL_FILTERS.some((key) => filters[key]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('internships.title')}</h1>
          <p className="mt-1 text-slate-600">{t('internships.subtitle')}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <Info className="size-3.5 shrink-0" aria-hidden="true" />
            {t('internships.sampleNotice')}
          </p>
        </div>
        <Link to="/applications" className="text-sm font-semibold text-brand-700 hover:underline">
          {t('nav.applications')} →
        </Link>
      </div>

      <div role="search" className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-card">
        <label htmlFor={searchId} className="sr-only">
          {t('internships.searchLabel')}
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            value={search.text}
            onChange={(event) => setSearch({ ...search, text: event.target.value })}
            placeholder={t('internships.searchPlaceholder')}
            maxLength={50}
            className="block w-full rounded-xl border-0 bg-transparent py-3 pr-4 pl-12 text-base text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-200 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <InternshipFilters filters={filters} cities={cities} onChange={(key, value) => update({ [key]: value })} onClear={clearAll} />
        </aside>

        <section aria-label={t('internships.results')} className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600" aria-live="polite">
              {loaded && !result.error && result.internships.length > 0 && t('internships.showing', { count: result.internships.length })}
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor={sortId} className="text-sm text-slate-600">
                {t('internships.sort.label')}
              </label>
              <select
                id={sortId}
                value={filters.sort ?? 'deadline'}
                onChange={(event) => update({ sort: event.target.value === 'deadline' ? '' : event.target.value })}
                className="rounded-lg border border-slate-300 bg-white py-1.5 pr-8 pl-3 text-sm font-medium text-slate-900 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
              >
                {SORTS.map((sort) => (
                  <option key={sort} value={sort}>
                    {t(`internships.sort.${sort}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ActiveFilters filters={filters} onRemove={(key) => update({ [key]: '' })} onClear={clearAll} />

          {!loaded && (
            <div className="space-y-4" aria-busy="true">
              <span className="sr-only">{t('common.loading')}</span>
              {[0, 1, 2].map((index) => (
                <div key={index} className="animate-pulse rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
                  <div className="flex gap-4">
                    <div className="size-12 rounded-xl bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-56 max-w-full rounded bg-slate-200" />
                      <div className="h-3.5 w-36 rounded bg-slate-200" />
                      <div className="h-3 w-48 rounded bg-slate-100" />
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {[0, 1, 2].map((cell) => (
                      <div key={cell} className="h-8 rounded bg-slate-100" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {loaded && result.error && (
            <Alert>
              <p>{t('internships.error')}</p>
              <p className="mt-1">{getErrorMessage(result.error)}</p>
            </Alert>
          )}

          {loaded && !result.error && result.internships.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <SearchX className="mx-auto size-10 text-slate-400" aria-hidden="true" />
              <h2 className="mt-3 font-semibold text-slate-900">{t('internships.emptyTitle')}</h2>
              <p className="mt-1 text-sm text-slate-600">{t('internships.empty')}</p>
              {hasFilters && (
                <button type="button" onClick={clearAll} className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'mt-4' })}>
                  {t('internships.filters.clear')}
                </button>
              )}
            </div>
          )}

          {loaded && result.internships.length > 0 && (
            <ul className="space-y-4">
              {result.internships.map((internship) => (
                <li key={internship.id}>
                  <InternshipCard internship={internship} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
