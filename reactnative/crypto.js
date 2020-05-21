// Mock module for use in ulid
const ReactNative = require('react-native');

module.exports = {
	randomBytes: ReactNative.NativeModules.RNRandomBytes.randomBytes
}
