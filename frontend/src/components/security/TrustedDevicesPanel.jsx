import { ShieldCheck } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getDevices, removeDevice } from '../../api/security.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { deviceLabel, formatIstDate, formatIstDateTime, locationText } from '../../utils/securityFormat.js';
import Alert from '../ui/Alert.jsx';
import ConfirmPasswordDialog from './ConfirmPasswordDialog.jsx';
import DeviceIcon from './DeviceIcon.jsx';
import SecurityPanel, { Badge } from './SecurityPanel.jsx';

// Module 6: browsers the account has been used from. A browser is trusted for 30 days after a correct email code.
const TrustedDevicesPanel = forwardRef(function TrustedDevicesPanel({ onChanged }, ref) {
  const { t, i18n } = useTranslation();
  const { endSession } = useAuth();
  const [devices, setDevices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [removing, setRemoving] = useState(null);

  // State is set only when the answer arrives (never synchronously inside the effect).
  const fetchDevices = useCallback(
    () =>
      getDevices()
        .then((data) => {
          setDevices(data.devices);
          setError('');
        })
        .catch(() => setError(t('accountSecurity.loadError')))
        .finally(() => setLoading(false)),
    [t],
  );

  const load = useCallback(() => {
    setLoading(true);
    return fetchDevices();
  }, [fetchDevices]);

  useImperativeHandle(ref, () => ({ reload: load }), [load]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  async function confirm(password) {
    const result = await removeDevice(removing.id, password);
    if (result.current) {
      endSession('SESSION_REVOKED');
      return;
    }
    setMessage(result.sessionsEnded > 0 ? t('accountSecurity.devices.removedWithSessions', { count: result.sessionsEnded }) : t('accountSecurity.devices.removed'));
    setRemoving(null);
    await load();
    onChanged?.();
  }

  return (
    <SecurityPanel
      id="trusted-devices"
      icon={ShieldCheck}
      title={t('accountSecurity.devices.title')}
      description={t('accountSecurity.devices.description')}
      loading={loading}
      error={error}
      onRefresh={load}
      empty={devices && devices.length === 0 ? t('accountSecurity.devices.empty') : null}
    >
      {devices && (
        <div className="space-y-3">
          {message && <Alert type="success">{message}</Alert>}
          <ul className="divide-y divide-slate-100">
            {devices.map((device) => {
              const label = deviceLabel(device, t);
              return (
                <li key={device.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <DeviceIcon deviceClass={device.deviceClass} label={t(`accountSecurity.deviceTypes.${device.deviceClass}`)} />
                    <div className="min-w-0 space-y-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                        <span className="break-words">{label}</span>
                        {device.current && <Badge tone="brand">{t('accountSecurity.thisDevice')}</Badge>}
                        {device.trusted ? (
                          <Badge tone="green">{t('accountSecurity.devices.trustedUntil', { date: formatIstDate(device.trustExpiresAt, i18n.language) })}</Badge>
                        ) : (
                          <Badge>{t('accountSecurity.devices.notTrusted')}</Badge>
                        )}
                      </p>
                      {device.model && <p className="text-xs text-slate-500">{device.model}</p>}
                      <p className="text-xs text-slate-500">
                        {t('accountSecurity.devices.firstSeen', { time: formatIstDateTime(device.firstSeenAt, i18n.language) })} ·{' '}
                        {t('accountSecurity.devices.lastSeen', { time: formatIstDateTime(device.lastSeenAt, i18n.language) })}
                      </p>
                      <p className="text-xs break-words text-slate-500">
                        {t('accountSecurity.ip', { ip: device.lastIp || '—' })} · {locationText(device.lastLocation, t)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRemoving(device)}
                    aria-label={t('accountSecurity.devices.removeLabel', { name: label })}
                    className="self-start rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                  >
                    {t('accountSecurity.devices.remove')}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {removing && (
        <ConfirmPasswordDialog
          title={t('accountSecurity.devices.confirmTitle')}
          description={t('accountSecurity.devices.confirmDescription')}
          confirmLabel={t('accountSecurity.devices.remove')}
          onConfirm={confirm}
          onClose={() => setRemoving(null)}
        />
      )}
    </SecurityPanel>
  );
});

export default TrustedDevicesPanel;
