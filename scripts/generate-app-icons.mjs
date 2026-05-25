import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const dir = join(process.cwd(), 'src/assets/icons/app');
mkdirSync(dir, { recursive: true });

const wrap = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" role="img">${body}</svg>\n`;

/** Soft plate + bold glyph — readable on dark Play dock cards. */
const shell = (tint, body) =>
  `<circle cx="24" cy="24" r="22" fill="${tint}" opacity="0.2"/>${body}`;

/** Play hub: categories + game modes (redesigned for the mode wheel). */
const playHubIcons = {
  'category-recognition': shell(
    '#22c55e',
    '<path d="M17 10v28" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/><path d="M17 10h18l-9 11 9 17H17V10z" fill="#22c55e" stroke="#15803d" stroke-width="2" stroke-linejoin="round"/><path d="M17 10l9 11 9-11" fill="#facc15" opacity=".95"/>',
  ),
  'category-recall': shell(
    '#a855f7',
    '<path d="M24 14c-5.5 0-10 4-10 9s4.5 9 10 9c2.2 0 4.2-.7 5.8-1.9" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round"/><path d="M28 26l4 4 4-4" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M32 22v8h-8" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="23" r="3" fill="#c4b5fd"/>',
  ),
  'category-course': shell(
    '#0ea5e9',
    '<path d="M24 11l14 7v3L24 28 10 21v-3l14-7z" fill="#38bdf8" stroke="#0284c7" stroke-width="2" stroke-linejoin="round"/><path d="M18 25v7c0 2 2.7 4 6 4s6-2 6-4v-7" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round"/><path d="M34 18v8" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/><circle cx="34" cy="28" r="2.5" fill="#f59e0b"/>',
  ),
  'category-explore': shell(
    '#06b6d4',
    '<circle cx="24" cy="22" r="13" fill="#e0f2fe" stroke="#0284c7" stroke-width="2.5"/><ellipse cx="24" cy="22" rx="13" ry="5" stroke="#0284c7" stroke-width="1.8"/><path d="M24 9v26M11 22h26" stroke="#0284c7" stroke-width="1.5" opacity=".45"/><path d="M30 16c3 2 5 5 5 8" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round"/><circle cx="31" cy="14" r="3" fill="#ef4444" stroke="#fff" stroke-width="1.5"/>',
  ),
  'category-together': shell(
    '#ec4899',
    '<circle cx="17" cy="19" r="5.5" fill="#fbcfe8" stroke="#ec4899" stroke-width="2.5"/><circle cx="31" cy="19" r="5.5" fill="#dbeafe" stroke="#3b82f6" stroke-width="2.5"/><path d="M8 36c2.5-6 8.5-9.5 16-9.5S37.5 30 40 36" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>',
  ),
  'mode-flag-pick': shell(
    '#22c55e',
    '<path d="M16 9v30" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/><path d="M16 9h20l-10 12 10 18H16V9z" fill="#22c55e" stroke="#15803d" stroke-width="2" stroke-linejoin="round"/>',
  ),
  'mode-flag-map': shell(
    '#2563eb',
    '<path d="M10 16l10-5 10 5 10-5v22l-10 5-10-5-10 5V16z" fill="#dbeafe" stroke="#2563eb" stroke-width="2.5" stroke-linejoin="round"/><circle cx="30" cy="18" r="4" fill="#ef4444" stroke="#fff" stroke-width="1.5"/><path d="M20 14v20M30 19v20" stroke="#2563eb" stroke-width="1.8" opacity=".55"/>',
  ),
  'mode-flag-type': shell(
    '#64748b',
    '<rect x="11" y="16" width="26" height="18" rx="4" fill="#f8fafc" stroke="#64748b" stroke-width="2.5"/><path d="M16 23h12M16 27h8" stroke="#334155" stroke-width="2.5" stroke-linecap="round"/><rect x="29" y="25" width="5" height="5" rx="1" fill="#0ea5e9"/>',
  ),
  'mode-capital-pick': shell(
    '#0284c7',
    '<path d="M14 36V18l10-7 10 7v18" stroke="#0284c7" stroke-width="2.5" stroke-linejoin="round"/><rect x="18" y="24" width="12" height="12" rx="2" fill="#bae6fd"/><path d="M22 14h4l2 4h-8l2-4z" fill="#f59e0b" stroke="#d97706" stroke-width="1.5" stroke-linejoin="round"/>',
  ),
  'mode-country-capital': shell(
    '#7c3aed',
    '<circle cx="19" cy="21" r="9" fill="#ede9fe" stroke="#7c3aed" stroke-width="2.5"/><path d="M28 33h14" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round"/><path d="M35 27v12" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round"/><path d="M31 30h8" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round"/>',
  ),
  'mode-globe-find': shell(
    '#0284c7',
    '<circle cx="24" cy="24" r="14" fill="#e0f2fe" stroke="#0284c7" stroke-width="2.5"/><ellipse cx="24" cy="24" rx="14" ry="5.5" stroke="#0284c7" stroke-width="1.8"/><circle cx="24" cy="24" r="9" stroke="#ef4444" stroke-width="2" stroke-dasharray="3 3" opacity=".85"/><circle cx="24" cy="24" r="2.5" fill="#ef4444"/>',
  ),
  'mode-map-find': shell(
    '#2563eb',
    '<rect x="10" y="14" width="28" height="22" rx="3" fill="#eff6ff" stroke="#2563eb" stroke-width="2.5"/><path d="M14 30l7-9 5 5 8-11 6 15H14z" fill="#22c55e" opacity=".85"/><circle cx="32" cy="19" r="3.5" fill="#ef4444" stroke="#fff" stroke-width="1.5"/>',
  ),
  'mode-knowledge-quiz': shell(
    '#d97706',
    '<path d="M24 12a8 8 0 00-3 15.3V32h6v-4.7A8 8 0 0024 12z" fill="#fef3c7" stroke="#d97706" stroke-width="2.5" stroke-linejoin="round"/><path d="M21 36h6" stroke="#d97706" stroke-width="2.5" stroke-linecap="round"/><path d="M22 39h4" stroke="#d97706" stroke-width="2" stroke-linecap="round"/>',
  ),
  'mode-facts-quiz': shell(
    '#db2777',
    '<rect x="13" y="11" width="22" height="26" rx="3" fill="#fce7f3" stroke="#db2777" stroke-width="2.5"/><circle cx="24" cy="21" r="5" fill="#fbcfe8" stroke="#db2777" stroke-width="2"/><path d="M19 31h10" stroke="#db2777" stroke-width="2.5" stroke-linecap="round"/>',
  ),
  'mode-learning-path': shell(
    '#8b5cf6',
    '<path d="M12 34c5-12 19-12 24 0" stroke="#8b5cf6" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="14" cy="31" r="3.5" fill="#22c55e" stroke="#fff" stroke-width="1.5"/><circle cx="24" cy="23" r="3.5" fill="#f59e0b" stroke="#fff" stroke-width="1.5"/><circle cx="34" cy="31" r="3.5" fill="#8b5cf6" stroke="#fff" stroke-width="1.5"/>',
  ),
  'mode-pass-flags': shell(
    '#22c55e',
    '<circle cx="16" cy="21" r="4.5" fill="#dbeafe"/><circle cx="32" cy="21" r="4.5" fill="#fbcfe8"/><path d="M15 11v26" stroke="#64748b" stroke-width="2"/><path d="M15 12h12l-6 8 6 10H15V12z" fill="#22c55e" stroke="#15803d" stroke-width="1.8" stroke-linejoin="round"/>',
  ),
  'mode-pass-capitals': shell(
    '#0284c7',
    '<circle cx="16" cy="22" r="4.5" fill="#dbeafe"/><circle cx="32" cy="22" r="4.5" fill="#fbcfe8"/><path d="M22 34V20l5-4 5 4v14" stroke="#0284c7" stroke-width="2.5" stroke-linejoin="round"/><rect x="24" y="24" width="6" height="10" fill="#bae6fd"/>',
  ),
  'mode-pass-mixed': shell(
    '#7c3aed',
    '<circle cx="15" cy="19" r="4" fill="#dbeafe"/><circle cx="33" cy="19" r="4" fill="#fbcfe8"/><path d="M22 33h8M26 27v12" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round"/><path d="M11 13h9l-4.5 7 4.5 7h-9V13z" fill="#22c55e" opacity=".9"/>',
  ),
  'mode-pass-speed': shell(
    '#f59e0b',
    '<path d="M27 7L13 27h11l-2 14 16-30H27z" fill="#fbbf24" stroke="#d97706" stroke-width="2" stroke-linejoin="round"/><circle cx="33" cy="33" r="5.5" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>',
  ),
  'course-africa': shell(
    '#d97706',
    '<path d="M12 34c3-14 24-16 24-2-5 7-12 9-19 5-7-4-10-6-5-3z" fill="#fde68a" stroke="#d97706" stroke-width="2.5" stroke-linejoin="round"/>',
  ),
  'course-asia': shell(
    '#e11d48',
    '<path d="M14 32c7-12 22-10 20 3-6 5-13 3-16-1-3-4-3-3 1-2z" fill="#fecdd3" stroke="#e11d48" stroke-width="2.5" stroke-linejoin="round"/><path d="M28 14h8v7h-8V14z" fill="#fef08a" stroke="#ca8a04" stroke-width="1.8" stroke-linejoin="round"/>',
  ),
  'course-europe': shell(
    '#7c3aed',
    '<path d="M17 34c-1-11 14-15 18-5 2 5-4 9-10 7-4-1-6-5-8-2z" fill="#ddd6fe" stroke="#7c3aed" stroke-width="2.5" stroke-linejoin="round"/>',
  ),
  'course-oceania': shell(
    '#0284c7',
    '<ellipse cx="24" cy="28" rx="13" ry="9" fill="#bae6fd" stroke="#0284c7" stroke-width="2.5"/><circle cx="30" cy="17" r="5" fill="#86efac" stroke="#16a34a" stroke-width="2"/>',
  ),
  'course-americas': shell(
    '#16a34a',
    '<path d="M15 12c5 0 9 7 7 15-2 9-9 13-9 5 0 7-5 9-12 3S8 20 15 12z" fill="#bbf7d0" stroke="#16a34a" stroke-width="2.5" stroke-linejoin="round"/>',
  ),
  'course-capitals': shell(
    '#0284c7',
    '<path d="M12 36V17l12-8 12 8v19" stroke="#0284c7" stroke-width="2.5" stroke-linejoin="round"/><rect x="18" y="24" width="12" height="12" rx="2" fill="#bae6fd"/><path d="M22 13h4v6h-4V13z" fill="#f59e0b"/>',
  ),
  'course-facts': shell(
    '#4f46e5',
    '<rect x="13" y="11" width="22" height="26" rx="3" fill="#e0e7ff" stroke="#4f46e5" stroke-width="2.5"/><path d="M19 19a3 3 0 106 0 3 3 0 10-6 0z" stroke="#4f46e5" stroke-width="2.5"/><path d="M19 29h10" stroke="#4f46e5" stroke-width="2.5" stroke-linecap="round"/>',
  ),
  'explore-lang': shell(
    '#d97706',
    '<rect x="11" y="15" width="26" height="18" rx="4" fill="#fef3c7" stroke="#d97706" stroke-width="2.5"/><path d="M17 23h14M17 27h10" stroke="#92400e" stroke-width="2.5" stroke-linecap="round"/><path d="M28 21h6v8h-6l-3-4 3-4z" fill="#dc2626" opacity=".9"/>',
  ),
  'explore-euro': shell(
    '#ca8a04',
    '<circle cx="24" cy="24" r="14" fill="#fef9c3" stroke="#ca8a04" stroke-width="2.5"/><path d="M20 18h8v12h-8V18z" fill="#ca8a04" opacity=".15"/><path d="M22 22h4M22 26h4" stroke="#854d0e" stroke-width="2.5" stroke-linecap="round"/>',
  ),
  'explore-population': shell(
    '#3b82f6',
    '<circle cx="16" cy="18" r="4.5" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/><circle cx="24" cy="16" r="4.5" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/><circle cx="32" cy="18" r="4.5" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/><path d="M10 35c3-7 9-11 14-11s11 4 14 11" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"/>',
  ),
  'explore-area': shell(
    '#16a34a',
    '<rect x="12" y="12" width="24" height="24" rx="3" stroke="#16a34a" stroke-width="2.5" stroke-dasharray="5 4"/><path d="M17 32l7-11 7 11H17z" fill="#bbf7d0" stroke="#16a34a" stroke-width="2" stroke-linejoin="round"/>',
  ),
  'explore-gdp': shell(
    '#2563eb',
    '<rect x="14" y="27" width="6" height="11" rx="1.5" fill="#93c5fd"/><rect x="22" y="21" width="6" height="17" rx="1.5" fill="#60a5fa"/><rect x="30" y="13" width="6" height="25" rx="1.5" fill="#2563eb"/><path d="M12 38h26" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>',
  ),
};

