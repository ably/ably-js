#!/usr/bin/env bash
set -euo pipefail

# Runs proxy integration tests:
# 1. Builds the Go test proxy (if needed)
# 2. Starts it on the control port
# 3. Runs the mocha tests matching the proxy pattern
# 4. Kills the proxy on exit

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROXY_SRC="${SCRIPT_DIR}/../../../../../../specification/uts/proxy"
PROXY_BIN="${PROXY_SRC}/test-proxy"
CONTROL_PORT="${PROXY_CONTROL_PORT:-9100}"
MOCHA_ARGS="${@}"

# Build proxy if source is newer than binary
if [ ! -f "$PROXY_BIN" ] || [ "$(find "$PROXY_SRC" -name '*.go' -newer "$PROXY_BIN" 2>/dev/null | head -1)" ]; then
  echo "Building test proxy..."
  (cd "$PROXY_SRC" && go build -o test-proxy .)
fi

cleanup() {
  if [ -n "${PROXY_PID:-}" ]; then
    kill "$PROXY_PID" 2>/dev/null || true
    wait "$PROXY_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Start proxy
echo "Starting test proxy on control port $CONTROL_PORT..."
"$PROXY_BIN" --port "$CONTROL_PORT" &
PROXY_PID=$!

# Wait for proxy to be ready
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${CONTROL_PORT}/health" > /dev/null 2>&1; then
    echo "Proxy ready (PID $PROXY_PID)"
    break
  fi
  if ! kill -0 "$PROXY_PID" 2>/dev/null; then
    echo "Proxy process died unexpectedly"
    exit 1
  fi
  sleep 0.2
done

if ! curl -sf "http://localhost:${CONTROL_PORT}/health" > /dev/null 2>&1; then
  echo "Proxy failed to start within 6 seconds"
  exit 1
fi

# Run proxy tests
export PROXY_CONTROL_HOST="http://localhost:${CONTROL_PORT}"
cd "$(dirname "$SCRIPT_DIR")/../../../.."

npx mocha --no-config --require tsx/cjs \
  'test/uts/realtime/integration/proxy/**/*.test.ts' \
  --timeout 60000 \
  $MOCHA_ARGS

echo "Proxy tests complete."
