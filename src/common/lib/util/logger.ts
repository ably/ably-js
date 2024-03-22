import Platform from 'common/platform';

export type LoggerOptions = {
  handler: LoggerFunction;
  level: LogLevels;
};
type LoggerFunction = (...args: string[]) => void;

// Workaround for salesforce lightning locker compatibility
// This is a shorthand version of Utils.getGlobalObject (which we can't use here without creating a circular import)
let globalObject = typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : self;

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
            msg,
        );
      }
    : logger;
}

const getDefaultLoggers = (): [Function, Function] => {
  let consoleLogger;
  let errorLogger;

  // we expect ably-js to be run in environments which have `console` object available with its `log` function
  if (typeof globalObject?.console?.log === 'function') {
    consoleLogger = function (...args: unknown[]) {
      console.log.apply(console, args);
    };

    errorLogger = console.warn
      ? function (...args: unknown[]) {
          console.warn.apply(console, args);
        }
      : consoleLogger;
  } else {
    // otherwise we should fallback to noop for log functions
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
  /**
   * In the modular variant of the SDK, the `stripLogs` esbuild plugin strips out all calls to this method (when invoked as `Logger.logAction(...)`) except when called with level `Logger.LOG_ERROR`. If you wish for a log statement to never be stripped, use the {@link logActionNoStrip} method instead.
   *
   * The aforementioned plugin expects `level` to be an expression of the form `Logger.LOG_*`; that is, you can’t dynamically specify the log level.
   */
  static logAction = (level: LogLevels, action: string, message?: string) => {
    this.logActionNoStrip(level, action, message);
  };

  /**
   * Calls to this method are never stripped by the `stripLogs` esbuild plugin. Use it for log statements that you wish to always be included in the modular variant of the SDK.
   */
  static logActionNoStrip(level: LogLevels, action: string, message?: string) {
    if (Logger.shouldLog(level)) {
      (level === LogLevels.Error ? Logger.logErrorHandler : Logger.logHandler)('Ably: ' + action + ': ' + message);
    }
  }

  static deprecated = (description: string, msg: string) => {
    Logger.deprecationWarning(`${description} is deprecated and will be removed in a future version. ${msg}`);
  };

  static renamedClientOption(oldName: string, newName: string) {
    Logger.deprecationWarning(
      `The \`${oldName}\` client option has been renamed to \`${newName}\`. Please update your code to use \`${newName}\` instead. \`${oldName}\` will be removed in a future version.`,
    );
  }

  static renamedMethod(className: string, oldName: string, newName: string) {
    Logger.deprecationWarning(
      `\`${className}\`’s \`${oldName}\` method has been renamed to \`${newName}\`. Please update your code to use \`${newName}\` instead. \`${oldName}\` will be removed in a future version.`,
    );
  }

  static deprecationWarning(message: string) {
    if (Logger.shouldLog(LogLevels.Error)) {
      Logger.logErrorHandler(`Ably: Deprecation warning - ${message}`);
    }
  }

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
