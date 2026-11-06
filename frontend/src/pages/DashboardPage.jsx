import { Briefcase, ClipboardList, MessagesSquare, Users } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

// The parts of InternConnect available so far, shown as cards on the dashboard.
const MODULES = [
  { to: '/internships', icon: Briefcase, title: 'Internships', text: 'Browse open internships and apply with a cover letter.' },
  { to: '/applications', icon: ClipboardList, title: 'My applications', text: 'See every internship you have applied for.' },
  { to: '/public-space', icon: MessagesSquare, title: 'Public Space', text: 'Share posts, photos and videos with other students.' },
  { to: '/friends', icon: Users, title: 'Friends', text: 'Find students, send friend requests and manage your friends.' },
];

function Detail({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:justify-between">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-medium break-all text-slate-900">{value}</dd>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const memberSince = new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {user.name}</h1>
        <p className="mt-1 text-slate-600">You are logged in to InternConnect.</p>
      </div>

      <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Your account</h2>
        <dl className="mt-2 divide-y divide-slate-100">
          <Detail label="Name" value={user.name} />
          <Detail label="Email" value={user.email} />
          <Detail label="Mobile number" value={user.phone} />
          <Detail label="Member since" value={memberSince} />
        </dl>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {MODULES.map(({ to, icon: Icon, title, text }) => (
          <Link
            key={to}
            to={to}
            className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon className="size-5" />
            </span>
            <span>
              <span className="block font-semibold text-slate-900">{title}</span>
              <span className="mt-0.5 block text-sm text-slate-600">{text}</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
