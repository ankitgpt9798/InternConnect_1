import { Link } from 'react-router';

export default function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="size-8" />
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Intern<span className="text-brand-700">Connect</span>
          </span>
        </Link>
      </nav>
    </header>
  );
}
