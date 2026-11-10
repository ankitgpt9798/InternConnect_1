import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { getGeneratedResumes, resumePdfUrl } from '../../api/resumes.js';
import { LANGUAGES } from '../../i18n/languages.js';

function Detail({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-medium break-all text-slate-900 sm:text-right">{value}</dd>
    </div>
  );
}

// The student's own account details (moved here from the Dashboard), with the resume PDF attached to the profile.
export default function AccountDetails({ user }) {
  const { t, i18n } = useTranslation();
  const [profileResume, setProfileResume] = useState(undefined); // undefined while loading, null when there is none

  useEffect(() => {
    getGeneratedResumes()
      .then((resumes) => setProfileResume(resumes.find((resume) => resume.onProfile) ?? null))
      .catch(() => setProfileResume(null));
  }, []);

  const locale = i18n.language?.startsWith('en') ? 'en-IN' : i18n.language;
  const memberSince = new Date(user.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const language = LANGUAGES.find((l) => l.code === (user.preferredLanguage || 'en'));

  return (
    <section aria-labelledby="account-title" className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
      <h2 id="account-title" className="text-lg font-semibold text-slate-900">
        {t('profile.account')}
      </h2>
      <dl className="mt-2 divide-y divide-slate-100">
        <Detail label={t('auth.fields.fullName')} value={user.name} />
        <Detail label={t('auth.fields.email')} value={user.email} />
        <Detail label={t('auth.fields.mobile')} value={user.phone} />
        <Detail label={t('profile.memberSince')} value={memberSince} />
        <Detail label={t('language.label')} value={<span lang={language?.htmlLang}>{language ? language.nativeName : 'English'}</span>} />
        <Detail
          label={t('profile.resume.title')}
          value={
            profileResume === undefined ? (
              t('common.loading')
            ) : profileResume ? (
              <a href={resumePdfUrl(profileResume.id)} className="font-semibold text-brand-700 hover:underline">
                {t('profile.resume.download')}
              </a>
            ) : (
              <Link to="/resume" className="font-semibold text-brand-700 hover:underline">
                {t('profile.resume.create')}
              </Link>
            )
          }
        />
      </dl>
    </section>
  );
}
