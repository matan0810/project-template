export const LANGUAGES = ['he', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Every piece of interface text, in Hebrew. English must provide the same keys. */
const he = {
  dir: 'rtl',
  brand: 'שם הפרויקט',
  switchLanguage: 'English',
  switchLanguageLabel: 'Switch to English',
  version: (v: string) => `גרסה ${v}`,
  heroTitle: 'שם הפרויקט',
  heroLine: 'משפט אחד שאומר מה זה.',
};

export type Strings = typeof he;

const en: Strings = {
  dir: 'ltr',
  brand: 'Project name',
  switchLanguage: 'עברית',
  switchLanguageLabel: 'החלפה לעברית',
  version: (v) => `Version ${v}`,
  heroTitle: 'Project name',
  heroLine: 'One sentence that says what this is.',
};

export const STRINGS: Record<Language, Strings> = { he, en };

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language === value);
}

/** Hebrew for Hebrew browsers or clocks set to Israel, English for everyone else. */
export function defaultLanguage(browserLanguages: readonly string[], timeZone = ''): Language {
  if (
    browserLanguages.some(
      (l) => l.toLowerCase().startsWith('he') || l.toLowerCase().startsWith('iw'),
    )
  )
    return 'he';
  return timeZone === 'Asia/Jerusalem' || timeZone === 'Asia/Tel_Aviv' ? 'he' : 'en';
}
