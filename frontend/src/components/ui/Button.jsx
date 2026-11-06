import { buttonClasses } from './buttonStyles.js';

// A button that is disabled and shows "Please wait…" while `loading` is true.
export default function Button({ variant, size, className, loading = false, disabled, children, ...props }) {
  return (
    <button className={buttonClasses({ variant, size, className })} disabled={loading || disabled} {...props}>
      {loading ? 'Please wait…' : children}
    </button>
  );
}
