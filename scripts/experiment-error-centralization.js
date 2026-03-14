#!/usr/bin/env node
/**
 * Experiment 4: Error Message Centralization
 *
 * Measures the total bytes consumed by ErrorInfo/PartialErrorInfo message
 * strings in the minified bundle, and estimates savings from centralizing
 * them into a code→message lookup table.
 */
const fs = require('fs');
const zlib = require('zlib');

const minified = fs.readFileSync('build/ably.min.js', 'utf8');
const unminified = fs.readFileSync('build/ably.js', 'utf8');

// Find all ErrorInfo constructor patterns in unminified code
// Pattern: new ErrorInfo("message", code, statusCode) or new PartialErrorInfo("message", code, statusCode)
const errorPattern = /new (?:ErrorInfo|PartialErrorInfo)\(\s*["']([^"']+)["']/g;
let match;
const messages = [];
while ((match = errorPattern.exec(unminified)) !== null) {
  messages.push(match[1]);
}

console.log(`Found ${messages.length} error message strings in unminified bundle`);
const totalBytes = messages.reduce((sum, m) => sum + m.length + 2, 0); // +2 for quotes
console.log(`Total error message string bytes: ${totalBytes}`);

// Count unique messages
const unique = [...new Set(messages)];
console.log(`Unique messages: ${unique.length}`);

// Calculate lookup table size
// Format: {code: "message"} — each entry is ~code(3-5 chars) + message
const lookupSize = unique.reduce((sum, m) => sum + m.length + 10, 0); // overhead per entry
console.log(`Lookup table size estimate: ${lookupSize} bytes`);

// Savings: we remove all inline strings but add the lookup table once
const savings = totalBytes - lookupSize;
console.log(`\nEstimated savings: ${savings} bytes in unminified`);

// Now check in minified — what fraction of the minified bundle is error strings?
let minifiedMatches = 0;
for (const msg of unique) {
  const escaped = msg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'g');
  const found = (minified.match(re) || []).length;
  if (found > 0) {
    minifiedMatches += found * (msg.length + 2);
  }
}
console.log(`Error strings found in minified bundle: ${minifiedMatches} bytes`);

// Show longest/most-duplicated messages
console.log('\nTop 15 longest error messages:');
unique.sort((a, b) => b.length - a.length).slice(0, 15).forEach(m => {
  const count = messages.filter(x => x === m).length;
  console.log(`  ${m.length}B (${count}x): "${m.substring(0, 80)}${m.length > 80 ? '...' : ''}"`);
});

// Estimate gzip impact
// Error strings are moderately compressible. Conservative estimate: 40% of raw savings after gzip.
const estimatedGzipSavings = Math.round(savings * 0.35);
console.log(`\nEstimated gzip savings: ~${estimatedGzipSavings} bytes (conservative)`);

// Also measure Logger.logAction string payloads for context
const logPattern = /Logger\.logAction\([^,]+,\s*[^,]+,\s*["']([^"']+)["']/g;
const logStrings = [];
while ((match = logPattern.exec(unminified)) !== null) {
  logStrings.push(match[1]);
}
const logTotalBytes = logStrings.reduce((sum, m) => sum + m.length + 2, 0);
console.log(`\n--- For reference ---`);
console.log(`Logger action strings: ${logStrings.length} strings, ${logTotalBytes} bytes`);
console.log(`(These are already stripped by stripLogsPlugin in experiment 1)`);
