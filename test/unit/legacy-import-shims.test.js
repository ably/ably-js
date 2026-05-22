'use strict';

define(['chai'], function (chai) {
  const { expect } = chai;
  const fs = require('fs');
  const path = require('path');
  const repoRoot = path.resolve(__dirname, '..', '..');

  describe('legacy v1 import-path shims', function () {
    function loadShim(relPath) {
      const abs = path.join(repoRoot, relPath);
      delete require.cache[abs];
      require(abs);
    }

    it("'ably/promises' shim throws naming the v1 entry point and migration guide", function () {
      expect(() => loadShim('promises.js'))
        .to.throw(Error)
        .with.property('message')
        .that.matches(/'ably\/promises' was the v1 entry point/)
        .and.matches(/migration-guides\/v2\/lib\.md/);
    });

    it("'ably/callbacks' shim throws naming the v1 callback API and migration guide", function () {
      expect(() => loadShim('callbacks.js'))
        .to.throw(Error)
        .with.property('message')
        .that.matches(/'ably\/callbacks' was the v1 callback API entry point/)
        .and.matches(/migration-guides\/v2\/lib\.md/);
    });

    it('package.json exports map wires the legacy subpaths to the shim files and their types', function () {
      const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

      expect(pkg.exports['./promises'], "exports['./promises']").to.deep.equal({
        types: './promises.d.ts',
        default: './promises.js',
      });
      expect(pkg.exports['./callbacks'], "exports['./callbacks']").to.deep.equal({
        types: './callbacks.d.ts',
        default: './callbacks.js',
      });

      for (const file of ['promises.js', 'promises.d.ts', 'callbacks.js', 'callbacks.d.ts']) {
        expect(fs.existsSync(path.join(repoRoot, file)), file).to.equal(true);
      }
    });

    it("'files' array ships the legacy shim files in the published package", function () {
      const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
      for (const file of ['promises.js', 'promises.d.ts', 'callbacks.js', 'callbacks.d.ts']) {
        expect(pkg.files, `files[] should include ${file}`).to.include(file);
      }
    });
  });
});
