#!/usr/bin/env node
/**
 * Regenerate Play hub icons (categories, modes, course, explore) — unified neon line style.
 * Run: node scripts/generate-play-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../src/assets/icons/app');

const S = '#e9d5ff';
const M = '#a78bfa';
const CY = '#22d3ee';
const PK = '#ec4899';
const GN = '#22c55e';
const AM = '#fbbf24';
const BL = '#38bdf8';

function svg(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" role="img" aria-hidden="true">${body}</svg>\n`;
}

const icons = {
  'category-recognition.svg': svg(`
<path d="M14 10v28" stroke="${M}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M14 10h15l-7.5 8.5L22 33H14V10z" fill="${GN}" fill-opacity="0.28" stroke="${S}" stroke-width="2.25" stroke-linejoin="round"/>
<circle cx="33" cy="15" r="6" stroke="${PK}" stroke-width="2" fill="${PK}" fill-opacity="0.15"/>
<path d="M33 13.5v3M31.5 15h3" stroke="${PK}" stroke-width="1.75" stroke-linecap="round"/>
`),

  'category-recall.svg': svg(`
<path d="M31 14l3 3-3 3" stroke="${CY}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M34 17a10 10 0 1 1-3-7.3" stroke="${S}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M20 22l4 4 8-8" stroke="${GN}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
`),

  'category-course.svg': svg(`
<path d="M24 13 11 20l13 7 13-7-13-7z" stroke="${S}" stroke-width="2.25" stroke-linejoin="round"/>
<path d="M17 23v5.5c0 2.2 3.1 4 7 4s7-1.8 7-4V23" stroke="${M}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M35 20v8" stroke="${BL}" stroke-width="2.25" stroke-linecap="round"/>
<circle cx="35" cy="30" r="2" fill="${AM}"/>
`),

  'category-explore.svg': svg(`
<circle cx="24" cy="23" r="11" stroke="${S}" stroke-width="2.25"/>
<ellipse cx="24" cy="23" rx="11" ry="4.5" stroke="${CY}" stroke-width="1.75" opacity="0.85"/>
<path d="M24 12v22M13 23h22" stroke="${M}" stroke-width="1.5" opacity="0.55"/>
<path d="M30 17c2.5 1.8 4 4.2 4 6" stroke="${GN}" stroke-width="2.25" stroke-linecap="round"/>
<circle cx="31" cy="15" r="2.5" fill="${PK}"/>
`),

  'category-together.svg': svg(`
<circle cx="17" cy="19" r="4.5" stroke="${PK}" stroke-width="2.25"/>
<circle cx="31" cy="19" r="4.5" stroke="${CY}" stroke-width="2.25"/>
<path d="M10 35c2.2-5 6.5-7.5 14-7.5S35.8 30 38 35" stroke="${S}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M22 24h4" stroke="${M}" stroke-width="2.25" stroke-linecap="round"/>
`),

  'mode-flag-pick.svg': svg(`
<path d="M12 11v26" stroke="${M}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M12 11h14l-7 8 7 13H12V11z" fill="${GN}" fill-opacity="0.25" stroke="${S}" stroke-width="2.25" stroke-linejoin="round"/>
<circle cx="34" cy="32" r="7" stroke="${PK}" stroke-width="2.25" fill="${PK}" fill-opacity="0.12"/>
<path d="M31.5 32l1.8 1.8 4-4" stroke="${PK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
`),

  'mode-flag-map.svg': svg(`
<path d="M10 34V18l6-3 6 3 6-3 6 3v16l-6-3-6 3-6-3-6 3z" stroke="${S}" stroke-width="2.25" stroke-linejoin="round"/>
<path d="M22 15v19M28 18v16" stroke="${M}" stroke-width="1.5" opacity="0.6"/>
<path d="M30 14l-4 8h3l-3 7" stroke="${AM}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
`),

  'mode-flag-type.svg': svg(`
<rect x="10" y="24" width="28" height="12" rx="3" stroke="${S}" stroke-width="2.25"/>
<path d="M14 30h6M24 30h10" stroke="${M}" stroke-width="2" stroke-linecap="round"/>
<path d="M14 12v10" stroke="${M}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M14 12h12l-6 7 6 3H14" fill="${GN}" fill-opacity="0.25" stroke="${S}" stroke-width="2.25" stroke-linejoin="round"/>
`),

  'mode-capital-pick.svg': svg(`
<path d="M14 32V20l10-6 10 6v12" stroke="${S}" stroke-width="2.25" stroke-linejoin="round"/>
<path d="M18 32v-8h12v8" stroke="${M}" stroke-width="2.25" stroke-linejoin="round"/>
<circle cx="34" cy="32" r="7" stroke="${CY}" stroke-width="2.25" fill="${CY}" fill-opacity="0.12"/>
<path d="M31.5 32l1.8 1.8 4-4" stroke="${CY}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
`),

  'mode-country-capital.svg': svg(`
<circle cx="14" cy="24" r="5" stroke="${GN}" stroke-width="2.25"/>
<path d="M22 24h4" stroke="${M}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M28 24h6" stroke="${M}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M34 20v8" stroke="${S}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M31 24h6" stroke="${S}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M34 20l3 4-3 4" stroke="${PK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
`),

  'mode-globe-find.svg': svg(`
<circle cx="24" cy="24" r="11" stroke="${S}" stroke-width="2.25"/>
<ellipse cx="24" cy="24" rx="11" ry="4.5" stroke="${CY}" stroke-width="1.75" opacity="0.8"/>
<circle cx="24" cy="24" r="7" stroke="${PK}" stroke-width="2" stroke-dasharray="3 2.5"/>
<circle cx="24" cy="24" r="2" fill="${PK}"/>
`),

  'mode-map-find.svg': svg(`
<path d="M9 33V19l7-3 7 3 7-3 7 3v14l-7-3-7 3-7-3-7 3z" stroke="${S}" stroke-width="2.25" stroke-linejoin="round"/>
<path d="M23 16v17M30 19v14" stroke="${M}" stroke-width="1.5" opacity="0.55"/>
<path d="M28 28l4 4 6-8" stroke="${GN}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="28" cy="28" r="2.5" fill="${PK}"/>
`),

  'mode-knowledge-quiz.svg': svg(`
<path d="M13 14h16a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V17a3 3 0 0 1 3-3z" stroke="${S}" stroke-width="2.25"/>
<path d="M17 22h10M17 27h7" stroke="${M}" stroke-width="2" stroke-linecap="round"/>
<circle cx="33" cy="15" r="7" stroke="${CY}" stroke-width="2.25" fill="${CY}" fill-opacity="0.12"/>
<path d="M33 12.5v5M30.5 15h5" stroke="${CY}" stroke-width="2" stroke-linecap="round"/>
`),

  'mode-facts-quiz.svg': svg(`
<rect x="11" y="13" width="22" height="22" rx="4" stroke="${S}" stroke-width="2.25"/>
<path d="M16 21h12M16 26h9" stroke="${M}" stroke-width="2" stroke-linecap="round"/>
<path d="M30 11l3 3-6 6-3-1 1-3 5-5z" fill="${AM}" fill-opacity="0.35" stroke="${AM}" stroke-width="2" stroke-linejoin="round"/>
`),

  'mode-learning-path.svg': svg(`
<circle cx="14" cy="24" r="4" stroke="${GN}" stroke-width="2.25" fill="${GN}" fill-opacity="0.2"/>
<circle cx="24" cy="16" r="4" stroke="${CY}" stroke-width="2.25" fill="${CY}" fill-opacity="0.2"/>
<circle cx="34" cy="28" r="4" stroke="${PK}" stroke-width="2.25" fill="${PK}" fill-opacity="0.2"/>
<path d="M17.5 22l4-4.5M27.5 18.5l4 6.5" stroke="${S}" stroke-width="2.25" stroke-linecap="round"/>
`),

  'mode-pass-flags.svg': svg(`
<circle cx="16" cy="18" r="4" stroke="${PK}" stroke-width="2.25"/>
<circle cx="32" cy="18" r="4" stroke="${CY}" stroke-width="2.25"/>
<path d="M11 33c1.8-4 4.8-6 10-6" stroke="${S}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M37 33c-1.8-4-4.8-6-10-6" stroke="${S}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M22 28v8" stroke="${M}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M22 28h8l-4-5-4 5z" fill="${GN}" fill-opacity="0.3" stroke="${S}" stroke-width="2" stroke-linejoin="round"/>
`),

  'mode-pass-capitals.svg': svg(`
<circle cx="16" cy="18" r="4" stroke="${PK}" stroke-width="2.25"/>
<circle cx="32" cy="18" r="4" stroke="${CY}" stroke-width="2.25"/>
<path d="M11 33c1.8-4 4.8-6 10-6" stroke="${S}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M37 33c-1.8-4-4.8-6-10-6" stroke="${S}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M22 27v9" stroke="${M}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M19 36h10" stroke="${M}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M24 27l-5 5h10l-5-5z" stroke="${S}" stroke-width="2.25" stroke-linejoin="round"/>
`),

  'mode-pass-mixed.svg': svg(`
<circle cx="16" cy="18" r="4" stroke="${PK}" stroke-width="2.25"/>
<circle cx="32" cy="18" r="4" stroke="${CY}" stroke-width="2.25"/>
<path d="M11 33c1.8-4 4.8-6 10-6" stroke="${S}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M37 33c-1.8-4-4.8-6-10-6" stroke="${S}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M21 27l3-4 3 4-3 4-3-4z" stroke="${AM}" stroke-width="2.25" stroke-linejoin="round"/>
<path d="M27 27l3-4 3 4-3 4-3-4z" stroke="${GN}" stroke-width="2.25" stroke-linejoin="round"/>
`),

  'mode-pass-speed.svg': svg(`
<path d="M26 12l-8 14h6l-2 10 10-16h-6l2-8z" fill="${AM}" fill-opacity="0.35" stroke="${AM}" stroke-width="2.25" stroke-linejoin="round"/>
<circle cx="34" cy="34" r="7" stroke="${S}" stroke-width="2.25"/>
<path d="M34 30v4l2.5 2.5" stroke="${S}" stroke-width="2" stroke-linecap="round"/>
`),

  'course-africa.svg': svg(`
<path d="M26 10c-6 2-10 7-11 13-.8 5 1 10 4 14 2 3 2 6-1 8-3 2-7 1-9-2-1-2-1-5 1-7 2-2 5-2 7 0" stroke="${S}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M22 14v18M28 12c3 4 4 9 2 14" stroke="${AM}" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
`),

  'course-asia.svg': svg(`
<path d="M12 28c4-8 10-12 18-12 6 0 10 3 10 8 0 5-4 9-10 10-4 1-8 0-11-3-2-2-4-5-7-3z" stroke="${S}" stroke-width="2.25" stroke-linejoin="round"/>
<path d="M30 14l4-2v6M18 20h8" stroke="${CY}" stroke-width="2" stroke-linecap="round"/>
`),

  'course-europe.svg': svg(`
<path d="M14 30c2-6 7-10 13-10 5 0 9 3 9 7 0 4-3 7-8 8-3 1-6 0-8-2M16 22c3-4 8-6 13-5" stroke="${S}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="30" cy="16" r="3" stroke="${BL}" stroke-width="2"/>
`),

  'course-oceania.svg': svg(`
<path d="M16 28c3-6 9-9 16-7 4 1 7 4 7 8 0 3-2 6-6 7-5 1-10-2-13-6-2-2-3-4-4-2z" stroke="${S}" stroke-width="2.25" stroke-linejoin="round"/>
<circle cx="34" cy="18" r="2.5" fill="${CY}"/>
<circle cx="38" cy="22" r="1.5" fill="${M}"/>
`),

  'course-americas.svg': svg(`
<path d="M18 10c-4 6-5 13-3 20 1 4 0 8-2 10M22 12c2 5 2 11 0 16-1 3-1 6 1 8" stroke="${S}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M28 14c3 4 4 10 2 15-1 4 0 8 2 11" stroke="${GN}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M14 32h20" stroke="${M}" stroke-width="1.75" stroke-linecap="round" opacity="0.5"/>
`),

  'course-capitals.svg': svg(`
<circle cx="24" cy="22" r="9" stroke="${S}" stroke-width="2.25"/>
<ellipse cx="24" cy="22" rx="9" ry="3.5" stroke="${CY}" stroke-width="1.5" opacity="0.7"/>
<path d="M20 32v-6l4-3 4 3v6" stroke="${AM}" stroke-width="2.25" stroke-linejoin="round"/>
<path d="M18 32h12" stroke="${M}" stroke-width="2.25" stroke-linecap="round"/>
`),

  'course-facts.svg': svg(`
<rect x="12" y="12" width="24" height="26" rx="3" stroke="${S}" stroke-width="2.25"/>
<path d="M17 20h10M17 25h14M17 30h11" stroke="${M}" stroke-width="2" stroke-linecap="round"/>
<circle cx="33" cy="17" r="5" stroke="${AM}" stroke-width="2" fill="${AM}" fill-opacity="0.2"/>
`),

  'explore-lang.svg': svg(`
<path d="M12 16h18a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V20a4 4 0 0 1 4-4z" stroke="${S}" stroke-width="2.25"/>
<path d="M16 24h8M20 20v8" stroke="${CY}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M28 22c2 0 3 1.5 3 3.5S30 29 28 29" stroke="${PK}" stroke-width="2" stroke-linecap="round"/>
`),

  'explore-euro.svg': svg(`
<circle cx="24" cy="24" r="11" stroke="${S}" stroke-width="2.25"/>
<path d="M24 17c-3 0-5 2-5 4.5 0 2 1.5 3.5 4 4 2.5.5 4 1.8 4 3.5S26 33 24 33" stroke="${AM}" stroke-width="2.5" stroke-linecap="round"/>
<path d="M20 20h8M20 28h8" stroke="${M}" stroke-width="2" stroke-linecap="round"/>
`),

  'explore-population.svg': svg(`
<circle cx="17" cy="18" r="3.5" stroke="${PK}" stroke-width="2.25"/>
<circle cx="31" cy="18" r="3.5" stroke="${CY}" stroke-width="2.25"/>
<path d="M11 30c1.5-3 4-4.5 8-4.5M37 30c-1.5-3-4-4.5-8-4.5" stroke="${S}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M14 34h20" stroke="${M}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M18 34v-6M24 34v-9M30 34v-4" stroke="${GN}" stroke-width="2.5" stroke-linecap="round"/>
`),

  'explore-area.svg': svg(`
<rect x="13" y="13" width="22" height="22" rx="2" stroke="${S}" stroke-width="2.25"/>
<path d="M13 19h22M19 13v22" stroke="${M}" stroke-width="1.5" opacity="0.55"/>
<path d="M27 27l8 8" stroke="${CY}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M27 35h8v-8" stroke="${CY}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
`),

  'explore-gdp.svg': svg(`
<path d="M12 34V18" stroke="${M}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M12 34h24" stroke="${M}" stroke-width="2.25" stroke-linecap="round"/>
<path d="M16 30l5-8 5 5 7-12" stroke="${GN}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="33" cy="15" r="2.5" fill="${AM}"/>
`),
};

for (const [name, content] of Object.entries(icons)) {
  fs.writeFileSync(path.join(outDir, name), content);
}

console.log(`Wrote ${Object.keys(icons).length} icons to ${outDir}`);
