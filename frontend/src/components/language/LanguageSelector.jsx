import { Check, ChevronDown, Globe, Loader2, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { updateUserLanguage } from '../../api/languages.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { applyLanguage } from '../../i18n/index.js';
import { LANGUAGES } from '../../i18n/languages.js';
import FrenchVerificationModal from './FrenchVerificationModal.jsx';

export default function LanguageSelector({ className = '' }) {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [frenchModalOpen, setFrenchModalOpen] = useState(false);
  const [switching, setSwitching] = useState(null);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  async function handleSelect(language) {
    if (language.code === i18n.language) {
      setOpen(false);
      return;
    }

    // French requires email OTP verification
    if (language.needsVerification) {
      setOpen(false);
      setFrenchModalOpen(true);
      return;
    }

    setSwitching(language.code);
    setError(null);
    try {
      if (user) {
        const res = await updateUserLanguage(language.code);
        if (res.user) updateUser(res.user);
      }
      await applyLanguage(language.code);
      setOpen(false);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update language.');
    } finally {
      setSwitching(null);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('language.menu', { language: currentLang.nativeName, defaultValue: `Language: ${currentLang.nativeName}` })}
        onClick={() => {
          setError(null);
          setOpen((v) => !v);
        }}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
      >
        {switching ? (
          <Loader2 className="size-3.5 animate-spin text-brand-700" />
        ) : (
          <Globe className="size-3.5 text-slate-500" />
        )}
        <span className="font-semibold">{currentLang.code.toUpperCase()}</span>
        <ChevronDown className="size-3 text-slate-400" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('language.label', 'Language')}
          className="absolute right-0 z-50 mt-1.5 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {t('language.label', 'Language')}
          </div>
          {LANGUAGES.map((lang) => {
            const isCurrent = lang.code === i18n.language;
            const isFrench = lang.needsVerification;

            return (
              <button
                key={lang.code}
                data-lang={lang.code}
                type="button"
                role="menuitem"
                disabled={Boolean(switching)}
                onClick={() => handleSelect(lang)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                  isCurrent
                    ? 'bg-brand-50 font-medium text-brand-800'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex flex-col">
                  <span lang={lang.htmlLang} className="font-medium">
                    {lang.nativeName}
                  </span>
                  {isFrench && !isCurrent && (
                    <span className="text-[11px] text-slate-400">
                      {user ? t('language.needsCode', 'needs an email code') : t('language.loginForFrench', 'log in to use it')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {isCurrent && <Check className="size-4 text-brand-700" />}
                  {isFrench && !isCurrent && <Lock className="size-3 text-slate-400" />}
                </div>
              </button>
            );
          })}

          {error && (
            <p className="mt-1 px-2 text-xs text-red-600">{error}</p>
          )}
        </div>
      )}

      {frenchModalOpen && (
        <FrenchVerificationModal
          isOpen={frenchModalOpen}
          onClose={() => setFrenchModalOpen(false)}
        />
      )}
    </div>
  );
}
