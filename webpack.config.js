/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { BannerPlugin } = require('webpack');
const banner = require('./src/fragments/license');
const CopyPlugin = require('copy-webpack-plugin');
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
  target: 'web',
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
  target: 'node',
  externals: {
    got: true,
    ws: true,
  },
  optimization: {
    minimize: false,
  },
};

const browserConfig = {
  ...baseConfig,
  output: {
    ...baseConfig.output,
    filename: 'ably.js',
  },
  entry: {
    index: platformPath('web'),
  },
  node: {
    crypto: 'empty',
    Buffer: false,
  },
  externals: {
    'crypto-js': true,
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
  node: {
    crypto: 'empty',
    Buffer: false,
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
  },
  node: {
    crypto: 'empty',
    Buffer: false,
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

const browserMinConfig = {
  ...browserConfig,
  output: {
    ...baseConfig.output,
    filename: 'ably.min.js',
  },
  optimization: {
    minimize: true,
  },
  performance: {
    hints: 'warning',
  },
  devtool: 'source-map',
};

const webworkerConfig = {
  target: 'webworker',
  ...browserConfig,
  entry: {
    index: platformPath('web', 'index-webworker.ts'),
  },
  output: {
    ...baseConfig.output,
    filename: 'ably-webworker.min.js',
    globalObject: 'this',
  },
  optimization: {
    minimize: true,
  },
  performance: {
    hints: 'warning',
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'src', 'fragments', 'ably.d.ts'),
          to: path.resolve(__dirname, 'build', 'ably-webworker.min.d.ts'),
        },
      ],
    }),
  ],
};

const noEncryptionConfig = {
  ...browserConfig,
  entry: {
    index: platformPath('web-noencryption'),
  },
  output: {
    ...baseConfig.output,
    filename: 'ably.noencryption.js',
  },
};

const noEncryptionMinConfig = {
  ...browserMinConfig,
  entry: {
    index: platformPath('web-noencryption'),
  },
  output: {
    ...baseConfig.output,
    filename: 'ably.noencryption.min.js',
  },
  devtool: 'source-map',
};

// We are using UMD in ably.js now so there is no need to build separately for CommonJS. These files are still being distributed to avoid breaking changes but should no longer be used.
const commonJsConfig = {
  ...browserConfig,
  output: {
    ...baseConfig.output,
    filename: 'ably-commonjs.js',
  },
};

const commonJsNoEncryptionConfig = {
  ...noEncryptionConfig,
  output: {
    ...baseConfig.output,
    filename: 'ably-commonjs.noencryption.js',
  },
};

function createMochaJUnitReporterConfigs() {
  const dir = path.join(__dirname, 'test', 'support', 'mocha_junit_reporter');

  const baseConfig = {
    mode: 'development',
    entry: path.join(dir, 'index.js'),
    module: {
      // TODO understand this and what it's trying to parse
      rules: [
        {
          use: [
            {
              // To support use of optional chaining in mocha-junit-reporter
              loader: 'babel-loader',
              options: {
                presets: [['@babel/preset-env']],
              },
            },
          ],
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
    resolve: {
      modules: [path.resolve(dir, 'shims'), 'node_modules'],
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
    externals: [nodeExternals({ allowlist: 'mocha-junit-reporter' })],
  };

  return {
    mochaJUnitReporterBrowser: browserConfig,
    mochaJUnitReporterNode: nodeConfig,
  };
}

module.exports = {
  node: nodeConfig,
  browser: browserConfig,
  browserMin: browserMinConfig,
  webworker: webworkerConfig,
  nativeScript: nativeScriptConfig,
  reactNative: reactNativeConfig,
  noEncryption: noEncryptionConfig,
  noEncryptionMin: noEncryptionMinConfig,
  commonJs: commonJsConfig,
  commonJsNoEncryption: commonJsNoEncryptionConfig,
  ...createMochaJUnitReporterConfigs(),
};
