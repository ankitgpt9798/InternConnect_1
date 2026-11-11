import { Languages, ShieldCheck, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import LanguageHistoryPanel from '../components/language/LanguageHistoryPanel.jsx';
import LanguageSelector from '../components/language/LanguageSelector.jsx';
import AccountDetails from '../components/profile/AccountDetails.jsx';
import SecuritySection from '../components/security/SecuritySection.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// The student's profile: account details, language and sign-in security (Module 6), moved here from the Dashboard.
// Each section has its own address (/profile, /profile#language, /profile#security), so links and the back button
// open the right one.
const SECTIONS = [
  { id: 'account', hash: '', icon: UserRound },
  { id: 'language', hash: '#language', icon: Languages },
  { id: 'security', hash: '#security', icon: ShieldCheck },
];

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { hash } = useLocation();
  const active = SECTIONS.find((section) => section.hash && section.hash === hash)?.id ?? 'account';
  const locale = i18n.language?.startsWith('en') ? 'en-IN' : i18n.language;
  const memberSince = new Date(user.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card sm:flex-row sm:items-center">
        <Avatar name={user.name} size="lg" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-700">{t('nav.profile')}</p>
          <h1 className="text-2xl font-bold tracking-tight break-words text-slate-900">{user.name}</h1>
          <p className="mt-0.5 text-sm break-all text-slate-600">{user.email}</p>
          <p className="mt-1 text-xs text-slate-500">
            {t('profile.memberSince')}: {memberSince}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label={t('profile.sections')} className="lg:sticky lg:top-22 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-card lg:flex-col">
            {SECTIONS.map(({ id, hash: sectionHash, icon: Icon }) => (
              <li key={id} className="shrink-0">
                <Link
                  to={`/profile${sectionHash}`}
                  aria-current={active === id ? 'page' : undefined}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                    active === id ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {t(`profile.tabs.${id}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          {active === 'account' && <AccountDetails user={user} />}

          {active === 'language' && (
            <>
              <section aria-labelledby="language-setting-title" className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 id="language-setting-title" className="text-lg font-semibold text-slate-900">
                      {t('language.settings.title')}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">{t('language.settings.description')}</p>
                    <p className="mt-2 text-xs text-slate-500">{t('language.settings.frenchNote')}</p>
                  </div>
                  <LanguageSelector />
                </div>
              </section>
              <LanguageHistoryPanel />
            </>
          )}

          {active === 'security' && <SecuritySection />}
        </div>
      </div>
    </div>
  );
}
