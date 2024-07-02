var express = require('express'),
  cors = require('cors'),
  path = require('path');

/**
 * Runs a simple web server that runs the mocha.html tests
 * This is useful if you need to run the mocha tests visually
 * via a tunnel to your localhost server
 *
 * @param playwrightTest - used to let this script know that tests are
 * running in a playwright context. When truthy, a different html document is
 * returned on 'GET /' and console logging is skipped.
 */

class MochaServer {
  constructor(playwrightTest) {
    this.playwrightTest = playwrightTest;
  }

  async listen() {
    const app = express();
    app.use((req, res, next) => {
      if (!this.playwrightTest) console.log('%s %s %s', req.method, req.url, req.path);
      next();
    });

    app.use(cors());

    app.get('/', (req, res) => {
      if (this.playwrightTest) {
        res.redirect('/playwright.html');
      } else {
        res.redirect('/mocha.html');
      }
    });

    // service workers have limited scope if not served from the base path
    app.get('/push_sw.js', (req, res) => {
      res.sendFile(path.join(__dirname, 'support', 'push_sw.js'));
    });

    app.use('/node_modules', express.static(__dirname + '/../node_modules'));
    app.use('/test', express.static(__dirname));
    app.use('/browser', express.static(__dirname + '/../src/web'));
    app.use('/build', express.static(__dirname + '/../build'));
    app.use(express.static(__dirname));

    const port = process.env.PORT || 3000;
    this.server = app.listen(port);

    console.log('Mocha test server listening on http://localhost:3000/');
  }

  close() {
    this.server.close();
  }
}

module.exports = MochaServer;
