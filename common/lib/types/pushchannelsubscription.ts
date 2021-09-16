import { decodeBody, encodeBody, Format } from "../util/encoding";
import isArray from "../util/isArray";

class PushChannelSubscription {
	channel?: string;
	deviceId?: string;
	clientId?: string;

	/**
	 * Overload toJSON() to intercept JSON.stringify()
	 * @return {*}
	 */
	toJSON() {
		return {
			channel: this.channel,
			deviceId: this.deviceId,
			clientId: this.clientId
		};
	}

	toString() {
		let result = '[PushChannelSubscription';
		if(this.channel)
			result += '; channel=' + this.channel;
		if(this.deviceId)
			result += '; deviceId=' + this.deviceId;
		if(this.clientId)
			result += '; clientId=' + this.clientId;
		result += ']';
		return result;
	}

	static toRequestBody = encodeBody;

	static fromResponseBody(body: Array<Record<string, unknown>> | Record<string, unknown>, format: Format) {
		if(format) {
			body = decodeBody(body, format);
		}

		if(isArray(body)) {
			return PushChannelSubscription.fromValuesArray(body);
		} else {
			return PushChannelSubscription.fromValues(body);
		}
	}

	static fromValues(values: Record<string, unknown>) {
		return Object.assign(new PushChannelSubscription(), values);
	}

	static fromValuesArray(values: Array<Record<string, unknown>>) {
		const count = values.length, result = new Array(count);
		for(let i = 0; i < count; i++) result[i] = PushChannelSubscription.fromValues(values[i]);
		return result;
	}
}

export default PushChannelSubscription;
