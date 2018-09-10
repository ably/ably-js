#!/usr/bin/env node

/************************************************************
 * Usage
 *
 * generate-test-data [key=<hex-encoded key>] [keylen=<length of key to generate>] [data=<data>] [encoding=<encoding>] [iv=<hex-encoded iv>] [save=true|false] [verbose=true|false]
 ************************************************************/

var crypto = require('crypto'),
	msgpack = require('@ably/msgpack-js'),
	util = require('util'),
	ably = require('../../nodejs/rest'),
	hexy = require('hexy'),
	DEFAULT_ALGORITHM = 'aes',
	DEFAULT_KEYLENGTH = 128,  // bits
	DEFAULT_MODE = 'cbc',
	DEFAULT_BLOCKLENGTH = 16, // bytes
	MAX_INT = Math.pow(2, 31) - 1,
	MIN_INT = -Math.pow(2, 31);

function mixin(target, src) {
	for(var prop in src)
		target[prop] = src[prop];
	return target;
}

function copy(src) {
	return mixin({}, src);
}

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

function hexdump(buffer) {
	verboseOutput(hexy.hexy(buffer)+ '(' + buffer.length + ' bytes)');
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

var algorithm = DEFAULT_ALGORITHM,
	mode = DEFAULT_MODE,
	keylength = DEFAULT_KEYLENGTH,
	key,
	iv,
	data,
	encoding,
	save,
	verbose;

for(var i = 1; i < process.argv.length; i++) {
	var optMatch = process.argv[i].match(/^\s*(\w+)\s*=\s*(.+)$/);
	if(optMatch) {
		switch(optMatch[1]) {
			case 'algorithm':
				algorithm = optMatch[2];
				if(algorithm != 'aes')
					usage('Unrecognised algorithm: ' + algorithm);
				break;
			case 'mode':
				mode = optMatch[2];
				if(mode != 'cbc')
					usage('Unrecognised mode: ' + mode);
				break;
			case 'keylen':
				keylength = Number(optMatch[2]);
				break;
			case 'key':
				try {
					var keyHex = optMatch[2].replace(/ /g, '');
					key = new Buffer(keyHex, 'hex');
				} catch(e) { usage(e.message); }
				break;
			case 'iv':
				try {
					var ivHex = optMatch[2].replace(/ /g, '');
					iv = new Buffer(ivHex, 'hex');
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
			case 'save':
				save = (optMatch[2] == 'true');
				break;
			case 'verbose':
				verbose = (optMatch[2] == 'true');
				break;
			default:
				usage('Unrecognised option name: ' + optMatch[1]);
		}
	}
}

/* generate key if none specified */
if(!key) {
	key = generateRandom(keylength / 8);
	verboseOutput('Generating key:');
	hexdump(key);
	verboseOutput('\n');
}

/* generate iv if none specified */
if(!iv) {
	iv = generateRandom(DEFAULT_BLOCKLENGTH);
	verboseOutput('Generating iv:');
	hexdump(iv);
	verboseOutput('\n');
}

/* use given data and encoding, or sample of data of various types */
var items;
if(data) {
	if(encoding)
		data = new Buffer(data, encoding);
	items = [data];
} else {
	items = [
		'The quick brown fox jumped over the lazy dog',
		new Buffer('000102030405060708090a0b0c0d0e0f', 'hex'),
		{example: {json: 'Object'}},
		['example', 'json', 'array']
	];
}
items = items.map(function(data) {
	try {
		return generate_test_data_for(data);
	} catch(e) {
		usage(e.message);
		/* exits ... */
	}
});

if(save) {
	process.stdout.write(JSON.stringify({
		algorithm: algorithm,
		mode: mode,
		keylength: keylength,
		key: key.toString('base64'),
		iv: iv.toString('base64'),
		items: items
	}, null, '\t'));
}

function verboseOutput(data) {
	if(verbose) console.error(data);
}
/************************************************
 * Step by step encryption process for given data
 ************************************************/

function generate_test_data_for(data) {
	verboseOutput('*******************************************************************');
	verboseOutput('Generating test data for: ' + util.inspect(data));
	verboseOutput('\n');

	/* unencrypted/unencoded Message */
	var unencoded_message = {
		name: 'example',
		data: data
	};

	verboseOutput('Unencoded message:');
	verboseOutput(util.inspect(unencoded_message));
	verboseOutput('\n');

	/* encode */
	var encoded_message = copy(unencoded_message);
	var isString = (typeof(data) == 'string');
	var isBuffer = Buffer.isBuffer(data);
	var encoding = null;
	if(!isString && !isBuffer) {
		encoded_message.data = data = JSON.stringify(data);
		encoded_message.encoding = encoding = 'json';
		isString = true;
	}

	verboseOutput('Encoded message:');
	verboseOutput(util.inspect(encoded_message));
	verboseOutput('\n');

	/* JSON-encoded representation if not encrypted */
	var encoded_json = copy(encoded_message);
	if(isBuffer) {
		encoded_json.data = data.toString('base64');
		encoded_json.encoding = (encoding ? (encoding + '/') : '') + 'base64';
	}
	verboseOutput('Unencrypted JSON message format:');
	verboseOutput(JSON.stringify(encoded_json));
	verboseOutput('\n');

	/* unencrypted format msgpack */
	verboseOutput('Unencrypted msgpack message format:');
	hexdump(msgpack.encode(encoded_message));
	verboseOutput('\n');

	/* plaintext without padding */
	verboseOutput('Plaintext before encryption (without padding):');
	var plaintext = data;
	if(isString) {
		plaintext = new Buffer(plaintext);
		encoding = (encoding ? (encoding + '/') : '') + 'utf-8';
	}
	hexdump(plaintext);
	verboseOutput('\n');

	/* plaintext including padding */
	verboseOutput('Plaintext before encryption (including padding):');
	var paddedPlaintext = padPlaintext(plaintext);
	hexdump(paddedPlaintext);
	verboseOutput('\n');

	/* cipher output */
	verboseOutput('Raw cipher output:');
	var cipher = crypto.createCipheriv(DEFAULT_ALGORITHM + keylength, key, iv);
	var cipherOut = cipher.update(paddedPlaintext);
	hexdump(cipherOut);
	verboseOutput('\n');

	/* encrypted data */
	verboseOutput('Encrypted value, iv + cipher output:');
	var encryptedData = Buffer.concat([iv, cipherOut]);
	hexdump(encryptedData);
	verboseOutput('\n');

	/* encrypted message */
	var encrypted_message = {
		name: 'example',
		data: encryptedData,
		encoding: (encoding ? (encoding + '/') : '') + 'cipher+' + [algorithm, keylength, mode].join('-')
	};
	verboseOutput('Encrypted message format:');
	verboseOutput(util.inspect(encrypted_message));
	verboseOutput('\n');

	/* encrypted format (JSON) */
	var encrypted_json = copy(encrypted_message);
	encrypted_json.data = encrypted_message.data.toString('base64');
	encrypted_json.encoding = encrypted_message.encoding + '/base64'
	verboseOutput('Encrypted JSON message format:');
	verboseOutput(JSON.stringify(encrypted_json));
	verboseOutput('\n');

	/* encrypted format (msgpack)*/
	verboseOutput('Encrypted msgpack message format:');
	hexdump(msgpack.encode(encrypted_message));
	verboseOutput('\n');

	return {
		encoded: encoded_json,
		encrypted: encrypted_json
	};
}
