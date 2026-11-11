import { ArrowRight, Briefcase, CalendarClock, Check, Clock, Hourglass, IndianRupee, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { formatDateIn, formatLocationText, formatStipendText } from '../../utils/internshipFormat.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const CLOSING_SOON_DAYS = 3; // listings closing within this many days are marked
const MAX_SKILLS = 4;

// Where the internship is (with its work mode), then duration, stipend and deadline. Used on the cards and on the
// internship's own page.
export function InternshipFacts({ internship, withLocation = true, className = '' }) {
  const { t, i18n } = useTranslation();
  const facts = [
    { key: 'duration', icon: Clock, value: t('internships.durationMonths', { count: internship.durationMonths }) },
    { key: 'stipend', icon: IndianRupee, value: formatStipendText(internship.stipend, t, i18n.language), highlight: internship.stipend.max > 0 },
    { key: 'deadline', icon: CalendarClock, value: formatDateIn(internship.applyBy, i18n.language) },
  ];

  return (
    <div className={className}>
      {withLocation && (
        <p className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600">
          <MapPin className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
          {formatLocationText(internship, t)}
        </p>
      )}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {facts.map(({ key, icon: Icon, value, highlight }) => (
          <div key={key} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Icon className="size-3.5 shrink-0" aria-hidden="true" />
              {t(`internships.facts.${key}`)}
            </dt>
            <dd className={`mt-0.5 text-sm font-semibold ${highlight ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// "Closes today" or "Closes in 2 days" when the deadline is near; nothing otherwise.
function DeadlineBadge({ applyBy }) {
  const { t } = useTranslation();
  const [now] = useState(() => Date.now()); // the badge does not need to change while the page is open
  const msLeft = new Date(applyBy).getTime() - now;
  if (msLeft < 0) return null;
  const days = Math.floor(msLeft / DAY_MS);
  if (days > CLOSING_SOON_DAYS) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
      <Hourglass className="size-3.5" aria-hidden="true" />
      {days === 0 ? t('internships.closesToday') : t('internships.closesIn', { count: days })}
    </span>
  );
}

// The first letters of the company name, in place of a logo (the sample companies have none).
const initials = (name) =>
  name
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');

// One listing in the results. The whole card opens the internship.
export default function InternshipCard({ internship }) {
  const { t } = useTranslation();
  const extraSkills = internship.skills.length - MAX_SKILLS;

  return (
    <Link
      to={`/internships/${internship.id}`}
      className="group block rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-[border-color,box-shadow] hover:border-brand-200 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
    >
      <div className="flex gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700 ring-1 ring-brand-100" aria-hidden="true">
          {initials(internship.company)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-lg leading-snug font-semibold text-slate-900 group-hover:text-brand-700">{internship.title}</h2>
              <p className="mt-0.5 text-sm text-slate-600">{internship.company}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <DeadlineBadge applyBy={internship.applyBy} />
              {internship.appliedAt && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 ring-1 ring-green-200">
                  <Check className="size-3.5" aria-hidden="true" /> {t('applications.status.submitted')}
                </span>
              )}
            </div>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
              {formatLocationText(internship, t)}
            </span>
            {internship.category && (
              <span className="inline-flex items-center gap-1">
                <Briefcase className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                {t(`internships.categories.${internship.category}`)}
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                internship.engagement === 'part_time' ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-slate-50 text-slate-700 ring-slate-200'
              }`}
            >
              {t(`internships.engagements.${internship.engagement ?? 'full_time'}`)}
            </span>
          </p>
        </div>
      </div>

      <InternshipFacts internship={internship} withLocation={false} className="mt-4 border-t border-slate-100 pt-4" />

      <div className="mt-4 flex items-end justify-between gap-3">
        <ul className="flex flex-wrap gap-1.5" aria-label={t('internships.detail.skills')}>
          {internship.skills.slice(0, MAX_SKILLS).map((skill) => (
            <li key={skill} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {skill}
            </li>
          ))}
          {extraSkills > 0 && <li className="px-1 py-0.5 text-xs text-slate-500">{t('internships.moreSkills', { count: extraSkills })}</li>}
        </ul>
        <ArrowRight className="size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden="true" />
      </div>
    </Link>
  );
}
