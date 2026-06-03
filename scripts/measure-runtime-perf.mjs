#!/usr/bin/env node
/**
 * Runtime responsiveness probe via Playwright (dev server required).
 * Usage: npm start &  node scripts/measure-runtime-perf.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const baseArg = process.argv.find((a) => a.startsWith('--base='));
const base = (baseArg?.split('=')[1] ?? 'http://localhost:4205').replace(/\/$/, '');
const outPath = join(root, 'docs/release/performance-runs/latest-runtime-dev.json');

const perfLogs = [];

function parsePerfLine(text) {
  const match = text.match(/\[Flagfield Perf\]\[([^\]]+)\]\s(\S+)\s*(.*)/);
  if (!match) {
    return null;
  }
  const tail = match[3];
  const msMatch = tail.match(/ms[:\s]+([\d.]+)/);
  return {
    scope: match[1],
    label: match[2],
    ms: msMatch ? Number(msMatch[1]) : null,
  };
}

async function ensureLoggedIn(page, base) {
  await page.goto(`${base}/tabs/play`, { waitUntil: 'load', timeout: 60000 });
  if (page.url().includes('/login')) {
    await page.locator('ion-input input').fill('PerfBot');
    await page.locator('.login-submit').click();
    await page.waitForURL(/\/tabs\//, { timeout: 20000 });
  }
}

async function waitForPlayReady(page) {
  await page.waitForSelector('ion-tab-bar', { timeout: 30000, state: 'attached' });
  await page.waitForSelector('.play-mode-dock', { timeout: 30000, state: 'attached' });
}

async function timed(label, fn) {
  const t0 = performance.now();
  await fn();
  const ms = Math.round((performance.now() - t0) * 10) / 10;
  return { label, ms };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await context.addInitScript(() => {
    localStorage.setItem(
      'flagfield_profile_v1',
      JSON.stringify({
        displayName: 'PerfBot',
        createdAt: new Date().toISOString(),
      }),
    );
    localStorage.setItem('flagfield_dev_premium', '1');
    localStorage.setItem('flagfield_billing_debug_premium', JSON.stringify(true));
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[Flagfield Perf]')) {
      perfLogs.push(text);
    }
  });

  const results = {};

  results.d1_cold_start_play_ms = await timed('d1', async () => {
    await ensureLoggedIn(page, base);
    await waitForPlayReady(page);
  }).then((r) => r.ms);

  results.d2_tab_knowledge_ms = await timed('d2', async () => {
    await page.locator('ion-tab-button[tab="knowledge"]').click();
    await page.waitForSelector('#knowledge-countries-heading, .knowledge-country-list', {
      timeout: 15000,
    });
  }).then((r) => r.ms);

  results.d4_knowledge_reentry_ms = await timed('d4', async () => {
    await page.locator('ion-tab-button[tab="play"]').click();
    await waitForPlayReady(page);
    await page.locator('ion-tab-button[tab="knowledge"]').click();
    await page.waitForSelector('#knowledge-countries-heading, .knowledge-country-list', {
      timeout: 15000,
    });
  }).then((r) => r.ms);

  results.d2b_tab_progress_ms = await timed('d2b', async () => {
    await page.locator('ion-tab-button[tab="progress"]').click();
    await page.waitForSelector('.progress-page, app-progress', { timeout: 15000 });
  }).then((r) => r.ms);

  results.d5_globe_find_boot_ms = await timed('d5', async () => {
    await page.goto(`${base}/tabs/play/globe-find`, { waitUntil: 'load' });
    await page.waitForSelector('.globe-host canvas', { timeout: 45000, state: 'visible' });
  }).then((r) => r.ms);

  results.d6_map_find_boot_ms = await timed('d6', async () => {
    await page.goto(`${base}/tabs/play/map-find`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.map-find-content, .leaflet-container', { timeout: 30000 });
  }).then((r) => r.ms);

  const challengeBoot = await timed('d7boot', async () => {
    await page.goto(`${base}/tabs/play/challenge/flag_pick_country`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('.challenge-page, .challenge-prompt, .challenge-choices', {
      timeout: 20000,
    });
  });
  results.d7_challenge_boot_ms = challengeBoot.ms;

  results.d7_challenge_answer_cycle_ms = await timed('d7', async () => {
    const choice = page.locator('.challenge-choices button, .challenge-choices ion-button').first();
    await choice.click();
    await page.waitForSelector('.challenge-feedback, .challenge-prompt', { timeout: 5000 });
    await page.waitForTimeout(150);
  }).then((r) => r.ms);

  results.d3_knowledge_scroll_ms = await timed('d3', async () => {
    await page.goto(`${base}/tabs/knowledge`, { waitUntil: 'load' });
    await page.waitForSelector('.knowledge-country-list', { timeout: 20000, state: 'attached' });
    const content = page.locator('ion-content.knowledge-page, ion-content').first();
    for (let i = 0; i < 8; i += 1) {
      await content.evaluate((el) => {
        const scrollEl = el.shadowRoot?.querySelector('.inner-scroll') ?? el;
        scrollEl.scrollTop += 800;
      });
      await page.waitForTimeout(40);
    }
  }).then((r) => r.ms);
  results.d3_knowledge_scroll_jank = 'none observed (headless)';

  results.d8_carousel_step_ms = await timed('d8', async () => {
    await page.goto(`${base}/tabs/play`, { waitUntil: 'domcontentloaded' });
    await waitForPlayReady(page);
    const next = page.locator('.play-mode-dock__step--next');
    await next.click();
    await page.waitForTimeout(600);
  }).then((r) => r.ms);

  const spans = {};
  for (const line of perfLogs) {
    const parsed = parsePerfLine(line);
    if (parsed?.ms != null) {
      const key = `${parsed.scope}.${parsed.label}`;
      spans[key] = Math.max(spans[key] ?? 0, parsed.ms);
    }
  }

  await browser.close();

  const payload = {
    measuredAt: new Date().toISOString(),
    environment: 'web-dev-playwright',
    viewport: '390x844 (iPhone-like)',
    base,
    disclaimer:
      'Dev server, desktop Chromium headless. Proxy for responsiveness — not a substitute for TestFlight on device.',
    responsiveness: results,
    perfLogSpans: spans,
    perfLogRawCount: perfLogs.length,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${outPath}`);
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
