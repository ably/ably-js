const path = require('path');
const { BannerPlugin } = require('webpack');
const banner = require('./browser/fragments/license');

const nodePath = path.resolve(__dirname, 'nodejs');
const browserPath = path.resolve(__dirname, 'browser');

const baseConfig = {
  mode: 'production',
  entry: {
      index: path.resolve(__dirname, 'common', 'lib', 'index.js')
  },
  resolve: {
      extensions: ['.js'],
  },
  output: {
      path: path.resolve(__dirname, 'browser/static'),
      library: 'Ably',
      libraryTarget: 'umd',
      libraryExport: 'default',
      iife: true,
      environment: {
        arrowFunction: false,
        const: false,
        destructuring: false,
        forOf: false,
      },
  },
  target: 'web',
  externals: {
      request: false,
      ws: false,
  },
  plugins: [
    new BannerPlugin({ banner }),
  ],
  devtool: 'source-map',
};

const nodeConfig = {
  ...baseConfig,
  output: {
    ...baseConfig.output,
    filename: 'ably-node.js',
  },
  resolve: {
      extensions: ['.js'],
      alias: {
        platform: path.resolve(nodePath, 'platform'),
        'platform-http': path.resolve(nodePath, 'lib', 'util', 'http'),
        'platform-bufferutils': path.resolve(nodePath, 'lib', 'util', 'bufferutils'),
        'platform-base64': false,
        'platform-defaults': path.resolve(nodePath, 'lib', 'util', 'defaults'),
        'platform-crypto': path.resolve(nodePath, 'lib', 'util', 'crypto'),
        'platform-webstorage': false,
        'platform-msgpack': false,
        'platform-transports': path.resolve(nodePath, 'lib', 'transport'),
      },
  },
  target: 'node',
  externals: {
      request: true,
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
  resolve: {
      extensions: ['.js'],
      alias: {
        platform: path.resolve(browserPath, 'fragments', 'platform-browser'),
        'platform-http': path.resolve(browserPath, 'lib', 'util', 'http'),
        'platform-bufferutils': path.resolve(browserPath, 'lib', 'util', 'bufferutils'),
        'platform-base64': path.resolve(browserPath, 'lib', 'util', 'base64'),
        'platform-defaults': path.resolve(browserPath, 'lib', 'util', 'defaults'),
        'platform-crypto': path.resolve(browserPath, 'lib', 'util', 'crypto'),
        'platform-webstorage': path.resolve(browserPath, 'lib', 'util', 'webstorage'),
        'platform-msgpack': path.resolve(browserPath, 'lib', 'util', 'msgpack'),
        'platform-transports': path.resolve(browserPath, 'lib', 'transport'),
      },
      fallback: {
        'crypto': false,
      },
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
  },
  resolve: {
      extensions: ['.js'],
      alias: {
        platform: path.resolve(browserPath, 'fragments', 'platform-nativescript'),
        'platform-http': path.resolve(browserPath, 'lib', 'util', 'http'),
        'platform-bufferutils': path.resolve(browserPath, 'lib', 'util', 'bufferutils'),
        'platform-base64': path.resolve(browserPath, 'lib', 'util', 'base64'),
        'platform-defaults': path.resolve(browserPath, 'lib', 'util', 'defaults'),
        'platform-crypto': path.resolve(browserPath, 'lib', 'util', 'crypto'),
        'platform-webstorage': path.resolve(browserPath, 'lib', 'util', 'webstorage'),
        'platform-msgpack': path.resolve(browserPath, 'lib', 'util', 'msgpack'),
        'platform-transports': path.resolve(browserPath, 'lib', 'transport'),
      },
      fallback: {
        'crypto': false,
      },
  },
  externals: {
      request: false,
      ws: false,
      'nativescript-websockets': true,
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
  resolve: {
      extensions: ['.js'],
      alias: {
        platform: path.resolve(browserPath, 'fragments', 'platform-reactnative'),
        'platform-http': path.resolve(browserPath, 'lib', 'util', 'http'),
        'platform-bufferutils': path.resolve(browserPath, 'lib', 'util', 'bufferutils'),
        'platform-base64': path.resolve(browserPath, 'lib', 'util', 'base64'),
        'platform-defaults': path.resolve(browserPath, 'lib', 'util', 'defaults'),
        'platform-crypto': path.resolve(browserPath, 'lib', 'util', 'crypto'),
        'platform-webstorage': path.resolve(browserPath, 'lib', 'util', 'webstorage'),
        'platform-msgpack': path.resolve(browserPath, 'lib', 'util', 'msgpack'),
        'platform-transports': path.resolve(browserPath, 'lib', 'transport'),
      },
      fallback: {
        'crypto': false,
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
  ...baseConfig,
  output: {
    ...baseConfig.output,
    filename: 'ably.min.js',
  },
  resolve: {
      extensions: ['.js'],
      alias: {
        platform: path.resolve(browserPath, 'fragments', 'platform-browser'),
        'platform-http': path.resolve(browserPath, 'lib', 'util', 'http'),
        'platform-bufferutils': path.resolve(browserPath, 'lib', 'util', 'bufferutils'),
        'platform-base64': path.resolve(browserPath, 'lib', 'util', 'base64'),
        'platform-defaults': path.resolve(browserPath, 'lib', 'util', 'defaults'),
        'platform-crypto': path.resolve(browserPath, 'lib', 'util', 'crypto'),
        'platform-webstorage': path.resolve(browserPath, 'lib', 'util', 'webstorage'),
        'platform-msgpack': path.resolve(browserPath, 'lib', 'util', 'msgpack'),
        'platform-transports': path.resolve(browserPath, 'lib', 'transport'),
      },
      fallback: {
        'crypto': false,
      },
  },
};

module.exports = [
  nodeConfig,
  browserConfig,
  browserMinConfig,
  nativeScriptConfig,
  reactNativeConfig,
];