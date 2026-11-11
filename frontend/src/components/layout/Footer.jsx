import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';
import ServiceStatus from './ServiceStatus.jsx';

const linkClass = 'text-sm text-slate-600 hover:text-brand-700';

export default function Footer() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const year = new Date().getFullYear();

  const explore = [
    { to: '/internships', label: t('nav.internships') },
    { to: '/public-space', label: t('nav.community') },
    { to: '/resume', label: t('nav.resumeBuilder') },
    { to: '/plans', label: t('nav.plans') },
  ];
  const account = user
    ? [
        { to: '/dashboard', label: t('nav.dashboard') },
        { to: '/profile', label: t('nav.profile') },
        { to: '/applications', label: t('nav.applications') },
        { to: '/profile#security', label: t('nav.security') },
      ]
    : [
        { to: '/login', label: t('nav.login') },
        { to: '/register', label: t('nav.register') },
      ];

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6 lg:grid-cols-4">
        <div className="col-span-2 space-y-3 sm:col-span-1 lg:col-span-2">
          <Link to="/" aria-label={t('common.appName')} className="inline-flex items-center gap-2">
            <img src="/favicon.svg" alt="" className="size-8" />
            <span className="text-lg font-bold tracking-tight text-slate-900">
              Intern<span className="text-brand-700">Connect</span>
            </span>
          </Link>
          <p className="max-w-sm text-sm text-slate-600">{t('footer.tagline')}</p>
        </div>

        <nav aria-labelledby="footer-explore">
          <h2 id="footer-explore" className="text-sm font-semibold text-slate-900">
            {t('footer.explore')}
          </h2>
          <ul className="mt-3 space-y-2">
            {explore.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-account">
          <h2 id="footer-account" className="text-sm font-semibold text-slate-900">
            {t('footer.account')}
          </h2>
          <ul className="mt-3 space-y-2">
            {account.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-slate-500">{t('footer.rights', { year })}</p>
          <ServiceStatus />
        </div>
      </div>
    </footer>
  );
}
