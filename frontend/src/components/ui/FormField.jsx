// A labelled input with its error message underneath.
export default function FormField({ label, id, error, hint, ...inputProps }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        name={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:ring-2 focus:outline-none ${
          error ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:border-brand-500 focus:ring-brand-200'
        }`}
        {...inputProps}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
