import { ChevronDown, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import Avatar from '../ui/Avatar.jsx';

// The account button in the top bar: My profile, Security and Log out. Closes on a click outside, on Escape and after
// choosing an item.
export default function UserMenu({ user, onLogout }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const itemClasses = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors';

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t('nav.accountMenu', { name: user.name })}
        className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
      >
        <Avatar name={user.name} size="sm" />
        <span className="hidden max-w-28 truncate xl:inline">{user.name.split(' ')[0]}</span>
        <ChevronDown className={`size-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div id={menuId} role="menu" className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-raised">
          <div className="border-b border-slate-100 px-3 pt-1.5 pb-2.5">
            <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="pt-1.5">
            <Link role="menuitem" to="/profile" onClick={() => setOpen(false)} className={`${itemClasses} text-slate-700 hover:bg-slate-100`}>
              <UserRound className="size-4 text-slate-500" aria-hidden="true" />
              {t('nav.profile')}
            </Link>
            <Link role="menuitem" to="/profile#security" onClick={() => setOpen(false)} className={`${itemClasses} text-slate-700 hover:bg-slate-100`}>
              <ShieldCheck className="size-4 text-slate-500" aria-hidden="true" />
              {t('nav.security')}
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className={`${itemClasses} text-red-600 hover:bg-red-50`}
            >
              <LogOut className="size-4" aria-hidden="true" />
              {t('nav.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
