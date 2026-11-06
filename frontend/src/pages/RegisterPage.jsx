import { useState } from 'react';
import { Link } from 'react-router';
import AuthCard from '../components/AuthCard.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import FormField from '../components/ui/FormField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage, getFieldErrors } from '../utils/getErrorMessage.js';
import { validateRegister } from '../utils/validation.js';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setServerError('');

    const found = validateRegister(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await register(form); // on success GuestRoute moves the new user to the dashboard
    } catch (error) {
      setErrors(getFieldErrors(error));
      setServerError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join InternConnect to apply for internships and connect with students."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {serverError && <Alert>{serverError}</Alert>}
        <FormField label="Full name" id="name" value={form.name} onChange={handleChange} error={errors.name} autoComplete="name" />
        <FormField label="Email" id="email" type="email" value={form.email} onChange={handleChange} error={errors.email} autoComplete="email" />
        <FormField
          label="Mobile number"
          id="phone"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="9876543210"
          value={form.phone}
          onChange={handleChange}
          error={errors.phone}
          hint="10-digit Indian mobile number"
          autoComplete="tel-national"
        />
        <FormField
          label="Password"
          id="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          hint="At least 8 characters"
          autoComplete="new-password"
        />
        <Button type="submit" loading={submitting} className="w-full">
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
