#!/usr/bin/env node
/**
 * Extracts bundle size metrics from a production Angular build.
 * Usage: node scripts/measure-build-perf.mjs [--config production-local]
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const configArg = process.argv.find((a) => a.startsWith('--config='));
const config = configArg?.split('=')[1] ?? 'production-local';
const outArg = process.argv.find((a) => a.startsWith('--out='));
const outPath =
  outArg?.split('=')[1] ??
  join(root, 'docs/release/performance-runs/latest-build.json');

function parseBuildOutput(text) {
  const initial = text.match(
    /Initial total\s*\|\s*([\d.]+\s*[kM]?B)\s*\|\s*([\d.]+\s*[kM]?B)/i,
  );
  const main = text.match(
    /main\.[a-f0-9]+\.js\s*\|\s*main\s*\|\s*([\d.]+\s*[kM]?B)\s*\|\s*([\d.]+\s*[kM]?B)/i,
  );
  const chunks = [];
  const chunkRe =
    /([a-f0-9]+\.[a-f0-9]+\.js)\s*\|\s*([^|]+?)\s*\|\s*([\d.]+\s*[kM]?B)\s*\|\s*([\d.]+\s*[kM]?B)/gi;
  let match;
  while ((match = chunkRe.exec(text)) !== null) {
    chunks.push({
      file: match[1].trim(),
      name: match[2].trim(),
      raw: match[3].trim(),
      transfer: match[4].trim(),
    });
  }

  const pick = (pattern) =>
    chunks.find((c) => pattern.test(c.name) || pattern.test(c.file));

  return {
    initialRaw: initial?.[1]?.trim() ?? null,
    initialTransfer: initial?.[2]?.trim() ?? null,
    mainRaw: main?.[1]?.trim() ?? null,
    mainTransfer: main?.[2]?.trim() ?? null,
    lazyGlobe: pick(/three-globe|globe-find/i),
    lazyMap: pick(/map-find/i),
    lazyKnowledge: pick(/knowledge-base/i),
    lazyPlay: pick(/play-play-module/i),
    lazySettings: pick(/settings-settings-module/i),
    chunkCount: chunks.length,
    warnings: [...text.matchAll(/Warning:.*/g)].map((m) => m[0].trim()),
  };
}

console.log(`Running ng build --configuration=${config}…`);
const buildOutput = execSync(`npm run ng -- build --configuration=${config}`, {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  maxBuffer: 20 * 1024 * 1024,
});

const parsed = parseBuildOutput(buildOutput);
const result = {
  measuredAt: new Date().toISOString(),
  configuration: config,
  bundle: parsed,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
console.log(JSON.stringify(result, null, 2));
