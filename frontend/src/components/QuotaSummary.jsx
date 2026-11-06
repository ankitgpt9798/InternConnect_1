import { Link } from 'react-router';
import { formatDate } from '../utils/format.js';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// "Free plan: 1 of 1 applications used this month (resets on 1 Dec 2026)."
export default function QuotaSummary({ quota, showUpgradeLink = true }) {
  if (!quota) return null;
  const { plan, used, limit, remaining, resetsAt } = quota;
  const period = plan.id === 'free' ? 'this month' : 'in this plan period';

  return (
    <p className={`text-sm ${remaining === 0 ? 'text-amber-700' : 'text-slate-600'}`}>
      <span className="font-semibold">{plan.name} plan:</span>{' '}
      {limit === null
        ? `unlimited applications (${plural(used, 'application')} so far ${period}).`
        : `${used} of ${plural(limit, 'application')} used ${period}, ${remaining} left. The count restarts on ${formatDate(resetsAt)}.`}
      {remaining === 0 && showUpgradeLink && (
        <>
          {' '}
          <Link to="/plans" className="font-semibold text-brand-700 hover:underline">
            Upgrade your plan
          </Link>
        </>
      )}
    </p>
  );
}
