import { MonitorSmartphone } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSessions, revokeOtherSessions, revokeSession } from '../../api/security.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { deviceLabel, formatIstDateTime, formatIstTime, locationText } from '../../utils/securityFormat.js';
import Alert from '../ui/Alert.jsx';
import ConfirmPasswordDialog from './ConfirmPasswordDialog.jsx';
import DeviceIcon from './DeviceIcon.jsx';
import SecurityPanel, { Badge } from './SecurityPanel.jsx';

// Module 6: browsers where the account is signed in now, with "Sign out" for the others.
export default function ActiveSessionsPanel({ onChanged }) {
  const { t, i18n } = useTranslation();
  const { endSession } = useAuth();
  const [sessions, setSessions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(null); // { session } or { others: true }

  // State is set only when the answer arrives (never synchronously inside the effect).
  const fetchSessions = useCallback(
    () =>
      getSessions()
        .then((data) => {
          setSessions(data.sessions);
          setError('');
        })
        .catch(() => setError(t('accountSecurity.loadError')))
        .finally(() => setLoading(false)),
    [t],
  );

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  function load() {
    setLoading(true);
    return fetchSessions();
  }

  async function confirm(password) {
    if (confirming.others) {
      const { revokedCount } = await revokeOtherSessions(password);
      setMessage(revokedCount > 0 ? t('accountSecurity.sessions.signedOutOthers', { count: revokedCount }) : t('accountSecurity.sessions.noOthers'));
    } else {
      const result = await revokeSession(confirming.session.id, password);
      if (result.current) {
        endSession('SESSION_REVOKED');
        return;
      }
      setMessage(t('accountSecurity.sessions.signedOut'));
    }
    setConfirming(null);
    await load();
    onChanged?.();
  }

  const others = sessions?.filter((session) => !session.current) ?? [];

  return (
    <SecurityPanel
      id="active-sessions"
      icon={MonitorSmartphone}
      title={t('accountSecurity.sessions.title')}
      description={t('accountSecurity.sessions.description')}
      loading={loading}
      error={error}
      onRefresh={load}
      empty={sessions && sessions.length === 0 ? t('accountSecurity.sessions.empty') : null}
      actions={
        others.length > 0 && (
          <button type="button" onClick={() => setConfirming({ others: true })} className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">
            {t('accountSecurity.sessions.signOutOthers')}
          </button>
        )
      }
    >
      {sessions && (
        <div className="space-y-3">
          {message && <Alert type="success">{message}</Alert>}
          <ul className="divide-y divide-slate-100">
            {sessions.map((session) => {
              const label = deviceLabel(session, t);
              const restricted = session.deviceClass === 'mobile' || session.deviceClass === 'tablet';
              return (
                <li key={session.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <DeviceIcon deviceClass={session.deviceClass} label={t(`accountSecurity.deviceTypes.${session.deviceClass}`)} />
                    <div className="min-w-0 space-y-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                        <span className="break-words">{label}</span>
                        {session.current && <Badge tone="brand">{t('accountSecurity.thisDevice')}</Badge>}
                        {session.trustedDevice && <Badge tone="green">{t('accountSecurity.sessions.trusted')}</Badge>}
                      </p>
                      {session.model && <p className="text-xs text-slate-500">{session.model}</p>}
                      <p className="text-xs break-words text-slate-500">
                        {t('accountSecurity.ip', { ip: session.ip || '—' })} · {locationText(session.location, t)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t('accountSecurity.sessions.started', { time: formatIstDateTime(session.createdAt, i18n.language) })} ·{' '}
                        {t('accountSecurity.sessions.lastActive', { time: formatIstDateTime(session.lastActiveAt, i18n.language) })}
                      </p>
                      {restricted && (
                        <p className="text-xs font-medium text-amber-800">
                          {t('accountSecurity.sessions.endsAt', { time: formatIstTime(session.expiresAt, i18n.language) })}
                        </p>
                      )}
                    </div>
                  </div>
                  {!session.current && (
                    <button
                      type="button"
                      onClick={() => setConfirming({ session })}
                      aria-label={t('accountSecurity.sessions.signOutLabel', { name: label })}
                      className="self-start rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                    >
                      {t('accountSecurity.sessions.signOut')}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {confirming && (
        <ConfirmPasswordDialog
          title={confirming.others ? t('accountSecurity.sessions.confirmOthersTitle') : t('accountSecurity.sessions.confirmOneTitle')}
          description={t('accountSecurity.confirm.description')}
          confirmLabel={confirming.others ? t('accountSecurity.sessions.signOutOthers') : t('accountSecurity.sessions.signOut')}
          onConfirm={confirm}
          onClose={() => setConfirming(null)}
        />
      )}
    </SecurityPanel>
  );
}
