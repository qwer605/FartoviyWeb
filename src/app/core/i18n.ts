import { Injectable, Pipe, PipeTransform, effect, inject, signal } from '@angular/core';
import { ukrainian } from './translations';

export function readStorage(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; }
}
export function writeStorage(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

@Injectable({ providedIn: 'root' })
export class I18n {
  readonly language = signal<'ru' | 'uk'>(readStorage('fartoviy-language') === 'uk' ? 'uk' : 'ru');
  private readonly pattern = new RegExp(Object.keys(ukrainian).sort((a, b) => b.length - a.length)
    .map(key => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');

  constructor() {
    // Keep the language preference compatible with the original demo.
    try { if (localStorage.getItem('fartoviy-language') === 'uk') this.language.set('uk'); } catch { /* Default to Russian. */ }
    effect(() => {
      document.documentElement.lang = this.language();
      document.title = 'FARTOVIY — каталог';
      try { localStorage.setItem('fartoviy-language', this.language()); } catch { /* Optional persistence. */ }
    });
  }

  text(value: string, language = this.language()): string {
    return language === 'uk' ? value.replace(this.pattern, match => ukrainian[match]) : value;
  }

  setLanguage(event: Event): void {
    const language = (event.target as HTMLSelectElement).value;
    if (language === 'ru' || language === 'uk') this.language.set(language);
  }
}

@Pipe({ name: 't', pure: false })
export class Translate implements PipeTransform {
  private readonly i18n = inject(I18n);
  transform(value: string): string { return this.i18n.text(value); }
}
