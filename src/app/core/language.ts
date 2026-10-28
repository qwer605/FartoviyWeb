export type Language = 'en' | 'ru' | 'uk';

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'ru' || value === 'uk';
}

export function resolveLanguage(savedPreference: unknown, browserLanguages: readonly string[]): Language {
  if (isLanguage(savedPreference)) return savedPreference;

  for (const locale of browserLanguages) {
    const language = locale.toLowerCase().split('-')[0];
    if (isLanguage(language)) return language;
  }
  return 'en';
}
