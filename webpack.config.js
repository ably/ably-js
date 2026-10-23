/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { BannerPlugin, ProvidePlugin } = require('webpack');
const banner = require('./packages/core-impl/src/fragments/license');
// This is needed for baseUrl to resolve correctly from tsconfig
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { createStripLogs } = require('./grunt/webpack/strip-logs');
const { msgpackPluginCondition } = require('./grunt/esbuild/build');

// Everything webpack builds here is compiled from the private implementation in packages/core-impl
// rather than from this monorepo root. That is also why the tsconfig has to be named explicitly:
// the plugin resolves one from the working directory, which would find the root's, and the root's
// covers scripts/ and carries none of the implementation's `baseUrl`.
const implDir = path.resolve(__dirname, 'packages', 'core-impl');
const tsconfigPathsPlugin = () => new TsconfigPathsPlugin({ configFile: path.resolve(implDir, 'tsconfig.json') });

const baseConfig = {
  mode: 'production',
  entry: {
    index: path.resolve(implDir, 'src', 'common', 'lib', 'index.js'),
  },
  resolve: {
    extensions: ['.js', '.ts'],
    plugins: [tsconfigPathsPlugin()],
  },
  output: {
    path: path.resolve(implDir, 'build'),
    library: 'Ably',
    libraryTarget: 'umd',
    libraryExport: 'default',
  },
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      { test: /\.ts$/, loader: 'ts-loader' },
    ],
  },
  target: ['web', 'es2020'],
  externals: {
    request: false,
    ws: false,
  },
  plugins: [new BannerPlugin({ banner })],
  performance: {
    hints: false,
  },
  stats: {
    modules: false,
  },
};

function platformPath(platform, ...dir) {
  return path.resolve(implDir, 'src', 'platform', platform, ...dir);
}

const nativeScriptConfig = {
  ...baseConfig,
  output: {
    ...baseConfig.output,
    filename: 'ably-nativescript.js',
    globalObject: 'global',
  },
  entry: {
    index: platformPath('nativescript'),
  },
  resolve: {
    ...baseConfig.resolve,
    fallback: {
      crypto: false,
    },
  },
  externals: {
    request: false,
    ws: false,
    'nativescript-websockets': true,
    '@nativescript/core/application-settings': true,
  },
  optimization: {
    minimize: false,
  },
};

// The React Native bundles of `@ably/pubsub-device`. Built with webpack rather than esbuild, as the
// React Native platform always has been. Each bundles the package's own entry point, which reaches
// the React Native implementation through the `react-native` export condition of
// `@ably/pubsub-core-impl/platform`, and leaves `@ably/pubsub-core` external for the same reason as
// the package's esbuild bundles (grunt/esbuild/build.js).
//
// Like the package's other platform bundles, it is built twice: with every log below error level
// stripped for the package root, and with full logging for `@ably/pubsub-device/debug`.
//
// It leaves MessagePack to the `MsgPack` plugin, as the package's other bundles do, by resolving
// with the same export condition (see `msgpackPluginCondition` in grunt/esbuild/build.js).
function createReactNativeConfig({ debug }) {
  const stripLogs = debug ? null : createStripLogs();

  return {
    ...baseConfig,
    entry: {
      index: path.resolve(__dirname, 'packages', 'device', 'src', 'index.ts'),
    },
    output: {
      path: path.resolve(__dirname, 'packages', 'device', 'dist'),
      filename: debug ? 'debug-react-native.js' : 'react-native.js',
      library: { type: 'commonjs2' },
    },
    module: {
      rules: [
        ...(stripLogs ? [stripLogs.rule] : []),
        // Type checking is left to `tsc`: the package sources sit outside the implementation's
        // tsconfig, whose `baseUrl` the implementation's own imports need.
        {
          test: /\.ts$/,
          loader: 'ts-loader',
          options: { configFile: path.resolve(implDir, 'tsconfig.json'), transpileOnly: true },
        },
      ],
    },
    plugins: [...baseConfig.plugins, ...(stripLogs ? [stripLogs.plugin] : [])],
    resolve: {
      extensions: ['.js', '.ts'],
      plugins: [tsconfigPathsPlugin()],
      conditionNames: [msgpackPluginCondition, 'react-native', 'require', 'default'],
      fallback: {
        crypto: false,
      },
    },
    externals: {
      request: false,
      ws: false,
      '@ably/pubsub-core': true,
      'react-native': true,
      fastestsmallesttextencoderdecoder: 'fastestsmallesttextencoderdecoder',
    },
    optimization: {
      minimize: false,
    },
  };
}

/**
 * We create a bundle that exposes the mocha-junit-reporter package to be able to use it in the browser. We need to do this for the following reasons:
 * - This package is designed for Node only and hence requires polyfills of Node libraries (e.g. `stream`, `path`) — webpack takes care of this for us.
 * - The package is not compatible with RequireJS and hence we don’t have any easy way to directly load it in our tests — the webpack bundle exposes it as a global named MochaJUnitReporter.
 */
function createMochaJUnitReporterConfig() {
  const dir = path.join(implDir, 'test', 'support', 'mocha_junit_reporter');

  return {
    mode: 'development',
    entry: path.join(dir, 'index.js'),
    externals: {
      mocha: 'mocha.Mocha',
    },
    output: {
      path: path.join(dir, 'build'),
      filename: 'browser.js',
      library: 'MochaJUnitReporter',
    },
    plugins: [
      new ProvidePlugin({
        process: 'process/browser.js',
      }),
    ],
    resolve: {
      fallback: {
        // These are the modules suggested by webpack, post v5-upgrade, to replace v4’s built-in shims.
        path: require.resolve('path-browserify'),
        stream: require.resolve('stream-browserify'),
      },
      modules: [
        // Webpack doesn’t suggest any useful shim for the `fs` module, so we provide our own.
        path.resolve(dir, 'shims'),
        'node_modules',
      ],
    },
  };
}

module.exports = {
  nativeScript: nativeScriptConfig,
  reactNative: createReactNativeConfig({ debug: false }),
  reactNativeDebug: createReactNativeConfig({ debug: true }),
  mochaJUnitReporterBrowser: createMochaJUnitReporterConfig(),
};
