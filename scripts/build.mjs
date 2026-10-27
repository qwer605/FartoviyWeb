import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = resolve(root, 'dist');
mkdirSync(destination, { recursive: true });
for (const name of ['index.html', 'styles.css', 'app.js', 'i18n.js', 'assets', 'share']) {
  const source = resolve(root, name);
  if (!existsSync(source)) throw new Error(`Missing site asset: ${name}`);
  cpSync(source, resolve(destination, name), { recursive: true });
}
console.log('Static storefront ready in dist/');
