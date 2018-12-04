export DISPLAY=:99.0
sh -e /etc/init.d/xvfb start
./node_modules/.bin/grunt test:karma
