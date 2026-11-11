import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ActiveSessionsPanel from './ActiveSessionsPanel.jsx';
import LoginHistoryPanel from './LoginHistoryPanel.jsx';
import TrustedDevicesPanel from './TrustedDevicesPanel.jsx';

// Module 6 on the dashboard (the student's profile): active sessions, devices and the login history.
export default function SecuritySection() {
  const { t } = useTranslation();
  const devicesRef = useRef(null);

  return (
    <section id="security" aria-labelledby="security-title" className="scroll-mt-20 space-y-4">
      <div>
        <h2 id="security-title" className="text-xl font-bold text-slate-900">
          {t('accountSecurity.title')}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{t('accountSecurity.subtitle')}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ActiveSessionsPanel onChanged={() => devicesRef.current?.reload()} />
        <TrustedDevicesPanel ref={devicesRef} />
      </div>
      <LoginHistoryPanel />
    </section>
  );
}
