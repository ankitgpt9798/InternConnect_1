import { Bell, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { getUnreadCount } from '../../api/notifications.js';
import { useAuth } from '../../context/AuthContext.jsx';
import LanguageSelector from '../language/LanguageSelector.jsx';
import { buttonClasses } from '../ui/buttonStyles.js';
import UserMenu from './UserMenu.jsx';

const linkClasses = ({ isActive }) =>
  `rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-100'}`;

export default function Navbar() {
  const { t } = useTranslation();
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false); // the menu on small screens
  const [unread, setUnread] = useState(0);

  const memberLinks = [
    { to: '/dashboard', label: t('nav.dashboard') },
    { to: '/internships', label: t('nav.internships') },
    { to: '/resume', label: t('nav.resumeBuilder') },
    { to: '/public-space', label: t('nav.community') },
    { to: '/friends', label: t('nav.people') },
    { to: '/plans', label: t('nav.plans') },
  ];
  // Visitors see the same parts of InternConnect; opening one asks them to log in first and then returns there.
  const guestLinks = [
    { to: '/internships', label: t('nav.internships') },
    { to: '/public-space', label: t('nav.community') },
    { to: '/resume', label: t('nav.resumeBuilder') },
    { to: '/plans', label: t('nav.plans') },
  ];
  const links = user ? memberLinks : guestLinks;

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
  const menuButton = (
    <button
      type="button"
      onClick={() => setMenuOpen(!menuOpen)}
      aria-expanded={menuOpen}
      aria-controls="mobile-menu"
      aria-label={menuOpen ? t('common.closeMenu') : t('common.openMenu')}
      className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
    >
      {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <nav aria-label={t('nav.primary')} className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" aria-label={t('common.appName')} className="flex shrink-0 items-center gap-2" onClick={() => setMenuOpen(false)}>
          <img src="/favicon.svg" alt="" className="size-8" />
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Intern<span className="text-brand-700">Connect</span>
          </span>
        </Link>

        {/* Nothing is shown until we know whether someone is logged in, so the buttons do not flicker. */}
        {!loading && (
          <div className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={linkClasses}>
                {link.label}
              </NavLink>
            ))}
          </div>
        )}

        {!loading &&
          (user ? (
            <div className="flex items-center gap-1.5">
              <LanguageSelector className="hidden sm:block" />
              <Link
                to="/notifications"
                onClick={() => setMenuOpen(false)}
                aria-label={badge > 0 ? t('nav.notificationsUnread', { count: badge }) : t('nav.notifications')}
                className="relative rounded-lg p-2 text-slate-700 hover:bg-slate-100"
              >
                <Bell className="size-5" />
                {badge > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] leading-4 font-bold text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </Link>
              <UserMenu user={user} onLogout={handleLogout} />
              {menuButton}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <LanguageSelector className="hidden sm:block" />
              {/* On phones "Log in" is in the menu instead (the wrapper hides it; the button's own inline-flex would not). */}
              <span className="hidden sm:block">
                <Link to="/login" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                  {t('nav.login')}
                </Link>
              </span>
              <Link to="/register" className={buttonClasses({ size: 'sm' })}>
                {t('nav.register')}
              </Link>
              {menuButton}
            </div>
          ))}
      </nav>

      {!loading && menuOpen && (
        <nav id="mobile-menu" aria-label={t('nav.mobile')} className="space-y-1 border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between gap-3 px-3 pb-2 sm:hidden">
            {user && <p className="min-w-0 truncate text-sm text-slate-500">{user.name}</p>}
            <LanguageSelector className="ml-auto" />
          </div>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className={(state) => `block ${linkClasses(state)}`}>
              {link.label}
            </NavLink>
          ))}
          {user ? (
            <>
              <NavLink to="/profile" end onClick={() => setMenuOpen(false)} className={(state) => `block ${linkClasses(state)}`}>
                {t('nav.profile')}
              </NavLink>
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full rounded-lg px-3 py-1.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <NavLink to="/login" onClick={() => setMenuOpen(false)} className={(state) => `block sm:hidden ${linkClasses(state)}`}>
              {t('nav.login')}
            </NavLink>
          )}
        </nav>
      )}
    </header>
  );
}
