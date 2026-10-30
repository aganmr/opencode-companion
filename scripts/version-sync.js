#!/usr/bin/env node
/**
 * Sync the app version from package.json into the native Android config.
 *
 * package.json `version` (A.B.C) is the single source of truth. Android
 * needs, besides the human-readable `versionName`, a strictly increasing
 * integer `versionCode`; we derive it as:
 *
 *   versionCode = A*10000 + B*100 + C      (e.g. 1.0.0 -> 10000)
 *
 * The 0-99 cap on B and C is what keeps this mapping collision-free.
 *
 * Usage: yarn version:sync
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg.version || '');
if (!m) {
  console.error(`Invalid version in package.json: "${pkg.version}" (expected A.B.C)`);
  process.exit(1);
}
const a = Number(m[1]);
const b = Number(m[2]);
const c = Number(m[3]);
if (b > 99 || c > 99) {
  console.error(`Version ${pkg.version}: B and C must be <= 99 (use rollover to the next digit).`);
  process.exit(1);
}
if (a > 214) {
  console.error(`Version ${pkg.version}: A > 214 would overflow the Android versionCode int.`);
  process.exit(1);
}

const versionCode = a * 10000 + b * 100 + c;
const gradle = fs.readFileSync(gradlePath, 'utf8');
const next = gradle
  .replace(/^(\s*versionCode\s+)\d+$/m, `$1${versionCode}`)
  .replace(/^(\s*versionName\s+)"[^"]*"/m, `$1"${pkg.version}"`);
if (next === gradle) {
  console.error('Could not find versionCode/versionName lines in android/app/build.gradle.');
  process.exit(1);
}
fs.writeFileSync(gradlePath, next);
console.log(`Synced ${pkg.version} (versionCode ${versionCode}) -> android/app/build.gradle`);
