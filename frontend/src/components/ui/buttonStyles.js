// Shared button look, used by <Button> and by links that should look like buttons.
const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS = {
  primary: 'bg-brand-700 text-white shadow-sm hover:bg-brand-800',
  secondary: 'border border-slate-300 bg-white text-slate-800 hover:border-brand-300 hover:bg-brand-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  inverse: 'bg-white text-brand-800 shadow-sm hover:bg-brand-50',
  // outlined white button for dark (brand-coloured) backgrounds
  outlineLight: 'border border-white/50 text-white hover:bg-white/10',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-3 text-base',
};

export function buttonClasses({ variant = 'primary', size = 'md', className = '' } = {}) {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`.trim();
}
