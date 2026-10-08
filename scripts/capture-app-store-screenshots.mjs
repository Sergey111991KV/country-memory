/**
 * Capture App Store screenshots via Playwright (iPhone viewport).
 * Requires: ng serve on :4200
 */
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../screenshots/ios/raw-final');
mkdirSync(outDir, { recursive: true });

const BASE = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:4200';
const PROFILE = {
  displayName: 'Alex',
  createdAt: '2026-07-21T18:00:00.000Z',
};

async function seedAuth(page) {
  await page.addInitScript((profile) => {
    localStorage.setItem('flagfield_profile_v1', JSON.stringify(profile));
    localStorage.setItem('app_theme_v1', JSON.stringify('light'));
    localStorage.setItem('app_theme_light_default_v2', JSON.stringify(1));
    localStorage.setItem(
      'flagfield_learned_marks_v1',
      JSON.stringify({ countries: ['US', 'JP', 'FR', 'BR', 'AU'], facts: [] }),
    );
  }, PROFILE);
}

async function shot(page, name) {
  const path = join(outDir, `${name}.png`);
  await page.waitForTimeout(800);
  await page.screenshot({ path, fullPage: false });
  console.log('wrote', path);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 14 Pro Max'],
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'en-US',
    colorScheme: 'light',
  });
  const page = await context.newPage();
  await seedAuth(page);

  await page.goto(`${BASE}/tabs/play`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot(page, '01-play-hub');

  await page.goto(`${BASE}/tabs/knowledge`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot(page, '02-knowledge');

  await page.goto(`${BASE}/tabs/play/globe-find`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await shot(page, '03-globe-quest');

  await page.goto(`${BASE}/tabs/play/map-find`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await shot(page, '04-map-quest');

  await page.goto(`${BASE}/tabs/play/challenge/flag_pick_country`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(2000);
  await shot(page, '05-flag-quiz');

  // Country portrait modal (culture hold disabled in quiz UI — open via component API)
  await page.evaluate(async () => {
    const el = document.querySelector('app-flag-display');
    // @ts-ignore
    const cmp = window.ng?.getComponent(el);
    if (!cmp) {
      throw new Error('flag-display not found');
    }
    cmp.enableCultureHold = true;
    cmp.iso2 = 'JP';
    await cmp.openCultureView();
  });
  await page.waitForTimeout(2000);
  await page.addStyleTag({
    content: '.culture-modal__asset-hint { display: none !important; }',
  });
  await shot(page, '06-country-portrait');

  await page.goto(`${BASE}/tabs/progress`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot(page, '07-progress');

  await page.goto(`${BASE}/tabs/play/knowledge-quiz`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await shot(page, '08-knowledge-quiz');

  await page.goto(`${BASE}/tabs/play/learn`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot(page, '09-learning-path');

  await page.goto(`${BASE}/tabs/play/about-game`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await shot(page, '10-about-game');

  await browser.close();
  console.log('Done. Output:', outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
