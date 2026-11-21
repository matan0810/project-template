import { useEffect, useMemo, type ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { I18nContext } from './context';
import { defaultLanguage, isLanguage, STRINGS, type Language } from './strings';

const STORAGE_KEY = 'app:language';

/** The language: the visitor's choice if saved, else the browser's. Sets lang and dir. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [stored, setLanguage] = useLocalStorage<Language | null>(STORAGE_KEY, null, (v) =>
    isLanguage(v) ? v : undefined,
  );
  const language = isLanguage(stored)
    ? stored
    : defaultLanguage(navigator.languages, Intl.DateTimeFormat().resolvedOptions().timeZone);
  const t = STRINGS[language];

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = t.dir;
  }, [language, t]);

  const value = useMemo(() => ({ language, t, setLanguage }), [language, t, setLanguage]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
