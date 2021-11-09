import ErrorInfo from '../types/errorinfo.js';
import Utils from '../util/utils.js';

var ConnectionError = {
	disconnected: ErrorInfo.fromValues({
		statusCode: 400,
		code: 80003,
		message: 'Connection to server temporarily unavailable'
	}),
	suspended: ErrorInfo.fromValues({
		statusCode: 400,
		code: 80002,
		message: 'Connection to server unavailable'
	}),
	failed: ErrorInfo.fromValues({
		statusCode: 400,
		code: 80000,
		message: 'Connection failed or disconnected by server'
	}),
	closing: ErrorInfo.fromValues({
		statusCode: 400,
		code: 80017,
		message: 'Connection closing'
	}),
	closed: ErrorInfo.fromValues({
		statusCode: 400,
		code: 80017,
		message: 'Connection closed'
	}),
	unknownConnectionErr: ErrorInfo.fromValues({
		statusCode: 500,
		code: 50002,
		message: 'Internal connection error'
	}),
	unknownChannelErr: ErrorInfo.fromValues({
		statusCode: 500,
		code: 50001,
		message: 'Internal channel error'
	})
};

ConnectionError.isRetriable = function(err) {
	if (!err.statusCode || !err.code || err.statusCode >= 500) {
		return true;
	}
	var retriable = false;
	Utils.valuesArray(ConnectionError).forEach(function(connErr) {
		if (connErr.code && connErr.code == err.code) {
			retriable = true;
		}
	});
	return retriable;
};

export default ConnectionError;
