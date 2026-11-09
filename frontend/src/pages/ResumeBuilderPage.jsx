import { CheckCircle2, CircleAlert, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getGeneratedResumes, getMyResume, resumePdfUrl, saveMyResume } from '../api/resumes.js';
import EntryList from '../components/resume/EntryList.jsx';
import PremiumPdfPanel from '../components/resume/PremiumPdfPanel.jsx';
import TextArea from '../components/resume/TextArea.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import FormField from '../components/ui/FormField.jsx';
import { getErrorMessage } from '../utils/getErrorMessage.js';

const EDUCATION_FIELDS = [
  { key: 'institution', label: 'Institution', placeholder: 'ABES Engineering College' },
  { key: 'degree', label: 'Degree', placeholder: 'B.Tech, Computer Science' },
  { key: 'startYear', label: 'Start year', placeholder: '2022' },
  { key: 'endYear', label: 'End year', placeholder: '2026' },
  { key: 'score', label: 'Score (optional)', placeholder: '8.4 CGPA' },
];
const EXPERIENCE_FIELDS = [
  { key: 'company', label: 'Company', placeholder: 'CodeCraft Ledgerworks' },
  { key: 'role', label: 'Role', placeholder: 'Web Development Intern' },
  { key: 'startDate', label: 'Start', placeholder: 'Jun 2025' },
  { key: 'endDate', label: 'End', placeholder: 'Aug 2025 or Present' },
  { key: 'description', label: 'What you did', placeholder: 'Built React screens for invoices…', multiline: true },
];
const PROJECT_FIELDS = [
  { key: 'name', label: 'Project name', placeholder: 'InternConnect' },
  { key: 'link', label: 'Link (optional)', placeholder: 'https://github.com/…' },
  { key: 'description', label: 'Description', placeholder: 'What it does and what you used', multiline: true },
];

// Skills are typed separated by commas, certifications one per line.
const toList = (text, separator) => text.split(separator).map((item) => item.trim()).filter(Boolean);

