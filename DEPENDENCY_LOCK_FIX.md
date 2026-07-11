# Dashboard dependency-lock correction

## Root cause

`package.json` had been migrated from Leaflet to `@react-google-maps/api` and `@types/google.maps`, but `package-lock.json` still described the old Leaflet dependency graph. Because Vercel runs `npm ci`, npm correctly rejected the repository: the manifest requested dependencies that the frozen lock did not contain, while the lock still contained removed direct dependencies.

## Correction

- Removed stale `leaflet`, `react-leaflet`, `@react-leaflet/core`, `@types/leaflet`, and `@types/geojson` lock entries.
- Removed `@react-google-maps/api`; only map primitives used by the Dashboard are now implemented locally on top of the official Google Maps JavaScript API. This avoids carrying six unused wrapper dependencies and their transitive graph.
- Kept `@types/google.maps@3.58.1` as the only Google Maps npm dependency and added it to the lock.
- Regenerated and normalized the lock with `npm install --package-lock-only --ignore-scripts --offline` after the dependency cleanup.
- Added `npm run check:lock`, executed automatically by `prebuild`, to compare both dependency sections in `package.json` and the root package in `package-lock.json`.

## Verification performed

- `npm install --package-lock-only --ignore-scripts --offline`: passed.
- `npm run check:lock`: passed.
- TypeScript/TSX syntax transpilation: passed.
- `git diff --check`: passed.
- Source scan confirms no Leaflet or `@react-google-maps/api` import remains.

## Verification blocked in this sandbox

A full `npm install` could not reach `registry.npmjs.org` (`ENOTFOUND`). A full offline install then stopped at the first uncached tarball (`yocto-queue@0.1.0`). Consequently, `npm ci`, `npm run build`, and a real Vercel deployment were not marked successful here. The lock mismatch itself is corrected, but release status remains blocked until Vercel executes `npm ci` and `npm run build` successfully with registry access.
