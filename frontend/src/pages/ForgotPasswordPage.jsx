import { Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { requestResetCode, resetPassword } from '../api/password.js';
import AuthCard from '../components/AuthCard.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import { buttonClasses } from '../components/ui/buttonStyles.js';
import FormField from '../components/ui/FormField.jsx';
import { getErrorMessage } from '../utils/getErrorMessage.js';

// Three steps: 1. email or mobile number -> 2. the 6-digit code -> 3. the new password, shown once.
export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(null); // the server's answer once a code was sent
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null); // { password, sentTo } after a successful reset
  const [resendIn, setResendIn] = useState(0); // seconds until a new code can be asked for
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Counts down once a second while a new code cannot be requested yet.
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function sendCode() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await requestResetCode(identifier.trim());
      setSent(data);
      setCode('');
      setResendIn(data.resendAfterSeconds);
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      if (err.response?.data?.retryAfterSeconds) setResendIn(err.response.data.retryAfterSeconds);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleRequest(event) {
    event.preventDefault();
    if (!identifier.trim()) {
      setError('Enter your email or mobile number.');
      return;
    }
    await sendCode();
  }

  async function handleResend() {
    if (await sendCode()) setNotice('A new code has been sent. The previous code no longer works.');
  }

  async function handleReset(event) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      setResult(await resetPassword(identifier.trim(), code));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(result.password);
      setCopied(true);
    } catch {
      setError('Copying did not work. Please write the password down.');
    }
  }

  function startOver() {
    setSent(null);
    setCode('');
    setError('');
    setNotice('');
  }

  // Step 3: the new password
  if (result) {
    return (
      <AuthCard title="Password reset" subtitle="Your new password is ready.">
        <div className="space-y-4">
          <Alert type="success">
            {result.message} We also sent it to {result.sentTo}.
          </Alert>
          <div>
            <p className="text-sm font-medium text-slate-700">Your new password</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-lg tracking-wider text-slate-900">
                {result.password}
              </code>
              <Button type="button" variant="secondary" onClick={copyPassword} aria-label="Copy password">
                <Copy className="size-4" />
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="mt-2 text-xs text-amber-700">It is shown only once. Copy it or write it down before leaving this page.</p>
          </div>
          {error && <Alert>{error}</Alert>}
          <Link to="/login" className={buttonClasses({ className: 'w-full' })}>
            Log in with the new password
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot password"
      subtitle={sent ? 'Enter the code we sent you.' : 'We will send a 6-digit code to your email or mobile number.'}
      footer={
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          Back to log in
        </Link>
      }
    >
      {sent ? (
        // Step 2: the code
        <form onSubmit={handleReset} noValidate className="space-y-4">
          <Alert type="info">
            {sent.message} The code works for {sent.expiresInMinutes} minutes.
            {sent.channel === 'phone' && ' (SMS is simulated in this project: the code appears in the backend terminal.)'}
          </Alert>
          {notice && <Alert type="success">{notice}</Alert>}
          {error && <Alert>{error}</Alert>}
          <FormField
            label="6-digit code"
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          />
          <Button type="submit" loading={busy} className="w-full">
            Reset password
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button type="button" onClick={handleResend} disabled={busy || resendIn > 0} className="font-medium text-brand-700 hover:underline disabled:text-slate-400 disabled:no-underline">
              {resendIn > 0 ? `Send a new code in ${resendIn}s` : 'Send a new code'}
            </button>
            <button type="button" onClick={startOver} className="text-slate-600 hover:underline">
              Use a different email or number
            </button>
          </div>
        </form>
      ) : (
        // Step 1: email or mobile number
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
          <Button type="submit" loading={busy} className="w-full">
            Send code
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
