export const supportedLocales = ['en', 'fr', 'de', 'nl', 'es'] as const;
export type Locale = (typeof supportedLocales)[number];

export const localeLabels: Record<Locale, string> = {
  en: 'EN',
  fr: 'FR',
  de: 'DE',
  nl: 'NL',
  es: 'ES',
};

export type TranslationKey = keyof typeof import('./en').default;
