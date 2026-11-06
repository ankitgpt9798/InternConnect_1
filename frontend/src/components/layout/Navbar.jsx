import { Bell, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { getUnreadCount } from '../../api/notifications.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { buttonClasses } from '../ui/buttonStyles.js';

// Pages linked in the navbar for logged-in users.
const LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/internships', label: 'Internships' },
  { to: '/public-space', label: 'Public Space' },
  { to: '/friends', label: 'Friends' },
  { to: '/plans', label: 'Plans' },
];

const linkClasses = ({ isActive }) =>
  `rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
    isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-100'
  }`;

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false); // the menu on small screens
  const [unread, setUnread] = useState(0);

  // The unread count is fetched again on every page change (no live connection is kept open).
  useEffect(() => {
    if (!user) return;
    let ignore = false;
    getUnreadCount()
      .then((count) => !ignore && setUnread(count))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [user, pathname]);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  }

  // The Notifications page marks everything as read, so no badge is shown there.
  const badge = pathname === '/notifications' ? 0 : unread;

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" aria-label="InternConnect home" className="flex shrink-0 items-center gap-2">
          <img src="/favicon.svg" alt="" className="size-8" />
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Intern<span className="text-brand-700">Connect</span>
          </span>
        </Link>

        {/* Nothing is shown until we know whether someone is logged in, so the buttons do not flicker. */}
        {!loading &&
          (user ? (
            <div className="flex items-center gap-1">
              <div className="hidden items-center gap-1 lg:flex">
                {LINKS.map((link) => (
                  <NavLink key={link.to} to={link.to} className={linkClasses}>
                    {link.label}
                  </NavLink>
                ))}
              </div>

              <Link
                to="/notifications"
                onClick={() => setMenuOpen(false)}
                aria-label={badge > 0 ? `Notifications, ${badge} unread` : 'Notifications'}
                className="relative rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:ml-1"
              >
                <Bell className="size-5" />
                {badge > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] leading-4 font-bold text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </Link>

              <div className="hidden items-center lg:flex">
                <span className="ml-2 text-sm text-slate-600">Hi, {user.name.split(' ')[0]}</span>
                <button type="button" onClick={handleLogout} className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'ml-3' })}>
                  Log out
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
              >
                {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                Log in
              </Link>
              <Link to="/register" className={buttonClasses({ size: 'sm' })}>
                Register
              </Link>
            </div>
          ))}
      </nav>

      {user && menuOpen && (
        <div id="mobile-menu" className="space-y-1 border-t border-slate-200 px-4 py-3 lg:hidden">
          <p className="px-3 pb-1 text-sm text-slate-500">Logged in as {user.name}</p>
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className={(state) => `block ${linkClasses(state)}`}>
              {link.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full rounded-lg px-3 py-1.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Log out
          </button>
        </div>
      )}
    </header>
  );
}
