#!/usr/bin/env node
/**
 * Experiment A: Property Mangling — Deep Assessment
 *
 * Measures the theoretical maximum savings from property mangling with a
 * properly curated reserved list of public API properties.
 *
 * Also analyzes how many internal properties exist per file to estimate
 * the effort of adopting a _-prefix convention.
 */
const { minify } = require('terser');
const fs = require('fs');
const zlib = require('zlib');

async function main() {
  const bundled = fs.readFileSync('build/ably.js', 'utf8');

  // Public API properties that must NOT be mangled
  const publicAPI = [
    // Client options
    'key', 'token', 'tokenDetails', 'authUrl', 'authMethod', 'authHeaders', 'authParams',
    'clientId', 'logLevel', 'logHandler', 'tls', 'port', 'tlsPort', 'restHost', 'realtimeHost',
    'fallbackHosts', 'useBinaryProtocol', 'recover', 'closeOnUnload', 'idempotentRestPublishing',
    'plugins', 'environment', 'endpoint', 'queueMessages', 'transportParams',
    // Connection
    'connection', 'state', 'id', 'serial', 'errorReason', 'recoveryKey',
    'connect', 'close', 'ping', 'on', 'off', 'once', 'whenState',
    // Channels
    'channels', 'get', 'release', 'channel', 'publish', 'subscribe', 'unsubscribe',
    'attach', 'detach', 'history', 'presence', 'modes', 'params', 'annotations',
    // Presence
    'enter', 'leave', 'update', 'members', 'subscriptions',
    // Message fields
    'name', 'data', 'encoding', 'extras', 'timestamp', 'action',
    'connectionId', 'connectionKey', 'version', 'serial',
    // Auth
    'auth', 'authorize', 'createTokenRequest', 'requestToken',
    // Rest
    'request', 'stats', 'time', 'push',
    // PaginatedResult
    'items', 'first', 'next', 'current', 'hasNext', 'isLast',
    // Events
    'emit', 'listeners',
    // fromValues / static constructors
    'fromValues', 'fromValuesArray',
    // Standard JS/DOM (must not mangle)
    'then', 'catch', 'finally', 'resolve', 'reject', 'prototype', 'constructor',
    'toString', 'valueOf', 'toJSON', 'length', 'map', 'forEach', 'filter', 'reduce',
    'push', 'pop', 'shift', 'unshift', 'slice', 'splice', 'concat', 'indexOf',
    'includes', 'keys', 'values', 'entries', 'hasOwnProperty',
    'apply', 'call', 'bind', 'Promise', 'Error', 'message', 'stack', 'code',
    'status', 'statusCode', 'href', 'cause', 'type', 'target', 'result',
    'addEventListener', 'removeEventListener', 'dispatchEvent', 'WebSocket',
    'ArrayBuffer', 'Uint8Array', 'DataView', 'TextEncoder', 'TextDecoder',
    'fetch', 'XMLHttpRequest', 'headers', 'body', 'method', 'url',
    'readyState', 'send', 'open', 'abort', 'onopen', 'onclose', 'onmessage', 'onerror',
    'response', 'responseText', 'responseType', 'setRequestHeader', 'getResponseHeader',
    'withCredentials',
    // Crypto
    'encrypt', 'decrypt', 'getDefaultParams', 'generateRandomKey',
    'algorithm', 'keyLength', 'mode',
    // Module names
    'Rest', 'Realtime', 'Crypto', 'MsgPack', 'ErrorInfo',
  ];

  // Baseline: terser minification (no property mangling)
  console.log('Minifying baseline (no property mangling)...');
  const baseline = await minify(bundled, {
    compress: { ecma: 2017, passes: 2 },
    mangle: true,
  });

  // Mangle ALL properties except reserved public API
  console.log('Minifying with property mangling (reserved public API)...');
  const mangled = await minify(bundled, {
    compress: { ecma: 2017, passes: 2 },
    mangle: {
      properties: {
        reserved: publicAPI,
      },
    },
  });

  // Mangle only _-prefixed (current state)
  console.log('Minifying with _-prefix only mangling (current codebase)...');
  const mangledUnderscore = await minify(bundled, {
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
    console.log(`  ${label}: ${raw} B min / ${gzipped} B gzip`);
    return { raw, gzipped };
  }

  console.log('\n=== RESULTS ===\n');
  const base = measure('No mangling (baseline)       ', baseline.code);
  const under = measure('_-prefix only (current state)', mangledUnderscore.code);
  const safe = measure('All props (reserved API list) ', mangled.code);

  console.log(`\n  _-prefix vs baseline:       -${base.raw - under.raw} B min / -${base.gzipped - under.gzipped} B gzip (${((1 - under.raw / base.raw) * 100).toFixed(1)}% / ${((1 - under.gzipped / base.gzipped) * 100).toFixed(1)}%)`);
  console.log(`  Reserved-API vs baseline:   -${base.raw - safe.raw} B min / -${base.gzipped - safe.gzipped} B gzip (${((1 - safe.raw / base.raw) * 100).toFixed(1)}% / ${((1 - safe.gzipped / base.gzipped) * 100).toFixed(1)}%)`);

  // Analyze internal property counts per source file
  console.log('\n=== INTERNAL PROPERTIES BY FILE ===\n');
  const propAccesses = bundled.match(/this\.\w+/g) || [];
  const allProps = [...new Set(propAccesses.map(p => p.replace('this.', '')))];
  const internalProps = allProps.filter(p => !publicAPI.includes(p));
  console.log(`Total unique this.* properties: ${allProps.length}`);
  console.log(`Public API (reserved): ${allProps.length - internalProps.length}`);
  console.log(`Internal (mangleable): ${internalProps.length}`);
  console.log(`\nTop 20 most-accessed internal properties:`);
  const freq = {};
  propAccesses.forEach(p => { const n = p.replace('this.', ''); if (!publicAPI.includes(n)) freq[n] = (freq[n] || 0) + 1; });
  Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([prop, count]) => console.log(`  ${count}x this.${prop}`));
}

main().catch(console.error);
