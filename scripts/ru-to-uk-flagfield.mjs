#!/usr/bin/env node
/**
 * Build uk.json from ru.json using Russian→Ukrainian phrase replacements (offline).
 * Not perfect MT — better than English fallback for uk locale.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ruToUk } from './lib/ru-to-uk.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_DIR = path.join(__dirname, 'flagfield-translations');

const ru = JSON.parse(fs.readFileSync(path.join(JSON_DIR, 'ru.json'), 'utf8'));
const uk = {};
for (const [k, v] of Object.entries(ru)) {
  uk[k] = ruToUk(v);
}
fs.writeFileSync(path.join(JSON_DIR, 'uk.json'), JSON.stringify(uk, null, 2));
console.log('uk.json', Object.keys(uk).length, 'keys');
