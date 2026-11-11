import { useTranslation } from 'react-i18next';
import Alert from '../ui/Alert.jsx';

const KEYS = {
  MOBILE_SESSION_ENDED: 'sessionNotice.mobileEnded',
  SESSION_REVOKED: 'sessionNotice.revoked',
  SESSION_CONTEXT_CHANGED: 'sessionNotice.contextChanged',
  SESSION_EXPIRED: 'sessionNotice.expired',
};

// Module 6: why this browser was signed out (shown on the login page).
export default function SessionNotice({ code, onDismiss }) {
  const { t } = useTranslation();
  if (!code) return null;
  return (
    <Alert type="info">
      <span>{t(KEYS[code] ?? KEYS.SESSION_EXPIRED)}</span>{' '}
      <button type="button" onClick={onDismiss} className="font-semibold underline">
        {t('sessionNotice.dismiss')}
      </button>
    </Alert>
  );
}
