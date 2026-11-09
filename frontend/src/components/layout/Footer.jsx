import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-4 text-center text-sm text-slate-500 sm:px-6">
        {t('footer.rights', {
          year: new Date().getFullYear(),
          defaultValue: `© ${new Date().getFullYear()} InternConnect. All rights reserved.`,
        })}
      </div>
    </footer>
  );
}
