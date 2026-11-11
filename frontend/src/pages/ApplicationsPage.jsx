import { FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { applicationResumeUrl, getMyApplications } from '../api/internships.js';
import Alert from '../components/ui/Alert.jsx';
import { formatDate, WORK_MODE_LABELS } from '../utils/format.js';
import { getErrorMessage } from '../utils/getErrorMessage.js';
import { formatFileSize } from '../utils/resumeFile.js';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyApplications()
      .then(setApplications)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My applications</h1>
        <p className="mt-1 text-slate-600">Internships you have applied for, newest first.</p>
      </div>

      {error && <Alert>{error}</Alert>}

      {!applications ? (
        !error && <p className="py-8 text-center text-slate-500">Loading…</p>
      ) : applications.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-slate-500">
          You have not applied for any internship yet.{' '}
          <Link to="/internships" className="font-semibold text-brand-700 hover:underline">
            Browse internships
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {applications.map(({ id, internship, appliedAt, resume }) => (
            <li key={id} className="px-5 py-4 hover:bg-slate-50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link to={`/internships/${internship.id}`} className="group min-w-0">
                  <p className="font-semibold text-slate-900 group-hover:text-brand-700">{internship.title}</p>
                  <p className="text-sm text-slate-600">
                    {/* Remote listings have "Remote" as their location, so the work mode is not repeated. */}
                    {internship.company} ·{' '}
                    {internship.workMode === 'remote' ? WORK_MODE_LABELS.remote : `${internship.location} · ${WORK_MODE_LABELS[internship.workMode]}`}
                  </p>
                </Link>
                <span className="text-sm text-slate-500">Applied {formatDate(appliedAt)}</span>
              </div>
              {resume ? (
                <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-slate-600">
                  <FileText className="size-4 text-brand-700" aria-hidden="true" />
                  Resume:
                  <a href={applicationResumeUrl(id)} className="font-semibold break-all text-brand-700 hover:underline">
                    {resume.fileName}
                  </a>
                  <span className="text-slate-500">({formatFileSize(resume.size)})</span>
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No resume attached</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
