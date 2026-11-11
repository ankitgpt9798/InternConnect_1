import { HelpCircle, Monitor, Smartphone, Tablet } from 'lucide-react';

const ICONS = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };

export default function DeviceIcon({ deviceClass, label }) {
  const Icon = ICONS[deviceClass] ?? HelpCircle;
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600" title={label}>
      <Icon className="size-5" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
