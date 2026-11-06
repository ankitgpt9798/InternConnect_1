import { useState } from 'react';
import { Link } from 'react-router';
import { requestResetCode } from '../api/password.js';
import AuthCard from '../components/AuthCard.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import FormField from '../components/ui/FormField.jsx';
import { getErrorMessage } from '../utils/getErrorMessage.js';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(null); // the server's answer once a code was sent
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function handleRequest(event) {
    event.preventDefault();
    if (!identifier.trim()) {
      setError('Enter your email or mobile number.');
      return;
    }
    setSending(true);
    setError('');
    try {
      setSent(await requestResetCode(identifier.trim()));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthCard
      title="Forgot password"
      subtitle="We will send a 6-digit code to your email or mobile number."
      footer={
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <Alert type="success">
          {sent.message} The code works for {sent.expiresInMinutes} minutes.
          {sent.channel === 'phone' && ' (SMS is simulated in this project: the code appears in the backend terminal.)'}
        </Alert>
      ) : (
        <form onSubmit={handleRequest} noValidate className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <FormField
            label="Email or mobile number"
            id="identifier"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            autoComplete="username"
          />
          <p className="text-xs text-slate-500">You can reset your password once per day.</p>
          <Button type="submit" loading={sending} className="w-full">
            Send code
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
