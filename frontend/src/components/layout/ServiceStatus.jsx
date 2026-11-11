import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios.js';

// "Service status: Online" in the footer (it used to be a card on the homepage). Checked once when the app opens.
// A response with an error (e.g. 503) means the API is up but the database is not; no response means it is down.
export default function ServiceStatus() {
  const { t } = useTranslation();
  const [status, setStatus] = useState('checking'); // checking | online | degraded | offline

  useEffect(() => {
    let ignore = false;
    api
      .get('/health')
      .then((res) => !ignore && setStatus(res.data.database === 'connected' ? 'online' : 'degraded'))
      .catch((error) => !ignore && setStatus(error.response ? 'degraded' : 'offline'));
    return () => {
      ignore = true;
    };
  }, []);

  const dot = { checking: 'bg-slate-300', online: 'bg-green-500', degraded: 'bg-amber-500', offline: 'bg-red-500' }[status];

  return (
    <p className="flex items-center gap-2 text-sm text-slate-600" aria-live="polite">
      <span className={`size-2.5 rounded-full ${dot}`} aria-hidden="true" />
      {t('status.label')}: <span className="font-semibold text-slate-900">{t(`status.${status}`)}</span>
    </p>
  );
}
