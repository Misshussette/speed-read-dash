// I18n context provider
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Locale, supportedLocales } from './types';
import en from './en';
import fr from './fr';
import de from './de';
import nl from './nl';
import es from './es';

const dictionaries: Record<Locale, Record<string, string>> = { en, fr, de, nl, es };

function detectLocale(): Locale {
  const stored = localStorage.getItem('stintlab-locale');
  if (stored && supportedLocales.includes(stored as Locale)) return stored as Locale;
  
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  if (supportedLocales.includes(browserLang as Locale)) return browserLang as Locale;
  
  return 'en';
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('stintlab-locale', l);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let text = dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};
