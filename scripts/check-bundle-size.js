#!/usr/bin/env node
/**
 * CI Bundle Size Tracking
 *
 * Measures bundle sizes and optionally enforces thresholds.
 * Run after `npx grunt build:browser` to check for regressions.
 *
 * Usage:
 *   node scripts/check-bundle-size.js          # Report sizes
 *   node scripts/check-bundle-size.js --check  # Fail if over threshold
 */
const fs = require('fs');
const zlib = require('zlib');

const THRESHOLDS = {
  // Set these to current sizes + 5% headroom
  // Update when intentional size changes are made
  'build/ably.min.js': { maxMinified: 195000, maxGzip: 54000 },
};

function measure(file) {
  if (!fs.existsSync(file)) return null;
  const code = fs.readFileSync(file);
  const minified = code.length;
  const gzipped = zlib.gzipSync(code).length;
  let brotli = null;
  try {
    brotli = zlib.brotliCompressSync(code).length;
  } catch (e) {
    // brotli not available in older Node
  }
  return { minified, gzipped, brotli };
}

const files = ['build/ably.min.js', 'build/ably.js'];
const check = process.argv.includes('--check');
let failed = false;

console.log('=== Bundle Size Report ===\n');

for (const file of files) {
  const stats = measure(file);
  if (!stats) {
    console.log(`  ${file}: NOT FOUND`);
    continue;
  }

  const brotliStr = stats.brotli ? ` / ${(stats.brotli / 1024).toFixed(1)} KB brotli` : '';
  console.log(`  ${file}:`);
  console.log(`    ${(stats.minified / 1024).toFixed(1)} KB raw / ${(stats.gzipped / 1024).toFixed(1)} KB gzip${brotliStr}`);

  if (check && THRESHOLDS[file]) {
    const t = THRESHOLDS[file];
    if (stats.minified > t.maxMinified) {
      console.log(`    FAIL: minified ${stats.minified} > threshold ${t.maxMinified}`);
      failed = true;
    }
    if (stats.gzipped > t.maxGzip) {
      console.log(`    FAIL: gzipped ${stats.gzipped} > threshold ${t.maxGzip}`);
      failed = true;
    }
    if (!failed) {
      console.log(`    PASS: within thresholds (max ${t.maxMinified} min / ${t.maxGzip} gzip)`);
    }
  }
}

console.log('');

if (check && failed) {
  console.log('Bundle size check FAILED. Update thresholds in scripts/check-bundle-size.js if this is intentional.');
  process.exit(1);
} else if (check) {
  console.log('Bundle size check PASSED.');
}
