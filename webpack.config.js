const path = require('path');

module.exports = {
  entry: {
      index: path.resolve(__dirname, 'common', 'lib', 'index.js')
  },
  resolve: {
      extensions: ['.js'],
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
  },
};