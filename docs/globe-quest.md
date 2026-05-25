# Globe Quest — 3D political globe

## How it should look

Reference implementation from the **three-globe** author (country polygons on a dark political-style base map):

- **Live demo:** [Country Polygons example](https://vasturiano.github.io/three-globe/example/country-polygons/)
- **Source:** [country-polygons/index.html](https://github.com/vasturiano/three-globe/blob/master/example/country-polygons/index.html)

Flagfield uses the same stack:

- [three-globe](https://github.com/vasturiano/three-globe) — country meshes on a sphere
- [Three.js](https://threejs.org/) — WebGL scene
- [Natural Earth 50m admin-0 countries](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries/) — political boundaries (GeoJSON in `src/assets/geo/countries.geojson`)

Visual intent: **dark ocean**, **colored countries by continent**, **visible borders**, orbit with drag/zoom, tap a country to select.

## API notes (important)

`three-globe` **does not** provide `onPolygonClick` or `pointOfView`. Those names come from older examples or **globe.gl** (a different wrapper).

Official polygon API (v2.45): [README — Polygons Layer](https://github.com/vasturiano/three-globe#polygons-layer)

| Need | Correct approach |
|------|------------------|
| Country click | `THREE.Raycaster` on the globe object; read `__data.data` on hit mesh (see `globe-pick.ts`) |
| Fly to country | `globe.getCoords(lat, lng, altitude)` then move camera; `globe.setPointOfView(camera)` |
| Shared Three.js | Set `window.THREE` before importing `three-globe` (see `src/main.ts`) |

## Boot sequence (Flagfield)

1. Load `countries.json` (names, capitals, coordinates)
2. Load `assets/geo/countries.geojson` (~3 MB, Natural Earth 50m)
3. Build playable list = catalog ∩ map ISO codes
4. Create `ThreeGlobe` with `polygonsData`
5. Attach pointer picking on the canvas

## Performance

The globe is **not** rendered at 60fps while idle. WebGL draws only when:

- OrbitControls fires `change` (drag / damping)
- Country colors update
- Camera flies to a target

Three.js runs **outside** `NgZone` to avoid Chrome `[Violation] 'requestAnimationFrame' handler took Nms` spam from zone.js.

Other tuning: coarser polygon caps (`polygonCapCurvatureResolution: 14`), `polygonsTransitionDuration: 0`, only catalog countries on the mesh, max DPR 1.5.

## Common failures

| Error | Cause | Fix |
|-------|--------|-----|
| `onPolygonClick is not a function` | Method removed in current three-globe | Raycaster picking (fixed) |
| `Globe host element missing` | `#globeHost` inside `*ngIf` during init | Host always in DOM; boot in `ionViewDidEnter` |
| `THREE is not initialized` | two copies of Three.js | `window.THREE` in `main.ts` before lazy import |
| Blank / stuck loading | 14 MB GeoJSON or boot error | Use 50m GeoJSON; check console for `Globe Quest boot failed: …` |

## More examples

- [three-globe examples index](https://github.com/vasturiano/three-globe#check-out-the-examples)
- [Basic globe](https://vasturiano.github.io/three-globe/example/basic/)
- [Hexed country polygons](https://vasturiano.github.io/three-globe/example/hexed-polygons/)
- [Natural Earth data](https://www.naturalearthdata.com/)
- [GeoJSON source (GitHub)](https://github.com/nvkelso/natural-earth-vector/tree/master/geojson)
