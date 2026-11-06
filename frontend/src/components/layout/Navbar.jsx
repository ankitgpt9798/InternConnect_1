import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';
import { buttonClasses } from '../ui/buttonStyles.js';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" aria-label="InternConnect home" className="flex shrink-0 items-center gap-2">
          <img src="/favicon.svg" alt="" className="size-8" />
          {/* On phones only the logo icon is shown, so the menu buttons fit. */}
          <span className="hidden text-lg font-bold tracking-tight text-slate-900 sm:inline">
            Intern<span className="text-brand-700">Connect</span>
          </span>
        </Link>

        {/* Nothing is shown until we know whether someone is logged in, so the buttons do not flicker. */}
        {!loading && (
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden text-sm text-slate-600 sm:inline">Hi, {user.name.split(' ')[0]}</span>
                <Link to="/dashboard" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                  Dashboard
                </Link>
                <Link to="/public-space" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                  Public Space
                </Link>
                <button type="button" onClick={handleLogout} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                  Log in
                </Link>
                <Link to="/register" className={buttonClasses({ size: 'sm' })}>
                  Register
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
