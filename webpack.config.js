/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { BannerPlugin, ProvidePlugin } = require('webpack');
const banner = require('./src/fragments/license');
// This is needed for baseUrl to resolve correctly from tsconfig
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const baseConfig = {
  mode: 'production',
  entry: {
    index: path.resolve(__dirname, 'src', 'common', 'lib', 'index.js'),
  },
  resolve: {
    extensions: ['.js', '.ts'],
    plugins: [new TsconfigPathsPlugin()],
  },
  output: {
    path: path.resolve(__dirname, 'build'),
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
  target: ['web', 'es2017'],
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
  return path.resolve(__dirname, 'src', 'platform', platform, ...dir);
}

const nodeConfig = {
  ...baseConfig,
  entry: {
    index: platformPath('nodejs'),
  },
  output: {
    ...baseConfig.output,
    filename: 'ably-node.js',
  },
  target: ['node', 'es2017'],
  externals: {
    got: true,
    ws: true,
  },
  optimization: {
    minimize: false,
  },
};

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

const reactNativeConfig = {
  ...baseConfig,
  output: {
    ...baseConfig.output,
    filename: 'ably-reactnative.js',
  },
  entry: {
    index: platformPath('react-native'),
  },
  resolve: {
    extensions: ['.js', '.ts'],
    plugins: [new TsconfigPathsPlugin()],
    fallback: {
      crypto: false,
    },
  },
  externals: {
    request: false,
    ws: false,
    'react-native': true,
  },
  optimization: {
    minimize: false,
  },
};

/**
 * We create a bundle that exposes the mocha-junit-reporter package. We do this for the following reasons:
 *
 * - Browser:
 *
 *   1. This package is designed for Node only and hence requires polyfills of Node libraries (e.g. `stream`, `path`) — webpack takes care of this for us.
 *   2. The package is not compatible with RequireJS and hence we don’t have any easy way to directly load it in our tests — the webpack bundle exposes it as a global named MochaJUnitReporter.
 *
 * - Node: The library uses optional chaining syntax, which is not supported by Node 12.
 */
function createMochaJUnitReporterConfigs() {
  const dir = path.join(__dirname, 'test', 'support', 'mocha_junit_reporter');

  const baseConfig = {
    mode: 'development',
    entry: path.join(dir, 'index.js'),
    module: {
      rules: [
        {
          // The optional chaining syntax used by mocha-junit-reporter is not supported by Node 12 (see above). Hence, we transpile using Babel.
          test: /\.js$/,
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-env']],
          },
        },
      ],
    },
    externals: {
      mocha: 'mocha.Mocha',
    },
    output: {
      path: path.join(dir, 'build'),
    },
  };

  const browserConfig = {
    ...baseConfig,
    externals: {
      mocha: 'mocha.Mocha',
    },
    output: {
      ...baseConfig.output,
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

  const nodeConfig = {
    ...baseConfig,
    target: 'node',
    output: {
      ...baseConfig.output,
      filename: 'node.js',
      libraryTarget: 'umd',
    },
    // Don’t bundle any packages except mocha-junit-reporter. Using the
    // webpack-node-externals library which I saw mentioned on
    // https://webpack.js.org/configuration/externals/#function; there may
    // be a simpler way of doing this but seems OK.
    externals: [nodeExternals({ allowlist: 'mocha-junit-reporter' })],
  };

  return {
    mochaJUnitReporterBrowser: browserConfig,
    mochaJUnitReporterNode: nodeConfig,
  };
}

module.exports = {
  node: nodeConfig,
  nativeScript: nativeScriptConfig,
  reactNative: reactNativeConfig,
  ...createMochaJUnitReporterConfigs(),
};
