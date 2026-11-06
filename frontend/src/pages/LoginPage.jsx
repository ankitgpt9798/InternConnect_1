import { useState } from 'react';
import { Link } from 'react-router';
import AuthCard from '../components/AuthCard.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import FormField from '../components/ui/FormField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../utils/getErrorMessage.js';
import { validateLogin } from '../utils/validation.js';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      await login(form.identifier, form.password); // on success GuestRoute redirects
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Log in"
      subtitle="Welcome back to InternConnect."
      footer={
        <>
          New to InternConnect?{' '}
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {serverError && <Alert>{serverError}</Alert>}
        <FormField
          label="Email or mobile number"
          id="identifier"
          value={form.identifier}
          onChange={handleChange}
          error={errors.identifier}
          autoComplete="username"
        />
        <FormField
          label="Password"
          id="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          autoComplete="current-password"
        />
        <Button type="submit" loading={submitting} className="w-full">
          Log in
        </Button>
      </form>
    </AuthCard>
  );
}
