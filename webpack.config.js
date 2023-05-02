/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { BannerPlugin } = require('webpack');
const banner = require('./src/fragments/license');
const CopyPlugin = require('copy-webpack-plugin');
// This is needed for baseUrl to resolve correctly from tsconfig
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

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
  target: ['web', 'es5'],
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
  target: ['node', 'es5'],
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
  resolve: {
    ...baseConfig.resolve,
    fallback: {
      crypto: false,
    },
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
  target: ['webworker', 'es5'],
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

module.exports = {
  node: nodeConfig,
  browser: browserConfig,
  browserMin: browserMinConfig,
  webworker: webworkerConfig,
  nativeScript: nativeScriptConfig,
  reactNative: reactNativeConfig,
  noEncryption: noEncryptionConfig,
  noEncryptionMin: noEncryptionMinConfig,
};
