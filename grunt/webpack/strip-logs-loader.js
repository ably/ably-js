const { stripLogs } = require('../strip-logs/transform');

// What each config's loader has found, by the key ./strip-logs.js registers it under. The loader is
// handed the key rather than the record itself, because grunt-webpack copies each config, options
// included, before handing it to webpack.
const statsByKey = new Map();

// The webpack loader half of ./strip-logs.js.
function stripLogsLoader(source) {
  const stats = statsByKey.get(this.getOptions().statsKey);
  const { code, errors } = stripLogs(source, this.resourcePath, stats);

  for (const { location, text } of errors) {
    this.emitError(new Error(`${location.file}:${location.line}:${location.column}: ${text}`));
  }

  return code;
}

module.exports = stripLogsLoader;
module.exports.statsByKey = statsByKey;
