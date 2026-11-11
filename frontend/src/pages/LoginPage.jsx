import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import OtpVerificationStep from '../components/auth/OtpVerificationStep.jsx';
import SessionNotice from '../components/auth/SessionNotice.jsx';
import AuthCard from '../components/AuthCard.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import FormField from '../components/ui/FormField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { authErrorMessage } from '../utils/authErrors.js';
import { validateLogin } from '../utils/validation.js';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login, sessionNotice, dismissNotice } = useAuth();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [challenge, setChallenge] = useState(null); // set when the server asks for an email code

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setServerError('');

    const found = validateLogin(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const result = await login(form.identifier, form.password); // signed in: GuestRoute redirects
      if (result.step === 'otp') {
        setChallenge(result.challenge);
        setForm((current) => ({ ...current, password: '' }));
      }
    } catch (error) {
      setServerError(authErrorMessage(error, t, i18n.language));
    } finally {
      setSubmitting(false);
    }
  }

  if (challenge) {
    return (
      <AuthCard title={t('otp.title')}>
        <OtpVerificationStep challenge={challenge} purpose="login" onRestart={() => setChallenge(null)} />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t('authPages.login.title')}
      subtitle={t('authPages.login.subtitle')}
      footer={
        <>
          {t('authPages.login.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">
            {t('authPages.login.createAccount')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <SessionNotice code={sessionNotice} onDismiss={dismissNotice} />
        {serverError && <Alert>{serverError}</Alert>}
        <FormField
          label={t('authPages.fields.identifier')}
          id="identifier"
          value={form.identifier}
          onChange={handleChange}
          error={errors.identifier && t(errors.identifier)}
          autoComplete="username"
        />
        <FormField
          label={t('authPages.fields.password')}
          id="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          error={errors.password && t(errors.password)}
          autoComplete="current-password"
        />
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">
            {t('authPages.login.forgotPassword')}
          </Link>
        </div>
        <Button type="submit" loading={submitting} loadingLabel={t('authPages.pleaseWait')} className="w-full">
          {t('authPages.login.submit')}
        </Button>
        <p className="flex items-start gap-2 text-xs text-slate-500">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{t('authPages.login.securityNote')}</span>
        </p>
      </form>
    </AuthCard>
  );
}
