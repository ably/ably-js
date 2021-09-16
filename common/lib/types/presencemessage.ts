import Logger from '../util/logger';
import BufferUtils from 'platform-bufferutils';
import Message, { CipherOptions } from './message';
import { decodeBody, Format } from '../util/encoding';

function toActionValue(actionString: string) {
	return PresenceMessage.Actions.indexOf(actionString);
}

class PresenceMessage {
	action?: string | number;
	id?: string;
	timestamp?: number;
	clientId?: string;
	connectionId?: string;
	data?: string | Buffer;
	encoding?: string;
	size?: number;

	static Actions = [
		'absent',
		'present',
		'enter',
		'leave',
		'update'
	];

	/* Returns whether this presenceMessage is synthesized, i.e. was not actually
	 * sent by the connection (usually means a leave event sent 15s after a
	 * disconnection). This is useful because synthesized messages cannot be
	 * compared for newness by id lexicographically - RTP2b1
	 */
	isSynthesized() {
		if (!this.id || !this.connectionId) { return true }
		return this.id.substring(this.connectionId.length, 0) !== this.connectionId;
	};

	/* RTP2b2 */
	parseId() {
		if (!this.id) throw new Error('parseId(): Presence message does not contain an id');
		const parts = this.id.split(':');
		return {
			connectionId: parts[0],
			msgSerial: parseInt(parts[1], 10),
			index: parseInt(parts[2], 10)
		};
	};

	/**
	 * Overload toJSON() to intercept JSON.stringify()
	 * @return {*}
	 */
	toJSON() {
		/* encode data to base64 if present and we're returning real JSON;
		 * although msgpack calls toJSON(), we know it is a stringify()
		 * call if it has a non-empty arguments list */
		let data = this.data as string | Buffer;
		let encoding = this.encoding;
		if(data && BufferUtils.isBuffer(data)) {
			if(arguments.length > 0) {
				/* stringify call */
				encoding = encoding ? (encoding + '/base64') : 'base64';
				data = BufferUtils.base64Encode(data);
			} else {
				/* Called by msgpack. toBuffer returns a datatype understandable by
				 * that platform's msgpack implementation (Buffer in node, Uint8Array
				 * in browsers) */
				data = BufferUtils.toBuffer(data);
			}
		}
		return {
			clientId: this.clientId,
			/* Convert presence action back to an int for sending to Ably */
			action: toActionValue(this.action as string),
			data: data,
			encoding: encoding,
		}
	};

	toString() {
		let result = '[PresenceMessage';
		result += '; action=' + this.action;
		if(this.id)
			result += '; id=' + this.id;
		if(this.timestamp)
			result += '; timestamp=' + this.timestamp;
		if(this.clientId)
			result += '; clientId=' + this.clientId;
		if(this.connectionId)
			result += '; connectionId=' + this.connectionId;
		if(this.encoding)
			result += '; encoding=' + this.encoding;
		if(this.data) {
			if (typeof(this.data) == 'string')
				result += '; data=' + this.data;
			else if (BufferUtils.isBuffer(this.data))
				result += '; data (buffer)=' + BufferUtils.base64Encode(this.data);
			else
				result += '; data (json)=' + JSON.stringify(this.data);
		}
		result += ']';
		return result;
	};

	static encode = Message.encode;
	static decode = Message.decode;

	static fromResponseBody(body: unknown[], options: CipherOptions, format: Format) {
		if(format) {
			body = decodeBody(body, format);
		}

		for(let i = 0; i < body.length; i++) {
			let msg = body[i] = PresenceMessage.fromValues(body[i], true);
			try {
				PresenceMessage.decode(msg, options);
			} catch (e) {
				Logger.logAction(Logger.LOG_ERROR, 'PresenceMessage.fromResponseBody()', (e as Error).toString());
			}
		}
		return body;
	};
	
	static fromValues(values: any, stringifyAction?: boolean): PresenceMessage {
		if(stringifyAction) {
			values.action = PresenceMessage.Actions[values.action]
		}
		return Object.assign(new PresenceMessage(), values);
	};
	
	static fromValuesArray(values: unknown[]) {
		const count = values.length, result = new Array(count);
		for(let i = 0; i < count; i++) result[i] = PresenceMessage.fromValues(values[i]);
		return result;
	};

	static fromEncoded(encoded: unknown, options: CipherOptions) {
		let msg = PresenceMessage.fromValues(encoded, true);
		/* if decoding fails at any point, catch and return the message decoded to
		 * the fullest extent possible */
		try {
			PresenceMessage.decode(msg, options);
		} catch(e) {
			Logger.logAction(Logger.LOG_ERROR, 'PresenceMessage.fromEncoded()', (e as Error).toString());
		}
		return msg;
	};

	static fromEncodedArray(encodedArray: unknown[], options: CipherOptions) {
		return encodedArray.map(function(encoded) {
			return PresenceMessage.fromEncoded(encoded, options);
		});
	};

	static getMessagesSize = Message.getMessagesSize;
}

export default PresenceMessage;
