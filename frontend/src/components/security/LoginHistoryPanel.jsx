import { History } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLoginHistory } from '../../api/security.js';
import { deviceLabel, formatIstDateTime, locationText } from '../../utils/securityFormat.js';
import DeviceIcon from './DeviceIcon.jsx';
import SecurityPanel, { Badge } from './SecurityPanel.jsx';

const STATUS_TONES = { success: 'green', failed: 'red', blocked: 'amber', rate_limited: 'amber', otp_pending: 'blue' };

// Module 6: every sign-in attempt on the account (successful or not), newest first.
export default function LoginHistoryPanel() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // State is set only when the answer arrives (never synchronously inside the effect).
  const fetchFirstPage = useCallback(
    () =>
      getLoginHistory()
        .then((data) => {
          setItems(data.items);
          setNextCursor(data.nextCursor);
          setError('');
        })
        .catch(() => setError(t('accountSecurity.loadError')))
        .finally(() => setLoading(false)),
    [t],
  );

  useEffect(() => {
    fetchFirstPage();
  }, [fetchFirstPage]);

  function load() {
    setLoading(true);
    return fetchFirstPage();
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const data = await getLoginHistory(nextCursor);
      setItems((current) => [...current, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch {
      setError(t('accountSecurity.loadError'));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <SecurityPanel
      id="login-history"
      icon={History}
      title={t('accountSecurity.history.title')}
      description={t('accountSecurity.history.description')}
      loading={loading}
      error={error}
      onRefresh={load}
      empty={items && items.length === 0 ? t('accountSecurity.history.empty') : null}
    >
      {items && (
        <>
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <DeviceIcon deviceClass={item.deviceClass} label={t(`accountSecurity.deviceTypes.${item.deviceClass}`)} />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold break-words text-slate-900">{deviceLabel(item, t)}</span>
                    <Badge tone={STATUS_TONES[item.status]}>
                      {item.status === 'success' && item.event === 'register'
                        ? t('accountSecurity.history.events.register')
                        : t(`accountSecurity.history.status.${item.status}`)}
                    </Badge>
                    {item.currentSession && <Badge tone="brand">{t('accountSecurity.history.thisSession')}</Badge>}
                    {item.flags?.newDevice && <Badge>{t('accountSecurity.history.flags.newDevice')}</Badge>}
                    {item.flags?.newBrowser && <Badge>{t('accountSecurity.history.flags.newBrowser')}</Badge>}
                    {item.flags?.newIp && <Badge>{t('accountSecurity.history.flags.newIp')}</Badge>}
                  </div>
                  {item.reason && <p className="text-xs font-medium text-slate-700">{t(`accountSecurity.history.reasons.${item.reason}`)}</p>}
                  {item.status === 'success' && item.verification === 'email_otp' && (
                    <p className="text-xs text-emerald-700">{t('accountSecurity.history.verifiedByEmail')}</p>
                  )}
                  {item.model && <p className="text-xs text-slate-500">{item.model}</p>}
                  <p className="text-xs break-words text-slate-500">
                    {t('accountSecurity.ip', { ip: item.ip || '—' })} · {locationText(item.location, t)}
                    {item.otp && item.otp.codesSent > 0 && <> · {t('accountSecurity.history.codesSent', { count: item.otp.codesSent })}</>}
                  </p>
                  <time dateTime={item.createdAt} className="block text-xs text-slate-400">
                    {t('accountSecurity.time', { time: formatIstDateTime(item.createdAt, i18n.language) })}
                  </time>
                </div>
              </li>
            ))}
          </ul>
          {nextCursor && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {loadingMore ? t('accountSecurity.loading') : t('accountSecurity.showMore')}
              </button>
            </div>
          )}
          <p className="mt-4 text-[11px] text-slate-400">{t('accountSecurity.history.geoAttribution')}</p>
        </>
      )}
    </SecurityPanel>
  );
}
