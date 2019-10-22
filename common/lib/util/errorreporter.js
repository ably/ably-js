var ErrorReporter = (function() {
	function ErrorReporter() {}

	var levels = ErrorReporter.levels = [
		'fatal',
		'error',
		'warning',
		'info',
		'debug'
	];

	/* (level: typeof ErrorReporter.levels[number], message: string, fingerprint?: string, tags?: {[key: string]: string}): void */
	ErrorReporter.report = function(level, message, fingerprint, tags) {
		var eventId = Utils.randomHexString(16);

		var event = {
			event_id: eventId,
			tags: Utils.mixin({
				lib: Platform.libver
			}, tags),
			platform: 'javascript',
			level: level,
			release: Defaults.version,
			fingerprint: fingerprint && [ fingerprint ],
			message: message,
			request: {
				headers: {
					'User-Agent': Platform.userAgent
				},
				url: Platform.currentUrl
			}
		};

		Logger.logAction(Logger.LOG_MICRO, 'ErrorReporter', 'POSTing to error reporter: ' + message);
		Http.postUri(null, Defaults.errorReportingUrl, Defaults.errorReportingHeaders, JSON.stringify(event), {}, function(err, res) {
			Logger.logAction(Logger.LOG_MICRO, 'ErrorReporter', 'POSTing to error reporter resulted in: ' +
				(err ? Utils.inspectError(err) : Utils.inspectBody(res))
			);
		});
	};

	return ErrorReporter;
})();
