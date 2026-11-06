const STYLES = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-green-200 bg-green-50 text-green-800',
  info: 'border-brand-200 bg-brand-50 text-brand-900',
};

export default function Alert({ type = 'error', children }) {
  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${STYLES[type]}`}>
      {children}
    </div>
  );
}
