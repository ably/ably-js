var path = require('path');
var babel = {
  types: require('@babel/types'),
  parser: require('@babel/parser'),
  traverse: require('@babel/traverse'),
  generator: require('@babel/generator'),
};

// The implementation's sources, the only files whose logging is stripped.
const implSrcDir = path.join(__dirname, '..', '..', 'packages', 'core-impl', 'src') + path.sep;

/**
 * Removes every `Logger.logAction(...)` call below error level from one source file of the
 * implementation, keeping error-level calls and `Logger.logActionNoStrip(...)` calls.
 *
 * Shared by the esbuild plugin (../esbuild/strip-logs.js) and the webpack loader
 * (../webpack/strip-logs-loader.js), each of which adds the bundle-wide sense checks of
 * {@link createStripLogsStats} on top.
 *
 * @param {string} contents - The file's TypeScript or JavaScript source.
 * @param {string} filePath - The file's path, for error locations.
 * @param {ReturnType<typeof createStripLogsStats>} stats - Accumulates what was found, across files.
 * @returns {{ code: string, errors: Array<{ location: object, text: string }> }} The transformed
 *   source, and an error for each logging call whose level could not be determined.
 */
function stripLogs(contents, filePath, stats) {
  const lines = contents.split('\n');
  const ast = babel.parser.parse(contents, { sourceType: 'module', plugins: ['typescript'] });
  const errors = [];

  babel.traverse.default(ast, {
    enter(path) {
      if (
        path.isCallExpression() &&
        babel.types.isMemberExpression(path.node.callee) &&
        babel.types.isIdentifier(path.node.callee.object, { name: 'Logger' })
      ) {
        if (babel.types.isIdentifier(path.node.callee.property, { name: 'logAction' })) {
          const secondArgument = path.node.arguments[1];

          if (
            babel.types.isMemberExpression(secondArgument) &&
            babel.types.isIdentifier(secondArgument.object, { name: 'Logger' }) &&
            secondArgument.property.name.startsWith('LOG_')
          ) {
            if (secondArgument.property.name === 'LOG_ERROR') {
              // `path` is a call to `Logger.logAction(arg0, Logger.LOG_ERROR, ...)`; preserve it.
              stats.foundErrorLog = true;
            } else {
              // `path` is a call to `Logger.logAction(arg0, Logger.LOG_*, ...) for some other log level; strip it.
              stats.foundLogToStrip = true;
              path.remove();
            }
          } else {
            // `path` is a call to `Logger.logAction(arg0, ...)` with some argument other than a `Logger.LOG_*` expression; raise an error because we can’t determine whether to strip it.
            errors.push({
              location: {
                file: filePath,
                column: secondArgument.loc.start.column,
                line: secondArgument.loc.start.line,
                lineText: lines[secondArgument.loc.start.line - 1],
              },
              text: `Second argument passed to Logger.logAction() must be Logger.LOG_*, got \`${
                babel.generator.default(secondArgument).code
              }\``,
            });
          }
        } else if (babel.types.isIdentifier(path.node.callee.property, { name: 'logActionNoStrip' })) {
          // `path` is a call to `Logger.logActionNoStrip(...)`; preserve it.
          stats.foundNoStripLog = true;
        }
      }
    },
  });

  return { code: babel.generator.default(ast).code, errors };
}

/** What {@link stripLogs} has found across the files of one bundle. */
function createStripLogsStats() {
  return { foundLogToStrip: false, foundErrorLog: false, foundNoStripLog: false };
}

/**
 * The bundle-wide sense checks, run once every file has been transformed.
 *
 * @param {ReturnType<typeof createStripLogsStats>} stats - What the bundle's files contained.
 * @returns {string[]} An error message for each check that failed.
 */
function checkStripLogsStats(stats) {
  const errorMessages = [];

  // Perform a sense check to make sure that we found some logging
  // calls to strip (to protect us against accidentally changing the
  // internal logging API in such a way that would cause us to no
  // longer strip any calls).

  if (!stats.foundLogToStrip) {
    errorMessages.push('Did not find any Logger.logAction(...) calls to strip');
  }

  // Perform a sense check to make sure that we found some logging
  // calls to preserve (to protect us against accidentally changing the
  // internal logging API in such a way that would cause us to
  // accidentally strip all logging calls).

  if (!stats.foundErrorLog) {
    errorMessages.push('Did not find any Logger.logAction(arg0, Logger.LOG_ERROR, ...) calls to preserve');
  }

  if (!stats.foundNoStripLog) {
    errorMessages.push('Did not find any Logger.logActionNoStrip(...) calls to preserve');
  }

  return errorMessages;
}

module.exports = { implSrcDir, stripLogs, createStripLogsStats, checkStripLogsStats };
