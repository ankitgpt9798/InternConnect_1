import { ArrowRight, Briefcase, CreditCard, FileText, Languages, Search, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { buttonClasses } from '../components/ui/buttonStyles.js';
import { useAuth } from '../context/AuthContext.jsx';
import { CATEGORIES } from '../utils/internshipFormat.js';

const FEATURES = [
  { key: 'internships', icon: Briefcase },
  { key: 'community', icon: Users },
  { key: 'resume', icon: FileText },
  { key: 'plans', icon: CreditCard },
  { key: 'security', icon: ShieldCheck },
  { key: 'languages', icon: Languages },
];

// Search from the homepage: opens the Internships page with the words and category already filled in. Visitors log
// in first and then land on those results.
function HeroSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const searchId = useId();
  const categoryId = useId();
  const [words, setWords] = useState('');
  const [category, setCategory] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (words.trim()) params.set('search', words.trim().slice(0, 50));
    if (category) params.set('category', category);
    const query = params.toString();
    navigate(query ? `/internships?${query}` : '/internships');
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 text-left shadow-raised sm:flex-row sm:items-center"
    >
      <label htmlFor={searchId} className="sr-only">
        {t('internships.searchLabel')}
      </label>
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id={searchId}
          type="search"
          maxLength={50}
          value={words}
          onChange={(event) => setWords(event.target.value)}
          placeholder={t('internships.searchPlaceholder')}
          className="block w-full rounded-xl border-0 bg-transparent py-3 pr-3 pl-11 text-base text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-200 focus:outline-none"
        />
      </div>
      <label htmlFor={categoryId} className="sr-only">
        {t('internships.filters.category')}
      </label>
      <select
        id={categoryId}
        value={category}
        onChange={(event) => setCategory(event.target.value)}
        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none sm:w-52 sm:border-0 sm:border-l sm:bg-transparent sm:rounded-none"
      >
        <option value="">{t('internships.filters.anyCategory')}</option>
        {CATEGORIES.map((key) => (
          <option key={key} value={key}>
            {t(`internships.categories.${key}`)}
          </option>
        ))}
      </select>
      <button type="submit" className={buttonClasses({ size: 'lg', className: 'rounded-xl' })}>
        <Search className="size-5" aria-hidden="true" />
        {t('home.search.button')}
      </button>
    </form>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-slate-50">
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-14 sm:px-6 sm:pt-24 sm:pb-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-brand-800 shadow-sm ring-1 ring-brand-100">
              <Sparkles className="size-4" aria-hidden="true" />
              {t('home.hero.eyebrow')}
            </p>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-balance text-slate-900 sm:text-5xl lg:text-6xl">{t('home.hero.title')}</h1>
            <p className="mt-6 text-lg text-pretty text-slate-600">{t('home.hero.subtitle')}</p>
          </div>

          <HeroSearch />

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/internships" className={buttonClasses({ size: 'lg' })}>
              {t('home.hero.primaryCta')}
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
            <Link to="/public-space" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
              {t('home.hero.secondaryCta')}
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="features-title">
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6 sm:pt-12 sm:pb-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="features-title" className="text-3xl font-bold tracking-tight text-slate-900">
              {t('home.features.title')}
            </h2>
            <p className="mt-3 text-slate-600">{t('home.features.subtitle')}</p>
          </div>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ key, icon: Icon }) => (
              <li key={key} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{t(`home.features.items.${key}.title`)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t(`home.features.items.${key}.description`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="cta-title">
        <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="flex flex-col items-start gap-6 rounded-3xl bg-brand-800 px-6 py-10 text-white sm:px-10 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 id="cta-title" className="text-2xl font-bold">
                {t('home.cta.title')}
              </h2>
              <p className="mt-2 text-brand-100">{user ? t('home.cta.memberDescription') : t('home.cta.description')}</p>
            </div>
            {!loading && (
              <Link to={user ? '/dashboard' : '/register'} className={buttonClasses({ variant: 'inverse', size: 'lg', className: 'shrink-0' })}>
                {user ? t('home.cta.memberButton') : t('home.cta.button')}
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
