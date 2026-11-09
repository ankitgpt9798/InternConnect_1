import { Briefcase, ClipboardList, Crown, FileText, MessagesSquare, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { getGeneratedResumes, resumePdfUrl } from '../api/resumes.js';
import LanguageHistoryPanel from '../components/language/LanguageHistoryPanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { LANGUAGES } from '../i18n/languages.js';

function Detail({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:justify-between">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-medium break-all text-slate-900">{value}</dd>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const memberSince = new Date(user.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  const [profileResume, setProfileResume] = useState(undefined); // undefined while loading, null when there is none

  // The parts of InternConnect available so far, shown as cards on the dashboard.
  const modules = [
    { to: '/internships', icon: Briefcase, title: t('nav.internships', 'Internships'), text: t('home.features.items.internships.description', 'Browse open internships and apply with a cover letter.') },
    { to: '/applications', icon: ClipboardList, title: t('applications.title', 'My applications'), text: t('applications.subtitle', 'See every internship you have applied for.') },
    { to: '/plans', icon: Crown, title: t('nav.plans', 'Plans'), text: t('plans.subtitle', 'See your plan and how many applications you have left this month.') },
    { to: '/resume', icon: FileText, title: t('nav.resumeBuilder', 'Resume Builder'), text: t('resume.subtitle', 'Write your resume and get a professional PDF (premium, ₹50).') },
    { to: '/public-space', icon: MessagesSquare, title: t('nav.community', 'Public Space'), text: t('home.features.items.community.description', 'Share posts, photos and videos with other students.') },
    { to: '/friends', icon: Users, title: t('nav.people', 'Friends'), text: t('social.friends.subtitle', 'Find students, send friend requests and manage your friends.') },
  ];

  // The paid resume PDF attached to the profile (the latest one).
  useEffect(() => {
    getGeneratedResumes()
      .then((resumes) => setProfileResume(resumes.find((resume) => resume.onProfile) ?? null))
      .catch(() => setProfileResume(null));
  }, []);

  const preferredLang = LANGUAGES.find((l) => l.code === (user.preferredLanguage || 'en'));
  const preferredLangDisplay = preferredLang ? preferredLang.nativeName : 'English';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {t('dashboard.welcome', { name: user.name, defaultValue: `Welcome, ${user.name}` })}
        </h1>
        <p className="mt-1 text-slate-600">
          {t('dashboard.loggedIn', 'You are logged in to InternConnect.')}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            {t('profile.account', 'Your account')}
          </h2>
          <dl className="mt-2 divide-y divide-slate-100">
            <Detail label={t('auth.fields.fullName', 'Name')} value={user.name} />
            <Detail label={t('auth.fields.email', 'Email')} value={user.email} />
            <Detail label={t('auth.fields.mobile', 'Mobile number')} value={user.phone} />
            <Detail label={t('profile.memberSince', 'Member since')} value={memberSince} />
            <Detail label={t('language.label', 'Preferred language')} value={preferredLangDisplay} />
            <Detail
              label={t('profile.resume.title', 'Resume')}
              value={
                profileResume === undefined ? (
                  t('common.loading', 'Loading…')
                ) : profileResume ? (
                  <a href={resumePdfUrl(profileResume.id)} className="font-semibold text-brand-700 hover:underline">
                    {t('profile.resume.download', 'Download resume PDF')}
                  </a>
                ) : (
                  <Link to="/resume" className="font-semibold text-brand-700 hover:underline">
                    {t('profile.resume.create', 'Create one in the Resume Builder')}
                  </Link>
                )
              }
            />
          </dl>
        </section>

        <LanguageHistoryPanel />
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        {modules.map(({ to, icon: Icon, title, text }) => (
          <Link
            key={to}
            to={to}
            className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon className="size-5" />
            </span>
            <span>
              <span className="block font-semibold text-slate-900">{title}</span>
              <span className="mt-0.5 block text-sm text-slate-600">{text}</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
