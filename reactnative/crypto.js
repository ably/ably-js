// From https://github.com/tradle/react-native-crypto
// Modified to reference local modified sjcl

// The MIT License

// Copyright (c) 2013 Dominic Tarr

// Permission is hereby granted, free of charge,
// to any person obtaining a copy of this software and
// associated documentation files (the "Software"), to
// deal in the Software without restriction, including
// without limitation the rights to use, copy, modify,
// merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom
// the Software is furnished to do so,
// subject to the following conditions:

// The above copyright notice and this permission notice
// shall be included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR
// ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

const sjcl = require("./sjcl");
const RNRandomBytes = require("react-native").NativeModules.RNRandomBytes;
const Buffer = require("buffer").Buffer;

function noop() {}

function toBuffer(nativeStr) {
	return new Buffer(nativeStr, "base64");
}

function init() {
	if (RNRandomBytes.seed) {
		const seedBuffer = toBuffer(RNRandomBytes.seed);
		addEntropy(seedBuffer);
	} else {
		seedSJCL();
	}
}

function addEntropy(entropyBuf) {
	const hexString = entropyBuf.toString("hex");
	const stanfordSeed = sjcl.codec.hex.toBits(hexString);
	sjcl.random.addEntropy(stanfordSeed);
}

export function seedSJCL(cb) {
	cb = cb || noop;
	randomBytes(4096, function (err, buffer) {
		if (err) return cb(err);

		addEntropy(buffer);
	});
}

export function randomBytes(length, cb) {
	if (!cb) {
		const size = length;
		const wordCount = Math.ceil(size * 0.25);
		const randomBytes = sjcl.random.randomWords(wordCount, 10);
		let hexString = sjcl.codec.hex.fromBits(randomBytes);
		hexString = hexString.substr(0, size * 2);
		return new Buffer(hexString, "hex");
	}

	RNRandomBytes.randomBytes(length, function (err, base64String) {
		if (err) {
			cb(err);
		} else {
			cb(null, toBuffer(base64String));
		}
	});
}

init();
