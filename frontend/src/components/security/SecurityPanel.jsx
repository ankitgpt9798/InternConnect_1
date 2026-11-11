import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// The card shared by the Module 6 dashboard panels: title, description, refresh, and loading/error/empty states.
export default function SecurityPanel({ id, icon: Icon, title, description, loading, error, empty, onRefresh, actions, children }) {
  const { t } = useTranslation();
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-brand-700" aria-hidden="true" />
          <h3 id={`${id}-title`} className="text-lg font-semibold text-slate-900">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{t('accountSecurity.refresh')}</span>
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
      <div className="mt-4">
        {error ? (
          <p className="text-sm text-red-600">
            {error}{' '}
            <button type="button" onClick={onRefresh} className="font-semibold underline">
              {t('accountSecurity.retry')}
            </button>
          </p>
        ) : loading && !children ? (
          <p className="py-6 text-center text-sm text-slate-500">{t('accountSecurity.loading')}</p>
        ) : empty ? (
          <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-500">{empty}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-800',
    blue: 'bg-blue-50 text-blue-700',
    brand: 'bg-brand-50 text-brand-800',
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}
