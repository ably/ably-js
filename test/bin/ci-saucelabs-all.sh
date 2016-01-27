#!/usr/bin/env bash

GREEN="\033[0;32m"
NO_COLOUR="\033[0m"

# enable colors by default with echo
shopt -s xpg_echo

echo "\n$GREEN -> Installing all dependencies $NO_COLOUR"
npm install
npm install grunt-cli

echo "\n$GREEN -> Running Karma test suite (Sauce Labs - part 1/3) $NO_COLOUR"
$(npm bin)/grunt test:karma --browsers sl_chrome_42,sl_chrome_35,sl_firefox_37,sl_firefox_31
karma_exitstatus1=$?

echo "\n$GREEN -> Running Karma test suite (Sauce Labs - part 2/3) $NO_COLOUR"
$(npm bin)/grunt test:karma --browsers sl_ios_safari_9_1,sl_ios_safari_8_4,sl_android_5_0,sl_ie_11
karma_exitstatus2=$?

echo "\n$GREEN -> Running Karma test suite (Sauce Labs - part 3/3) $NO_COLOUR"
$(npm bin)/grunt test:karma --browsers sl_ie_10,sl_ie_9,sl_ie_8,sl_safari_9
karma_exitstatus3=$?

if [[ $karma_exitstatus1 -ne 0 ]]; then exit $karma_exitstatus1; fi
if [[ $karma_exitstatus2 -ne 0 ]]; then exit $karma_exitstatus2; fi
if [[ $karma_exitstatus3 -ne 0 ]]; then exit $karma_exitstatus3; fi

exit 0
