import { Injectable, Pipe, PipeTransform, effect, inject, signal } from '@angular/core';
import { isLanguage, Language, resolveLanguage } from './language';
import { translateText } from './translations';

// The old key also stored automatic Russian defaults, not just manual choices.
const LANGUAGE_PREFERENCE_KEY = 'fartoviy-language-preference';

export function readStorage(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; }
}
export function writeStorage(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

@Injectable({ providedIn: 'root' })
export class I18n {
  readonly language = signal<Language>(this.initialLanguage());

  constructor() {
    effect(() => {
      document.documentElement.lang = this.language();
      document.title = this.text('FARTOVIY — каталог');
      document.querySelector('meta[name="description"]')?.setAttribute('content',
        this.text('Демо: каталог товаров, информация о товаре и корзина.'));
    });
  }

  text(value: string, language = this.language()): string {
    return translateText(value, language);
  }

  setLanguage(event: Event): void {
    const language = (event.target as HTMLSelectElement).value;
    if (!isLanguage(language)) return;
    this.language.set(language);
    writeStorage(LANGUAGE_PREFERENCE_KEY, language);
  }

  private initialLanguage(): Language {
    const languages = typeof navigator === 'undefined' ? []
      : navigator.languages?.length ? navigator.languages : [navigator.language];
    return resolveLanguage(readStorage(LANGUAGE_PREFERENCE_KEY), languages);
  }
}

@Pipe({ name: 't', pure: false })
export class Translate implements PipeTransform {
  private readonly i18n = inject(I18n);
  transform(value: string): string { return this.i18n.text(value); }
}
