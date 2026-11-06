const SIZES = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
};

// A circle with the person's initials, e.g. "Asha Verma" -> "AV".
export default function Avatar({ name, size = 'md' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800 ${SIZES[size]}`}
    >
      {initials}
    </span>
  );
}
