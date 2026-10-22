var fs = require('fs');
var { implSrcDir, stripLogs, createStripLogsStats, checkStripLogsStats } = require('../strip-logs/transform');

// This function is copied from
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// This esbuild plugin strips all log messages from the bundles it is given to, except for
// error-level logs and other logging statements explicitly marked as not to be stripped. The
// transform itself is shared with the webpack loader; see ../strip-logs/transform.js.
const stripLogsPlugin = {
  name: 'stripLogs',
  setup(build) {
    const stats = createStripLogsStats();

    const filter = new RegExp(`^${escapeRegExp(implSrcDir)}.*\\.[tj]s$`);
    build.onLoad({ filter }, async (args) => {
      const contents = (await fs.promises.readFile(args.path)).toString();
      const { code, errors } = stripLogs(contents, args.path, stats);

      return { contents: code, loader: 'ts', errors };
    });

    build.onEnd(() => {
      return { errors: checkStripLogsStats(stats).map((text) => ({ text })) };
    });
  },
};

exports.default = stripLogsPlugin;
