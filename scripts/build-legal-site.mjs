#!/usr/bin/env node
/**
 * Builds static legal pages from docs/legal/*.md into docs/legal/public/
 * Run: npm run legal:build
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const legalDir = join(root, 'docs', 'legal');
const outDir = join(legalDir, 'public');

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>');
}

function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  let inUl = false;
  let inTable = false;

  const closeUl = () => {
    if (inUl) {
      out.push('</ul>');
      inUl = false;
    }
  };
  const closeTable = () => {
    if (inTable) {
      out.push('</tbody></table>');
      inTable = false;
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      closeUl();
      closeTable();
      i += 1;
      continue;
    }

    if (trimmed.startsWith('> ')) {
      closeUl();
      closeTable();
      out.push(`<p class="notice">${inlineMarkdown(trimmed.slice(2))}</p>`);
      i += 1;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      closeUl();
      closeTable();
      out.push(`<h3>${inlineMarkdown(trimmed.slice(4))}</h3>`);
      i += 1;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      closeUl();
      closeTable();
      out.push(`<h2>${inlineMarkdown(trimmed.slice(3))}</h2>`);
      i += 1;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      closeUl();
      closeTable();
      out.push(`<h1>${inlineMarkdown(trimmed.slice(2))}</h1>`);
      i += 1;
      continue;
    }

    if (trimmed.startsWith('|')) {
      closeUl();
      const cells = trimmed
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.every((c) => /^-+$/.test(c.replace(/:/g, '')))) {
        i += 1;
        continue;
      }
      if (!inTable) {
        out.push('<table><thead><tr>');
        for (const cell of cells) {
          out.push(`<th>${inlineMarkdown(cell)}</th>`);
        }
        out.push('</tr></thead><tbody>');
        inTable = true;
      } else {
        out.push('<tr>');
        for (const cell of cells) {
          out.push(`<td>${inlineMarkdown(cell)}</td>`);
        }
        out.push('</tr>');
      }
      i += 1;
      continue;
    }

    if (trimmed.startsWith('- ')) {
      closeTable();
      if (!inUl) {
        out.push('<ul>');
        inUl = true;
      }
      out.push(`<li>${inlineMarkdown(trimmed.slice(2))}</li>`);
      i += 1;
      continue;
    }

    closeUl();
    closeTable();
    out.push(`<p>${inlineMarkdown(trimmed)}</p>`);
    i += 1;
  }

  closeUl();
  closeTable();
  return out.join('\n');
}

function pageShell({ title, bodyHtml, active }) {
  const nav = (href, label, key) =>
    `<a href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${escapeHtml(title)} — Flagfield (com.flagfield.learn)" />
  <title>${escapeHtml(title)} — Flagfield</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="site-header">
    <a class="brand" href="index.html">Flagfield</a>
    <nav class="site-nav">
      ${nav('privacy.html', 'Privacy', 'privacy')}
      ${nav('terms.html', 'Terms', 'terms')}
    </nav>
  </header>
  <main class="content">
    ${bodyHtml}
  </main>
  <footer class="site-footer">
    <p>Flagfield · <code>com.flagfield.learn</code></p>
    <p>Contact: <a href="mailto:supp0rt.serg@yandex.com">supp0rt.serg@yandex.com</a></p>
  </footer>
</body>
</html>
`;
}

function indexHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Legal documents for Flagfield — geography learning app." />
  <title>Flagfield — Legal</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="site-header">
    <span class="brand">Flagfield</span>
    <nav class="site-nav">
      <a href="privacy.html">Privacy</a>
      <a href="terms.html">Terms</a>
    </nav>
  </header>
  <main class="content landing">
    <h1>Flagfield legal</h1>
    <p class="lead">Publish this folder at your public HTTPS domain. Use the same URLs in App Store Connect, Google Play, and <code>environment.prod.local.ts</code>.</p>
    <ul class="card-list">
      <li><a href="privacy.html"><strong>Privacy Policy</strong><span>How we handle data</span></a></li>
      <li><a href="terms.html"><strong>Terms of Use</strong><span>License, subscriptions, liability</span></a></li>
    </ul>
    <p class="hint">Suggested paths: <code>/privacy</code> and <code>/terms</code> (see <code>docs/release/PUBLISH.md</code>).</p>
  </main>
  <footer class="site-footer">
    <p>Contact: <a href="mailto:supp0rt.serg@yandex.com">supp0rt.serg@yandex.com</a></p>
  </footer>
</body>
</html>
`;
}

const styles = `/* Flagfield legal pages — static hosting */
:root {
  color-scheme: light dark;
  --bg: #f0f9ff;
  --surface: #ffffff;
  --text: #0f172a;
  --muted: #475569;
  --accent: #0284c7;
  --border: #bae6fd;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0c4a6e;
    --surface: #0f172a;
    --text: #f0f9ff;
    --muted: #94a3b8;
    --accent: #38bdf8;
    --border: #1e3a8a;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: "DM Sans", system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.brand {
  font-weight: 500;
  font-size: 1.125rem;
  color: var(--text);
  text-decoration: none;
}
.site-nav a {
  margin-left: 1rem;
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
}
.site-nav a[aria-current="page"] {
  text-decoration: underline;
}
.content {
  max-width: 42rem;
  margin: 0 auto;
  padding: 2rem 1.25rem 3rem;
  background: var(--surface);
  min-height: 60vh;
}
.landing { text-align: left; }
.lead { font-size: 1.05rem; color: var(--muted); }
.card-list {
  list-style: none;
  padding: 0;
  margin: 1.5rem 0;
}
.card-list a {
  display: block;
  padding: 1rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  margin-bottom: 0.75rem;
  text-decoration: none;
  color: var(--text);
  background: var(--bg);
}
.card-list a span {
  display: block;
  color: var(--muted);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}
