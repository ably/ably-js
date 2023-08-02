const esbuild = require('esbuild');

// List of all modules accepted in ModulesMap
const moduleNames = ['Rest'];

function formatBytes(bytes) {
  const kibibytes = bytes / 1024;
  const formatted = kibibytes.toFixed(2);
  return `${formatted} KiB`;
}

// Gets the bundled size in bytes of an array of named exports from 'ably/modules'
function getImportSize(modules) {
  const outfile = modules.join('');
  const result = esbuild.buildSync({
    stdin: {
      contents: `export { ${modules.join(', ')} } from './build/modules'`,
      resolveDir: '.',
    },
    metafile: true,
    minify: true,
    bundle: true,
    outfile,
    write: false,
  });

  return result.metafile.outputs[outfile].bytes;
}

const errors = [];

['BaseRest', 'BaseRealtime'].forEach((baseClient) => {
  const baseClientSize = getImportSize([baseClient]);

  // First display the size of the base client
  console.log(`${baseClient}: ${formatBytes(baseClientSize)}`);

  // Then display the size of each module together with the base client
  moduleNames.forEach((moduleName) => {
    const size = getImportSize([baseClient, moduleName]);
    console.log(`${baseClient} + ${moduleName}: ${formatBytes(size)}`);

    if (!(baseClientSize < size) && !(baseClient === 'BaseRest' && moduleName === 'Rest')) {
      // Emit an error if adding the module does not increase the bundle size
      // (this means that the module is not being tree-shaken correctly).
      errors.push(new Error(`Adding ${moduleName} to ${baseClient} does not increase the bundle size.`));
    }
  });
});

if (errors.length > 0) {
  for (const error of errors) {
    console.log(error.message);
  }
  process.exit(1);
}
