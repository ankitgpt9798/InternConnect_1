// Indian number format, e.g. 15000 -> "₹15,000".
export const formatRupees = (amount) => `₹${amount.toLocaleString('en-IN')}`;

// { min: 15000, max: 20000 } -> "₹15,000 – ₹20,000 a month"
export function formatStipend({ min, max }) {
  return min === max ? `${formatRupees(min)} a month` : `${formatRupees(min)} – ${formatRupees(max)} a month`;
}

// "6 Nov 2026"
export const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const WORK_MODE_LABELS = { remote: 'Remote', office: 'In office', hybrid: 'Hybrid' };
