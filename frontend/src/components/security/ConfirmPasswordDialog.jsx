import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { authErrorMessage } from '../../utils/authErrors.js';
import Alert from '../ui/Alert.jsx';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';

// Module 6: signing other sessions out or removing a device needs the password again, so someone with only a copied
// session cookie cannot lock the real student out. `onConfirm(password)` does the action; errors are shown here.
export default function ConfirmPasswordDialog({ title, description, confirmLabel, onConfirm, onClose }) {
  const { t, i18n } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!password) {
      setError(t('authPages.errors.passwordRequired'));
      return;
    }
    setBusy(true);
    try {
      await onConfirm(password);
    } catch (err) {
      setError(authErrorMessage(err, t, i18n.language));
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-password-title"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="confirm-password-title" className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('accountSecurity.confirm.cancel')} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          {error && <Alert>{error}</Alert>}
          <FormField
            ref={inputRef}
            label={t('accountSecurity.confirm.password')}
            id="confirm-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('accountSecurity.confirm.cancel')}
            </Button>
            <Button type="submit" loading={busy} loadingLabel={t('authPages.pleaseWait')}>
              {confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
