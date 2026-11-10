import { ArrowRight, Briefcase, ClipboardList, Crown, FileText, Languages, MessagesSquare, ShieldCheck, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import Avatar from '../components/ui/Avatar.jsx';
import { buttonClasses } from '../components/ui/buttonStyles.js';
import { useAuth } from '../context/AuthContext.jsx';

// The student's starting point: a welcome, a short profile card and the parts of InternConnect. Account details,
// language history and sign-in security are on the Profile page (/profile).
export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const modules = [
    { to: '/internships', icon: Briefcase, title: t('nav.internships'), text: t('home.features.items.internships.description') },
    { to: '/applications', icon: ClipboardList, title: t('applications.title'), text: t('applications.subtitle') },
    { to: '/plans', icon: Crown, title: t('nav.plans'), text: t('plans.subtitle') },
    { to: '/resume', icon: FileText, title: t('nav.resumeBuilder'), text: t('resume.subtitle') },
    { to: '/public-space', icon: MessagesSquare, title: t('nav.community'), text: t('home.features.items.community.description') },
    { to: '/friends', icon: Users, title: t('nav.people'), text: t('social.friends.subtitle') },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('dashboard.welcome', { name: user.name.split(' ')[0] })}</h1>
        <p className="mt-1 text-slate-600">{t('dashboard.subtitle')}</p>
      </div>

      <section
        aria-label={t('nav.profile')}
        className="flex flex-col gap-5 rounded-2xl bg-gradient-to-r from-brand-700 to-brand-800 p-6 text-white shadow-card sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={user.name} size="md" tone="light" />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{user.name}</p>
            <p className="truncate text-sm text-brand-100">{user.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/profile" className={buttonClasses({ variant: 'inverse' })}>
            {t('dashboard.viewProfile')}
          </Link>
          <Link to="/profile#security" className={buttonClasses({ variant: 'outlineLight' })}>
            <ShieldCheck className="size-4" aria-hidden="true" />
            {t('nav.security')}
          </Link>
          <Link to="/profile#language" className={buttonClasses({ variant: 'outlineLight' })}>
            <Languages className="size-4" aria-hidden="true" />
            {t('profile.tabs.language')}
          </Link>
        </div>
      </section>

      <section aria-labelledby="dashboard-modules">
        <h2 id="dashboard-modules" className="text-lg font-semibold text-slate-900">
          {t('dashboard.modulesTitle')}
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ to, icon: Icon, title, text }) => (
            <li key={to}>
              <Link
                to={to}
                className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-[border-color,box-shadow] hover:border-brand-200 hover:shadow-card-hover"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="mt-4 flex items-center justify-between gap-2 font-semibold text-slate-900 group-hover:text-brand-700">
                  {title}
                  <ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden="true" />
                </span>
                <span className="mt-1 text-sm leading-6 text-slate-600">{text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
