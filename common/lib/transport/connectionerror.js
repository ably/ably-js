var ConnectionError = {
	disconnected: {
		statusCode: 408,
		code: 80003,
		message: 'Connection to server temporarily unavailable'
	},
	suspended: {
		statusCode: 408,
		code: 80002,
		message: 'Connection to server unavailable'
	},
	failed: {
		statusCode: 408,
		code: 80000,
		message: 'Connection failed or disconnected by server'
	},
	closed: {
		statusCode: 408,
		code: 80017,
		message: 'Connection closed'
	},
	unknownConnectionErr: {
		statusCode: 500,
		code: 50002,
		message: 'Internal connection error'
	},
	unknownChannelErr: {
		statusCode: 500,
		code: 50001,
		message: 'Internal channel error'
	}
};
