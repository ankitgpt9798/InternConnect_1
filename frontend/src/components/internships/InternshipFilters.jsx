import { SlidersHorizontal } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CATEGORIES,
  DURATION_STEPS,
  ENGAGEMENTS,
  formatRupeesIn,
  PANEL_FILTERS,
  STIPEND_STEPS,
  WORK_MODES,
} from '../../utils/internshipFormat.js';
import { buttonClasses } from '../ui/buttonStyles.js';

function FilterSelect({ label, value, onChange, children }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none ${
          value ? 'border-brand-300 bg-brand-50/50' : 'border-slate-300 bg-white'
        }`}
      >
        {children}
      </select>
    </div>
  );
}

// The Filters card. `filters` are the values from the page address; onChange(key, value) with an empty value removes
// that filter. On phones and tablets the card opens with a button so the results stay near the top.
export default function InternshipFilters({ filters, cities, onChange, onClear }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  // A city from a shared link stays selectable even if no open internship has it any more.
  const cityOptions = filters.city && !cities.includes(filters.city) ? [filters.city, ...cities] : cities;
  const active = PANEL_FILTERS.filter((key) => filters[key]).length;

  return (
    <section aria-label={t('internships.filters.title')} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span className="flex size-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700" aria-hidden="true">
            <SlidersHorizontal className="size-4" />
          </span>
          {t('internships.filters.title')}
          {active > 0 && <span className="rounded-full bg-brand-700 px-2 py-0.5 text-xs text-white">{active}</span>}
        </h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="rounded-md px-2 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50 lg:hidden"
        >
          {t(open ? 'internships.filters.hide' : 'internships.filters.show')}
        </button>
      </div>

      <div id={panelId} className={`${open ? 'block' : 'hidden'} mt-4 space-y-4 lg:block`}>
        <FilterSelect label={t('internships.filters.category')} value={filters.category} onChange={(value) => onChange('category', value)}>
          <option value="">{t('internships.filters.anyCategory')}</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {t(`internships.categories.${category}`)}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label={t('internships.filters.workMode')} value={filters.workMode} onChange={(value) => onChange('workMode', value)}>
          <option value="">{t('internships.filters.any')}</option>
          {WORK_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(`internships.workModes.${mode}`)}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label={t('internships.filters.location')} value={filters.city} onChange={(value) => onChange('city', value)}>
          <option value="">{t('internships.filters.anyCity')}</option>
          {cityOptions.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label={t('internships.filters.engagement')} value={filters.engagement} onChange={(value) => onChange('engagement', value)}>
          <option value="">{t('internships.filters.any')}</option>
          {ENGAGEMENTS.map((engagement) => (
            <option key={engagement} value={engagement}>
              {t(`internships.engagements.${engagement}`)}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label={t('internships.filters.minStipend')} value={filters.minStipend} onChange={(value) => onChange('minStipend', value)}>
          <option value="">{t('internships.filters.any')}</option>
          {STIPEND_STEPS.map((amount) => (
            <option key={amount} value={String(amount)}>
              {t('internships.filters.stipendAtLeast', { amount: formatRupeesIn(amount, i18n.language) })}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label={t('internships.filters.maxDuration')} value={filters.maxDuration} onChange={(value) => onChange('maxDuration', value)}>
          <option value="">{t('internships.filters.any')}</option>
          {DURATION_STEPS.map((months) => (
            <option key={months} value={String(months)}>
              {t('internships.filters.durationUpTo', { count: months })}
            </option>
          ))}
        </FilterSelect>

        <button
          type="button"
          onClick={onClear}
          disabled={active === 0 && !filters.search}
          className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'w-full' })}
        >
          {t('internships.filters.clear')}
        </button>
      </div>
    </section>
  );
}
