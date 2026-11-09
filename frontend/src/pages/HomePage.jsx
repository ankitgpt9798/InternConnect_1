import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import api from '../api/axios.js';
import { buttonClasses } from '../components/ui/buttonStyles.js';
import { useAuth } from '../context/AuthContext.jsx';

function StatusRow({ label, value, ok }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-slate-600">{label}</span>
      <span className="flex items-center gap-2 font-medium">
        <span className={`size-2.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
        {value}
      </span>
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  // null while the first check is still running
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api
      .get('/health')
      .then((res) => setHealth({ api: true, database: res.data.database }))
      .catch((error) =>
        // A response (e.g. 503) means the API is up but the database is not; no response means the API is down.
        setHealth({ api: Boolean(error.response), database: error.response?.data?.database ?? 'unknown' }),
      );
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-brand-700 px-6 py-12 text-white sm:px-10">
        <h1 className="text-3xl font-bold sm:text-4xl">
          {t('home.hero.title', 'Find the internship that starts your career')}
        </h1>
        <p className="mt-3 max-w-2xl text-brand-100">
          {t(
            'home.hero.subtitle',
            'Discover internships, apply in a few clicks, build a standout resume and learn alongside students who are on the same journey.',
          )}
        </p>
        {!loading && (
          <div className="mt-6 flex flex-wrap gap-3">
            {user ? (
              <Link to="/dashboard" className={buttonClasses({ variant: 'inverse', size: 'lg' })}>
                {t('nav.dashboard', 'Go to dashboard')}
              </Link>
            ) : (
              <>
                <Link to="/register" className={buttonClasses({ variant: 'inverse', size: 'lg' })}>
                  {t('nav.register', 'Create an account')}
                </Link>
                <Link to="/login" className={buttonClasses({ variant: 'outlineLight', size: 'lg' })}>
                  {t('nav.login', 'Log in')}
                </Link>
              </>
            )}
          </div>
        )}
      </section>

      <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          {t('status.label', 'System status')}
        </h2>
        {health === null ? (
          <p className="mt-3 text-sm text-slate-500">{t('status.checking', 'Checking…')}</p>
        ) : (
          <div className="mt-2 divide-y divide-slate-100 text-sm">
            <StatusRow
              label="API server"
              value={health.api ? t('status.online', 'Online') : t('status.offline', 'Offline')}
              ok={health.api}
            />
            <StatusRow
              label="Database"
              value={health.database === 'connected' ? t('status.online', 'connected') : health.database}
              ok={health.database === 'connected'}
            />
          </div>
        )}
      </section>
    </div>
  );
}
