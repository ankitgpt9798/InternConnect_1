import { CalendarClock, Check, Clock, IndianRupee, MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { formatDate, formatStipend, WORK_MODE_LABELS } from '../../utils/format.js';

export function InternshipFacts({ internship }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
      <li className="inline-flex items-center gap-1">
        <MapPin className="size-4" aria-hidden="true" />
        {internship.location} · {WORK_MODE_LABELS[internship.workMode]}
      </li>
      <li className="inline-flex items-center gap-1">
        <IndianRupee className="size-4" aria-hidden="true" />
        {formatStipend(internship.stipend)}
      </li>
      <li className="inline-flex items-center gap-1">
        <Clock className="size-4" aria-hidden="true" />
        {internship.durationMonths} {internship.durationMonths === 1 ? 'month' : 'months'}
      </li>
      <li className="inline-flex items-center gap-1">
        <CalendarClock className="size-4" aria-hidden="true" />
        Apply by {formatDate(internship.applyBy)}
      </li>
    </ul>
  );
}

export default function InternshipCard({ internship }) {
  return (
    <Link
      to={`/internships/${internship.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900">{internship.title}</h2>
          <p className="text-sm text-slate-600">{internship.company}</p>
        </div>
        {internship.appliedAt && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
            <Check className="size-3.5" /> Applied
          </span>
        )}
      </div>
      <div className="mt-3">
        <InternshipFacts internship={internship} />
      </div>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {internship.skills.map((skill) => (
          <li key={skill} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
            {skill}
          </li>
        ))}
      </ul>
    </Link>
  );
}
