const esbuild = require('esbuild');

// List of all modules accepted in ModulesMap
const moduleNames = [];

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

['BaseRest', 'BaseRealtime'].forEach((baseClient) => {
  // First display the size of the base client
  console.log(`${baseClient}: ${formatBytes(getImportSize([baseClient]))}`);

  // Then display the size of each module together with the base client
  moduleNames.forEach((moduleName) => {
    console.log(`${baseClient} + ${moduleName}: ${formatBytes(getImportSize([baseClient, moduleName]))}`);
  });
});
