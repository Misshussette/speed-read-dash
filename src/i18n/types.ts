export const supportedLocales = ['en', 'fr', 'de', 'nl', 'es'] as const;
export type Locale = (typeof supportedLocales)[number];

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  nl: 'Nederlands',
  es: 'Español',
};

export type TranslationKey = string;
