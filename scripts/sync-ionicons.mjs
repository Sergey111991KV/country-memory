#!/usr/bin/env node
/**
 * Copies only ionicons referenced in src/ into src/assets/ionicons-svg
 * so production bundles skip the full ~5MB ionicons set.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'src/assets/ionicons-svg');
const ION_SRC = path.join(ROOT, 'node_modules/ionicons/dist/ionicons/svg');

const EXTRA = [
  'bookmark',
  'bookmark-outline',
  'bulb-outline',
  'checkbox-outline',
  'chevron-down',
  'chevron-up',
  'close-circle',
  'ellipse-outline',
  'heart',
  'lock-closed',
];

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'ionicons-svg') {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(html|ts)$/.test(entry.name) && !entry.name.endsWith('.spec.ts')) {
      files.push(full);
    }
  }
  return files;
}

const names = new Set(EXTRA);
const patterns = [
  /<ion-icon[^>]*\sname=["']([a-z0-9-]+)["']/g,
  /icon:\s*['"]([a-z0-9-]+(?:-outline)?)['"]/g,
];

for (const file of walk(SRC)) {
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of patterns) {
    let match = pattern.exec(text);
    while (match) {
      names.add(match[1]);
      match = pattern.exec(text);
    }
  }
}

fs.mkdirSync(OUT, { recursive: true });
for (const file of fs.readdirSync(OUT)) {
  if (file.endsWith('.svg')) {
    fs.unlinkSync(path.join(OUT, file));
  }
}

let copied = 0;
const missing = [];

for (const name of [...names].sort()) {
  const source = path.join(ION_SRC, `${name}.svg`);
  if (!fs.existsSync(source)) {
    missing.push(name);
    continue;
  }
  fs.copyFileSync(source, path.join(OUT, `${name}.svg`));
  copied += 1;
}

if (missing.length > 0) {
  console.warn(`Missing ionicons (${missing.length}): ${missing.join(', ')}`);
}

console.log(`Synced ${copied} ionicons → src/assets/ionicons-svg`);
