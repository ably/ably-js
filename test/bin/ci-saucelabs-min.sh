#!/usr/bin/env bash

set -e

GREEN="\033[0;32m"
NO_COLOUR="\033[0m"

# enable colors by default with echo
shopt -s xpg_echo

echo "\n$GREEN -> Installing all dependencies $NO_COLOUR"
npm install
npm install grunt-cli

echo "\n$GREEN -> Running Karma test suite (Sauce Labs - Chrome, IE, Safari for iOS) $NO_COLOUR"
$(npm bin)/grunt test:karma --browsers sl_chrome_42,sl_ie_11,sl_ios_safari_8_2
karma_exitstatus=$?

if [[ $karma_exitstatus -ne 0 ]]; then exit $karma_exitstatus; fi

exit 0
