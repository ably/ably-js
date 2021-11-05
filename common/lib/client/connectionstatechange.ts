import ErrorInfo from "../types/errorinfo";

class ConnectionStateChange {
	previous?: string;
	current?: string;
	retryIn?: number;
	reason?: string | Error | ErrorInfo;

	constructor(previous?: string, current?: string, retryIn?: number | null, reason?: string | Error | ErrorInfo) {
		this.previous = previous;
		this.current = current;
		if(retryIn) this.retryIn = retryIn;
		if(reason) this.reason = reason;
	}
}

export default ConnectionStateChange;
