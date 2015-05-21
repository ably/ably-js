#!/usr/bin/env bash

set -e

GREEN="\033[0;32m"
NO_COLOUR="\033[0m"

# enable colors by default with echo
shopt -s xpg_echo

echo "\n$GREEN -> Installing all dependencies $NO_COLOUR"
npm install
npm install grunt-cli

echo "\n$GREEN -> Running Node unit test suite $NO_COLOUR"
npm test
npm_exitstatus=$?

if [[ $npm_exitstatus -ne 0 ]]; then exit $npm_exitstatus; fi

exit 0
