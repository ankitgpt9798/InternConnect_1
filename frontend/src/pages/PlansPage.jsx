import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getMySubscription, getPlans } from '../api/subscriptions.js';
import QuotaSummary from '../components/QuotaSummary.jsx';
import Alert from '../components/ui/Alert.jsx';
import { formatDate, formatRupees } from '../utils/format.js';
import { getErrorMessage } from '../utils/getErrorMessage.js';

function PlanCard({ plan, isCurrent }) {
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
      <p className="mt-3 flex items-center gap-2 text-sm text-slate-700">
        <Check className="size-4 text-green-600" aria-hidden="true" />
        {plan.applicationsPerMonth === null
          ? 'Unlimited internship applications'
          : `${plan.applicationsPerMonth} internship ${plan.applicationsPerMonth === 1 ? 'application' : 'applications'} a month`}
      </p>
    </div>
  );
}

export default function PlansPage() {
  const [plans, setPlans] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getPlans(), getMySubscription()])
      .then(([nextPlans, nextSubscription]) => {
        setPlans(nextPlans);
        setSubscription(nextSubscription);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Plans</h1>
        <p className="mt-1 text-slate-600">Your plan decides how many internships you can apply for each month.</p>
      </div>

      {error && <Alert>{error}</Alert>}

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

      {plans && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} isCurrent={subscription?.plan.id === plan.id} />
          ))}
        </div>
      )}
    </div>
  );
}
