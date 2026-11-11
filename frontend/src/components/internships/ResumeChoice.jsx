import { FileText, Upload, X } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router';
import { resumePdfUrl } from '../../api/resumes.js';
import { formatDate } from '../../utils/format.js';
import { formatFileSize, RESUME_MAX_BYTES } from '../../utils/resumeFile.js';

const optionClasses = (selected) =>
  `flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors ${
    selected ? 'border-brand-300 bg-brand-50/60' : 'border-slate-200 hover:border-slate-300'
  }`;

// The resume part of the apply form: upload a PDF, or (when the student has one) use their InternConnect resume PDF
// from the Resume Builder. `source` is 'upload' or 'internconnect'.
export default function ResumeChoice({ internconnectResume, source, onSourceChange, file, onFileChange }) {
  const inputRef = useRef(null);
  const internconnectName = internconnectResume ? `${internconnectResume.fullName.replace(/[^A-Za-z0-9]+/g, '-')}-Resume.pdf` : '';

  function clearFile() {
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const uploadBox = (
    <div className="mt-2">
      <input
        ref={inputRef}
        id="resume-file"
        type="file"
        accept="application/pdf,.pdf"
        className="peer sr-only"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />
      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <FileText className="size-5 shrink-0 text-brand-700" aria-hidden="true" />
            <span className="truncate font-medium text-slate-900">{file.name}</span>
            <span className="shrink-0 text-slate-500">{formatFileSize(file.size)}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <label htmlFor="resume-file" className="cursor-pointer rounded-md px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50">
              Change
            </label>
            <button type="button" onClick={clearFile} aria-label="Remove the selected resume" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
              <X className="size-4" aria-hidden="true" />
            </button>
          </span>
        </div>
      ) : (
        <label
          htmlFor="resume-file"
          className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition-colors peer-focus-visible:border-brand-500 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-200 hover:border-brand-300 hover:bg-brand-50/40"
        >
          <Upload className="size-6 text-brand-700" aria-hidden="true" />
          <span className="text-sm font-semibold text-slate-900">Choose your resume (PDF)</span>
          <span className="text-xs text-slate-500">Up to {formatFileSize(RESUME_MAX_BYTES)}</span>
        </label>
      )}
    </div>
  );

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-700">
        Resume <span className="font-normal text-slate-500">(required, PDF up to {formatFileSize(RESUME_MAX_BYTES)})</span>
      </legend>

      {internconnectResume ? (
        <>
          <label className={optionClasses(source === 'upload')}>
            <input type="radio" name="resume-source" value="upload" checked={source === 'upload'} onChange={() => onSourceChange('upload')} className="mt-0.5 accent-brand-700" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-slate-900">Upload a PDF</span>
              <span className="block text-slate-600">Send a resume file from your device.</span>
            </span>
          </label>
          {source === 'upload' && uploadBox}
          <label className={optionClasses(source === 'internconnect')}>
            <input
              type="radio"
              name="resume-source"
              value="internconnect"
              checked={source === 'internconnect'}
              onChange={() => onSourceChange('internconnect')}
              className="mt-0.5 accent-brand-700"
            />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-slate-900">Use my InternConnect resume</span>
              <span className="block break-all text-slate-600">
                {internconnectName} · made {formatDate(internconnectResume.createdAt)} ·{' '}
                <a href={resumePdfUrl(internconnectResume.id)} className="font-semibold text-brand-700 hover:underline">
                  View
                </a>
              </span>
            </span>
          </label>
        </>
      ) : (
        <>
          {uploadBox}
          <p className="text-xs text-slate-500">
            No resume yet?{' '}
            <Link to="/resume" className="font-semibold text-brand-700 hover:underline">
              Create one in the Resume Builder
            </Link>
            .
          </p>
        </>
      )}
    </fieldset>
  );
}
