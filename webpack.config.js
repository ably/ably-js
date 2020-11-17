const path = require('path');

const nodePath = path.resolve(__dirname, 'nodejs');

module.exports = {
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
      }
  },
  output: {
      filename: 'ably-commonjs.js',
      path: path.resolve(__dirname, 'browser/static'),
      library: 'Ably',
      libraryTarget: 'commonjs2',
  },
  target: 'node',
  externals: {
      request: 'request',
      ws: 'ws',
      'crypto-js': 'crypto-js',
  },
  devtool: 'source-map',
};