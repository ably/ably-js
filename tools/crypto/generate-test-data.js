#!/usr/bin/env node

/************************************************************
 * Usage
 *
 * generate-test-data [key=<hex-encoded key>] [data=<data>] [encoding=<encoding>] [iv=<hex-encoded iv>]
 ************************************************************/

var crypto = require('crypto'),
	util = require('util'),
	ably = require('../../nodejs/rest'),
	TType = require('../../nodejs/lib/protocol/clientmessage_types').TType,
	hexy = require('hexy'),
	DEFAULT_ALGORITHM = "aes",
	DEFAULT_KEYLENGTH = 128,  // bits
	DEFAULT_BLOCKLENGTH = 16, // bytes
	MAX_INT = Math.pow(2, 31) - 1,
	MIN_INT = -Math.pow(2, 31);

/**
 * Generate a buffer of secure random bytes of the given length
 * @param bytes
 * @param callback
 */
function generateRandom(bytes, callback) {
	return crypto.randomBytes(bytes, callback);
}

/**
 * Calculate the padded length of a given plaintext
 * using PKCS5.
 * @param plaintextLength
 * @return
 */
function getPaddedLength(plaintextLength) {
	return (plaintextLength + DEFAULT_BLOCKLENGTH) & -DEFAULT_BLOCKLENGTH;
}

/**
 * Generate padded plaintext
 * @param plaintext
 * @returns {*}
 */
function padPlaintext(plaintext) {
	var unpaddedLength = plaintext.length,
		paddedLength = getPaddedLength(unpaddedLength),
		paddingLength = paddedLength - unpaddedLength,
		padding = new Buffer(paddingLength);

	padding.fill(paddingLength);
	return Buffer.concat([plaintext, padding]);
}

/**
 * Convert a given value to a TData (Thrift) representation
 * @param value
 * @returns {{}}
 */
function toTData(value) {
	var result = {};
	switch(typeof(value)) {
		case 'string':
			result.type = TType.STRING;
			result.stringData = value;
			break;
		case 'number':
			if(value % 1 === 0 && value >= MIN_INT && value <= MAX_INT) {
				result.type = TType.INT32;
				result.i32Data = value;
			} else {
				result.type = TType.DOUBLE;
				result.doubleData = value;
			}
			break;
		case 'object':
			if(Array.isArray(value)) {
				result.type = TType.JSONARRAY;
				result.stringData = JSON.stringify(value);
			} else if(Buffer.isBuffer(value)) {
				result.type = TType.BUFFER;
				result.binaryData = value;
			} else {
				result.type = TType.JSONOBJECT;
				result.stringData = JSON.stringify(value);
			}
			break;
		default:
			throw new Error('Unable to convert data value (' + String(value) + ')');
	}
	return result;
}

function hexdump(buffer) {
	console.log(hexy.hexy(buffer)+ '(' + buffer.length + ' bytes)');
}

/**
 * Helpful message
 * @param str
 * @param err
 */
function usage(str, err) {
	console.error(str);
	process.exit(err || 1);
}

/************************************************
 *              Process arguments
 ************************************************/

var key,
	keylength,
	data,
	encoding,
	iv;

for(var i = 1; i < process.argv.length; i++) {
	var optMatch = process.argv[i].match(/^\s*(\w+)\s*=\s*(.+)$/);
	if(optMatch) {
		switch(optMatch[1]) {
			case 'key':
				try {
					var keyHex = optMatch[2].replace(/ /g, '');
					key = new Buffer(keyHex, 'hex');
				} catch(e) { usage(e.message); }
				break;
			case 'data':
				try {
					data = JSON.parse(optMatch[2]);
				} catch(e) { usage(e.message); }
				break;
			case 'encoding':
				encoding = optMatch[2];
				if(encoding != 'base64')
					usage('Unrecognised encoding: ' + encoding);
				break;
			case 'iv':
				try {
					var ivHex = optMatch[2].replace(/ /g, '');
					iv = new Buffer(ivHex, 'hex');
				} catch(e) { usage(e.message); }
				break;
			default:
				usage('Unrecognised option name: ' + optMatch[1]);
		}
	}
}

/* generate key if none specified */
if(!key) {
	key = generateRandom(DEFAULT_KEYLENGTH / 8);
	console.log('Generating key:');
	hexdump(key);
	console.log('\n');
}
keylength = key.length * 8;

/* generate iv if none specified */
if(!iv) {
	iv = generateRandom(DEFAULT_BLOCKLENGTH);
	console.log('Generating iv:');
	hexdump(iv);
	console.log('\n');
}

/* use given data and encoding, or sample of data of various types */
if(data) {
	if(encoding)
		data = new Buffer(data, encoding);

	try {
		generate_test_data_for(data);
	} catch(e) { usage(e.message); }

} else {
	[
		12345,
		1.2345,
		'The quick brown fox jumped over the lazy dog',
		new Buffer('000102030405060708090a0b0c0d0e0f', 'hex'),
		{example:{json:'object'}},
		['example', 'json', 'array']
	].forEach(function(data) { generate_test_data_for(data); });
}

/************************************************
 * Step by step encryption process for given data
 ************************************************/

function generate_test_data_for(data) {
	console.log('*******************************************************************');
	console.log('Generating test data for: ' + util.inspect(data));
	console.log('\n');

	/* unencrypted format (JSON) */
	var unencrypted_json = {
		name: 'example',
		data: data
	};
	if(Buffer.isBuffer(data)) {
		unencrypted_json.data = data.toString('base64');
		unencrypted_json.encoding = 'base64';
	}
	console.log('Unencrypted JSON message format:');
	console.log(util.inspect(unencrypted_json));
	console.log('\n');

	/* unencrypted format (Thrift)*/
	var unencrypted_thrift = toTData(data),
		tdata_type = unencrypted_thrift.type;

	console.log('Unencrypted Thrift message format:');
	console.log('TData(' + util.inspect(unencrypted_thrift, 1) + ')');
	console.log('\n');

	/* plaintext without padding */
	console.log('Plaintext before encryption (without padding):');
	var plaintext = ably.Crypto.Data.asPlaintext(unencrypted_thrift);
	hexdump(plaintext);
	console.log('\n');

	/* plaintext including padding */
	console.log('Plaintext before encryption (including padding):');
	var paddedPlaintext = padPlaintext(plaintext);
	hexdump(paddedPlaintext);
	console.log('\n');

	/* cipher output */
	console.log('Raw cipher output:');
	var cipher = crypto.createCipheriv(DEFAULT_ALGORITHM + keylength, key, iv);
	var cipherOut = cipher.update(paddedPlaintext);
	hexdump(cipherOut);
	console.log('\n');

	/* encrypted data */
	console.log('Encrypted value, iv + cipher output:');
	var encryptedData = Buffer.concat([iv, cipherOut]);
	hexdump(encryptedData);
	console.log('\n');

	/* encrypted format (JSON) */
	var encrypted_json = {
		name: 'example',
		data: encryptedData.toString('base64'),
		encoding: 'cipher+base64',
		type: tdata_type
	};
	console.log('Encrypted JSON message format:');
	console.log(util.inspect(encrypted_json));
	console.log('\n');

	/* encrypted format (Thrift)*/
	var encrypted_thrift = {
		type: tdata_type,
		cipherData: encryptedData
	};
	console.log('Encrypted Thrift message format:');
	console.log('TData(' + util.inspect(encrypted_thrift) + ')');
	console.log('\n');
}
