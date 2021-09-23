import Utils from "../util/utils";

export default class ErrorInfo {
	message?: string;
	code?: number;
	statusCode?: number;
	cause?: string | Error;
	href?: string;

	constructor(message?: string, code?: number, statusCode?: number, cause?: string | Error) {
		this.message = message;
		this.code = code;
		this.statusCode = statusCode;
		this.cause = cause;
	}

	toString(): string {
		let result = '[' + this.constructor.name;
		if(this.message) result += ': ' + this.message;
		if(this.statusCode) result += '; statusCode=' + this.statusCode;
		if(this.code) result += '; code=' + this.code;
		if(this.cause) result += '; cause=' + Utils.inspectError(this.cause);
		if(this.href && !(this.message && this.message.indexOf('help.ably.io') > -1)) result += '; see ' + this.href + ' ';
		result += ']';
		return result;
	}

	static fromValues(values: Error | ErrorInfo): ErrorInfo {
		const result = Object.assign(new ErrorInfo(), values);
		if (values instanceof Error) {
			/* Error.message is not enumerable, so mixin loses the message */
			result.message = values.message;
		}
		if(result.code && !result.href) {
			result.href = 'https://help.ably.io/error/' + result.code;
		}
		return result;
	}
}
