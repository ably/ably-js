#!/usr/bin/env node
/**
 * Experiment 2: Compare minifiers (esbuild vs swc vs terser)
 *
 * Builds with esbuild (bundle only, no minify), then minifies with each tool.
 */
const esbuild = require('esbuild');
const swc = require('@swc/core');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const banner = require('../src/fragments/license');
const umdWrapper = require('esbuild-plugin-umd-wrapper');

async function main() {
  // Step 1: Bundle with esbuild (no minification)
  console.log('Bundling with esbuild (no minify)...');
  await esbuild.build({
    bundle: true,
    sourcemap: false,
    format: 'umd',
    banner: { js: '/*' + banner + '*/' },
    plugins: [umdWrapper.default({ libraryName: 'Ably', amdNamedModule: false })],
    target: 'es2017',
    entryPoints: ['src/platform/web/index.ts'],
    outfile: 'build/ably.bundled.js',
    minify: false,
  });

  const bundled = fs.readFileSync('build/ably.bundled.js', 'utf8');
  console.log(`Bundled size: ${bundled.length} bytes\n`);

  // Step 2a: esbuild minify
  console.log('Minifying with esbuild...');
  const esbuildResult = await esbuild.transform(bundled, {
    minify: true,
    target: 'es2017',
  });
  const esbuildMin = esbuildResult.code;

  // Step 2b: swc minify
  console.log('Minifying with swc...');
  const swcResult = await swc.minify(bundled, {
    compress: {
      ecma: 2017,
      passes: 2,
    },
    mangle: true,
  });
  const swcMin = swcResult.code;

  // Step 2c: terser minify (optional - check if installed)
  let terserMin = null;
  try {
    const { minify: terserMinify } = require('terser');
    console.log('Minifying with terser...');
    const terserResult = await terserMinify(bundled, {
      compress: {
        ecma: 2017,
        passes: 2,
      },
      mangle: true,
    });
    terserMin = terserResult.code;
  } catch (e) {
    console.log('terser not installed, skipping');
  }

  // Step 3: Measure
  function measure(label, code) {
    const raw = Buffer.byteLength(code);
    const gzipped = zlib.gzipSync(code).length;
    console.log(`  ${label}: ${raw} bytes min / ${gzipped} bytes gzip`);
    return { raw, gzipped };
  }

  console.log('\n=== RESULTS ===');
  const esbuildStats = measure('esbuild', esbuildMin);
  const swcStats = measure('swc    ', swcMin);
  if (terserMin) {
    const terserStats = measure('terser ', terserMin);
    console.log(`\n  swc vs esbuild: ${esbuildStats.raw - swcStats.raw} bytes min / ${esbuildStats.gzipped - swcStats.gzipped} bytes gzip`);
    console.log(`  terser vs esbuild: ${esbuildStats.raw - terserStats.raw} bytes min / ${esbuildStats.gzipped - terserStats.gzipped} bytes gzip`);
  } else {
    console.log(`\n  swc vs esbuild: ${esbuildStats.raw - swcStats.raw} bytes min / ${esbuildStats.gzipped - swcStats.gzipped} bytes gzip`);
  }

  // Save the swc version for inspection
  fs.writeFileSync('build/ably.swc.min.js', swcMin);
  if (terserMin) fs.writeFileSync('build/ably.terser.min.js', terserMin);
}

main().catch(console.error);
