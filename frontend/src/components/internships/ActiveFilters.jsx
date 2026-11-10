import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatRupeesIn } from '../../utils/internshipFormat.js';

// The filters in use as removable chips (the search words stay in the search box), with "Clear all".
export default function ActiveFilters({ filters, onRemove, onClear }) {
  const { t, i18n } = useTranslation();
  const labels = {
    category: filters.category && t(`internships.categories.${filters.category}`),
    workMode: filters.workMode && t(`internships.workModes.${filters.workMode}`),
    engagement: filters.engagement && t(`internships.engagements.${filters.engagement}`),
    city: filters.city,
    minStipend: filters.minStipend && t('internships.filters.stipendAtLeast', { amount: formatRupeesIn(Number(filters.minStipend), i18n.language) }),
    maxDuration: filters.maxDuration && t('internships.filters.durationUpTo', { count: Number(filters.maxDuration) }),
  };
  const chips = Object.entries(labels).filter(([, label]) => label);
  if (chips.length === 0) return null;

  return (
    <div role="group" aria-label={t('internships.chips.label')} className="flex flex-wrap items-center gap-2">
      {chips.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onRemove(key)}
          aria-label={t('internships.chips.remove', { filter: label })}
          className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pr-2 pl-3 text-xs font-medium text-brand-800 ring-1 ring-brand-200 transition-colors hover:bg-brand-100"
        >
          {label}
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ))}
      <button type="button" onClick={onClear} className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:text-brand-700 hover:underline">
        {t('internships.chips.clearAll')}
      </button>
    </div>
  );
}
