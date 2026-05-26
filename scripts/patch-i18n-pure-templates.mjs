#!/usr/bin/env node
/**
 * Adds `@let lang = …langSig();` and passes `:lang` into pure i18n pipe bindings.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

function walkHtmlFiles(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...walkHtmlFiles(fullPath));
      continue;
    }
    if (entry.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

const htmlFiles = walkHtmlFiles(path.join(ROOT, 'src'));

const localeAliasByFile = {
  'settings.page.html': 'i18n',
};

function patchI18nBindings(content) {
  return content.replace(
    /\|\s*i18n(?:\s*:\s*(\{[^}]+\}))?(?!\s*:lang)\s*(?=\}\}|"|'|\))/g,
    (_match, vars) => (vars ? `| i18n:${vars}:lang` : '| i18n:null:lang'),
  );
}

for (const file of htmlFiles) {
  const original = readFileSync(file, 'utf8');
  if (!original.includes('| i18n')) {
    continue;
  }

  const fileName = path.basename(file);
  const localeRef = localeAliasByFile[fileName] ?? 'locale';
  let content = original;

  if (!content.includes('@let lang =')) {
    content = `@let lang = ${localeRef}.langSig();\n${content}`;
  }

  content = patchI18nBindings(content);

  if (content !== original) {
    writeFileSync(file, content, 'utf8');
    console.log(`patched ${path.relative(ROOT, file)}`);
  }
}
