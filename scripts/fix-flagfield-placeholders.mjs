#!/usr/bin/env node
/**
 * Re-translate keys where {{placeholder}} was glued to the next word (MT glitch).
 * Usage: node scripts/fix-flagfield-placeholders.mjs es de fr
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_DIR = path.join(__dirname, 'flagfield-translations');
const EN_PATH = path.join(JSON_DIR, 'en.json');

/** Placeholder immediately followed by a letter (no space) — broken merge. */
const GLITCH_RE = /\{\{[^}]+\}\}[A-Za-zÀ-ÿ]/;

async function runMyMemory(lang) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['scripts/translate-flagfield-mymemory.mjs', lang],
      {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, SKIP_EXISTING: '1' },
        stdio: 'inherit',
      },
    );
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`exit ${code}`)),
    );
  });
}

async function main() {
  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
  const langs = process.argv.slice(2);
  if (!langs.length) {
    console.error('Pass locale codes: es de fr');
    process.exit(1);
  }

  for (const lang of langs) {
    const locPath = path.join(JSON_DIR, `${lang}.json`);
    if (!fs.existsSync(locPath)) {
      console.log(`[${lang}] skip — no json`);
      continue;
    }
    const loc = JSON.parse(fs.readFileSync(locPath, 'utf8'));
    const glitchKeys = Object.keys(en).filter((k) => loc[k] && GLITCH_RE.test(loc[k]));
    if (!glitchKeys.length) {
      console.log(`[${lang}] no placeholder glitches`);
      continue;
    }
    console.log(`[${lang}] clearing ${glitchKeys.length} glitched keys`);
    for (const k of glitchKeys) {
      delete loc[k];
    }
    fs.writeFileSync(locPath, JSON.stringify(loc, null, 2));
    await runMyMemory(lang);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
