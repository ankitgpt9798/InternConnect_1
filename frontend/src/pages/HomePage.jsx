import { useEffect, useState } from 'react';
import api from '../api/axios.js';

function StatusRow({ label, value, ok }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-slate-600">{label}</span>
      <span className="flex items-center gap-2 font-medium">
        <span className={`size-2.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
        {value}
      </span>
    </div>
  );
}

export default function HomePage() {
  // null while the first check is still running
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api
      .get('/health')
      .then((res) => setHealth({ api: true, database: res.data.database }))
      .catch((error) =>
        // A response (e.g. 503) means the API is up but the database is not; no response means the API is down.
        setHealth({ api: Boolean(error.response), database: error.response?.data?.database ?? 'unknown' }),
      );
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-brand-700 px-6 py-12 text-white sm:px-10">
        <h1 className="text-3xl font-bold sm:text-4xl">Welcome to InternConnect</h1>
        <p className="mt-3 max-w-2xl text-brand-100">
          Find internships, build your resume and connect with fellow students.
        </p>
      </section>

      <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">System status</h2>
        {health === null ? (
          <p className="mt-3 text-sm text-slate-500">Checking…</p>
        ) : (
          <div className="mt-2 divide-y divide-slate-100 text-sm">
            <StatusRow label="API server" value={health.api ? 'Online' : 'Offline'} ok={health.api} />
            <StatusRow label="Database" value={health.database} ok={health.database === 'connected'} />
          </div>
        )}
      </section>
    </div>
  );
}
