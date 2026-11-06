import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { applyToInternship, getInternship } from '../api/internships.js';
import { InternshipFacts } from '../components/internships/InternshipCard.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import { formatDate } from '../utils/format.js';
import { getErrorMessage } from '../utils/getErrorMessage.js';

// The same limits as the backend (backend/src/models/Application.js).
const COVER_LETTER_MIN = 50;
const COVER_LETTER_MAX = 1000;

export default function InternshipDetailPage() {
  const { id } = useParams();
  const [internship, setInternship] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getInternship(id)
      .then(setInternship)
      .catch((err) => setError(err.response?.status === 404 ? 'This internship does not exist.' : getErrorMessage(err)));
  }, [id]);

  async function handleApply(event) {
    event.preventDefault();
    const length = coverLetter.trim().length;
    if (length < COVER_LETTER_MIN || length > COVER_LETTER_MAX) {
      setError(`Write a cover letter of ${COVER_LETTER_MIN} to ${COVER_LETTER_MAX} characters.`);
      return;
    }
    setSending(true);
    setError('');
    try {
      const data = await applyToInternship(id, coverLetter);
      setSuccess(data.message);
      setInternship({ ...internship, appliedAt: data.appliedAt });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/internships" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
        <ArrowLeft className="size-4" />
        Back to internships
      </Link>

      {!internship ? (
        error ? <Alert>{error}</Alert> : <p className="py-8 text-center text-slate-500">Loading…</p>
      ) : (
        <>
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{internship.title}</h1>
              <p className="text-slate-600">{internship.company}</p>
            </div>
            <InternshipFacts internship={internship} />
            <p className="leading-relaxed text-slate-800">{internship.description}</p>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Skills</h2>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {internship.skills.map((skill) => (
                  <li key={skill} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Apply</h2>
            {success && (
              <div className="mt-3">
                <Alert type="success">{success}</Alert>
              </div>
            )}
            {internship.appliedAt ? (
              <p className="mt-2 text-sm text-slate-600">
                You applied on {formatDate(internship.appliedAt)}. See it in{' '}
                <Link to="/applications" className="font-semibold text-brand-700 hover:underline">
                  My applications
                </Link>
                .
              </p>
            ) : !internship.isOpen ? (
              <p className="mt-2 text-sm text-slate-600">Applications for this internship are closed.</p>
            ) : (
              <form onSubmit={handleApply} noValidate className="mt-3 space-y-3">
                {error && <Alert>{error}</Alert>}
                <label htmlFor="cover-letter" className="block text-sm font-medium text-slate-700">
                  Why should we pick you? (cover letter)
                </label>
                <textarea
                  id="cover-letter"
                  rows={6}
                  maxLength={COVER_LETTER_MAX}
                  value={coverLetter}
                  onChange={(event) => setCoverLetter(event.target.value)}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                />
                <p className="text-xs text-slate-500">
                  {coverLetter.trim().length}/{COVER_LETTER_MAX} characters (at least {COVER_LETTER_MIN})
                </p>
                <Button type="submit" loading={sending}>
                  Submit application
                </Button>
              </form>
            )}
          </section>
        </>
      )}
    </div>
  );
}
