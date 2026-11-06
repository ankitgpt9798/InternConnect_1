import { Check, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createSubscriptionOrder, getMyPayments, getPaymentWindow, verifyPayment } from '../api/payments.js';
import { getMySubscription, getPlans } from '../api/subscriptions.js';
import QuotaSummary from '../components/QuotaSummary.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import { formatDate, formatRupees } from '../utils/format.js';
import { getErrorMessage } from '../utils/getErrorMessage.js';
import { openRazorpayCheckout } from '../utils/razorpay.js';

const formatTime = (date) => new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

function PlanCard({ plan, isCurrent, canBuy, busy, onBuy }) {
  return (
    <div className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${isCurrent ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
        {isCurrent && <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800">Current plan</span>}
      </div>
      <p className="mt-2">
        <span className="text-2xl font-bold text-slate-900">{formatRupees(plan.price)}</span>
        <span className="text-sm text-slate-500">{plan.price === 0 ? ' forever' : ' for 30 days'}</span>
      </p>
      <p className="mt-3 flex flex-1 items-start gap-2 text-sm text-slate-700">
        <Check className="mt-0.5 size-4 shrink-0 text-green-600" aria-hidden="true" />
        {plan.applicationsPerMonth === null
          ? 'Unlimited internship applications'
          : `${plan.applicationsPerMonth} internship ${plan.applicationsPerMonth === 1 ? 'application' : 'applications'} a month`}
      </p>
      {plan.price > 0 && (
        <Button className="mt-4 w-full" onClick={() => onBuy(plan)} disabled={!canBuy || !!busy} loading={busy === plan.id}>
          {isCurrent ? `Renew ${plan.name}` : `Buy ${plan.name}`}
        </Button>
      )}
    </div>
  );
}

export default function PlansPage() {
  const [plans, setPlans] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [paymentWindow, setPaymentWindow] = useState(null); // the 5:00-11:45 AM IST payment window
  const [payments, setPayments] = useState([]);
  const [busy, setBusy] = useState(''); // id of the plan being bought
  const [message, setMessage] = useState(null); // { type, text }

  useEffect(() => {
    Promise.all([getPlans(), getMySubscription(), getPaymentWindow(), getMyPayments()])
      .then(([nextPlans, nextSubscription, nextWindow, nextPayments]) => {
        setPlans(nextPlans);
        setSubscription(nextSubscription);
        setPaymentWindow(nextWindow);
        setPayments(nextPayments);
      })
      .catch((err) => setMessage({ type: 'error', text: getErrorMessage(err) }));
  }, []);

  async function handleBuy(plan) {
    setBusy(plan.id);
    setMessage(null);

    // 1. The server creates the Razorpay order (and refuses outside the payment window).
    let checkout;
    try {
      ({ checkout } = await createSubscriptionOrder(plan.id));
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
      if (err.response?.data?.window) setPaymentWindow(err.response.data.window);
      setBusy('');
      return;
    }

    // 2. The student pays in Razorpay Checkout; 3. the server verifies the payment and starts the plan.
    try {
      await openRazorpayCheckout(checkout, {
        onPaid: async (response) => {
          try {
            const data = await verifyPayment(response);
            setMessage({ type: 'success', text: `${data.message} Invoice number: ${data.invoiceNumber}.` });
            setSubscription(data.subscription);
            setPayments(await getMyPayments());
          } catch (err) {
            setMessage({ type: 'error', text: getErrorMessage(err) });
          } finally {
            setBusy('');
          }
        },
        onFailed: (error) =>
          setMessage({ type: 'error', text: `Payment failed: ${error?.description ?? 'please try again.'} You can try again in the Razorpay window.` }),
        onClosed: () => {
          setBusy('');
          setMessage((current) => current ?? { type: 'info', text: 'Payment cancelled. No money was taken.' });
        },
      });
    } catch {
      setMessage({ type: 'error', text: 'Razorpay Checkout could not be loaded. Check your internet connection and try again.' });
      setBusy('');
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Plans</h1>
        <p className="mt-1 text-slate-600">Your plan decides how many internships you can apply for each month.</p>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      {subscription && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Your plan</h2>
          <div className="mt-1">
            <QuotaSummary quota={subscription} showUpgradeLink={false} />
          </div>
          {subscription.expiresAt && (
            <p className="mt-1 text-sm text-slate-600">Valid until {formatDate(subscription.expiresAt)}; after that you are back on Free.</p>
          )}
        </section>
      )}

      {paymentWindow && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
            paymentWindow.open ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Plan payments can be made only between 5:00 AM and 11:45 AM IST.{' '}
            {paymentWindow.open
              ? paymentWindow.testOverride
                ? 'Payments are open now because the local test switch is on.'
                : 'Payments are open now.'
              : `Payments are closed now and open again on ${formatTime(paymentWindow.opensAt)} IST.`}
          </p>
        </div>
      )}

      {plans && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={subscription?.plan.id === plan.id}
              canBuy={!!paymentWindow?.open}
              busy={busy}
              onBuy={handleBuy}
            />
          ))}
        </div>
      )}
      <p className="text-xs text-slate-500">
        Buying a plan starts it straight away for 30 days and replaces your current plan. Payments use Razorpay Test Mode,
        so no real money is charged.
      </p>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Payment history</h2>
        {payments.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No payments yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-xs text-slate-500 uppercase">
                <tr>
                  <th className="py-2 pr-4 font-medium">Paid on</th>
                  <th className="py-2 pr-4 font-medium">Plan</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">Invoice</th>
                  <th className="py-2 font-medium">Razorpay payment ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-2 pr-4">{formatTime(payment.paidAt)}</td>
                    <td className="py-2 pr-4">{payment.plan ?? 'Resume'}</td>
                    <td className="py-2 pr-4">{formatRupees(payment.amount)}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{payment.invoiceNumber}</td>
                    <td className="py-2 font-mono text-xs">{payment.razorpayPaymentId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">Each invoice is also emailed to you after the payment.</p>
      </section>
    </div>
  );
}