.hint { font-size: 0.875rem; color: var(--muted); }
h1 { font-size: 1.75rem; margin-top: 0; }
h2 { font-size: 1.25rem; margin-top: 2rem; }
h3 { font-size: 1.05rem; margin-top: 1.25rem; }
p, li { color: var(--text); }
.notice {
  padding: 0.75rem 1rem;
  border-left: 4px solid var(--accent);
  background: var(--bg);
  border-radius: 0 8px 8px 0;
  font-size: 0.9rem;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  margin: 1rem 0;
}
th, td {
  border: 1px solid var(--border);
  padding: 0.5rem 0.75rem;
  text-align: left;
}
a { color: var(--accent); }
code {
  font-size: 0.85em;
  background: var(--bg);
  padding: 0.1em 0.35em;
  border-radius: 4px;
}
.site-footer {
  text-align: center;
  padding: 1.5rem;
  font-size: 0.875rem;
  color: var(--muted);
}
`;

mkdirSync(outDir, { recursive: true });

const privacyMd = readFileSync(join(legalDir, 'privacy-policy.md'), 'utf8');
const termsMd = readFileSync(join(legalDir, 'terms-of-use.md'), 'utf8');

writeFileSync(join(outDir, 'styles.css'), styles);
writeFileSync(join(outDir, 'index.html'), indexHtml());
writeFileSync(
  join(outDir, 'privacy.html'),
  pageShell({
    title: 'Privacy Policy',
    bodyHtml: markdownToHtml(privacyMd),
    active: 'privacy',
  }),
);
writeFileSync(
  join(outDir, 'terms.html'),
  pageShell({
    title: 'Terms of Use',
    bodyHtml: markdownToHtml(termsMd),
    active: 'terms',
  }),
);
writeFileSync(join(outDir, '.nojekyll'), '');
writeFileSync(
  join(outDir, '_redirects'),
  '/privacy    /privacy.html   200\n/terms      /terms.html     200\n',
);

console.log('Legal site built → docs/legal/public/');
console.log('  privacy.html, terms.html, index.html, styles.css, _redirects');
