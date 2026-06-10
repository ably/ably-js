#!/usr/bin/env node
/**
 * Experiment 5: Logger String Constants
 *
 * Measure how much space is consumed by repeated function-name strings
 * in Logger.logAction() calls, and estimate savings from extracting to constants.
 */
const fs = require('fs');
const zlib = require('zlib');

const unminified = fs.readFileSync('build/ably.js', 'utf8');
const minified = fs.readFileSync('build/ably.min.js', 'utf8');

// Find Logger.logAction 3rd argument (action string)
// In the bundled code these are the descriptive strings like 'ConnectionManager.activateTransport()'
const logPattern = /Logger\.logAction\([^,]+,\s*[^,]+,\s*["']([^"']+)["']/g;
let match;
const actionStrings = [];
while ((match = logPattern.exec(unminified)) !== null) {
  actionStrings.push(match[1]);
}

// Also check logActionNoStrip
const noStripPattern = /Logger\.logActionNoStrip\([^,]+,\s*["']([^"']+)["']/g;
while ((match = noStripPattern.exec(unminified)) !== null) {
  actionStrings.push(match[1]);
}

console.log(`Found ${actionStrings.length} logger action strings in unminified bundle`);
const totalBytes = actionStrings.reduce((sum, s) => sum + s.length + 2, 0);
console.log(`Total string bytes (with quotes): ${totalBytes}`);

const unique = [...new Set(actionStrings)];
console.log(`Unique strings: ${unique.length}`);

// Frequency analysis
const freq = {};
actionStrings.forEach(s => { freq[s] = (freq[s] || 0) + 1; });

console.log('\nTop 20 most frequent:');
Object.entries(freq)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .forEach(([str, count]) => {
    console.log(`  ${count}x "${str}" (${str.length}B)`);
  });

// Now check: after stripping (experiment 1), only LOG_ERROR and logActionNoStrip remain
// So the relevant strings are only those in LOG_ERROR calls and logActionNoStrip calls
const errorLogPattern = /Logger\.logAction\([^,]+,\s*Logger\.LOG_ERROR\s*,\s*["']([^"']+)["']/g;
const preservedStrings = [];
while ((match = errorLogPattern.exec(unminified)) !== null) {
  preservedStrings.push(match[1]);
}
while ((match = noStripPattern.exec(unminified)) !== null) {
  preservedStrings.push(match[1]);
}

console.log(`\n--- After log stripping (experiment 1) ---`);
console.log(`Preserved strings (LOG_ERROR + logActionNoStrip): ${preservedStrings.length}`);
const preservedBytes = preservedStrings.reduce((sum, s) => sum + s.length + 2, 0);
console.log(`Preserved string bytes: ${preservedBytes}`);

// If we extracted these to constants, savings = (occurrences * original_length) - (unique * original_length + occurrences * ~3 chars for var name)
const preservedFreq = {};
preservedStrings.forEach(s => { preservedFreq[s] = (preservedFreq[s] || 0) + 1; });
const preservedUnique = [...new Set(preservedStrings)];

let savingsFromConstants = 0;
preservedUnique.forEach(s => {
  const count = preservedFreq[s];
  if (count > 1) {
    // Original: count * (length + 2) bytes
    // With constant: (length + 2) + count * 2 bytes (short var name after minification)
    savingsFromConstants += (count - 1) * (s.length + 2) - (count * 2);
  }
});

console.log(`Savings from extracting preserved constants: ${savingsFromConstants} bytes`);

// Without log stripping, full savings
let fullSavings = 0;
unique.forEach(s => {
  const count = freq[s];
  if (count > 1) {
    fullSavings += (count - 1) * (s.length + 2) - (count * 2);
  }
});
console.log(`\n--- Without log stripping ---`);
console.log(`Savings from extracting ALL to constants: ${fullSavings} bytes`);

// Check what's in minified
let minifiedStringBytes = 0;
for (const s of unique) {
  const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'g');
  const matches = (minified.match(re) || []).length;
  minifiedStringBytes += matches * (s.length + 2);
}
console.log(`Logger strings in minified bundle: ${minifiedStringBytes} bytes`);