// Preserve non-play-hub icons unless listed above; regenerate only play hub set + merge from full legacy file on first run.
const legacyPath = join(process.cwd(), 'scripts/generate-app-icons.mjs');
const legacyIcons = {
  'ui-premium':
    '<path d="M24 8l4.5 10.5L40 20l-8.5 6.5L34 38l-10-6.5L14 38l2.5-11.5L8 20l11.5-1.5L24 8z" fill="#fef08a" stroke="#ca8a04" stroke-width="2" stroke-linejoin="round"/><circle cx="24" cy="22" r="4" fill="#f59e0b"/>',
  'ui-daily-goal':
    '<circle cx="24" cy="24" r="14" fill="#ecfdf5" stroke="#16a34a" stroke-width="2"/><circle cx="24" cy="24" r="8" stroke="#16a34a" stroke-width="2"/><circle cx="24" cy="24" r="2" fill="#16a34a"/><path d="M24 10v4M24 34v4M10 24h4M34 24h4" stroke="#16a34a" stroke-width="2" stroke-linecap="round"/>',
  'ui-lock':
    '<rect x="14" y="22" width="20" height="16" rx="3" fill="#fef3c7" stroke="#d97706" stroke-width="2"/><path d="M18 22v-4a6 6 0 0112 0v4" stroke="#d97706" stroke-width="2" stroke-linecap="round"/><circle cx="24" cy="30" r="2" fill="#d97706"/>',
  'result-trophy':
    '<path d="M16 14h16v6c0 6-4 10-8 10s-8-4-8-10v-6z" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/><path d="M12 14H8v2c0 4 2 6 4 6M36 14h4v2c0 4-2 6-4 6" stroke="#ca8a04" stroke-width="2" stroke-linecap="round"/><path d="M20 30h8v4H20z" fill="#d97706"/><rect x="18" y="34" width="12" height="4" rx="1" fill="#92400e"/>',
  'result-tie':
    '<circle cx="16" cy="18" r="5" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/><circle cx="32" cy="18" r="5" fill="#fce7f3" stroke="#ec4899" stroke-width="2"/><path d="M12 34c2-5 6-8 12-8M36 34c-2-5-6-8-12-8" stroke="#64748b" stroke-width="2" stroke-linecap="round"/><path d="M20 26h8" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>',
  'result-star':
    '<path d="M24 10l5 11 12 1.5-9 8 2.5 12L24 36l-10.5 6.5L16 30.5 7 22.5 19 21 24 10z" fill="#fef08a" stroke="#ca8a04" stroke-width="2" stroke-linejoin="round"/>',
  'result-spark':
    '<path d="M24 8v8M24 32v8M8 24h8M32 24h8" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round"/><path d="M24 16l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" fill="#ddd6fe" stroke="#7c3aed" stroke-width="2" stroke-linejoin="round"/>',
  'result-target':
    '<circle cx="24" cy="24" r="14" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/><circle cx="24" cy="24" r="8" stroke="#dc2626" stroke-width="2"/><circle cx="24" cy="24" r="3" fill="#dc2626"/>',
  'medal-gold':
    '<circle cx="24" cy="26" r="10" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/><path d="M18 14l6 6 6-6M18 14h12" stroke="#ca8a04" stroke-width="2" stroke-linecap="round"/><text x="24" y="30" text-anchor="middle" font-size="10" fill="#92400e" font-weight="700" font-family="system-ui">1</text>',
  'medal-silver':
    '<circle cx="24" cy="26" r="10" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/><path d="M18 14l6 6 6-6M18 14h12" stroke="#64748b" stroke-width="2" stroke-linecap="round"/><text x="24" y="30" text-anchor="middle" font-size="10" fill="#334155" font-weight="700" font-family="system-ui">2</text>',
  'medal-bronze':
    '<circle cx="24" cy="26" r="10" fill="#fed7aa" stroke="#c2410c" stroke-width="2"/><path d="M18 14l6 6 6-6M18 14h12" stroke="#c2410c" stroke-width="2" stroke-linecap="round"/><text x="24" y="30" text-anchor="middle" font-size="10" fill="#9a3412" font-weight="700" font-family="system-ui">3</text>',
};

const brandMarkSrc = join(dir, 'brand-mark.svg');
if (existsSync(join(process.cwd(), 'src/assets/brand/flagfield-mark.svg'))) {
  writeFileSync(brandMarkSrc, readFileSync(join(process.cwd(), 'src/assets/brand/flagfield-mark.svg')));
}

const allIcons = { ...legacyIcons, ...playHubIcons };

for (const [name, body] of Object.entries(allIcons)) {
  writeFileSync(join(dir, `${name}.svg`), wrap(body));
}

console.log(`Wrote ${Object.keys(allIcons).length} play-hub + system icons to ${dir}`);
void legacyPath;
