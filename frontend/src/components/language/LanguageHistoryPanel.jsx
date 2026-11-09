import { CheckCircle2, History, Languages, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLanguageHistory } from '../../api/languages.js';
import { LANGUAGES } from '../../i18n/languages.js';

export default function LanguageHistoryPanel({ className = '' }) {
  const { t, i18n } = useTranslation();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    getLanguageHistory()
      .then((data) => {
        if (!ignore) {
          setHistory(data.history || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setError(t('language.historyError', 'Could not load language history.'));
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [i18n.language, t]);

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      const data = await getLanguageHistory();
      setHistory(data.history || []);
    } catch {
      setError(t('language.historyError', 'Could not load language history.'));
    } finally {
      setRefreshing(false);
    }
  }

  const getLangName = (code) => {
    const found = LANGUAGES.find((l) => l.code === code);
    return t(`language.names.${code}`, found ? found.nativeName : code?.toUpperCase());
  };

  return (
    <section
      id="language-history"
      aria-labelledby="language-history-title"
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Languages className="size-5 text-brand-700" />
          <h2 id="language-history-title" className="text-lg font-semibold text-slate-900">
            {t('security.tabs.languages', 'Language History')}
          </h2>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading || refreshing}
          aria-label={t('common.refresh', 'Refresh language history')}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{t('common.refresh', 'Refresh')}</span>
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {t(
          'security.languages.description',
          'Every change of the interface language, newest first. French is applied only after an email code.',
        )}
      </p>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <div className="mt-4">
        {loading ? (
          <div className="py-6 text-center text-sm text-slate-500">
            <RefreshCw className="mx-auto mb-2 size-5 animate-spin text-brand-700" />
            {t('common.loading', 'Loading history…')}
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
            <History className="mx-auto mb-2 size-6 text-slate-400" />
            <p className="text-sm font-medium text-slate-600">
              {t('security.languages.empty', 'You have not changed the language yet.')}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((item) => {
              const fromName = getLangName(item.previousLanguage);
              const toName = getLangName(item.selectedLanguage);
              const isOtp = item.verification === 'email_otp';
              const dateStr = new Date(item.appliedAt || item.createdAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              return (
                <li key={item._id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {t('security.languages.change', {
                          from: fromName,
                          to: toName,
                          defaultValue: `${fromName} → ${toName}`,
                        })}
                      </span>
                      {isOtp ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          <ShieldCheck className="size-3" />
                          {t('security.languages.results.verified', 'Email OTP Verified')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                          <CheckCircle2 className="size-3" />
                          {t('security.languages.results.not_required', 'Direct Switch')}
                        </span>
                      )}
                    </div>
                    {item.destination && (
                      <p className="text-xs text-slate-500">
                        {t('security.languages.verification.email_otp', {
                          destination: item.destination,
                          defaultValue: `Email code sent to ${item.destination}`,
                        })}
                      </p>
                    )}
                  </div>
                  <time className="text-xs text-slate-400 sm:text-right">{dateStr}</time>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
