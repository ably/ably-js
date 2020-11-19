const path = require('path');

const nodePath = path.resolve(__dirname, 'nodejs');
const browserPath = path.resolve(__dirname, 'browser');

const nodeConfig = {
  mode: 'production',
  entry: {
      index: path.resolve(__dirname, 'common', 'lib', 'index.js')
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
  output: {
      filename: 'ably-node.js',
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
  target: 'node',
  externals: {
      request: true,
      ws: true,
      'crypto-js': false,
  },
  optimization: {
    minimize: false,
  },
  devtool: 'source-map',
};

const browserConfig = {
  mode: 'production',
  entry: {
      index: path.resolve(__dirname, 'common', 'lib', 'index.js')
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
  output: {
      filename: 'ably.js',
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
  devtool: 'source-map',
  optimization: {
    minimize: true,
  },
};

module.exports = [
  nodeConfig,
  browserConfig,
];