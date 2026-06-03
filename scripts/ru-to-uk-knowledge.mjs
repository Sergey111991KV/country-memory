#!/usr/bin/env node
/** Apply Russian→Ukrainian phrase rules to country-knowledge.json (offline). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ruToUk } from './lib/ru-to-uk.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '../src/assets/data/country-knowledge.json');
const cachePath = path.join(__dirname, 'data/knowledge-cache/uk.json');

function localizeField(field) {
  const ru = field?.ru;
  if (!ru || ru === field.en) {
    return false;
  }
  field.uk = ruToUk(ru);
  return field.uk !== field.en;
}

const data = JSON.parse(fs.readFileSync(outPath, 'utf8'));
const cache = fs.existsSync(cachePath)
  ? JSON.parse(fs.readFileSync(cachePath, 'utf8'))
  : {};

let applied = 0;
for (const entry of Object.values(data.countries)) {
  for (const field of [entry.subregion, entry.currencyName]) {
    if (localizeField(field)) {
      if (field.en) {
        cache[field.en] = field.uk;
      }
      applied++;
    }
  }
  for (const fact of entry.facts ?? []) {
    if (localizeField(fact.text)) {
      if (fact.text.en) {
        cache[fact.text.en] = fact.text.uk;
      }
      applied++;
    }
  }
}

fs.mkdirSync(path.dirname(cachePath), { recursive: true });
fs.writeFileSync(cachePath, `${JSON.stringify(cache)}\n`);
fs.writeFileSync(outPath, `${JSON.stringify(data)}\n`);

let facts = 0;
for (const e of Object.values(data.countries)) {
  for (const f of e.facts) {
    if (f.text.uk && f.text.uk !== f.text.en) {
      facts++;
    }
  }
}
console.log(`Applied ${applied} uk fields; facts ${facts}/755`);
