#!/usr/bin/env node
/**
 * Builds src/assets/data/neighbors.json (ISO2 -> bordering ISO2 list) from the
 * Natural Earth countries GeoJSON: two countries are neighbours when they share
 * at least two boundary vertices (land borders share exact coordinates).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const geo = JSON.parse(readFileSync(join(root, 'src/assets/geo/countries.geojson'), 'utf8'));

function iso2(props) {
  let raw = props['ISO3166-1-Alpha-2'] ?? props.ISO_A2 ?? '';
  if (!raw || raw === '-99') raw = props.ISO_A2_EH ?? props.WB_A2 ?? '';
  const iso = String(raw).toUpperCase();
  return iso && iso !== '-99' && iso.length === 2 ? iso : '';
}

function* rings(geometry) {
  if (geometry.type === 'Polygon') yield* geometry.coordinates;
  else if (geometry.type === 'MultiPolygon') for (const p of geometry.coordinates) yield* p;
}

const owners = new Map(); // "lng,lat" -> Set<iso>
for (const f of geo.features) {
  const iso = iso2(f.properties ?? {});
  if (!iso || iso === 'AQ' || !f.geometry) continue;
  for (const ring of rings(f.geometry)) {
    for (const [lng, lat] of ring) {
      const key = `${lng.toFixed(4)},${lat.toFixed(4)}`;
      let set = owners.get(key);
      if (!set) owners.set(key, (set = new Set()));
      set.add(iso);
    }
  }
}

const shared = new Map(); // "A|B" -> count
for (const set of owners.values()) {
  if (set.size < 2) continue;
  const list = [...set].sort();
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const k = `${list[i]}|${list[j]}`;
      shared.set(k, (shared.get(k) ?? 0) + 1);
    }
  }
}

const neighbors = {};
for (const [k, n] of shared) {
  if (n < 2) continue;
  const [a, b] = k.split('|');
  (neighbors[a] ??= []).push(b);
  (neighbors[b] ??= []).push(a);
}
const sorted = Object.fromEntries(
  Object.keys(neighbors).sort().map((k) => [k, neighbors[k].sort()]),
);
writeFileSync(
  join(root, 'src/assets/data/neighbors.json'),
  JSON.stringify({ version: 1, neighbors: sorted }) + '\n',
);
console.log(`neighbors.json: ${Object.keys(sorted).length} countries with land borders`);
