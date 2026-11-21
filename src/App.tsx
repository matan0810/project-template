import { useI18n } from './i18n/context';
import styles from './App.module.css';

/** The first screen. Replace it; keep the header's language switch and version. */
export function App() {
  const { t, language, setLanguage } = useI18n();
  return (
    <>
      <header className={styles.header}>
        <span className={styles.brand}>{t.brand}</span>
        <span className={styles.version} title={t.version(__APP_VERSION__)}>
          v{__APP_VERSION__}
        </span>
        <button
          type="button"
          className={styles.language}
          aria-label={t.switchLanguageLabel}
          onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}
        >
          {t.switchLanguage}
        </button>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>{t.heroTitle}</h1>
        <p className={styles.lead}>{t.heroLine}</p>
      </main>
    </>
  );
}
