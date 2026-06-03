#!/usr/bin/env node
/**
 * Measures dev-server load timings for key routes and assets.
 * Prerequisite: npm start (http://localhost:4205)
 *
 * Usage: node scripts/measure-web-perf.mjs [--base=http://localhost:4205]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const baseArg = process.argv.find((a) => a.startsWith('--base='));
const base = (baseArg?.split('=')[1] ?? 'http://localhost:4205').replace(/\/$/, '');
const outPath = join(root, 'docs/release/performance-runs/latest-web-dev.json');

async function timed(label, url, init) {
  const t0 = performance.now();
  const res = await fetch(`${base}${url}`, init);
  const body = await res.arrayBuffer();
  const ms = performance.now() - t0;
  return {
    label,
    url,
    status: res.status,
    ms: Math.round(ms * 10) / 10,
    bytes: body.byteLength,
  };
}

async function main() {
  const results = [];
  results.push(await timed('play_route', '/tabs/play'));
  results.push(await timed('countries_json', '/assets/data/countries.json'));
  results.push(await timed('knowledge_route', '/tabs/knowledge'));
  results.push(await timed('progress_route', '/tabs/progress'));

  const payload = {
    measuredAt: new Date().toISOString(),
    environment: 'web-dev-proxy',
    base,
    note:
      'Dev server (unminified chunks). Use as regression trend only; native device runs go in PERFORMANCE-LOG.md.',
    routes: results,
    playTabReadyProxyMs: results.find((r) => r.label === 'play_route')?.ms ?? null,
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
