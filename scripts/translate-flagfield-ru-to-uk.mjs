#!/usr/bin/env node
/** ru.json -> uk.json via MyMemory (Russian UI -> Ukrainian). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_DIR = path.join(__dirname, 'flagfield-translations');
const DELAY_MS = 1200;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateOne(text) {
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', 'ru|uk');
  const res = await fetch(url);
  if (res.status === 429) {
    await sleep(60_000);
    return translateOne(text);
  }
  const body = await res.json();
  return (body.responseData?.translatedText ?? text).trim();
}

async function main() {
  const ru = JSON.parse(fs.readFileSync(path.join(JSON_DIR, 'ru.json'), 'utf8'));
  const outPath = path.join(JSON_DIR, 'uk.json');
  const existing = fs.existsSync(outPath)
    ? JSON.parse(fs.readFileSync(outPath, 'utf8'))
    : {};
  const keys = Object.keys(ru);
  let i = 0;
  for (const key of keys) {
    if (existing[key] && process.env.SKIP_EXISTING === '1') {
      i++;
      continue;
    }
    existing[key] = await translateOne(ru[key]);
    i++;
    if (i % 20 === 0) {
      console.log(`${i}/${keys.length}`);
      fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
    }
    await sleep(DELAY_MS);
  }
  fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
  console.log('uk.json done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
