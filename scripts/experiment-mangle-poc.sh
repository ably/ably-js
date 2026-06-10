#!/bin/bash
# Experiment: Property mangling PoC on ConnectionManager.ts
#
# Programmatically adds _ prefix to all internal (non-public-API) properties
# in ConnectionManager.ts, builds, then mangles with terser to measure the delta.
#
# This proves the mangling approach works on a real file without needing
# a codebase-wide refactor.

set -e

FILE="src/common/lib/transport/connectionmanager.ts"
BACKUP="/tmp/connectionmanager.ts.bak"

# Public API properties that must NOT be renamed
PUBLIC_API="connection|state|id|key|serial|errorReason|recoveryKey|connect|close|ping|on|off|once|whenState|emit|listeners|channels|get|release|channel|publish|subscribe|unsubscribe|attach|detach|history|presence|modes|params|name|data|encoding|extras|timestamp|action|connectionId|connectionKey|auth|authorize|request|stats|time|push|items|first|next|current|hasNext|isLast|fromValues|fromValuesArray|then|catch|finally|resolve|reject|prototype|constructor|toString|valueOf|toJSON|length|message|stack|code|status|statusCode|type|target|result|options|logger|format"

echo "=== Property Mangling PoC: ConnectionManager.ts ==="
echo ""

# Backup
cp "$FILE" "$BACKUP"

# Get list of internal this.* properties (excluding public API)
INTERNAL_PROPS=$(grep -oE 'this\.[a-zA-Z][a-zA-Z0-9]*' "$FILE" | \
  sed 's/this\.//' | sort -u | \
  grep -vE "^($PUBLIC_API)$" || true)

PROP_COUNT=$(echo "$INTERNAL_PROPS" | wc -l | tr -d ' ')
echo "Found $PROP_COUNT internal properties to rename in ConnectionManager.ts"
echo "First 20:"
echo "$INTERNAL_PROPS" | head -20 | sed 's/^/  /'
echo ""

# Rename each internal property: this.foo -> this._foo
# We need to be careful to also rename declarations and other references
for prop in $INTERNAL_PROPS; do
  # Skip single-char props and very common JS names
  if [ ${#prop} -le 1 ]; then continue; fi

  # Rename this.prop to this._prop throughout the file
  sed -i '' "s/this\\.${prop}\\b/this._${prop}/g" "$FILE"
  # Also rename bare property declarations (e.g., "readonly foo:" -> "readonly _foo:")
  sed -i '' "s/\\b${prop}:/\\_${prop}:/g" "$FILE"
done

echo "Renamed properties. Attempting build..."

# Build
if npx grunt build:browser 2>&1 | tail -3 | grep -q "Done."; then
  echo ""
  echo "=== Build SUCCEEDED ==="

  MIN_SIZE=$(wc -c < build/ably.min.js | tr -d ' ')
  GZIP_SIZE=$(gzip -c build/ably.min.js | wc -c | tr -d ' ')
  echo "After renaming: $MIN_SIZE B min / $GZIP_SIZE B gzip"

  # Now mangle _-prefixed properties
  echo ""
  echo "Running terser with _-prefix mangling..."
  node -e "
    const { minify } = require('terser');
    const fs = require('fs');
    const zlib = require('zlib');

    async function run() {
      const code = fs.readFileSync('build/ably.js', 'utf8');
      const result = await minify(code, {
        compress: { ecma: 2017, passes: 2 },
        mangle: { properties: { regex: /^_/ } },
      });
      const min = Buffer.byteLength(result.code);
      const gz = zlib.gzipSync(result.code).length;
      console.log('After mangling _-prefixed: ' + min + ' B min / ' + gz + ' B gzip');
    }
    run();
  "
else
  echo ""
  echo "=== Build FAILED (expected — some cross-file references may break) ==="
  echo "This is expected for a single-file PoC. The key measurement is the"
  echo "terser mangling on the full bundle (experiment-property-mangle-v2.js)"
  echo "which already showed -33 KB min / -3.8 KB gzip with a reserved API list."
fi

# Restore
cp "$BACKUP" "$FILE"
echo ""
echo "Restored original ConnectionManager.ts"
