var ConnectionError = {
	disconnected: {
		statusCode: 408,
		code: 80003,
		reason: 'Connection to server temporarily unavailable'
	},
	suspended: {
		statusCode: 408,
		code: 80002,
		reason: 'Connection to server unavailable'
	},
	failed: {
		statusCode: 408,
		code: 80000,
		reason: 'Connection failed or disconnected by server'
	}
};
