#!/usr/bin/env node
/**
 * Experiment 6: Code Deduplication
 *
 * Analyze the bundled output for repeated code patterns and estimate
 * savings from consolidation.
 */
const fs = require('fs');
const zlib = require('zlib');

const bundled = fs.readFileSync('build/ably.js', 'utf8');
const minified = fs.readFileSync('build/ably.min.js', 'utf8');

console.log(`Bundle: ${bundled.length} B unminified / ${minified.length} B minified / ${zlib.gzipSync(minified).length} B gzip\n`);

// Strategy: Look for repeated multi-line patterns in the bundled output
// We'll extract all lines, find recurring sequences of 3+ lines

// Simpler approach: find all repeated substrings > 50 chars
function findRepeatedSubstrings(code, minLen, maxLen) {
  const counts = {};
  // Sample substrings at various positions
  for (let len = minLen; len <= maxLen; len += 10) {
    for (let i = 0; i < code.length - len; i += 50) {
      const sub = code.substring(i, i + len);
      if (sub.includes('\n') && !sub.match(/^\s+$/)) { // multi-line, non-whitespace
        const key = sub.trim();
        if (key.length >= minLen) {
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    }
  }
  return Object.entries(counts)
    .filter(([_, count]) => count > 1)
    .sort((a, b) => (b[0].length * (b[1] - 1)) - (a[0].length * (a[1] - 1)));
}

// Approach 2: find specific known patterns
console.log('=== Pattern Analysis ===\n');

// 1. fromValuesArray pattern
const fromValuesArrayPattern = /static fromValuesArray\([^)]+\)[^{]*\{[^}]+\}/g;
const fvaMatches = bundled.match(fromValuesArrayPattern) || [];
console.log(`fromValuesArray implementations: ${fvaMatches.length}`);
const fvaBytes = fvaMatches.reduce((sum, m) => sum + m.length, 0);
console.log(`  Total bytes: ${fvaBytes}`);
fvaMatches.forEach((m, i) => console.log(`  #${i+1}: ${m.length}B - ${m.substring(0, 80)}...`));

// 2. fromValues pattern (Object.assign based)
const fromValuesPattern = /static fromValues\([^)]+\)[^{]*\{[^}]+\}/g;
const fvMatches = bundled.match(fromValuesPattern) || [];
console.log(`\nfromValues implementations: ${fvMatches.length}`);
const fvBytes = fvMatches.reduce((sum, m) => sum + m.length, 0);
console.log(`  Total bytes: ${fvBytes}`);

// 3. Check for repeated object spread / Object.assign patterns
const assignPattern = /Object\.assign\(new \w+\(\)/g;
const assignMatches = bundled.match(assignPattern) || [];
console.log(`\nObject.assign(new Class()) patterns: ${assignMatches.length}`);

// 4. Check for repeated toJSON patterns
const toJsonPattern = /toJSON\(\)[^{]*\{[^}]+\}/g;
const toJsonMatches = bundled.match(toJsonPattern) || [];
console.log(`toJSON implementations: ${toJsonMatches.length}`);
const toJsonBytes = toJsonMatches.reduce((sum, m) => sum + m.length, 0);
console.log(`  Total bytes: ${toJsonBytes}`);

// 5. Estimate total dedup opportunity
const totalDupBytes = fvaBytes + fvBytes + toJsonBytes;
console.log(`\n=== Summary ===`);
console.log(`Total identified pattern bytes: ${totalDupBytes}`);
console.log(`  fromValuesArray: ${fvaBytes}B (${fvaMatches.length} impls)`);
console.log(`  fromValues: ${fvBytes}B (${fvMatches.length} impls)`);
console.log(`  toJSON: ${toJsonBytes}B (${toJsonMatches.length} impls)`);

// If consolidated, each impl reduces to ~30B call (generic helper + call site)
// Savings = totalBytes - (helperSize + numImpls * callSiteSize)
const helperOverhead = 200; // one generic helper function
const callSiteSize = 40; // per call site
const estimatedSavings = totalDupBytes - (helperOverhead + (fvaMatches.length + fvMatches.length + toJsonMatches.length) * callSiteSize);
console.log(`\nEstimated savings from consolidation: ${estimatedSavings} B unminified`);
console.log(`Estimated minified savings: ~${Math.round(estimatedSavings * 0.5)} B (conservative)`);
console.log(`Estimated gzip savings: ~${Math.round(estimatedSavings * 0.15)} B (gzip already deduplicates well)`);
