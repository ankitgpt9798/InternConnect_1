import { buttonClasses } from './buttonStyles.js';

// A button that is disabled and shows "Please wait…" (or `loadingLabel`, e.g. a translated text) while `loading` is true.
export default function Button({ variant, size, className, loading = false, loadingLabel = 'Please wait…', disabled, children, ...props }) {
  return (
    <button className={buttonClasses({ variant, size, className })} disabled={loading || disabled} {...props}>
      {loading ? loadingLabel : children}
    </button>
  );
}
