const banner = require('../../src/fragments/license');
const umdWrapper = require('esbuild-plugin-umd-wrapper');
const stripLogsPlugin = require('./strip-logs').default;
const swc = require('@swc/core');
const remapping = require('@ampproject/remapping');
const fs = require('fs');

// Experiment #2: swc minification plugin
// Replaces esbuild's built-in minifier with swc, which produces ~4% smaller gzip output.
// swc minifies the bundled output as a post-build step.
// Source maps are composed: esbuild's map (TS→bundled) is chained through swc's map
// (bundled→minified) using @ampproject/remapping so the final map points to original .ts files.
const swcMinifyPlugin = {
  name: 'swcMinify',
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length > 0) return;
      const outfile = build.initialOptions.outfile;
      if (!outfile) return;
      const code = await fs.promises.readFile(outfile, 'utf8');
      const esbuildMap = await fs.promises.readFile(outfile + '.map', 'utf8');
      const minified = await swc.minify(code, {
        compress: { ecma: 2017, passes: 2 },
        mangle: true,
        sourceMap: true,
      });
      // Compose source maps: swc's map (code→minified) + esbuild's map (ts→code)
      // so the final map points from minified output back to original .ts sources.
      // remapping calls the loader for each source in the chain. We return esbuild's
      // map for the first level (swc's input), then null for the original .ts sources
      // (they don't have further maps).
      const esbuildMapParsed = JSON.parse(esbuildMap);
      const esbuildSources = new Set(esbuildMapParsed.sources || []);
      let returnedEsbuildMap = false;
      const composedMap = remapping(minified.map, (file) => {
        if (!returnedEsbuildMap) {
          returnedEsbuildMap = true;
          return esbuildMapParsed;
        }
        return null; // original .ts sources have no further source maps
      });
      await fs.promises.writeFile(outfile, minified.code + `\n//# sourceMappingURL=${require('path').basename(outfile)}.map`);
      await fs.promises.writeFile(outfile + '.map', JSON.stringify(composedMap));
    });
  },
};

// We need to create a new copy of the base config each time, because calling
// esbuild.build() with the base config causes it to mutate the passed
// config’s `banner.js` property to add some weird modules shim code,
// which we don’t want here.
function createBaseConfig() {
  return {
    bundle: true,
    sourcemap: true,
    format: 'umd',
    banner: { js: '/*' + banner + '*/' },
    plugins: [umdWrapper.default({ libraryName: 'Ably', amdNamedModule: false })],
    target: 'es2017',
  };
}

const webConfig = {
  ...createBaseConfig(),
  entryPoints: ['src/platform/web/index.ts'],
  outfile: 'build/ably.js',
};

const minifiedWebConfig = {
  ...createBaseConfig(),
  entryPoints: ['src/platform/web/index.ts'],
  outfile: 'build/ably.min.js',
  // Experiment #2: Use swc for minification instead of esbuild's built-in minifier.
  // esbuild bundles the code, then swcMinifyPlugin minifies the output.
  // This produces ~3.4 KB smaller minified / ~2.1 KB smaller gzip vs esbuild minify.
  minify: false,
  plugins: [stripLogsPlugin, umdWrapper.default({ libraryName: 'Ably', amdNamedModule: false }), swcMinifyPlugin],
};

const modularConfig = {
  ...createBaseConfig(),
  entryPoints: ['src/platform/web/modular.ts'],
  outfile: 'build/modular/index.mjs',
  format: 'esm',
  plugins: [stripLogsPlugin],
};

const nodeConfig = {
  ...createBaseConfig(),
  platform: 'node',
  entryPoints: ['src/platform/nodejs/index.ts'],
  outfile: 'build/ably-node.js',
  /**
   * externals are not bundled into the esbuild output, instead they are left
   * as commonjs imports. This means that the version installed via package.json
   * dependencies is used rather than being pinned to whatever version we built
   * the package release with. This is especially important in the case of 'ws'
   * where the bun runtime has its own 'ws' module, and the npm 'ws' module
   * doesn't work at all.
   */
  external: ['ws', 'got'],
};

const pushPluginConfig = {
  ...createBaseConfig(),
  entryPoints: ['src/plugins/push/index.ts'],
  plugins: [umdWrapper.default({ libraryName: 'AblyPushPlugin', amdNamedModule: false })],
  outfile: 'build/push.js',
  external: ['ulid'],
};

const pushPluginCdnConfig = {
  ...createBaseConfig(),
  entryPoints: ['src/plugins/push/index.ts'],
  plugins: [umdWrapper.default({ libraryName: 'AblyPushPlugin', amdNamedModule: false })],
  outfile: 'build/push.umd.js',
};

const minifiedPushPluginCdnConfig = {
  ...createBaseConfig(),
  entryPoints: ['src/plugins/push/index.ts'],
  plugins: [umdWrapper.default({ libraryName: 'AblyPushPlugin', amdNamedModule: false })],
  outfile: 'build/push.umd.min.js',
  minify: true,
};

const liveObjectsPluginConfig = {
  ...createBaseConfig(),
  entryPoints: ['src/plugins/liveobjects/index.ts'],
  plugins: [umdWrapper.default({ libraryName: 'AblyLiveObjectsPlugin', amdNamedModule: false })],
  outfile: 'build/liveobjects.js',
  external: ['dequal'],
};

const liveObjectsPluginEsmConfig = {
  ...createBaseConfig(),
  format: 'esm',
  plugins: [],
  entryPoints: ['src/plugins/liveobjects/index.ts'],
  outfile: 'build/liveobjects.mjs',
  external: ['dequal'],
};

const liveObjectsPluginCdnConfig = {
  ...createBaseConfig(),
  entryPoints: ['src/plugins/liveobjects/index.ts'],
  plugins: [umdWrapper.default({ libraryName: 'AblyLiveObjectsPlugin', amdNamedModule: false })],
  outfile: 'build/liveobjects.umd.js',
};

const minifiedLiveObjectsPluginCdnConfig = {
  ...createBaseConfig(),
  entryPoints: ['src/plugins/liveobjects/index.ts'],
  plugins: [umdWrapper.default({ libraryName: 'AblyLiveObjectsPlugin', amdNamedModule: false })],
  outfile: 'build/liveobjects.umd.min.js',
  minify: true,
};

module.exports = {
  webConfig,
  minifiedWebConfig,
  modularConfig,
  nodeConfig,
  pushPluginConfig,
  pushPluginCdnConfig,
  minifiedPushPluginCdnConfig,
  liveObjectsPluginConfig,
  liveObjectsPluginEsmConfig,
  liveObjectsPluginCdnConfig,
  minifiedLiveObjectsPluginCdnConfig,
};
