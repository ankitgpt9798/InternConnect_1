import { Mail, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { sendFrenchLanguageOtp, verifyFrenchLanguageOtp } from '../../api/languages.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { applyLanguage } from '../../i18n/index.js';
import { getErrorMessage } from '../../utils/getErrorMessage.js';
import Alert from '../ui/Alert.jsx';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';

export default function FrenchVerificationModal({ isOpen, onClose }) {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const [code, setCode] = useState('');
  const [destination, setDestination] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [codeSent, setCodeSent] = useState(false);
  const closeButtonRef = useRef(null);

  const handleClose = useCallback(() => {
    setCode('');
    setError(null);
    onClose();
  }, [onClose]);

  // Focus close button on open, listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  // Request code asynchronously on mount when user is authenticated
  useEffect(() => {
    let ignore = false;
    if (isOpen && user && !codeSent) {
      sendFrenchLanguageOtp()
        .then((data) => {
          if (!ignore) {
            setDestination(data.destination);
            setResendIn(data.resendAfterSeconds || 60);
            setCodeSent(true);
          }
        })
        .catch((err) => {
          if (!ignore) {
            if (err.response?.data?.destination) {
              setDestination(err.response.data.destination);
            }
            if (err.response?.data?.retryAfterSeconds) {
              setResendIn(err.response.data.retryAfterSeconds);
            }
            if (err.response?.status !== 429) {
              setError(getErrorMessage(err));
            }
          }
        });
    }

    return () => {
      ignore = true;
    };
  }, [isOpen, user, codeSent]);

  async function handleResendCode() {
    setSending(true);
    setError(null);
    try {
      const data = await sendFrenchLanguageOtp();
      setDestination(data.destination);
      setResendIn(data.resendAfterSeconds || 60);
      setCodeSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
      if (err.response?.data?.retryAfterSeconds) {
        setResendIn(err.response.data.retryAfterSeconds);
      }
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(event) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError(t('language.french.enterSixDigits', 'Enter the 6-digit code.'));
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      const data = await verifyFrenchLanguageOtp(trimmed);
      if (data.user) {
        updateUser(data.user);
      }
      await applyLanguage('fr');
      handleClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  }

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="french-modal-title"
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 sm:p-5">
          <div>
            <h2 id="french-modal-title" className="text-lg font-semibold text-slate-900">
              {t('language.french.title', 'Switch to French')} <span lang="fr">· Français</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {t('language.french.subtitle', 'Email verification is required for French')}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            aria-label={t('language.french.close', 'Close')}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5">
          {!user ? (
            <div className="space-y-4">
              <Alert type="info">
                <p>
                  {t(
                    'language.french.loginRequired',
                    'You must be logged in to switch to French, as a verification code will be sent to your registered email address.',
                  )}
                </p>
              </Alert>
              <div className="flex gap-2">
                <Link
                  to="/login"
                  onClick={handleClose}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
                >
                  {t('nav.login', 'Log in')}
                </Link>
                <Button variant="secondary" className="w-full" onClick={handleClose}>
                  {t('language.french.close', 'Close')}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              {error && <Alert type="error">{error}</Alert>}

              {destination ? (
                <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  <Mail className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden="true" />
                  <p>
                    {t('language.french.codeSent', {
                      destination,
                      defaultValue: `We sent a 6-digit code to ${destination}.`,
                    })}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <RefreshCw className="size-4 animate-spin text-brand-700" />
                  <p>{t('language.french.sendingCode', 'Sending verification code to your email…')}</p>
                </div>
              )}

              <p className="text-xs text-slate-500">
                {t('language.french.description', {
                  minutes: 10,
                  language: t(`language.names.${i18n.language}`, i18n.language),
                  defaultValue: 'Enter it to switch InternConnect to French. It expires in 10 minutes.',
                })}
              </p>

              <FormField
                id="french-otp"
                label={t('language.french.codeLabel', '6-digit verification code')}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
              />

              <div className="flex flex-col gap-2 pt-2">
                <Button type="submit" loading={verifying} disabled={code.length !== 6 || sending} className="w-full">
                  {t('language.french.verify', 'Verify and switch to French')}
                </Button>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {resendIn > 0
                      ? t('language.french.resendTimer', {
                          seconds: resendIn,
                          defaultValue: `Resend code in ${resendIn}s`,
                        })
                      : ''}
                  </span>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendIn > 0 || sending || verifying}
                    className="inline-flex items-center gap-1 font-medium text-brand-700 hover:text-brand-800 disabled:opacity-50"
                  >
                    <RefreshCw className={`size-3 ${sending ? 'animate-spin' : ''}`} />
                    {t('language.french.restart', 'Send a new code')}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
