import { Crown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { verifyPayment } from '../../api/payments.js';
import { requestResumeCode, verifyResumeCode } from '../../api/resumes.js';
import { getErrorMessage } from '../../utils/getErrorMessage.js';
import { openRazorpayCheckout } from '../../utils/razorpay.js';
import Alert from '../ui/Alert.jsx';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';

// The premium resume PDF: 1. email code -> 2. code confirmed -> 3. ₹50 Razorpay payment -> 4. PDF ready.
export default function PremiumPdfPanel({ ready, unsaved, onGenerated }) {
  const [sent, setSent] = useState(null); // answer once a code was emailed
  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type, text }

  // Counts down once a second while a new code cannot be requested yet.
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function sendCode() {
    setBusy(true);
    setMessage(null);
    try {
      const data = await requestResumeCode();
      setSent(data);
      setCode('');
      setResendIn(data.resendAfterSeconds);
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
      if (err.response?.data?.retryAfterSeconds) setResendIn(err.response.data.retryAfterSeconds);
    } finally {
      setBusy(false);
    }
  }

  async function confirmAndPay(event) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setMessage({ type: 'error', text: 'Enter the 6-digit code.' });
      return;
    }
    setBusy(true);
    setMessage(null);

    let checkout;
    try {
      ({ checkout } = await verifyResumeCode(code));
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
      setBusy(false);
      return;
    }

    // The code has been used: after this, trying again needs a new code.
    setSent(null);
    try {
      await openRazorpayCheckout(checkout, {
        onPaid: async (response) => {
          try {
            const data = await verifyPayment(response);
            setMessage({ type: 'success', text: `${data.message} Invoice number: ${data.invoiceNumber}.` });
            onGenerated();
          } catch (err) {
            setMessage({ type: 'error', text: getErrorMessage(err) });
          } finally {
            setBusy(false);
          }
        },
        onFailed: (error) =>
          setMessage({ type: 'error', text: `Payment failed: ${error?.description ?? 'please try again.'} You can try again in the Razorpay window.` }),
        onClosed: () => {
          setBusy(false);
          setMessage((current) => current ?? { type: 'info', text: 'Payment cancelled. No money was taken. Ask for a new code to try again.' });
        },
      });
    } catch {
      setMessage({ type: 'error', text: 'Razorpay Checkout could not be loaded. Check your internet connection and ask for a new code.' });
      setBusy(false);
    }
  }

  const blocked = !ready ? 'Complete the checklist above first.' : unsaved ? 'Save your changes first: the PDF uses your last saved draft.' : '';

  return (
    <section className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50 p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-brand-900">
        <Crown className="size-5" aria-hidden="true" /> Premium resume PDF – ₹50
      </h2>
      <p className="text-sm text-slate-700">
        A clean, ATS-friendly PDF of your saved resume. We first email a code to your registered address, then you pay
        ₹50 with Razorpay (Test Mode, no real money). The PDF is attached to your profile and you can download it again
        for free. Editing your resume later needs a new PDF.
      </p>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      {!sent ? (
        <div>
          <Button onClick={sendCode} loading={busy} disabled={!!blocked || resendIn > 0}>
            {resendIn > 0 ? `Get the code (wait ${resendIn}s)` : 'Get my resume PDF – ₹50'}
          </Button>
          {blocked && <p className="mt-2 text-sm text-amber-800">{blocked}</p>}
        </div>
      ) : (
        <form onSubmit={confirmAndPay} noValidate className="space-y-3">
          <Alert type="info">
            {sent.message} The code works for {sent.expiresInMinutes} minutes.
          </Alert>
          <div className="max-w-xs">
            <FormField
              label="6-digit code"
              id="resume-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={busy}>
              Confirm and pay ₹50
            </Button>
            <button
              type="button"
              onClick={sendCode}
              disabled={busy || resendIn > 0}
              className="text-sm font-medium text-brand-700 hover:underline disabled:text-slate-400 disabled:no-underline"
            >
              {resendIn > 0 ? `Send a new code in ${resendIn}s` : 'Send a new code'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
