import * as Utils from './utils';
import Platform from 'platform';
import Defaults from './defaults';
import Logger from './logger';
import Http from 'platform-http';
import ErrorInfo from '../types/errorinfo';
import { ErrnoException } from '../../types/http';

const levels = ['fatal', 'error', 'warning', 'info', 'debug'];

class ErrorReporter {
	static levels = levels;

	static report(level: string, message: string, fingerprint?: string, tags?: Record<string, string>): void {
		const eventId = Utils.randomHexString(16);

		const event = {
			event_id: eventId,
			tags: Utils.mixin(
				{
					ablyAgent: Defaults.agent,
				},
				tags,
			),
			platform: 'javascript',
			level: level,
			release: Defaults.version,
			fingerprint: fingerprint && [fingerprint],
			message: message,
			request: {
				headers: {
					'User-Agent': Platform.userAgent,
				},
				url: Platform.currentUrl,
			},
		};

		Logger.logAction(Logger.LOG_MICRO, 'ErrorReporter', 'POSTing to error reporter: ' + message);
		Http.postUri(
			null,
			Defaults.errorReportingUrl,
			Defaults.errorReportingHeaders,
			JSON.stringify(event),
			{},
			function (err?: ErrorInfo | ErrnoException | null, res?: unknown) {
				Logger.logAction(
					Logger.LOG_MICRO,
					'ErrorReporter',
					'POSTing to error reporter resulted in: ' + (err ? Utils.inspectError(err) : Utils.inspectBody(res)),
				);
			},
		);
	}
}

export default ErrorReporter;
