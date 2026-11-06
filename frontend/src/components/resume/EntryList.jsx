import { Plus, Trash2 } from 'lucide-react';
import FormField from '../ui/FormField.jsx';
import Button from '../ui/Button.jsx';
import TextArea from './TextArea.jsx';

// Edits a list of resume entries (education, experience or projects).
// fields: [{ key, label, placeholder, multiline }]
export default function EntryList({ name, title, singular, items, fields, max, onChange }) {
  const update = (index, key, value) => onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  const remove = (index) => onChange(items.filter((_, i) => i !== index));
  const add = () => onChange([...items, Object.fromEntries(fields.map((field) => [field.key, '']))]);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {items.length === 0 && <p className="text-sm text-slate-500">Nothing added yet.</p>}

      {items.map((item, index) => (
        <div key={index} className="space-y-3 rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              {singular} {index + 1}
            </p>
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={`Remove ${singular.toLowerCase()} ${index + 1}`}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => {
              const id = `${name}-${index}-${field.key}`;
              const props = { id, label: field.label, placeholder: field.placeholder, value: item[field.key] ?? '' };
              return field.multiline ? (
                <div key={field.key} className="sm:col-span-2">
                  <TextArea {...props} onChange={(event) => update(index, field.key, event.target.value)} />
                </div>
              ) : (
                <FormField key={field.key} {...props} onChange={(event) => update(index, field.key, event.target.value)} />
              );
            })}
          </div>
        </div>
      ))}

      {items.length < max ? (
        <Button type="button" variant="secondary" size="sm" onClick={add}>
          <Plus className="size-4" /> Add {singular.toLowerCase()}
        </Button>
      ) : (
        <p className="text-xs text-slate-500">You can add up to {max}.</p>
      )}
    </section>
  );
}
