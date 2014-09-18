var Logger = (function() {
	var noop = function() {};

	var LOG_NONE  = 0,
	LOG_ERROR = 1,
	LOG_MAJOR = 2,
	LOG_MINOR = 3,
	LOG_MICRO = 4;

	var LOG_DEFAULT = LOG_MINOR,
	LOG_DEBUG   = LOG_MICRO;

	var logLevel = LOG_MICRO;
	var logHandler = noop;

	/* public constructor */
	function Logger(args) {}

	/* public constants */
	Logger.LOG_NONE    = LOG_NONE,
	Logger.LOG_ERROR   = LOG_ERROR,
	Logger.LOG_MAJOR   = LOG_MAJOR,
	Logger.LOG_MINOR   = LOG_MINOR,
	Logger.LOG_MICRO   = LOG_MICRO;

	Logger.LOG_DEFAULT = LOG_DEFAULT,
	Logger.LOG_DEBUG   = LOG_DEBUG;

	/* public static functions */
	Logger.logAction = function(level, action, message) {
		if(level <= logLevel) {
			logHandler('Ably: ' + action + ': ' + message);
		}
	};

	Logger.setLog = function(level, handler) {
		logLevel = level || LOG_DEFAULT;
		logHandler = handler || function(msg) { console.log(msg); };
	};

	return Logger;
})();
