import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getInternships } from '../api/internships.js';
import InternshipCard from '../components/internships/InternshipCard.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import { getErrorMessage } from '../utils/getErrorMessage.js';

export default function InternshipsPage() {
  const [internships, setInternships] = useState(null);
  const [search, setSearch] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    getInternships()
      .then(setInternships)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  async function handleSearch(event) {
    event.preventDefault();
    setSearching(true);
    setError('');
    try {
      setInternships(await getInternships({ search, workMode }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Internships</h1>
          <p className="mt-1 text-slate-600">Open internships, closing soonest first.</p>
        </div>
        <Link to="/applications" className="text-sm font-semibold text-brand-700 hover:underline">
          My applications →
        </Link>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
        <label htmlFor="internship-search" className="sr-only">
          Search internships
        </label>
        <input
          id="internship-search"
          type="search"
          maxLength={50}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by title, company, skill or city"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
        />
        <label htmlFor="work-mode" className="sr-only">
          Work mode
        </label>
        <select
          id="work-mode"
          value={workMode}
          onChange={(event) => setWorkMode(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
        >
          <option value="">Any work mode</option>
          <option value="remote">Remote</option>
          <option value="office">In office</option>
          <option value="hybrid">Hybrid</option>
        </select>
        <Button type="submit" loading={searching}>
          <Search className="size-4" /> Search
        </Button>
      </form>

      {error && <Alert>{error}</Alert>}

      {!internships ? (
        !error && <p className="py-8 text-center text-slate-500">Loading internships…</p>
      ) : internships.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-slate-500">
          No open internships match your search.
        </p>
      ) : (
        <div className="space-y-4">
          {internships.map((internship) => (
            <InternshipCard key={internship.id} internship={internship} />
          ))}
        </div>
      )}
    </div>
  );
}