export default function ResumeBuilderPage() {
  const [resume, setResume] = useState(null);
  const [skillsText, setSkillsText] = useState('');
  const [certificationsText, setCertificationsText] = useState('');
  const [readiness, setReadiness] = useState(null);
  const [unsaved, setUnsaved] = useState(false); // changes not saved yet (the PDF uses the saved draft)
  const [pdfs, setPdfs] = useState([]); // paid resume PDFs, newest first
  const [message, setMessage] = useState(null); // { type, text, errors }
  const [saving, setSaving] = useState(false);

  function load(data) {
    setResume(data.resume);
    setSkillsText(data.resume.skills.join(', '));
    setCertificationsText(data.resume.certifications.join('\n'));
    setReadiness(data.readiness);
    setUnsaved(false);
  }

  const loadPdfs = () =>
    getGeneratedResumes()
      .then(setPdfs)
      .catch(() => {});

  useEffect(() => {
    getMyResume()
      .then(load)
      .catch((err) => setMessage({ type: 'error', text: getErrorMessage(err) }));
    getGeneratedResumes()
      .then(setPdfs)
      .catch(() => {});
  }, []);

  function setPersonal(key, value) {
    setResume((current) => ({ ...current, personal: { ...current.personal, [key]: value } }));
    setUnsaved(true);
  }
  function setPart(key, value) {
    setResume((current) => ({ ...current, [key]: value }));
    setUnsaved(true);
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const data = await saveMyResume({
        ...resume,
        skills: toList(skillsText, /[,\n]/),
        certifications: toList(certificationsText, /\n/),
      });
      load(data);
      setMessage({ type: 'success', text: data.message });
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err), errors: err.response?.data?.errors });
    } finally {
      setSaving(false);
    }
  }

  if (!resume) {
    return message ? <Alert>{message.text}</Alert> : <p className="py-16 text-center text-slate-500">Loading your resume…</p>;
  }

  const { personal } = resume;

  // The premium PDF panel has its own form (the email code), so it stays outside the resume form: a form inside a
  // form makes "Confirm and pay" reload the page instead of opening Razorpay.
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Resume Builder</h1>
        <p className="mt-1 text-slate-600">
          Fill in your details and save your draft. When it is ready you can get a professional PDF (premium, ₹50).
        </p>
      </div>

      {message && (
        <Alert type={message.type}>
          {message.text}
          {message.errors?.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {message.errors.map((error) => (
                <li key={error.field}>{error.message}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      {readiness && (
        <section
          className={`rounded-2xl border p-5 ${readiness.ready ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}
          aria-live="polite"
        >
          <h2 className={`flex items-center gap-2 font-semibold ${readiness.ready ? 'text-green-800' : 'text-amber-800'}`}>
            {readiness.ready ? <CheckCircle2 className="size-5" /> : <CircleAlert className="size-5" />}
            {readiness.ready ? 'Your resume is ready for the PDF' : 'Still needed for the PDF'}
          </h2>
          {!readiness.ready && (
            <ul className="mt-2 list-disc pl-6 text-sm text-amber-900">
              {readiness.missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-slate-600">The checklist is updated each time you save.</p>
        </section>
      )}

      <PremiumPdfPanel ready={!!readiness?.ready} unsaved={unsaved} onGenerated={loadPdfs} />

      {pdfs.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Your resume PDFs</h2>
          <ul className="mt-2 divide-y divide-slate-100">
            {pdfs.map((pdf) => (
              <li key={pdf.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {pdf.fullName}
                    {pdf.onProfile && (
                      <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">On your profile</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">Created {new Date(pdf.createdAt).toLocaleString('en-IN')}</p>
                </div>
                <a href={resumePdfUrl(pdf.id)} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
                  <Download className="size-4" /> Download PDF
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form onSubmit={handleSave} noValidate className="space-y-6">
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Personal details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Full name" id="fullName" value={personal.fullName} onChange={(e) => setPersonal('fullName', e.target.value)} />
            <FormField label="Email" id="resumeEmail" type="email" value={personal.email} onChange={(e) => setPersonal('email', e.target.value)} />
            <FormField label="Phone" id="resumePhone" value={personal.phone} onChange={(e) => setPersonal('phone', e.target.value)} />
            <FormField label="City (optional)" id="location" value={personal.location} onChange={(e) => setPersonal('location', e.target.value)} />
            <div className="sm:col-span-2">
              <FormField
                label="LinkedIn or portfolio link (optional)"
                id="link"
                placeholder="https://linkedin.com/in/…"
                value={personal.link}
                onChange={(e) => setPersonal('link', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <TextArea
            label="Career summary"
            id="summary"
            rows={4}
            maxLength={600}
            value={resume.summary}
            onChange={(e) => setPart('summary', e.target.value)}
            hint={`${resume.summary.length}/600 characters (at least 30). Write it in English: the PDF prints Latin letters only.`}
          />
        </section>

        <EntryList name="education" title="Education" singular="Education" items={resume.education} fields={EDUCATION_FIELDS} max={5} onChange={(items) => setPart('education', items)} />
        <EntryList name="experience" title="Experience and internships" singular="Experience" items={resume.experience} fields={EXPERIENCE_FIELDS} max={5} onChange={(items) => setPart('experience', items)} />
        <EntryList name="projects" title="Projects" singular="Project" items={resume.projects} fields={PROJECT_FIELDS} max={5} onChange={(items) => setPart('projects', items)} />

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Skills and certifications</h2>
          <FormField
            label="Skills"
            id="skills"
            placeholder="React, Node.js, MongoDB"
            value={skillsText}
            onChange={(e) => {
              setSkillsText(e.target.value);
              setUnsaved(true);
            }}
            hint="Separate skills with commas (up to 30)."
          />
          <TextArea
            label="Certifications (optional)"
            id="certifications"
            value={certificationsText}
            onChange={(e) => {
              setCertificationsText(e.target.value);
              setUnsaved(true);
            }}
            hint="One per line (up to 10)."
          />
        </section>

        <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
          <Button type="submit" loading={saving}>
            Save draft
          </Button>
          {resume.updatedAt && (
            <span className="ml-3 text-xs text-slate-500">Last saved {new Date(resume.updatedAt).toLocaleString('en-IN')}</span>
          )}
        </div>
      </form>
    </div>
  );
}
