import Platform from 'common/platform';

export type LoggerOptions = {
  handler: LoggerFunction;
  level: LogLevels;
};
type LoggerFunction = (...args: string[]) => void;

// Workaround for salesforce lightning locker compatibility
// This is a shorthand version of Utils.getGlobalObject (which we can't use here without creating a circular import)
let globalObject = global || (typeof window !== 'undefined' ? window : self);

enum LogLevels {
  None = 0,
  Error = 1,
  Major = 2,
  Minor = 3,
  Micro = 4,
}

function pad(timeSegment: number, three?: number) {
  return `${timeSegment}`.padStart(three ? 3 : 2, '0');
}

function getHandler(logger: Function): Function {
  return Platform.Config.logTimestamps
    ? function (msg: unknown) {
        const time = new Date();
        logger(
          pad(time.getHours()) +
            ':' +
            pad(time.getMinutes()) +
            ':' +
            pad(time.getSeconds()) +
            '.' +
            pad(time.getMilliseconds(), 1) +
            ' ' +
            msg
        );
      }
    : logger;
}

const getDefaultLoggers = (): [Function, Function] => {
  let consoleLogger;
  let errorLogger;

  /* Can't just check for console && console.log; fails in IE <=9 */
  if (
    (typeof Window === 'undefined' && typeof WorkerGlobalScope === 'undefined') /* node */ ||
    typeof globalObject?.console?.log?.apply === 'function' /* sensible browsers */
  ) {
    consoleLogger = function (...args: unknown[]) {
      console.log.apply(console, args);
    };
    errorLogger = console.warn
      ? function (...args: unknown[]) {
          console.warn.apply(console, args);
        }
      : consoleLogger;
  } else if (globalObject?.console.log as unknown) {
    /* IE <= 9 with the console open -- console.log does not
     * inherit from Function, so has no apply method */
    consoleLogger = errorLogger = function () {
      Function.prototype.apply.call(console.log, console, arguments);
    };
  } else {
    /* IE <= 9 when dev tools are closed - window.console not even defined */
    consoleLogger = errorLogger = function () {};
  }

  return [consoleLogger, errorLogger].map(getHandler) as [Function, Function];
};

class Logger {
  private static logLevel: LogLevels = LogLevels.Error; // default logLevel
  private static logHandler: Function;
  private static logErrorHandler: Function;

  // public constants
  static readonly LOG_NONE: LogLevels = LogLevels.None;
  static readonly LOG_ERROR: LogLevels = LogLevels.Error;
  static readonly LOG_MAJOR: LogLevels = LogLevels.Major;
  static readonly LOG_MINOR: LogLevels = LogLevels.Minor;
  static readonly LOG_MICRO: LogLevels = LogLevels.Micro;
  // aliases
  static readonly LOG_DEFAULT: LogLevels = LogLevels.Error;
  static readonly LOG_DEBUG: LogLevels = LogLevels.Micro;

  constructor() {
    Logger.logLevel = Logger.LOG_DEFAULT;
  }

  static initLogHandlers() {
    const [logHandler, logErrorHandler] = getDefaultLoggers();
    this.logHandler = logHandler;
    this.logErrorHandler = logErrorHandler;
  }

  /* public static functions */
  static logAction = (level: LogLevels, action: string, message?: string) => {
    if (Logger.shouldLog(level)) {
      (level === LogLevels.Error ? Logger.logErrorHandler : Logger.logHandler)('Ably: ' + action + ': ' + message);
    }
  };

  static deprecated = function (original: string, replacement: string) {
    Logger.deprecatedWithMsg(original, "Please use '" + replacement + "' instead.");
  };

  static deprecatedWithMsg = (funcName: string, msg: string) => {
    if (Logger.shouldLog(LogLevels.Error)) {
      Logger.logErrorHandler(
        "Ably: Deprecation warning - '" + funcName + "' is deprecated and will be removed from a future version. " + msg
      );
    }
  };

  /* Where a logging operation is expensive, such as serialisation of data, use shouldLog will prevent
	   the object being serialised if the log level will not output the message */
  static shouldLog = (level: LogLevels) => {
    return level <= Logger.logLevel;
  };

  static setLog = (level: LogLevels | undefined, handler: Function | undefined) => {
    if (level !== undefined) Logger.logLevel = level;
    if (handler !== undefined) Logger.logHandler = Logger.logErrorHandler = handler;
  };
}

export default Logger;
