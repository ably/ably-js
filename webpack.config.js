/**
 * Webpack v4 is used as Webpack v5 does not offer support for ES3 and creates issues for ES3 support such as discarding string literal keyword property names.
 */
const path = require('path');
const { BannerPlugin } = require('webpack');
const banner = require('./src/platform/web/fragments/license');
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

function platformPath(platform, ...dir){
  return path.resolve(__dirname, 'src', 'platform', platform, ...dir);
}

const nodeConfig = {
  ...baseConfig,
  entry: {
    index: platformPath("nodejs"),
  },
  output: {
    ...baseConfig.output,
    filename: 'ably-node.js',
  },
  module: {
    rules: [
      ...baseConfig.module.rules,
      {
        test: /(platform-webstorage|platform-msgpack)/,
        use: 'null-loader',
      },
    ],
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
  resolve: {
    ...baseConfig.resolve,
    alias: {
      platform: platformPath("web", "platform"),
      'platform-http': platformPath("web", 'lib', 'util', 'http'),
      'platform-bufferutils': platformPath("web", 'lib', 'util', 'bufferutils'),
      'platform-defaults': platformPath("web", 'lib', 'util', 'defaults'),
      'platform-crypto': platformPath("web", 'lib', 'util', 'crypto'),
      'platform-webstorage': platformPath("web", 'lib', 'util', 'webstorage'),
      'platform-msgpack': platformPath("web", 'lib', 'util', 'msgpack'),
      'platform-transports': platformPath("web", 'lib', 'transport'),
    },
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
  },
  resolve: {
    ...baseConfig.resolve,
    alias: {
      platform: platformPath("nativescript", "platform"),
      'platform-http': platformPath("web", 'lib', 'util', 'http'),
      'platform-bufferutils': platformPath("web", 'lib', 'util', 'bufferutils'),
      'platform-defaults': platformPath("web", 'lib', 'util', 'defaults'),
      'platform-crypto': platformPath("web", 'lib', 'util', 'crypto'),
      'platform-webstorage': platformPath("web", 'lib', 'util', 'webstorage'),
      'platform-msgpack': platformPath("web", 'lib', 'util', 'msgpack'),
      'platform-transports': platformPath("web", 'lib', 'transport', 'withoutjsonp'),
    },
  },
  node: {
    crypto: 'empty',
    Buffer: false,
  },
  externals: {
    request: false,
    ws: false,
    'nativescript-websockets': true,
  },
  optimization: {
    minimize: false,
  },
  performance: {
    hints: false,
  },
};

const reactNativeConfig = {
  ...baseConfig,
  output: {
    ...baseConfig.output,
    filename: 'ably-reactnative.js',
  },
  resolve: {
    extensions: ['.js', '.ts'],
    alias: {
      platform: platformPath("react-native", "platform"),
      'platform-http': platformPath("web", 'lib', 'util', 'http'),
      'platform-bufferutils': platformPath("web", 'lib', 'util', 'bufferutils'),
      'platform-defaults': platformPath("web", 'lib', 'util', 'defaults'),
      'platform-crypto': platformPath("web", 'lib', 'util', 'crypto'),
      'platform-webstorage': platformPath("web", 'lib', 'util', 'webstorage'),
      'platform-msgpack': platformPath("web", 'lib', 'util', 'msgpack'),
      'platform-transports': platformPath("web", 'lib', 'transport', 'withoutjsonp'),
    },
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
  performance: {
    hints: false,
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
          from: platformPath("web",  'fragments', 'ably.d.ts'),
          to: path.resolve(__dirname, 'build', 'ably-webworker.min.d.ts'),
        },
      ],
    }),
  ],
};

const noEncryptionConfig = {
  ...browserConfig,
  output: {
    ...baseConfig.output,
    filename: 'ably.noencryption.js',
  },
  module: {
    rules: [
      ...baseConfig.module.rules,
      {
        test: platformPath("web", 'lib', 'util', 'crypto'),
        use: 'null-loader',
      },
    ],
  },
};

const noEncryptionMinConfig = {
  ...browserMinConfig,
  output: {
    ...baseConfig.output,
    filename: 'ably.noencryption.min.js',
  },
  module: {
    rules: [
      ...baseConfig.module.rules,
      {
        test: platformPath("web", 'lib', 'util', 'crypto'),
        use: 'null-loader',
      },
    ],
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
};
