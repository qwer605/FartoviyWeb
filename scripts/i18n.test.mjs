import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolveLanguage } from '../src/app/core/language.ts';
import { english, ukrainian, translateText } from '../src/app/core/translations.ts';
import { products } from '../src/app/core/catalog.ts';

test('uses English when no browser language is supported or available', () => {
  for (const languages of [[], ['it-IT'], ['de-DE', 'fr-FR']]) {
    assert.equal(resolveLanguage(null, languages), 'en');
  }
});

test('recognizes regional locales and respects browser preference order', () => {
  assert.equal(resolveLanguage(null, ['en-GB', 'ru-RU']), 'en');
  assert.equal(resolveLanguage(null, ['ru-RU', 'en-US']), 'ru');
  assert.equal(resolveLanguage(null, ['uk-UA', 'en-US']), 'uk');
  assert.equal(resolveLanguage(null, ['it-IT', 'UK-UA', 'ru']), 'uk');
});

test('manual choices override browser languages', () => {
  for (const language of ['en', 'ru', 'uk']) {
    assert.equal(resolveLanguage(language, ['de-DE', 'ru-RU']), language);
  }
});

test('ignores unsupported or corrupt saved preferences', () => {
  for (const stored of ['de', '"it"', '{broken', null, false, {}, [], '']) {
    assert.equal(resolveLanguage(stored, ['uk-UA']), 'uk');
    assert.equal(resolveLanguage(stored, ['it-IT']), 'en');
  }
});

test('translates complete messages before shorter words', () => {
  assert.equal(translateText('Корзина пуста.', 'en'), 'Your cart is empty.');
  assert.equal(translateText('Товар добавлен в корзину.', 'uk'), 'Товар додано до кошика.');
  assert.equal(translateText('Худи Comfort Club', 'en'), 'Hoodie Comfort Club');
  assert.equal(translateText('Худи и свитшоты', 'uk'), 'Худі та світшоти');
  assert.equal(translateText('FARTOVIY — каталог', 'en'), 'FARTOVIY — Catalog');
  assert.equal(translateText('у.е.', 'en'), 'units');
  assert.equal(translateText('у.е.', 'uk'), 'у.о.');
});

test('English covers all current product text, sizes, UI labels and messages', () => {
  const values = products.flatMap(product => [product.name, product.label, product.description, ...product.sizes]);
  for (const file of ['app.html', 'pages/catalog.html', 'pages/cart.html', 'pages/product.html', 'shared/product-card.html']) {
    const template = readFileSync(new URL('../src/app/' + file, import.meta.url), 'utf8');
    for (const match of template.matchAll(/'([^']+)'\s*\|\s*t\b/g)) values.push(match[1]);
  }
  const productPage = readFileSync(new URL('../src/app/pages/product.ts', import.meta.url), 'utf8');
  for (const match of productPage.matchAll(/'([^']*[А-Яа-яЁё][^']*)'/g)) values.push(match[1]);
  for (const value of values) {
    assert.doesNotMatch(translateText(value, 'en'), /[А-Яа-яЁё]/, 'Missing English translation: ' + value);
  }
});

test('both dictionaries cover the same messages and Russian remains unchanged', () => {
  assert.deepEqual(Object.keys(english).sort(), Object.keys(ukrainian).sort());
  for (const value of Object.keys(english)) assert.equal(translateText(value, 'ru'), value);
  assert.equal(translateText('FARTOVIY', 'en'), 'FARTOVIY');
});
