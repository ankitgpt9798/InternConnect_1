const SIZES = {
  sm: 'size-8 text-xs',
  md: 'size-12 text-base',
  lg: 'size-16 text-xl',
};

// The student's initials in a circle (there are no profile photos). Decorative: the name is always shown next to it.
export default function Avatar({ name, size = 'md', tone = 'brand', className = '' }) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => [...word][0]?.toUpperCase() ?? '')
    .join('');
  const colours = tone === 'light' ? 'bg-white text-brand-800' : 'bg-brand-700 text-white';
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${colours} ${SIZES[size]} ${className}`}>
      {letters}
    </span>
  );
}
