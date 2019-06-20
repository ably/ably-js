var Logger = (function() {
	var consoleLogger, errorLogger;

	/* Can't just check for console && console.log; fails in IE <=9 */
	if((typeof Window === 'undefined' && typeof WorkerGlobalScope === 'undefined') /* node */ ||
		 (global.console && global.console.log && (typeof global.console.log.apply === 'function')) /* sensible browsers */) {
		consoleLogger = function() { console.log.apply(console, arguments); };
		errorLogger = console.warn ? function() { console.warn.apply(console, arguments); } : consoleLogger;
	} else if(global.console && global.console.log) {
		/* IE <= 9 with the console open -- console.log does not
		 * inherit from Function, so has no apply method */
		consoleLogger = errorLogger = function() { Function.prototype.apply.call(console.log, console, arguments); };
	} else {
		/* IE <= 9 when dev tools are closed - window.console not even defined */
		consoleLogger = errorLogger = function() {};
	}

	function pad(str, three) {
		return ('000' + str).slice(-2-(three || 0));
	}

	var LOG_NONE  = 0,
	LOG_ERROR = 1,
	LOG_MAJOR = 2,
	LOG_MINOR = 3,
	LOG_MICRO = 4;

	var LOG_DEFAULT = LOG_ERROR,
	LOG_DEBUG   = LOG_MICRO;

	var logLevel = LOG_DEFAULT;

	function getHandler(logger) {
		return Platform.logTimestamps ?
			function(msg) {
				var time = new Date();
				logger(pad(time.getHours()) + ':' + pad(time.getMinutes()) + ':' + pad(time.getSeconds()) + '.' + pad(time.getMilliseconds(), true) + ' ' + msg);
			} : logger;
	}

	var logHandler = getHandler(consoleLogger),
		logErrorHandler = getHandler(errorLogger);

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
		if (Logger.shouldLog(level)) {
			(level === LOG_ERROR ? logErrorHandler : logHandler)('Ably: ' + action + ': ' + message);
		}
	};

	Logger.deprecated = function(original, replacement) {
		if (Logger.shouldLog(LOG_ERROR)) {
			logErrorHandler("Ably: Deprecation warning - '" + original + "' is deprecated and will be removed from a future version. Please use '" + replacement + "' instead.");
		}
	}

	/* Where a logging operation is expensive, such as serialisation of data, use shouldLog will prevent
	   the object being serialised if the log level will not output the message */
	Logger.shouldLog = function(level) {
		return level <= logLevel;
	};

	Logger.setLog = function(level, handler) {
		if(level !== undefined) logLevel = level;
		if(handler !== undefined) logHandler = logErrorHandler = handler;
	};

	return Logger;
})();
