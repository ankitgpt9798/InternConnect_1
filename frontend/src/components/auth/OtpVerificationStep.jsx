import { MailCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext.jsx';
import { authErrorMessage, ENDS_CODE_STEP } from '../../utils/authErrors.js';
import Alert from '../ui/Alert.jsx';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';

const REASON_KEYS = {
  chrome: 'otp.reasons.chrome',
  new_device: 'otp.reasons.newDevice',
  untrusted_device: 'otp.reasons.newDevice',
  device_mismatch: 'otp.reasons.newDevice',
  new_country: 'otp.reasons.unusual',
  recent_failures: 'otp.reasons.unusual',
  new_account: 'otp.reasons.newAccount',
};

// Module 6: the email-code step of a login or registration. Times (resend wait, expiry) come from the server's
// clock, so a wrong clock on this device does not matter. `onRestart` goes back to the password form.
export default function OtpVerificationStep({ challenge: initial, purpose, onRestart }) {
  const { t, i18n } = useTranslation();
  const { verifyCode, resendCode, cancelChallenge } = useAuth();
  const [challenge, setChallenge] = useState(initial);
  const [offset, setOffset] = useState(() => new Date(initial.serverTime).getTime() - Date.now());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [ended, setEnded] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const serverNow = nowMs + offset;
  const resendIn = Math.max(0, Math.ceil((new Date(challenge.resendAvailableAt).getTime() - serverNow) / 1000));
  const codeExpired = serverNow >= new Date(challenge.codeExpiresAt).getTime();
  const reasons = useMemo(() => [...new Set((challenge.reasons ?? []).map((reason) => REASON_KEYS[reason]).filter(Boolean))], [challenge.reasons]);

  function fail(err) {
    setInfo('');
    setError(authErrorMessage(err, t, i18n.language));
    if (ENDS_CODE_STEP.has(err.response?.data?.code)) setEnded(true);
  }

  async function handleVerify(event) {
    event.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) {
      setError(t('authPages.errors.otpFormat'));
      return;
    }
    setVerifying(true);
    try {
      await verifyCode(code); // signed in: the guest-only route moves on to the dashboard
    } catch (err) {
      fail(err);
      setVerifying(false);
    }
  }

  async function handleResend() {
    setError('');
    setResending(true);
    try {
      const next = await resendCode();
      setOffset(new Date(next.serverTime).getTime() - Date.now());
      setChallenge(next);
      setCode('');
      setInfo(t('otp.resent'));
    } catch (err) {
      fail(err);
    } finally {
      setResending(false);
    }
  }

  async function handleRestart() {
    if (!ended) await cancelChallenge();
    onRestart();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl bg-brand-50 p-4 text-sm text-brand-900">
        <MailCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="space-y-1">
          <p>{t('otp.sentTo', { destination: challenge.destination })}</p>
          {reasons.map((key) => (
            <p key={key} className="text-brand-800">
              {t(key)}
            </p>
          ))}
        </div>
      </div>

      {error && <Alert>{error}</Alert>}
      {info && !error && <Alert type="success">{info}</Alert>}
      {codeExpired && !ended && !error && <Alert type="info">{t('otp.codeExpired')}</Alert>}

      {!ended && (
        <form onSubmit={handleVerify} noValidate className="space-y-4">
          <FormField
            label={t('otp.codeLabel')}
            id="otp"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
          />
          <Button type="submit" loading={verifying} loadingLabel={t('authPages.pleaseWait')} className="w-full">
            {purpose === 'register' ? t('otp.verifyRegister') : t('otp.verify')}
          </Button>
          <div className="text-center">
            {challenge.resendsLeft > 0 ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendIn > 0 || resending}
                className="text-sm font-medium text-brand-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
              >
                {resendIn > 0 ? t('otp.resendIn', { count: resendIn }) : t('otp.resend')}
              </button>
            ) : (
              <p className="text-sm text-slate-500">{t('otp.noResends')}</p>
            )}
          </div>
        </form>
      )}

      <div className="border-t border-slate-100 pt-4 text-center">
        <button type="button" onClick={handleRestart} className="text-sm font-semibold text-slate-600 hover:text-slate-900 hover:underline">
          {ended ? t('otp.startAgain') : t('otp.useDifferentAccount')}
        </button>
      </div>
    </div>
  );
}
