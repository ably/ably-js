#!/bin/bash

set -eo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

main() {
  echo "** Starting xvfb"
  export DISPLAY=:99
  /usr/bin/Xvfb $DISPLAY &
  echo "** Started xvfb"

  npm rebuild
  "${ROOT}/test/bin/ci-nodeunit.sh"
}

main $@
