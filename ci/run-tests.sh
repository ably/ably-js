#!/bin/bash

set -eo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

main() {
  # TODO: start X server

  "${ROOT}/test/bin/ci-nodeunit.sh"
}

main $@
