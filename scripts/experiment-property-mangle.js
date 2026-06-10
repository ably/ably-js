#!/usr/bin/env node
/**
 * Experiment 3: Property Mangling (Preact-style)
 *
 * Test mangling _-prefixed properties on the existing bundle
 * to measure potential savings. Expected to break things.
 */
const { minify } = require('terser');
const fs = require('fs');
const zlib = require('zlib');

async function main() {
  const bundled = fs.readFileSync('build/ably.js', 'utf8');

  // Count _-prefixed properties in the bundle
  const underscoreProps = bundled.match(/\._[a-zA-Z]\w*/g) || [];
  const uniqueProps = [...new Set(underscoreProps)];
  console.log(`Found ${underscoreProps.length} _-prefixed property accesses`);
  console.log(`Found ${uniqueProps.length} unique _-prefixed properties`);
  console.log(`Top 20 most frequent:`);
  const freq = {};
  underscoreProps.forEach(p => { freq[p] = (freq[p] || 0) + 1; });
  Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([prop, count]) => console.log(`  ${count}x ${prop}`));

  // Baseline: terser minify WITHOUT property mangling
  console.log('\nMinifying without property mangling...');
  const baseline = await minify(bundled, {
    compress: { ecma: 2017, passes: 2 },
    mangle: true,
  });

  // With property mangling on _-prefixed
  console.log('Minifying WITH _-prefix property mangling...');
  const mangled = await minify(bundled, {
    compress: { ecma: 2017, passes: 2 },
    mangle: {
      properties: {
        regex: /^_/,
      },
    },
  });

  function measure(label, code) {
    const raw = Buffer.byteLength(code);
    const gzipped = zlib.gzipSync(code).length;
    console.log(`  ${label}: ${raw} bytes min / ${gzipped} bytes gzip`);
    return { raw, gzipped };
  }

  console.log('\n=== RESULTS ===');
  const baseStats = measure('no mangle  ', baseline.code);
  const mangleStats = measure('_-mangled  ', mangled.code);
  console.log(`\n  Delta: -${baseStats.raw - mangleStats.raw} bytes min / -${baseStats.gzipped - mangleStats.gzipped} bytes gzip`);
  console.log(`  Savings: ${((1 - mangleStats.raw / baseStats.raw) * 100).toFixed(1)}% min / ${((1 - mangleStats.gzipped / baseStats.gzipped) * 100).toFixed(1)}% gzip`);

  fs.writeFileSync('build/ably.mangled.min.js', mangled.code);
}

main().catch(console.error);
