import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import OtpVerificationStep from '../components/auth/OtpVerificationStep.jsx';
import AuthCard from '../components/AuthCard.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import { buttonClasses } from '../components/ui/buttonStyles.js';
import FormField from '../components/ui/FormField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { authErrorMessage, fieldErrorsFrom } from '../utils/authErrors.js';
import { formatIstTime } from '../utils/securityFormat.js';
import { validateRegister } from '../utils/validation.js';

export default function RegisterPage() {
  const { t, i18n } = useTranslation();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [challenge, setChallenge] = useState(null); // the email code that confirms the new account
  const [createdOpensAt, setCreatedOpensAt] = useState(null); // phone/tablet outside 10 AM–1 PM IST: no session yet

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setServerError('');

    const found = validateRegister(form);
    setErrors(Object.fromEntries(Object.entries(found).map(([field, key]) => [field, t(key)])));
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const result = await register(form);
      if (result.step === 'otp') setChallenge(result.challenge);
      if (result.step === 'created') setCreatedOpensAt(result.opensAt);
    } catch (error) {
      setErrors(fieldErrorsFrom(error, t));
      setServerError(authErrorMessage(error, t, i18n.language));
    } finally {
      setSubmitting(false);
    }
  }

  if (createdOpensAt) {
    return (
      <AuthCard title={t('authPages.register.createdTitle')}>
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-sm text-slate-700">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>{t('authPages.register.createdBody', { time: formatIstTime(createdOpensAt, i18n.language) })}</span>
          </p>
          <Link to="/login" className={buttonClasses({ className: 'w-full' })}>
            {t('authPages.register.goToLogin')}
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (challenge) {
    return (
      <AuthCard title={t('otp.titleRegister')}>
        <OtpVerificationStep challenge={challenge} purpose="register" onRestart={() => setChallenge(null)} />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t('authPages.register.title')}
      subtitle={t('authPages.register.subtitle')}
      footer={
        <>
          {t('authPages.register.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            {t('authPages.register.logIn')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {serverError && <Alert>{serverError}</Alert>}
        <FormField label={t('authPages.fields.name')} id="name" value={form.name} onChange={handleChange} error={errors.name} autoComplete="name" />
        <FormField
          label={t('authPages.fields.email')}
          id="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          hint={t('authPages.register.emailHint')}
          autoComplete="email"
        />
        <FormField
          label={t('authPages.fields.phone')}
          id="phone"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="9876543210"
          value={form.phone}
          onChange={handleChange}
          error={errors.phone}
          hint={t('authPages.register.phoneHint')}
          autoComplete="tel-national"
        />
        <FormField
          label={t('authPages.fields.password')}
          id="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          hint={t('authPages.register.passwordHint')}
          autoComplete="new-password"
        />
        <Button type="submit" loading={submitting} loadingLabel={t('authPages.pleaseWait')} className="w-full">
          {t('authPages.register.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
